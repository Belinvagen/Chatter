"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useChats } from "@/hooks/useChats";
import { getUserProfiles } from "@/lib/users";
import type { UserProfile } from "@/types";

/**
 * Derives contacts from the user's existing DM chats.
 * Returns an array of UserProfiles for people the user has chatted with.
 * Cached and auto-refreshed when chats update via onSnapshot.
 */
export function useContacts() {
  const { user } = useAuth();
  const { data: chats = [] } = useChats();

  // Extract unique UIDs of DM partners
  const contactUids = Array.from(
    new Set(
      chats
        .filter((c) => c.type === "dm" || !c.type)
        .map((c) => c.participants.find((uid) => uid !== user?.uid))
        .filter((uid): uid is string => !!uid)
    )
  );

  return useQuery<UserProfile[]>({
    queryKey: ["contacts", user?.uid, contactUids.join(",")],
    queryFn: () => getUserProfiles(contactUids),
    enabled: !!user && contactUids.length > 0,
    staleTime: 1000 * 60 * 2,
  });
}
