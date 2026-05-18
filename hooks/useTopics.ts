"use client";

import { useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { onSnapshot } from "firebase/firestore";
import { topicsQuery } from "@/lib/groups";
import type { Topic } from "@/types";

/**
 * Real-time hook for topics in a super group.
 */
export function useTopics(chatId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!chatId) return;

    const q = topicsQuery(chatId);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const topics: Topic[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Topic[];

      queryClient.setQueryData<Topic[]>(["topics", chatId], topics);
    });

    return unsubscribe;
  }, [chatId, queryClient]);

  return useQuery<Topic[]>({
    queryKey: ["topics", chatId],
    queryFn: () => queryClient.getQueryData(["topics", chatId]) ?? [],
    enabled: !!chatId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
