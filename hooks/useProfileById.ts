"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types";

/**
 * Fetch any user's profile by UID in realtime.
 * Uses onSnapshot so that online presence updates instantly.
 */
export function useProfileById(uid: string | null | undefined) {
  const [data, setData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const docRef = doc(db, "users", uid);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data() as UserProfile);
      } else {
        setData(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Failed to fetch profile", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  return { data, isLoading };
}
