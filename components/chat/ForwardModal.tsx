"use client";

import { useState } from "react";
import { useChats } from "@/hooks/useChats";
import { useAuth } from "@/hooks/useAuth";
import { useProfileById } from "@/hooks/useProfileById";
import { useTopics } from "@/hooks/useTopics";
import { Avatar } from "@/components/Avatar";
import type { Chat } from "@/types";

interface Props {
  onClose: () => void;
  onForward: (chatId: string, topicId?: string) => void;
}

// A small component to render a chat item in the list
function ForwardChatItem({ chat, onSelect }: { chat: Chat; onSelect: () => void }) {
  const { user } = useAuth();
  const isGroup = chat.type === "group";
  
  const otherUid = !isGroup
    ? chat.participants.find((uid) => uid !== user?.uid) ?? ""
    : "";
  const { data: otherProfile } = useProfileById(otherUid || undefined);

  let displayName: string;
  let avatarUrl: string | undefined;

  if (isGroup) {
    displayName = chat.name ?? "Group";
    avatarUrl = chat.groupAvatarUrl;
  } else {
    const fallback = chat.participantInfo[otherUid];
    displayName = otherProfile?.displayName ?? fallback?.displayName ?? "Unknown";
    avatarUrl = otherProfile?.avatarUrl ?? fallback?.avatarUrl;
  }

  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/5 transition-colors text-left"
    >
      <Avatar src={avatarUrl} name={displayName} size={10} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-white">{displayName}</p>
        <p className="truncate text-xs text-gray-500">
          {isGroup ? `${chat.participants.length} members` : "Direct Message"}
        </p>
      </div>
    </button>
  );
}

export function ForwardModal({ onClose, onForward }: Props) {
  const { data: chats = [] } = useChats();
  const [search, setSearch] = useState("");
  const [selectedSuperGroup, setSelectedSuperGroup] = useState<Chat | null>(null);

  // If a supergroup is selected, fetch its topics
  const { data: topics = [] } = useTopics(selectedSuperGroup?.id ?? null);

  // To make search work properly here, we need to resolve names for all chats.
  // For a simple forward modal, we can just render the chats.
  // Let's implement a rudimentary filter for group names.
  const displayChats = chats.filter((chat) => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (chat.type === "group" && chat.name?.toLowerCase().includes(q)) return true;
    // For DMs, it's harder because names are in participantInfo or profiles.
    // We'll rely on participantInfo for simple filtering.
    if (chat.type === "dm") {
      const pInfo = Object.values(chat.participantInfo);
      return pInfo.some((p) => p.displayName.toLowerCase().includes(q));
    }
    return false;
  });

  const handleSelectChat = (chat: Chat) => {
    if (chat.isSuperGroup) {
      setSelectedSuperGroup(chat);
    } else {
      onForward(chat.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#0b0f1a] border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">
        {selectedSuperGroup ? (
          <>
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <button
                onClick={() => setSelectedSuperGroup(null)}
                className="p-1 -ml-1 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h2 className="text-lg font-bold text-white truncate">Select Topic</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {topics.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">No topics found.</p>
              ) : (
                topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => onForward(selectedSuperGroup.id, topic.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 font-medium">
                      #
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">{topic.name}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-white/5">
              <h2 className="text-lg font-bold text-white mb-4">Forward to...</h2>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {displayChats.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">No chats found.</p>
              ) : (
                displayChats.map((chat) => (
                  <ForwardChatItem
                    key={chat.id}
                    chat={chat}
                    onSelect={() => handleSelectChat(chat)}
                  />
                ))
              )}
            </div>
          </>
        )}
        
        <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
