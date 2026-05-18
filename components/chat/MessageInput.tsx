"use client";

import { useState, type FormEvent, useRef, useEffect } from "react";
import { useSendMessage } from "@/hooks/useSendMessage";
import { uploadMessageAttachment } from "@/lib/storage";
import type { AttachmentData } from "@/lib/messages";
import { editMessage } from "@/lib/messages";
import { updateTypingStatus } from "@/lib/chats";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import type { Message } from "@/types";

interface Props {
  chatId: string;
  topicId?: string;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
}

export function MessageInput({ chatId, topicId, replyTo, onCancelReply, editingMessage, onCancelEdit }: Props) {
  const [text, setText] = useState("");
  const { mutate: send, isPending } = useSendMessage();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // When editingMessage changes, populate the text
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      inputRef.current?.focus();
    } else {
      setText("");
    }
  }, [editingMessage]);

  const { user } = useAuth();
  const lastTypingTimeRef = useRef<number>(0);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    
    // Throttle typing updates to once every 2 seconds
    const now = Date.now();
    if (user && now - lastTypingTimeRef.current > 2000) {
      lastTypingTimeRef.current = now;
      updateTypingStatus(chatId, user.uid).catch(console.error);
    }
  };

  // Attachment state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chatId]);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be under 50MB");
        return;
      }
      setAttachment(file);
      // Clear file input so the same file can be selected again
      e.target.value = "";
    }
  };

  const getAttachmentType = (file: File | Blob): "image" | "video" | "audio" | "file" => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "file";
  };

  const handleSubmit = async (e?: FormEvent, overrideFile?: File) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    const activeFile = overrideFile || attachment;
    
    // Check if we have anything to send
    if (!trimmed && !activeFile) return;
    if (isPending || isUploading || isRecording) return;

    try {
      if (editingMessage) {
        // Handle Edit
        await editMessage(chatId, editingMessage.id, trimmed);
        setText("");
        if (onCancelEdit) onCancelEdit();
        return;
      }

      let attachmentData: AttachmentData | undefined;

      if (activeFile) {
        setIsUploading(true);
        const result = await uploadMessageAttachment(chatId, activeFile, setUploadProgress);
        attachmentData = {
          type: getAttachmentType(activeFile),
          fileUrl: result.url,
          fileName: result.name,
          fileSize: result.size,
        };
      }

      const replyToData = replyTo ? {
        id: replyTo.id,
        senderName: replyTo.senderName,
        text: replyTo.text,
        type: replyTo.type,
      } : undefined;

      send({ chatId, text: trimmed, topicId, attachment: attachmentData, replyTo: replyToData });
      setText("");
      setAttachment(null);
      setUploadProgress(0);
      if (onCancelReply) onCancelReply();
      
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ─── Audio Recording Logic ────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release the mic
        stream.getTracks().forEach((track) => track.stop());
        
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size > 0) {
          const file = new File([audioBlob], `Voice_Message_${Date.now()}.webm`, {
            type: "audio/webm",
          });
          // Call handleSubmit directly with the file to bypass state batching
          handleSubmit(undefined, file);
        }
        setIsRecording(false);
        setRecordingDuration(0);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Clear chunks so it doesn't send on stop
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Format seconds to M:SS
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col border-t border-green-100 bg-white">
      {/* Edit Preview Area */}
      {editingMessage && (
        <div className="flex items-center gap-3 border-b border-rose-100 px-4 py-2 bg-rose-50">
          <div className="flex h-10 w-1 flex-shrink-0 bg-rose-500 rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-rose-600">Editing Message</p>
            <p className="truncate text-xs text-gray-500">
              {editingMessage.text}
            </p>
          </div>
          <button
            onClick={() => {
              if (onCancelEdit) onCancelEdit();
              setText("");
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Reply Preview Area */}
      {replyTo && !editingMessage && (
        <div className="flex items-center gap-3 border-b border-green-100 px-4 py-2 bg-green-50">
          <div className="flex h-10 w-1 flex-shrink-0 bg-green-500 rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-green-600">Replying to {replyTo.senderName}</p>
            <p className="truncate text-xs text-gray-500">
              {replyTo.text || (replyTo.type === "image" ? "📷 Photo" : replyTo.type === "video" ? "🎥 Video" : replyTo.type === "audio" ? "🎤 Voice message" : "📎 File")}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-green-100 hover:text-green-700 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Attachment Preview Area */}
      {attachment && !isRecording && (
        <div className="flex items-center gap-3 border-b border-green-100 px-4 py-2 bg-green-50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-gray-600">
            {attachment.type.startsWith("image/") ? "📷" : attachment.type.startsWith("video/") ? "🎥" : attachment.type.startsWith("audio/") ? "🎤" : "📎"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800 font-medium">{attachment.name}</p>
            <p className="text-xs text-gray-500">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          {isUploading ? (
            <div className="text-xs text-green-600 font-medium">{Math.round(uploadProgress)}%</div>
          ) : (
            <button
              onClick={() => setAttachment(null)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-green-100 hover:text-red-500 transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Recording Area */}
      {isRecording && (
        <div className="flex items-center justify-between px-4 py-3 bg-rose-50 border-t border-rose-100">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm font-medium text-rose-600">
              Recording {formatDuration(recordingDuration)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cancelRecording}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shadow-md shadow-green-200 cursor-pointer"
              title="Stop & Send"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {!isRecording && (
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 px-4 py-3"
        >
          {/* File attach button */}
          {!editingMessage && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending || isUploading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Text Input */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={attachment ? "Add a caption…" : "Type a message…"}
            disabled={isPending || isUploading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-green-200 bg-green-50/50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-green-400 focus:ring-1 focus:ring-green-400/20 max-h-32"
            style={{
              height: "auto",
              minHeight: "44px",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />

          {/* Send / Mic button */}
          {text.trim() || attachment || editingMessage ? (
            <button
              type="submit"
              disabled={isPending || isUploading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-200 transition-all hover:shadow-green-300 hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={isPending || isUploading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 border border-green-200 text-gray-500 hover:bg-green-100 hover:text-green-600 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </button>
          )}
        </form>
      )}
    </div>
  );
}
