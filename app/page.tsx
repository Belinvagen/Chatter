"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { NewChatModal } from "@/components/chat/NewChatModal";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import type { Chat } from "@/types";

/** Landing page shown to unauthenticated visitors */
function LandingView() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 text-center">
      {/* Soft green glow */}
      <div className="pointer-events-none absolute top-1/3 h-80 w-80 rounded-full bg-green-300/30 blur-[120px]" />

      <div className="relative z-10 animate-fade-in-up">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Now in public beta
        </div>
      </div>

      <h1 className="relative z-10 animate-fade-in-up text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl [animation-delay:50ms]">
        Chat smarter with{" "}
        <span className="gradient-text">Chatter</span>
      </h1>

      <p className="relative z-10 mt-4 max-w-md text-base text-gray-500 animate-fade-in-up [animation-delay:100ms] sm:text-lg">
        Instant, reliable messaging for you and your groups. No noise, just conversation.
      </p>

      <div className="relative z-10 mt-8 flex gap-4 animate-fade-in-up [animation-delay:200ms]">
        <Link
          href="/login"
          className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-200 transition-all hover:shadow-green-300 hover:brightness-105"
        >
          Get started free
        </Link>
        <Link
          href="/signup"
          className="rounded-xl border border-green-200 bg-white px-6 py-3 text-sm font-semibold text-green-700 transition-colors hover:border-green-300 hover:bg-green-50"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}

/** Chat interface shown to authenticated users */
function ChatView() {
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div className="flex h-[calc(100dvh-4rem)]">
      {/* Desktop sidebar */}
      <div className="hidden md:block md:w-80 lg:w-96 shrink-0">
        <ChatSidebar
          activeChatId={activeChat?.id ?? null}
          onSelectChat={(chat) => {
            setActiveChat(chat);
            setShowSidebar(false);
          }}
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowCreateGroup(true)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowSidebar(false)}
          />
          <div className="relative z-10 h-full w-80 animate-fade-in-up">
            <ChatSidebar
              activeChatId={activeChat?.id ?? null}
              onSelectChat={(chat) => {
                setActiveChat(chat);
                setShowSidebar(false);
              }}
              onNewChat={() => setShowNewChat(true)}
              onNewGroup={() => setShowCreateGroup(true)}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {activeChat ? (
          <>
            {/* Mobile header with menu button */}
            <div className="flex items-center gap-2 border-b border-green-100 bg-white px-3 py-2 md:hidden">
              <button
                onClick={() => setShowSidebar(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-green-600 hover:bg-green-50 cursor-pointer"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ChatWindow chat={activeChat} />
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <button
              onClick={() => setShowSidebar(true)}
              className="absolute top-20 left-4 flex h-9 w-9 items-center justify-center rounded-lg border border-green-200 bg-white text-green-600 hover:bg-green-50 md:hidden cursor-pointer"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-green-200/30 blur-[120px]" />
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 border border-green-200 shadow-sm">
              <svg
                className="h-10 w-10 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Your Conversations
            </h2>
            <p className="max-w-xs text-sm text-gray-500 mb-6">
              Pick a conversation from the sidebar or start a fresh one.
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-200 transition-all hover:shadow-green-300 hover:brightness-105 cursor-pointer"
            >
              Start chatting
            </button>
          </div>
        )}
      </div>

      {/* New chat modal */}
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        onChatCreated={(chat) => setActiveChat(chat)}
      />

      {/* Create group modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={(chat) => setActiveChat(chat)}
      />
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-green-200 border-t-green-500" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  return user ? <ChatView /> : <LandingView />;
}
