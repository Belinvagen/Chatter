"use client";

import { useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type { Chat } from "@/types";

/**
 * Real-time hook for the current user's chat list.
 * Streams Firestore snapshots into TanStack Query cache.
 */
export function useChats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats: Chat[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Chat[];

      queryClient.setQueryData<Chat[]>(["chats", user.uid], chats);
    });

    return unsubscribe;
  }, [user, queryClient]);

  return useQuery<Chat[]>({
    queryKey: ["chats", user?.uid],
    queryFn: () => queryClient.getQueryData(["chats", user?.uid]) ?? [],
    enabled: !!user,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
