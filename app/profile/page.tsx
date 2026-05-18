"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { updateUserProfile, uploadAvatar, isUsernameTaken } from "@/lib/users";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setUsername(profile.username ?? "");
      setStatus(profile.status ?? "");
      setAvatarPreview(profile.avatarUrl);
    }
  }, [profile]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      toast.error("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      toast.error("Username can only contain letters, numbers, and underscores.");
      return;
    }

    setSaving(true);
    try {
      // Check username uniqueness if it changed
      if (cleanUsername !== profile?.username) {
        const taken = await isUsernameTaken(cleanUsername);
        if (taken) {
          toast.error("Username is already taken.");
          setSaving(false);
          return;
        }
      }

      let avatarUrl: string | undefined;

      // Upload new avatar if selected
      if (avatarFile) {
        avatarUrl = await uploadAvatar(user.uid, avatarFile);
      }

      await updateUserProfile(user.uid, {
        displayName,
        username: cleanUsername,
        status,
        ...(avatarUrl && { avatarUrl }),
      });

      // Invalidate the cached profile so the UI refreshes
      await queryClient.invalidateQueries({ queryKey: ["userProfile", user.uid] });
      toast.success("Profile updated!");
      setAvatarFile(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-500" />
          <p className="text-sm text-gray-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-8">
      {/* Background glow */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-indigo-500/10 blur-[120px]" />

      <div className="glass w-full max-w-lg rounded-2xl p-8 animate-fade-in-up">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
          <p className="mt-1 text-sm text-gray-400">
            Customize how others see you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-24 w-24 rounded-full overflow-hidden cursor-pointer"
            >
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-bold text-white">
                  {displayName?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
                  />
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
            <p className="text-xs text-gray-500">
              Click to upload · Max 5 MB
            </p>
          </div>

          {/* Display name */}
          <div>
            <label
              htmlFor="displayName"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
            />
          </div>

          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">@</span>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="johndoe"
                maxLength={30}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
              />
            </div>
            <p className="mt-1 text-xs text-gray-600">Others can find you by this username</p>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              Status
            </label>
            <input
              id="status"
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={100}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
            />
            <p className="mt-1 text-right text-xs text-gray-600">
              {status.length}/100
            </p>
          </div>

          {/* Email (read-only) */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user.email ?? ""}
              disabled
              className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
