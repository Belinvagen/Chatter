"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileById } from "@/hooks/useProfileById";
import { useFolders } from "@/hooks/useFolders";
import { pinChat, archiveChat, deleteChat, leaveGroup, toggleChatFolder } from "@/lib/chats";
import { Avatar } from "@/components/Avatar";
import { formatDistanceToNow } from "date-fns";
import type { Chat } from "@/types";
import toast from "react-hot-toast";

interface Props {
  chat: Chat;
  isActive: boolean;
  onSelect: (chat: Chat) => void;
}

export function ChatListItem({ chat, isActive, onSelect }: Props) {
  const { user } = useAuth();
  const isGroup = chat.type === "group";

  const otherUid = !isGroup
    ? (chat.participants.find((uid) => uid !== user?.uid) ?? "")
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

  const isPinned = user ? chat.pinned?.[user.uid] : false;
  const unreadCount = user ? chat.unreadCount?.[user.uid] ?? 0 : 0;
  const isOnline = otherProfile?.isOnline;

  const lastMsg = chat.lastMessage;
  const lastTime = lastMsg?.timestamp
    ? new Date(lastMsg.timestamp.seconds * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Context menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowFolderPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handlePin = async () => {
    if (!user) return;
    try {
      await pinChat(chat.id, user.uid, !isPinned);
      toast.success(isPinned ? "Unpinned" : "Pinned");
    } catch { toast.error("Failed"); }
    setMenuOpen(false);
  };

  const handleArchive = async () => {
    if (!user) return;
    try {
      const isArchived = chat.archived?.[user.uid];
      await archiveChat(chat.id, user.uid, !isArchived);
      toast.success(isArchived ? "Unarchived" : "Archived");
    } catch { toast.error("Failed"); }
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      if (isGroup) {
        await leaveGroup(chat.id, user.uid);
        toast.success("Left group");
      } else {
        await deleteChat(chat.id);
        toast.success("Chat deleted");
      }
    } catch { toast.error("Failed"); }
    setMenuOpen(false);
  };

  const handleToggleFolder = async (folderId: string, add: boolean) => {
    if (!user) return;
    try {
      await toggleChatFolder(chat.id, user.uid, folderId, add);
      toast.success(add ? "Added to folder" : "Removed from folder");
    } catch { toast.error("Failed"); }
    // Don't close menu so user can select multiple
  };

  return (
    <div className="relative group/item">
      <button
        onClick={() => onSelect(chat)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all cursor-pointer ${
          isActive
            ? "bg-indigo-500/10 border border-indigo-500/20"
            : "border border-transparent hover:bg-white/[0.03]"
        }`}
      >
        <div className="relative flex-shrink-0">
          <Avatar src={avatarUrl} name={displayName} size={10} />
          {!isGroup && isOnline && (
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0b0f19] bg-green-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {isPinned && (
                <svg className="h-3 w-3 shrink-0 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
              )}
              {isGroup && (
                <svg className="h-3.5 w-3.5 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
              )}
              <p className={`truncate text-sm font-medium ${isActive ? "text-white" : "text-gray-300"}`}>
                {displayName}
              </p>
            </div>
            {lastTime && (
              <span className="shrink-0 text-[10px] text-gray-600 pr-6">{lastTime}</span>
            )}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2 pr-6">
            {lastMsg ? (
              <p className="truncate text-xs text-gray-500">
                {lastMsg.senderId === user?.uid ? "You: " : ""}
                {lastMsg.text}
              </p>
            ) : (
              <p className="text-xs text-transparent select-none">No messages</p>
            )}
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* 3-dot menu trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 opacity-0 group-hover/item:opacity-100 hover:bg-white/5 hover:text-gray-300 transition-all cursor-pointer"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Context menu dropdown */}
      {menuOpen && (
        <ContextMenu
          ref={menuRef}
          chat={chat}
          isPinned={!!isPinned}
          isGroup={isGroup}
          showFolderPicker={showFolderPicker}
          onToggleFolderPicker={() => setShowFolderPicker(!showFolderPicker)}
          onPin={handlePin}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onToggleFolder={handleToggleFolder}
        />
      )}
    </div>
  );
}

/** Dropdown context menu */
import { forwardRef } from "react";

interface MenuProps {
  chat: Chat;
  isPinned: boolean;
  isGroup: boolean;
  showFolderPicker: boolean;
  onToggleFolderPicker: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleFolder: (folderId: string, add: boolean) => void;
}

const ContextMenu = forwardRef<HTMLDivElement, MenuProps>(
  function ContextMenu(
    { chat, isPinned, isGroup, showFolderPicker, onToggleFolderPicker, onPin, onArchive, onDelete, onToggleFolder },
    ref
  ) {
    const { user } = useAuth();
    const { data: folders = [] } = useFolders();
    const isArchived = user ? chat.archived?.[user.uid] : false;
    const currentFolders = user ? chat.folder?.[user.uid] ?? [] : [];

    return (
      <div
        ref={ref}
        className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-white/10 bg-[#0e1325] py-1 shadow-xl shadow-black/30 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pin */}
        <MenuButton onClick={onPin}>
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
          {isPinned ? "Unpin" : "Pin"}
        </MenuButton>

        {/* Archive */}
        <MenuButton onClick={onArchive}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
          {isArchived ? "Unarchive" : "Archive"}
        </MenuButton>

        {/* Add to folder */}
        <MenuButton onClick={onToggleFolderPicker}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
          Add to folders
          <svg className={`h-3 w-3 ml-auto transition-transform ${showFolderPicker ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </MenuButton>

        {/* Folder picker sub-menu */}
        {showFolderPicker && (
          <div className="border-t border-white/5 py-1 px-1">
            {folders.map((f) => {
              const inFolder = currentFolders.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => onToggleFolder(f.id, !inFolder)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/[0.03] transition-colors cursor-pointer ${
                    inFolder ? "text-white bg-white/5" : "text-gray-400"
                  }`}
                >
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: f.color }} />
                  <span className="flex-1 truncate">{f.name}</span>
                  {inFolder && (
                    <svg className="h-4 w-4 shrink-0 text-indigo-400 ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              );
            })}
            {folders.length === 0 && (
              <p className="px-3 py-2 text-[10px] text-gray-600">No folders yet</p>
            )}
          </div>
        )}

        <div className="border-t border-white/5 my-1" />

        {/* Delete / Leave */}
        <MenuButton onClick={onDelete} danger>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
          {isGroup ? "Leave group" : "Delete chat"}
        </MenuButton>
      </div>
    );
  }
);

function MenuButton({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
        danger
          ? "text-rose-400 hover:bg-rose-500/10"
          : "text-gray-300 hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}
