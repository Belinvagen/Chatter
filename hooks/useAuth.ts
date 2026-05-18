"use client";

import { useContext } from "react";
import { AuthContext } from "@/providers/AuthProvider";
import type { AuthContextValue } from "@/types";

/**
 * Custom hook to access the current Firebase auth state.
 * Must be used within an <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
