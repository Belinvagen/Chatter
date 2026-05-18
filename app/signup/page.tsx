"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, isUsernameTaken } from "@/lib/users";
import toast from "react-hot-toast";

const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-green-400 focus:ring-1 focus:ring-green-400/25";
const labelCls = "mb-1.5 block text-sm font-medium text-gray-700";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    if (!cleanUsername || cleanUsername.length < 3) {
      toast.error("Username must be at least 3 characters."); return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      toast.error("Username can only contain letters, numbers, and underscores."); return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match."); return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters."); return;
    }
    setLoading(true);
    try {
      const taken = await isUsernameTaken(cleanUsername);
      if (taken) { toast.error("Username is already taken."); setLoading(false); return; }
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName });
      await createUserProfile(user.uid, email, displayName, cleanUsername);
      toast.success("Account created! Welcome to Chatter 🎉");
      router.push("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      const emailPrefix = (user.email ?? "user").split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase();
      const autoUsername = emailPrefix || `user_${Date.now()}`;
      await createUserProfile(user.uid, user.email ?? "", user.displayName ?? "User", autoUsername, user.photoURL);
      toast.success("Welcome!");
      router.push("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-8">
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-emerald-300/25 blur-[100px]" />

      <div className="relative w-full max-w-md rounded-2xl border border-green-100 bg-white p-8 shadow-xl shadow-green-100/50 animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-200">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Join Chatter and start connecting</p>
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign up with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="displayName" className={labelCls}>Display name</label>
            <input id="displayName" type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="John Doe" className={inputCls} />
          </div>
          <div>
            <label htmlFor="username" className={labelCls}>Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
              <input id="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="johndoe" maxLength={30} className={`${inputCls} pl-8`} />
            </div>
            <p className="mt-1 text-xs text-gray-400">Letters, numbers, underscores only</p>
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
          </div>
          <div>
            <label htmlFor="password" className={labelCls}>Password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelCls}>Confirm password</label>
            <input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-green-200 transition-all hover:shadow-green-300 hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-green-600 transition-colors hover:text-green-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
