"use client";

import { useEffect, useRef } from "react";
import { useChats } from "@/hooks/useChats";
import { useAuth } from "@/hooks/useAuth";
import { useParams, usePathname } from "next/navigation";
import toast from "react-hot-toast";

export function GlobalNotifications() {
  const { data: chats } = useChats();
  const { user } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  
  // Store the last seen timestamp for each chat to detect truly new messages
  const lastMessageTimes = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!chats || !user) return;

    chats.forEach((chat) => {
      const currentLastTime = chat.lastMessage?.timestamp?.seconds || 0;
      const previousLastTime = lastMessageTimes.current[chat.id] || 0;

      // If we have a new message
      if (currentLastTime > previousLastTime) {
        // Only trigger toast if we had a previous time (so we don't toast on initial load)
        // AND the sender is not the current user
        if (previousLastTime > 0 && chat.lastMessage?.senderId !== user.uid) {
          
          // Check if we are currently viewing this chat
          const isViewingThisChat = pathname.startsWith("/chat/") && params?.id === chat.id;
          
          // Check if the chat is actually unread for us
          const isUnread = (chat.unreadCount?.[user.uid] ?? 0) > 0;

          if (!isViewingThisChat && isUnread) {
            // It's a new message, we're not looking at the chat, and it's unread
            toast.custom(
              (t) => (
                <div
                  className={`${
                    t.visible ? "animate-enter" : "animate-leave"
                  } max-w-md w-full bg-[#0e1325] border border-white/10 shadow-xl shadow-black/50 rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
                  onClick={() => {
                    toast.dismiss(t.id);
                    // Optional: could push router to /chat/${chat.id}
                  }}
                >
                  <div className="flex-1 w-0 p-4 cursor-pointer">
                    <div className="flex items-start">
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {chat.type === "group" ? `${chat.name} (${chat.lastMessage?.senderName})` : chat.lastMessage?.senderName}
                        </p>
                        <p className="mt-1 text-sm text-gray-400 truncate">
                          {chat.lastMessage?.text || "Sent an attachment"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ),
              { duration: 4000 }
            );
          }
        }

        // Update the ref to the newest time
        lastMessageTimes.current[chat.id] = currentLastTime;
      }
    });
  }, [chats, user, params, pathname]);

  return null;
}
