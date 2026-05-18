"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const setOnline = async () => {
      try {
        await updateDoc(userRef, {
          isOnline: true,
          lastSeen: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to set online presence", err);
      }
    };

    const setOffline = async () => {
      try {
        await updateDoc(userRef, {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to set offline presence", err);
      }
    };

    // Set online immediately
    setOnline();

    // Set up interval to refresh 'lastSeen' while online (every 1 minute)
    const interval = setInterval(setOnline, 60 * 1000);

    // Handle visibility changes (e.g., switching tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setOnline();
      } else {
        setOffline();
      }
    };

    // Handle window closing
    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setOffline();
    };
  }, [user]);
}
