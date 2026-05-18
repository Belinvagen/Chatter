"use client";

import { useState, useRef, type FormEvent } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { searchUsersByUsername } from "@/lib/users";
import { getUserProfile } from "@/lib/users";
import { createGroup } from "@/lib/groups";
import { Avatar } from "@/components/Avatar";
import type { Chat, UserProfile, ParticipantInfo } from "@/types";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (chat: Chat) => void;
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<"info" | "members">("info");
  const [name, setName] = useState("");
  const [isSuperGroup, setIsSuperGroup] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Member search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSearch = async () => {
    const trimmed = searchQuery.trim().replace(/^@/, "");
    if (!trimmed || !user) return;

    setSearching(true);
    try {
      const results = await searchUsersByUsername(trimmed);
      // Filter out current user and already-selected members
      const selectedIds = new Set(selectedMembers.map((m) => m.uid));
      setSearchResults(
        results.filter((p) => p.uid !== user.uid && !selectedIds.has(p.uid))
      );
    } catch {
      toast.error("Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const addMember = (profile: UserProfile) => {
    setSelectedMembers((prev) => [...prev, profile]);
    setSearchResults((prev) => prev.filter((p) => p.uid !== profile.uid));
    setSearchQuery("");
  };

  const removeMember = (uid: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.uid !== uid));
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim() || selectedMembers.length === 0) return;

    setCreating(true);
    try {
      const currentProfile = await getUserProfile(user.uid);

      // Build participantInfo map
      const participantInfoMap: Record<string, ParticipantInfo> = {};
      participantInfoMap[user.uid] = {
        displayName: currentProfile?.displayName ?? user.displayName ?? "User",
        avatarUrl: currentProfile?.avatarUrl ?? "",
      };
      for (const member of selectedMembers) {
        participantInfoMap[member.uid] = {
          displayName: member.displayName,
          avatarUrl: member.avatarUrl,
        };
      }

      const memberUids = selectedMembers.map((m) => m.uid);

      const chat = await createGroup(
        name.trim(),
        user.uid,
        memberUids,
        participantInfoMap,
        isSuperGroup,
        avatarFile
      );

      onGroupCreated(chat);
      handleClose();
      toast.success("Group created!");
    } catch {
      toast.error("Failed to create group.");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep("info");
    setName("");
    setIsSuperGroup(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedMembers([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-2xl p-6 mx-4 animate-fade-in-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-3">
            {step === "members" && (
              <button
                onClick={() => setStep("info")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
            <h2 className="text-lg font-semibold text-white">
              {step === "info" ? "New Group" : "Add Members"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === "info" ? (
          /* ── Step 1: Group info ── */
          <div className="space-y-5">
            {/* Group avatar */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative h-20 w-20 rounded-full overflow-hidden cursor-pointer"
              >
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Group avatar" fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-600 text-2xl font-bold text-white">
                    {name?.[0]?.toUpperCase() ?? "G"}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                  </svg>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500">Click to upload group avatar</p>
            </div>

            {/* Group name */}
            <div>
              <label htmlFor="groupName" className="mb-1.5 block text-sm font-medium text-gray-300">
                Group name
              </label>
              <input
                id="groupName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My awesome group"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
              />
            </div>

            {/* Super Group toggle */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">Super Group</p>
                <p className="text-xs text-gray-500">Organize messages with topic channels</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSuperGroup(!isSuperGroup)}
                className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                  isSuperGroup ? "bg-indigo-500" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    isSuperGroup ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            {/* Next button */}
            <button
              onClick={() => name.trim() && setStep("members")}
              disabled={!name.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next — Add Members
            </button>
          </div>
        ) : (
          /* ── Step 2: Add members ── */
          <form onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0">
            {/* Selected members */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                {selectedMembers.map((m) => (
                  <span
                    key={m.uid}
                    className="flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 px-3 py-1.5"
                  >
                    <span className="text-xs text-white">{m.displayName}</span>
                    <button
                      type="button"
                      onClick={() => removeMember(m.uid)}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:text-white cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="flex gap-2 shrink-0">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">@</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.replace(/[^a-zA-Z0-9_@]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                  placeholder="Search by username…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="rounded-xl bg-indigo-500/20 px-4 py-3 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {searching ? "…" : "Search"}
              </button>
            </div>

            {/* Search results */}
            <div className="mt-3 flex-1 overflow-y-auto min-h-0">
              {searchResults.map((profile) => (
                <button
                  type="button"
                  key={profile.uid}
                  onClick={() => addMember(profile)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all hover:bg-white/[0.03] cursor-pointer"
                >
                  <Avatar src={profile.avatarUrl} name={profile.displayName} size={10} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{profile.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
                  </div>
                  <span className="text-xs text-emerald-400">+ Add</span>
                </button>
              ))}
            </div>

            {/* Create button */}
            <button
              type="submit"
              disabled={creating || selectedMembers.length === 0}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {creating ? "Creating…" : `Create Group (${selectedMembers.length + 1} members)`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
