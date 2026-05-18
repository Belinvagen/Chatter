"use client";

import { useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { onSnapshot } from "firebase/firestore";
import { messagesQuery } from "@/lib/messages";
import type { Message } from "@/types";

/**
 * Real-time hook for messages in a chat room.
 * Supports optional topicId filtering for Super Groups.
 *
 * Uses Firestore onSnapshot to stream updates directly into TanStack Query's
 * cache, giving us real-time data + all of TQ's state management.
 */
export function useMessages(chatId: string | null, topicId?: string | null) {
  const queryClient = useQueryClient();
  const cacheKey = ["messages", chatId, topicId ?? "__all__"];

  // Subscribe to Firestore snapshots and push data into TQ cache
  useEffect(() => {
    if (!chatId) return;

    const q = messagesQuery(chatId, topicId ?? undefined);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      queryClient.setQueryData<Message[]>(cacheKey, messages);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, topicId, queryClient]);

  // TQ query that serves as the "read" layer
  return useQuery<Message[]>({
    queryKey: cacheKey,
    queryFn: () => queryClient.getQueryData(cacheKey) ?? [],
    enabled: !!chatId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
