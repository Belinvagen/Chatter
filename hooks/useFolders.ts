"use client";

import { useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { onSnapshot } from "firebase/firestore";
import { foldersQuery } from "@/lib/folders";
import { useAuth } from "@/hooks/useAuth";
import type { Folder } from "@/types";

/**
 * Real-time hook for the current user's folders.
 */
export function useFolders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const q = foldersQuery(user.uid);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const folders: Folder[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Folder[];

      queryClient.setQueryData<Folder[]>(["folders", user.uid], folders);
    });

    return unsubscribe;
  }, [user, queryClient]);

  return useQuery<Folder[]>({
    queryKey: ["folders", user?.uid],
    queryFn: () => queryClient.getQueryData(["folders", user?.uid]) ?? [],
    enabled: !!user,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
