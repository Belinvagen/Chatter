"use client";

import { useState } from "react";
import type { Message } from "@/types";

interface Props {
  message: Message;
  otherUserName?: string;
  isGroup: boolean;
  onConfirm: (forEveryone: boolean) => void;
  onCancel: () => void;
}

export function DeleteMessageModal({ message, otherUserName, isGroup, onConfirm, onCancel }: Props) {
  const [forEveryone, setForEveryone] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#161b22] p-6 shadow-2xl animate-fade-in-up">
        <h3 className="text-xl font-semibold text-white mb-2">Delete message?</h3>
        <p className="text-sm text-gray-400 mb-6">
          Are you sure you want to delete this message? This action cannot be undone.
        </p>

        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            className="group relative flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/20 bg-black/20 transition-colors hover:border-indigo-500"
            onClick={() => setForEveryone(!forEveryone)}
          >
            {forEveryone && (
              <svg className="h-3.5 w-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </button>
          <span 
            className="text-sm text-gray-300 cursor-pointer select-none"
            onClick={() => setForEveryone(!forEveryone)}
          >
            Also delete for {isGroup ? "everyone" : otherUserName || "the other person"}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(forEveryone)}
            className="rounded-xl bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
