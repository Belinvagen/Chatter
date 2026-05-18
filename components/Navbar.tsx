"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Avatar } from "@/components/Avatar";

export function Navbar() {
  const { user, loading } = useAuth();
  const { data: profile } = useUserProfile();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-green-200/80 bg-white/85 backdrop-blur-xl shadow-sm shadow-green-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative h-9 w-9 overflow-hidden rounded-xl shadow-md shadow-green-200 transition-transform group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="Chatter Logo"
              fill
              sizes="36px"
              className="object-cover"
            />
          </div>
          <span className="text-lg font-bold text-green-700 tracking-tight">
            Chatter
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-green-100" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 -ml-2 transition-colors hover:bg-green-50"
              >
                <Avatar
                  src={profile?.avatarUrl}
                  name={profile?.displayName ?? user.displayName}
                  size={8}
                />
                <span className="hidden text-sm text-green-800 font-medium sm:block max-w-[140px] truncate">
                  {profile?.displayName ?? user.displayName ?? user.email}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-xl border border-green-200 px-3 py-1.5 text-sm text-green-700 transition-colors hover:border-red-300 hover:text-red-500 hover:bg-red-50 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-green-200 transition-all hover:shadow-green-300 hover:brightness-105"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
