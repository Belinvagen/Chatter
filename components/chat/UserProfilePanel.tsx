"use client";

import { useProfileById } from "@/hooks/useProfileById";
import { Avatar } from "@/components/Avatar";
import { formatDistanceToNow } from "date-fns";

interface Props {
  uid: string;
  onClose: () => void;
}

/**
 * Slide-in panel showing a user's profile (like Telegram's user info panel).
 */
export function UserProfilePanel({ uid, onClose }: Props) {
  const { data: profile, isLoading } = useProfileById(uid);

  return (
    <div className="flex h-full w-80 flex-col border-l border-white/5 bg-[#080c16]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 shrink-0">
        <h3 className="text-sm font-semibold text-white">User Info</h3>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isLoading || !profile ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-500" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Avatar + name */}
          <div className="flex flex-col items-center px-6 py-8">
            <Avatar src={profile.avatarUrl} name={profile.displayName} size={24} />
            <h2 className="mt-4 text-lg font-semibold text-white text-center">
              {profile.displayName}
            </h2>
            <p className="mt-0.5 text-sm text-indigo-400">@{profile.username}</p>
            {profile.isOnline ? (
              <p className="mt-2 text-sm text-green-500 text-center">Online</p>
            ) : profile.lastSeen ? (
              <p className="mt-2 text-sm text-gray-400 text-center">
                last seen {formatDistanceToNow(profile.lastSeen.toDate(), { addSuffix: true })}
              </p>
            ) : null}
          </div>

          {/* Info rows */}
          <div className="border-t border-white/5 px-5 py-4 space-y-4">
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Email</p>
              <p className="mt-0.5 text-sm text-gray-300">{profile.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Username</p>
              <p className="mt-0.5 text-sm text-gray-300">@{profile.username}</p>
            </div>
            {profile.status && (
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Status</p>
                <p className="mt-0.5 text-sm text-gray-300">{profile.status}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
