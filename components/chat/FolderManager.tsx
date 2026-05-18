"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFolders } from "@/hooks/useFolders";
import { createFolder, renameFolder, deleteFolder, FOLDER_COLORS } from "@/lib/folders";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function FolderManager({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const { data: folders = [] } = useFolders();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setLoading(true);
    try {
      await createFolder(user.uid, newName.trim(), folders.length);
      setNewName("");
      toast.success("Folder created");
    } catch {
      toast.error("Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (folderId: string) => {
    if (!editName.trim() || !user) return;
    try {
      await renameFolder(user.uid, folderId, editName.trim());
      setEditingId(null);
      toast.success("Folder renamed");
    } catch {
      toast.error("Failed to rename folder");
    }
  };

  const handleDelete = async (folderId: string) => {
    if (!user) return;
    try {
      await deleteFolder(user.uid, folderId);
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-sm rounded-2xl p-5 mx-4 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Folders</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Create new */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="New folder name…"
            maxLength={20}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/50"
          />
          <button
            onClick={handleCreate}
            disabled={loading || !newName.trim()}
            className="rounded-xl bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-40 cursor-pointer"
          >
            Add
          </button>
        </div>

        {/* Folder list */}
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {folders.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No folders yet. Create one above.
            </p>
          ) : (
            folders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03]"
              >
                {/* Color dot */}
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: folder.color }}
                />

                {editingId === folder.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(folder.id)}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(folder.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-400 hover:text-gray-300 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-white truncate">
                      {folder.name}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(folder.id);
                        setEditName(folder.name);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:text-white hover:bg-white/5 cursor-pointer"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(folder.id)}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:text-rose-400 hover:bg-white/5 cursor-pointer"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
