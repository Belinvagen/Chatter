"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useProfileById } from "@/hooks/useProfileById";
import { useChats } from "@/hooks/useChats";
import { useContacts } from "@/hooks/useContacts";
import {
  updateGroupInfo,
  updateGroupAvatar,
  updateGroupPermissions,
  addGroupMembers,
} from "@/lib/groups";
import { getUserProfile, searchUsersByUsername } from "@/lib/users";
import { Avatar } from "@/components/Avatar";
import type { Chat, ParticipantInfo, UserProfile } from "@/types";
import toast from "react-hot-toast";

interface Props {
  chat: Chat;
  onClose: () => void;
  onMemberClick: (uid: string) => void;
}

/** A single member row that fetches the live profile */
function MemberRow({
  uid,
  isAdmin,
  onClick,
}: {
  uid: string;
  isAdmin: boolean;
  onClick: () => void;
}) {
  const { data: profile } = useProfileById(uid);
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.03] transition-all cursor-pointer"
    >
      <Avatar
        src={profile?.avatarUrl}
        name={profile?.displayName}
        size={8}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white truncate">
          {profile?.displayName ?? "Loading…"}
        </p>
        <p className="text-xs text-gray-500 truncate">
          @{profile?.username ?? "…"}
        </p>
      </div>
      {isAdmin && (
        <span className="shrink-0 rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
          Admin
        </span>
      )}
    </button>
  );
}

