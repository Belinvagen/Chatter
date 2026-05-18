"use client";

import { useState } from "react";
import { useTopics } from "@/hooks/useTopics";
import { addTopic } from "@/lib/groups";
import { useAuth } from "@/hooks/useAuth";
import type { Topic } from "@/types";
import toast from "react-hot-toast";

interface Props {
  chatId: string;
  activeTopicId: string | null;
  onSelectTopic: (topic: Topic) => void;
}

export function TopicsSidebar({ chatId, activeTopicId, onSelectTopic }: Props) {
  const { user } = useAuth();
  const { data: topics = [], isLoading } = useTopics(chatId);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAddTopic = async () => {
    if (!newName.trim() || !user) return;

    setAdding(true);
    try {
      await addTopic(chatId, newName.trim(), user.uid);
      setNewName("");
      setShowAdd(false);
      toast.success("Topic created!");
    } catch {
      toast.error("Failed to create topic.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex h-full w-56 flex-col border-r border-white/5 bg-[#060a14]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-3">
        <h3 className="text-sm font-semibold text-gray-300">Topics</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/5 hover:text-indigo-400 cursor-pointer"
          title="Add topic"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Add topic form */}
      {showAdd && (
        <div className="border-b border-white/5 p-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
            placeholder="Topic name…"
            maxLength={40}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500/50"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddTopic}
              disabled={adding || !newName.trim()}
              className="flex-1 rounded-lg bg-indigo-500/20 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-40 cursor-pointer"
            >
              {adding ? "…" : "Add"}
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(""); }}
              className="flex-1 rounded-lg bg-white/5 py-1.5 text-xs text-gray-400 hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Topic list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : topics.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-gray-600">No topics yet</p>
        ) : (
          topics.map((topic) => {
            const isActive = activeTopicId === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-500/10 text-indigo-400"
                    : "text-gray-400 hover:bg-white/[0.03] hover:text-gray-300"
                }`}
              >
                <span className="text-sm">#</span>
                <span className="text-xs font-medium truncate">{topic.name}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
