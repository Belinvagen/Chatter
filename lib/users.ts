import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { UserProfile } from "@/types";

const DEFAULT_AVATAR = "https://api.dicebear.com/9.x/initials/svg?seed=";

/**
 * Check if a username is already taken.
 * Usernames are stored lowercase for case-insensitive uniqueness.
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username.toLowerCase()));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Search for users by username (prefix match).
 * Returns all users whose username starts with the query string.
 */
export async function searchUsersByUsername(
  searchQuery: string
): Promise<UserProfile[]> {
  const normalized = searchQuery.toLowerCase().replace(/^@/, "");
  if (!normalized) return [];

  const usersRef = collection(db, "users");
  // Firestore range query for prefix matching:
  // >= "abc" and < "abd" matches all strings starting with "abc"
  const end = normalized.slice(0, -1) + String.fromCharCode(normalized.charCodeAt(normalized.length - 1) + 1);

  const q = query(
    usersRef,
    where("username", ">=", normalized),
    where("username", "<", end)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as UserProfile);
}

/** Create a user profile document if it doesn't already exist. */
export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  username: string,
  photoURL?: string | null
): Promise<void> {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) return; // Don't overwrite existing profiles

  const profile: Omit<UserProfile, "createdAt" | "updatedAt"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
  } = {
    uid,
    email,
    displayName,
    username: username.toLowerCase(),
    avatarUrl: photoURL ?? `${DEFAULT_AVATAR}${encodeURIComponent(displayName)}`,
    status: "",
    createdAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
    updatedAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
  };

  await setDoc(userRef, profile);
}

/** Fetch a user profile by UID. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as UserProfile;
}

/** Batch-fetch multiple user profiles by UID. */
export async function getUserProfiles(uids: string[]): Promise<UserProfile[]> {
  if (uids.length === 0) return [];
  // Firestore doesn't support batch get, so we fetch in parallel
  const results = await Promise.all(
    uids.slice(0, 30).map((uid) => getUserProfile(uid))
  );
  return results.filter((p): p is UserProfile => p !== null);
}

/** Update mutable profile fields. */
export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "displayName" | "username" | "status" | "avatarUrl">>
): Promise<void> {
  const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
  // Ensure username is always stored lowercase
  if (updateData.username && typeof updateData.username === "string") {
    updateData.username = updateData.username.toLowerCase();
  }
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, updateData);
}

/**
 * Upload an avatar image to Firebase Storage and return the download URL.
 * Path: avatars/{uid}/{filename}
 */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const storageRef = ref(storage, `avatars/${uid}/avatar.${ext}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
