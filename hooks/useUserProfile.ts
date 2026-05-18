"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile } from "@/lib/users";
import type { UserProfile } from "@/types";

/**
 * Fetches the current user's Firestore profile.
 * Automatically disabled when there is no authenticated user.
 */
export function useUserProfile() {
  const { user } = useAuth();

  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", user?.uid],
    queryFn: () => getUserProfile(user!.uid),
    enabled: !!user,
  });
}
