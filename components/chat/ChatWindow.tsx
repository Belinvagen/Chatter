"use client";

import { useRef, useEffect, useState } from "react";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useProfileById } from "@/hooks/useProfileById";
import { useTopics } from "@/hooks/useTopics";
import { useChats } from "@/hooks/useChats";
import { markChatAsRead } from "@/lib/chats";
import { sendMessage, deleteMessageForEveryone, deleteMessageForMe } from "@/lib/messages";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";
import { TopicsSidebar } from "@/components/chat/TopicsSidebar";
import { UserProfilePanel } from "@/components/chat/UserProfilePanel";
import { GroupInfoPanel } from "@/components/chat/GroupInfoPanel";
import { ForwardModal } from "@/components/chat/ForwardModal";
import { DeleteMessageModal } from "@/components/chat/DeleteMessageModal";
import { Avatar } from "@/components/Avatar";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import type { Chat, Topic, Message } from "@/types";

interface Props {
  chat: Chat;
}

export function ChatWindow({ chat: chatProp }: Props) {
  const { user } = useAuth();

  // ── Live chat: resolve from useChats cache so updates (name, avatar, members)
  //    are reflected instantly without page reload ──
  const { data: chats = [] } = useChats();
  const chat = chats.find((c) => c.id === chatProp.id) ?? chatProp;

  const isGroup = chat.type === "group";
  const isSuperGroup = isGroup && chat.isSuperGroup;

  // Topic state for super groups
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const { data: topics = [] } = useTopics(isSuperGroup ? chat.id : null);

  // Panel state
  const [showPanel, setShowPanel] = useState<
    | { type: "user"; uid: string }
    | { type: "group" }
    | null
  >(null);

  // Reply, Forward, Edit, and Delete state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());

  // Auto-select first topic when entering a super group
  useEffect(() => {
    if (isSuperGroup && topics.length > 0 && !activeTopic) {
      setActiveTopic(topics[0]);
    }
  }, [isSuperGroup, topics, activeTopic]);

  // Reset topic and panel when chat changes
  useEffect(() => {
    setActiveTopic(null);
    setShowPanel(null);
  }, [chat.id]);

  const topicId = isSuperGroup ? activeTopic?.id ?? null : null;

  const { data: messages = [], isLoading } = useMessages(
    chat.id,
    isSuperGroup ? topicId : undefined
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark chat as read if unread count > 0
  useEffect(() => {
    if (user?.uid && chat.id) {
      if ((chat.unreadCount?.[user.uid] ?? 0) > 0) {
        markChatAsRead(chat.id, user.uid).catch(console.error);
      }
    }
  }, [chat.id, chat.unreadCount, user?.uid]);

  // For DMs: get the other participant's live profile
  const otherUid = !isGroup
    ? (chat.participants.find((uid) => uid !== user?.uid) ?? "")
    : "";
  const { data: otherProfile } = useProfileById(otherUid || undefined);

  // Display info
  let headerName = "";
  let headerAvatar: string | undefined = undefined;
  let headerSubtext: React.ReactNode = "";

  if (isGroup) {
    headerName = chat.name ?? "Group";
    headerAvatar = chat.groupAvatarUrl;
    headerSubtext = `${chat.participants.length} members${isSuperGroup ? " · Super Group" : ""}`;
  } else {
    const fallback = chat.participantInfo[otherUid];
    headerName = otherProfile?.displayName ?? fallback?.displayName ?? "Unknown";
    headerAvatar = otherProfile?.avatarUrl ?? fallback?.avatarUrl;
    
    if (otherProfile) {
      if (otherProfile.isOnline) {
        headerSubtext = <span className="text-green-500">Online</span>;
      } else if (otherProfile.lastSeen) {
        try {
          const distance = formatDistanceToNow(otherProfile.lastSeen.toDate(), { addSuffix: true });
          headerSubtext = `last seen ${distance}`;
        } catch (e) {
          headerSubtext = "Offline";
        }
      } else {
        headerSubtext = "Offline";
      }
    } else {
      headerSubtext = "Direct Message";
    }
  }

  const handleHeaderClick = () => {
    if (isGroup) {
      setShowPanel(showPanel?.type === "group" ? null : { type: "group" });
    } else if (otherUid) {
      setShowPanel(
        showPanel?.type === "user" && showPanel.uid === otherUid
          ? null
          : { type: "user", uid: otherUid }
      );
    }
  };

  const handleForward = async (targetChatId: string, topicId?: string) => {
    if (!forwardingMessage || !user) return;
    
    // Construct attachment data if the message had one
    let attachmentData;
    if (forwardingMessage.fileUrl && forwardingMessage.type && forwardingMessage.type !== "text") {
      attachmentData = {
        type: forwardingMessage.type as "image" | "video" | "audio" | "file",
        fileUrl: forwardingMessage.fileUrl,
        fileName: forwardingMessage.fileName || "forwarded_file",
        fileSize: forwardingMessage.fileSize || 0,
      };
    }

    try {
      await sendMessage(
        targetChatId,
        user.uid,
        user.displayName ?? "User",
        forwardingMessage.text,
        topicId,
        attachmentData,
        undefined, // Don't carry over replies
        { senderName: forwardingMessage.senderName }
      );
      toast.success("Message forwarded");
    } catch (err) {
      toast.error("Failed to forward message");
    } finally {
      setForwardingMessage(null);
    }
  };

  const handleDeleteMessageConfirm = async (forEveryone: boolean) => {
    if (!messageToDelete || !user) return;
    const msgId = messageToDelete.id;
    setMessageToDelete(null);

    // Optimistically hide the message
    setPendingDeletions(prev => new Set(prev).add(msgId));

    let isUndone = false;

    toast((t) => (
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-white">Message deleted</span>
        <button
          onClick={() => {
            isUndone = true;
            setPendingDeletions(prev => {
              const newSet = new Set(prev);
              newSet.delete(msgId);
              return newSet;
            });
            toast.dismiss(t.id);
          }}
          className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          UNDO
        </button>
      </div>
    ), { duration: 5000 });

    // Wait 5 seconds
    setTimeout(async () => {
      if (isUndone) return;
      try {
        if (forEveryone) {
          await deleteMessageForEveryone(chat.id, msgId);
        } else {
          await deleteMessageForMe(chat.id, msgId, user.uid);
        }
      } catch (err) {
        console.error("Failed to permanently delete message:", err);
        // If it fails, we should ideally un-hide it
        setPendingDeletions(prev => {
          const newSet = new Set(prev);
          newSet.delete(msgId);
          return newSet;
        });
      }
    }, 5000);
  };

  // Filter messages hidden by user or pending deletion
  const visibleMessages = messages.filter(msg => 
    !msg.deletedFor?.includes(user?.uid || "") && !pendingDeletions.has(msg.id)
  );

  return (
    <div className="flex h-full">
      {/* Topics sidebar for super groups */}
      {isSuperGroup && (
        <TopicsSidebar
          chatId={chat.id}
          activeTopicId={activeTopic?.id ?? null}
          onSelectTopic={(topic) => setActiveTopic(topic)}
        />
      )}

      {/* Main chat column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Clickable chat header */}
        <button
          onClick={handleHeaderClick}
          className="flex items-center gap-3 border-b border-green-100 bg-white px-5 py-3 shrink-0 text-left w-full hover:bg-green-50/50 transition-colors cursor-pointer shadow-sm"
        >
          <Avatar src={headerAvatar} name={headerName} size={10} />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-gray-800 truncate">
              {headerName}
            </h2>
            <p className="text-[11px] text-gray-500">{headerSubtext}</p>
          </div>
          {isSuperGroup && activeTopic && (
            <div className="rounded-lg bg-green-100 border border-green-200 px-3 py-1">
              <span className="text-xs font-medium text-green-700">
                # {activeTopic.name}
              </span>
            </div>
          )}
          <svg
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${showPanel ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/50">
          {isSuperGroup && !activeTopic ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm text-gray-500">Select a topic to view messages</p>
            </div>
          ) : isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-200 border-t-green-500" />
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 border border-green-200">
                <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                {isSuperGroup ? `No messages in #${activeTopic?.name}. Start the conversation!` : "No messages yet. Say hello! 👋"}
              </p>
            </div>
          ) : (
            visibleMessages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                chat={chat}
                isGroup={isGroup} 
                onReply={() => { setReplyingTo(msg); setEditingMessage(null); }}
                onForward={() => setForwardingMessage(msg)}
                onEdit={() => { setEditingMessage(msg); setReplyingTo(null); }}
                onDelete={() => setMessageToDelete(msg)}
              />
            ))
          )}

          {/* Typing Indicator */}
          {chat.typing && Object.entries(chat.typing).some(([uid, timestamp]) => {
            if (!user || uid === user.uid || !timestamp) return false;
            const ms = timestamp.seconds ? timestamp.seconds * 1000 : Date.now();
            return Date.now() - ms < 3000;
          }) && (
            <div className="flex items-center gap-2 text-gray-400 text-xs px-2 py-1 animate-pulse">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              Someone is typing...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {(!isSuperGroup || activeTopic) && (
          <MessageInput 
            chatId={chat.id} 
            topicId={topicId ?? undefined} 
            replyTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
          />
        )}
      </div>

      {/* ── Right panel ── */}
      {showPanel?.type === "user" && (
        <UserProfilePanel
          uid={showPanel.uid}
          onClose={() => setShowPanel(null)}
        />
      )}
      {showPanel?.type === "group" && (
        <GroupInfoPanel
          chat={chat}
          onClose={() => setShowPanel(null)}
          onMemberClick={(uid) =>
            setShowPanel({ type: "user", uid })
          }
        />
      )}

      {/* Forward Modal */}
      {forwardingMessage && (
        <ForwardModal 
          onClose={() => setForwardingMessage(null)}
          onForward={handleForward}
        />
      )}

      {/* Delete Message Modal */}
      {messageToDelete && (
        <DeleteMessageModal
          message={messageToDelete}
          otherUserName={headerName}
          isGroup={isGroup}
          onConfirm={handleDeleteMessageConfirm}
          onCancel={() => setMessageToDelete(null)}
        />
      )}
    </div>
  );
}
