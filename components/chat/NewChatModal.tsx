"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { getOrCreateDmChat } from "@/lib/chats";
import { getUserProfile, searchUsersByUsername } from "@/lib/users";
import { Avatar } from "@/components/Avatar";
import type { Chat, UserProfile } from "@/types";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chat: Chat) => void;
}

export function NewChatModal({ isOpen, onClose, onChatCreated }: Props) {
  const { user } = useAuth();
  const { data: contacts = [] } = useContacts();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [globalResults, setGlobalResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced live search
  useEffect(() => {
    const trimmed = searchQuery.trim().toLowerCase().replace(/^@/, "");
    if (!trimmed || !user) {
      setGlobalResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchUsersByUsername(trimmed);
        // Filter out current user
        setGlobalResults(found.filter((p) => p.uid !== user.uid));
      } catch {
        // silent fail — contacts still visible
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  // Filter contacts by query
  const filteredContacts = searchQuery.trim()
    ? contacts.filter(
        (c) =>
          c.username.includes(searchQuery.toLowerCase().replace(/^@/, "")) ||
          c.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts;

  // Global results minus contacts (avoid duplicates)
  const contactUids = new Set(contacts.map((c) => c.uid));
  const otherResults = globalResults.filter((r) => !contactUids.has(r.uid));

  const handleStartChat = useCallback(
    async (other: UserProfile) => {
      if (!user) return;

      setLoading(true);
      try {
        const currentProfile = await getUserProfile(user.uid);
        const chat = await getOrCreateDmChat(
          user.uid,
          other.uid,
          {
            displayName:
              currentProfile?.displayName ?? user.displayName ?? "User",
            avatarUrl: currentProfile?.avatarUrl ?? "",
          },
          {
            displayName: other.displayName,
            avatarUrl: other.avatarUrl,
          }
        );

        onChatCreated(chat);
        handleClose();
      } catch {
        toast.error("Failed to create chat.");
      } finally {
        setLoading(false);
      }
    },
    [user, onChatCreated]
  );

  const handleClose = () => {
    onClose();
    setSearchQuery("");
    setGlobalResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-2xl p-6 mx-4 animate-fade-in-up max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-semibold text-white">New Conversation</h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search input — no button, live search */}
        <div className="relative shrink-0">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by @username or name…"
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="mt-3 flex-1 overflow-y-auto min-h-0 space-y-1">
          {/* Contacts section */}
          {filteredContacts.length > 0 && (
            <>
              <p className="px-3 py-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Contacts
              </p>
              {filteredContacts.map((profile) => (
                <UserRow
                  key={profile.uid}
                  profile={profile}
                  loading={loading}
                  onClick={() => handleStartChat(profile)}
                />
              ))}
            </>
          )}

          {/* Global results (non-contacts) */}
          {otherResults.length > 0 && (
            <>
              <p className="px-3 py-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-2">
                Other Users
              </p>
              {otherResults.map((profile) => (
                <UserRow
                  key={profile.uid}
                  profile={profile}
                  loading={loading}
                  onClick={() => handleStartChat(profile)}
                />
              ))}
            </>
          )}

          {/* Loading indicator */}
          {searching && (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-500" />
            </div>
          )}

          {/* Empty state */}
          {!searching &&
            filteredContacts.length === 0 &&
            otherResults.length === 0 &&
            searchQuery.trim() && (
              <p className="py-6 text-center text-sm text-gray-500">
                No users found.
              </p>
            )}

          {/* Initial empty — no contacts */}
          {!searchQuery.trim() && contacts.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500">
              Type a username to find people.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Reusable user row */
function UserRow({
  profile,
  loading,
  onClick,
}: {
  profile: UserProfile;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/[0.03] disabled:opacity-50 cursor-pointer"
    >
      <Avatar src={profile.avatarUrl} name={profile.displayName} size={10} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">
          {profile.displayName}
        </p>
        <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
      </div>
      <span className="text-xs text-indigo-400">Chat →</span>
    </button>
  );
}
