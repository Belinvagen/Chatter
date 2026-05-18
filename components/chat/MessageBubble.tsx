"use client";

import Image from "next/image";
import type { Chat, Message } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useProfileById } from "@/hooks/useProfileById";
import { Avatar } from "@/components/Avatar";
import { AudioPlayer } from "@/components/chat/AudioPlayer";

interface Props {
  message: Message;
  chat: Chat;
  /** When true, show sender avatar next to non-own messages */
  isGroup?: boolean;
  /** Callback when user clicks Reply on this message */
  onReply?: () => void;
  /** Callback when user clicks Forward on this message */
  onForward?: () => void;
  /** Callback when user clicks Edit on this message */
  onEdit?: () => void;
  /** Callback when user clicks Delete on this message */
  onDelete?: () => void;
}

export function MessageBubble({ message, chat, isGroup, onReply, onForward, onEdit, onDelete }: Props) {
  const { user } = useAuth();
  const isOwn = user?.uid === message.senderId;
  const isAdmin = user?.uid === chat.adminUid;
  const canDelete = isOwn || isAdmin;

  // Fetch sender profile for group chats (avatar + live name)
  const { data: senderProfile } = useProfileById(
    isGroup && !isOwn ? message.senderId : undefined
  );

  const time = message.timestamp
    ? new Date(message.timestamp.seconds * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Compute read status
  let isRead = false;
  if (isOwn && message.timestamp) {
    // Check if any other participant has a lastRead timestamp >= this message's timestamp
    const otherParticipants = chat.participants.filter(uid => uid !== user.uid);
    isRead = otherParticipants.some(uid => {
      const userLastRead = chat.lastRead?.[uid];
      return userLastRead && userLastRead.seconds >= message.timestamp!.seconds;
    });
  }

  const renderAttachment = () => {
    if (!message.fileUrl) return null;

    switch (message.type) {
      case "image":
        return (
          <div className="relative mb-2 w-full overflow-hidden rounded-xl" style={{ maxHeight: "350px", maxWidth: "350px" }}>
            <Image
              src={message.fileUrl}
              alt="Attached image"
              width={400}
              height={400}
              className="h-auto max-h-[350px] w-auto max-w-full object-contain rounded-xl"
              unoptimized
            />
          </div>
        );
      case "video":
        return (
          <div className="relative mb-2 w-full overflow-hidden rounded-xl bg-black/5">
            <video
              src={message.fileUrl}
              controls
              className="h-auto w-full max-h-[400px]"
            />
          </div>
        );
      case "audio":
        return <AudioPlayer src={message.fileUrl} />;
      case "file":
      default:
        return (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 mb-2 rounded-xl p-3 transition-colors ${
              isOwn ? "bg-white/20 hover:bg-white/30" : "bg-green-50 border border-green-100 hover:bg-green-100"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${isOwn ? "text-white" : "text-gray-800"}`}>{message.fileName}</p>
              {message.fileSize && (
                <p className={`text-xs ${isOwn ? "text-white/70" : "text-gray-500"}`}>
                  {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </a>
        );
    }
  };

  return (
    <div
      className={`flex w-full items-center ${isOwn ? "flex-row-reverse justify-start" : "flex-row justify-start"} group gap-2`}
    >
      {/* Sender avatar for group messages */}
      {isGroup && !isOwn && (
        <div className="mt-auto shrink-0 self-end">
          <Avatar
            src={senderProfile?.avatarUrl}
            name={senderProfile?.displayName ?? message.senderName}
            size={8}
          />
        </div>
      )}

      <div
        className={`relative max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
          isOwn
            ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-br-sm"
            : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
        } ${message.pending ? "opacity-60" : ""}`}
      >
        {/* Forwarded Header */}
        {message.forwardedFrom && (
          <p className={`mb-1 text-[11px] italic ${isOwn ? "text-white/80" : "text-gray-400"}`}>
            Forwarded from {message.forwardedFrom.senderName}
          </p>
        )}

        {/* Sender name (only in received messages) */}
        {!isOwn && (
          <p className="mb-1 text-[11px] font-semibold text-green-600">
            {senderProfile?.displayName ?? message.senderName}
          </p>
        )}

        {/* Replied Message Block */}
        {message.replyTo && (
          <div className={`mb-2 flex flex-col border-l-2 px-2 py-1 rounded-r-md ${
            isOwn ? "border-white/50 bg-white/10" : "border-green-400 bg-green-50"
          }`}>
            <span className={`text-[11px] font-semibold ${isOwn ? "text-white/80" : "text-green-600"}`}>{message.replyTo.senderName}</span>
            <span className={`text-xs truncate ${isOwn ? "text-white/70" : "text-gray-500"}`}>
              {message.replyTo.text || (message.replyTo.type === "image" ? "📷 Photo" : message.replyTo.type === "video" ? "🎥 Video" : message.replyTo.type === "audio" ? "🎤 Voice message" : "📎 File")}
            </span>
          </div>
        )}

        {/* Attachment */}
        {renderAttachment()}

        {/* Text content */}
        {message.text && (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {message.text}
          </p>
        )}

        {/* Time and pending indicator */}
        <div
          className={`mt-1 flex items-center gap-1.5 ${
            isOwn ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-[10px] ${
              isOwn ? "text-white/70" : "text-gray-400"
            }`}
          >
            {message.isEdited && <span className="mr-1 italic text-[9px]">(edited)</span>}
            {time}
          </span>
          {message.pending ? (
            <svg
              className="h-3 w-3 animate-spin text-white/50"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : isOwn ? (
            <div className={`flex text-[10px] ${isRead ? "text-white" : "text-white/60"}`}>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={isRead ? 3 : 2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                {isRead && <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 12.75 6 6 9-13.5" className="opacity-50" style={{ transform: "translateX(-6px)" }} />}
              </svg>
            </div>
          ) : null}
        </div>
      </div>

      {/* Hover Action Buttons */}
      <div
        className={`flex items-center gap-1 opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0`}
      >
        {onReply && (
          <button
            onClick={onReply}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300 hover:bg-green-50 transition-colors shadow-sm cursor-pointer"
            title="Reply"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
          </button>
        )}
        {onForward && (
          <button
            onClick={onForward}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300 hover:bg-green-50 transition-colors shadow-sm cursor-pointer"
            title="Forward"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
            </svg>
          </button>
        )}
        {isOwn && onEdit && message.type === "text" && (
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300 hover:bg-green-50 transition-colors shadow-sm cursor-pointer"
            title="Edit"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
            </svg>
          </button>
        )}
        {canDelete && onDelete && (
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 text-rose-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-colors shadow-sm cursor-pointer"
            title="Delete"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
