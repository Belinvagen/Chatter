"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChats } from "@/hooks/useChats";
import { useFolders } from "@/hooks/useFolders";
import { useContacts } from "@/hooks/useContacts";
import { ChatListItem } from "@/components/chat/ChatListItem";
import { FolderManager } from "@/components/chat/FolderManager";
import type { Chat } from "@/types";

interface Props {
  activeChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
}

type Tab = "all" | "archive" | string;

export function ChatSidebar({ activeChatId, onSelectChat, onNewChat, onNewGroup }: Props) {
  const { user } = useAuth();
  const { data: chats = [], isLoading } = useChats();
  const { data: folders = [] } = useFolders();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [showFolderManager, setShowFolderManager] = useState(false);
  const { data: contacts = [] } = useContacts();

  const contactMap = new Map(contacts.map((c) => [c.uid, c]));
  const uid = user?.uid ?? "";
  let filtered = chats;

  if (activeTab === "archive") {
    filtered = filtered.filter((c) => c.archived?.[uid]);
  } else if (activeTab === "all") {
    filtered = filtered.filter((c) => !c.archived?.[uid]);
  } else {
    filtered = filtered.filter((c) => c.folder?.[uid]?.includes(activeTab));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((c) => {
      if (c.type === "group") return c.name?.toLowerCase().includes(q);
      const otherUid = c.participants.find((p) => p !== uid);
      if (!otherUid) return false;
      const contact = contactMap.get(otherUid);
      const fallback = c.participantInfo[otherUid];
      const name = contact?.displayName ?? fallback?.displayName ?? "";
      const username = contact?.username ?? "";
      return name.toLowerCase().includes(q) || username.toLowerCase().includes(q);
    });
  }

  filtered = [...filtered].sort((a, b) => {
    const aPinned = a.pinned?.[uid] ? 1 : 0;
    const bPinned = b.pinned?.[uid] ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return 0;
  });

  const archivedCount = chats.filter((c) => c.archived?.[uid]).length;

  return (
    <aside className="flex h-full w-full flex-col border-r border-green-100 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-green-100 px-4 py-3 shrink-0">
        <h2 className="text-lg font-bold text-gray-800">Messages</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFolderManager(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-100 text-green-600 transition-all hover:border-green-300 hover:bg-green-50 cursor-pointer"
            title="Manage folders"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
          </button>
          <button
            onClick={onNewGroup}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-100 text-green-600 transition-all hover:border-green-300 hover:bg-green-50 cursor-pointer"
            title="New group"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </button>
          <button
            onClick={onNewChat}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm shadow-green-200 transition-all hover:shadow-md hover:brightness-105 cursor-pointer"
            title="New conversation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages…"
            className="w-full rounded-lg border border-green-100 bg-green-50/60 pl-9 pr-3 py-2 text-xs text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-green-400 focus:ring-1 focus:ring-green-400/20"
          />
        </div>
      </div>

      {/* Folder tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>
          All
        </TabButton>
        {folders.map((f) => (
          <TabButton
            key={f.id}
            active={activeTab === f.id}
            onClick={() => setActiveTab(f.id)}
            color={f.color}
          >
            {f.name}
          </TabButton>
        ))}
        {archivedCount > 0 && (
          <TabButton active={activeTab === "archive"} onClick={() => setActiveTab("archive")}>
            Archive
            <span className="ml-1 text-[9px] text-gray-400">{archivedCount}</span>
          </TabButton>
        )}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3 animate-shimmer">
                <div className="h-10 w-10 shrink-0 rounded-full bg-green-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-green-100" />
                  <div className="h-2.5 w-36 rounded bg-green-50" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border border-green-200">
              <svg className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              {searchQuery ? "No chats match your search" : activeTab === "archive" ? "No archived chats" : "No conversations yet"}
            </p>
            {!searchQuery && activeTab === "all" && (
              <button
                onClick={onNewChat}
                className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 cursor-pointer"
              >
                Start a chat
              </button>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {filtered.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isActive={activeChatId === chat.id}
                onSelect={onSelectChat}
              />
            ))}
          </div>
        )}
      </div>

      <FolderManager
        isOpen={showFolderManager}
        onClose={() => setShowFolderManager(false)}
      />
    </aside>
  );
}

function TabButton({
  children,
  active,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
        active
          ? "bg-green-100 text-green-700 border border-green-200"
          : "text-gray-500 hover:bg-green-50 hover:text-green-600"
      }`}
    >
      {color && <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
      {children}
    </button>
  );
}