export function GroupInfoPanel({ chat, onClose, onMemberClick }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.uid === chat.adminUid;
  const perms = chat.permissions ?? {
    canEditInfo: "admin",
    canAddMembers: "everyone",
  };
  const canEdit =
    perms.canEditInfo === "everyone" || isAdmin;
  const canAdd =
    perms.canAddMembers === "everyone" || isAdmin;

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(chat.name ?? "");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync editName when live chat data updates
  useEffect(() => {
    if (!editing) setEditName(chat.name ?? "");
  }, [chat.name, editing]);

  // Add members state
  const [showAddMembers, setShowAddMembers] = useState(false);
  const { data: allChats = [] } = useChats();
  const { data: contacts = [] } = useContacts();
  const [adding, setAdding] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addGlobalResults, setAddGlobalResults] = useState<UserProfile[]>([]);

  // Debounced search for adding members
  useEffect(() => {
    const trimmed = addSearch.trim().toLowerCase().replace(/^@/, "");
    if (!trimmed) { setAddGlobalResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const found = await searchUsersByUsername(trimmed);
        setAddGlobalResults(found.filter((p) => p.uid !== user?.uid));
      } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [addSearch, user]);

  // Contacts not already in group
  const addableContacts = contacts
    .filter((c) => !chat.participants.includes(c.uid))
    .filter((c) => !addSearch.trim() ||
      c.username.includes(addSearch.toLowerCase().replace(/^@/, "")) ||
      c.displayName.toLowerCase().includes(addSearch.toLowerCase())
    );
  const contactUids = new Set(contacts.map((c) => c.uid));
  const addableGlobal = addGlobalResults.filter(
    (r) => !contactUids.has(r.uid) && !chat.participants.includes(r.uid)
  );

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updateGroupInfo(chat.id, { name: editName.trim() });
      setEditing(false);
      toast.success("Group name updated");
    } catch {
      toast.error("Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    setSaving(true);
    try {
      await updateGroupAvatar(chat.id, file);
      toast.success("Group avatar updated");
    } catch {
      toast.error("Failed to update avatar");
    } finally {
      setSaving(false);
    }
  };

  const handlePermChange = async (
    key: "canEditInfo" | "canAddMembers",
    value: "admin" | "everyone"
  ) => {
    try {
      await updateGroupPermissions(chat.id, { [key]: value });
      toast.success("Permissions updated");
    } catch {
      toast.error("Failed to update permissions");
    }
  };

  const handleAddMember = async (uid: string) => {
    setAdding(true);
    try {
      const profile = await getUserProfile(uid);
      if (!profile) throw new Error("User not found");

      const info: ParticipantInfo = {
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      };
      await addGroupMembers(chat.id, [{ uid, info }]);
      toast.success(`${profile.displayName} added to group`);
    } catch {
      toast.error("Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex h-full w-80 flex-col border-l border-white/5 bg-[#080c16]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 shrink-0">
        <h3 className="text-sm font-semibold text-white">Group Info</h3>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Group avatar + name */}
        <div className="flex flex-col items-center px-6 py-6">
          <div className="relative group">
            <Avatar
              src={chat.groupAvatarUrl}
              name={chat.name}
              size={24}
            />
            {canEdit && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* Editable name */}
          {editing ? (
            <div className="mt-4 flex items-center gap-2 w-full">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              />
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="rounded-lg bg-indigo-500/20 px-3 py-2 text-xs text-indigo-400 hover:bg-indigo-500/30 cursor-pointer"
              >
                {saving ? "…" : "Save"}
              </button>
              <button
                onClick={() => { setEditing(false); setEditName(chat.name ?? ""); }}
                className="rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400 hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">{chat.name}</h2>
              {canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:text-indigo-400 hover:bg-white/5 cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                </button>
              )}
            </div>
          )}

          <p className="mt-1 text-xs text-gray-500">
            {chat.participants.length} members{chat.isSuperGroup ? " · Super Group" : ""}
          </p>
        </div>

        {/* ── Admin: Permissions ── */}
        {isAdmin && (
          <div className="border-t border-white/5 px-5 py-4">
            <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
              Permissions
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Edit group info</span>
                <select
                  value={perms.canEditInfo}
                  onChange={(e) =>
                    handlePermChange(
                      "canEditInfo",
                      e.target.value as "admin" | "everyone"
                    )
                  }
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="admin">Admin only</option>
                  <option value="everyone">Everyone</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Add members</span>
                <select
                  value={perms.canAddMembers}
                  onChange={(e) =>
                    handlePermChange(
                      "canAddMembers",
                      e.target.value as "admin" | "everyone"
                    )
                  }
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="admin">Admin only</option>
                  <option value="everyone">Everyone</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Members ── */}
        <div className="border-t border-white/5 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Members ({chat.participants.length})
            </h4>
            {canAdd && (
              <button
                onClick={() => setShowAddMembers(!showAddMembers)}
                className="rounded-md bg-indigo-500/10 px-2 py-1 text-[10px] font-medium text-indigo-400 hover:bg-indigo-500/20 cursor-pointer"
              >
                {showAddMembers ? "Done" : "+ Add"}
              </button>
            )}
          </div>

          {/* Add members — smart search */}
          {showAddMembers && (
            <div className="mb-3 rounded-xl border border-white/5 bg-white/[0.02] p-2 space-y-2">
              <input
                type="text"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Search @username…"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500/50"
                autoFocus
              />
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {addableContacts.length > 0 && (
                  <>
                    <p className="px-2 py-1 text-[9px] font-medium text-gray-600 uppercase">Contacts</p>
                    {addableContacts.map((profile) => (
                      <ContactProfileRow
                        key={profile.uid}
                        profile={profile}
                        adding={adding}
                        onAdd={() => handleAddMember(profile.uid)}
                      />
                    ))}
                  </>
                )}
                {addableGlobal.length > 0 && (
                  <>
                    <p className="px-2 py-1 text-[9px] font-medium text-gray-600 uppercase mt-1">Other Users</p>
                    {addableGlobal.map((profile) => (
                      <ContactProfileRow
                        key={profile.uid}
                        profile={profile}
                        adding={adding}
                        onAdd={() => handleAddMember(profile.uid)}
                      />
                    ))}
                  </>
                )}
                {addableContacts.length === 0 && addableGlobal.length === 0 && !addSearch.trim() && (
                  <p className="py-3 text-center text-xs text-gray-600">No contacts to add</p>
                )}
                {addableContacts.length === 0 && addableGlobal.length === 0 && addSearch.trim() && (
                  <p className="py-3 text-center text-xs text-gray-600">No users found</p>
                )}
              </div>
            </div>
          )}

          {/* Member list */}
          <div className="space-y-0.5">
            {chat.participants.map((uid) => (
              <MemberRow
                key={uid}
                uid={uid}
                isAdmin={uid === chat.adminUid}
                onClick={() => onMemberClick(uid)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Row for adding a user to the group (receives full profile) */
function ContactProfileRow({
  profile,
  adding,
  onAdd,
}: {
  profile: UserProfile;
  adding: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
      <Avatar src={profile.avatarUrl} name={profile.displayName} size={8} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white truncate">{profile.displayName}</p>
        <p className="text-[10px] text-gray-500 truncate">@{profile.username}</p>
      </div>
      <button
        onClick={onAdd}
        disabled={adding}
        className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 cursor-pointer"
      >
        Add
      </button>
    </div>
  );
}
