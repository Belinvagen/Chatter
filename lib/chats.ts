import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  deleteField,
  arrayRemove,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Chat, ParticipantInfo } from "@/types";

/**
 * Generate a deterministic chat ID for a 1-on-1 DM.
 * Sorting UIDs ensures both users resolve to the same chat.
 */
export function getDmChatId(uid1: string, uid2: string): string {
  const sorted = [uid1, uid2].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

/**
 * Get or create a 1-on-1 chat between two users.
 */
export async function getOrCreateDmChat(
  currentUid: string,
  otherUid: string,
  currentInfo: ParticipantInfo,
  otherInfo: ParticipantInfo
): Promise<Chat> {
  const chatId = getDmChatId(currentUid, otherUid);
  const chatRef = doc(db, "chats", chatId);
  const snapshot = await getDoc(chatRef);

  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Chat;
  }

  const participants = [currentUid, otherUid].sort();
  const newChat = {
    type: "dm" as const,
    participants,
    participantInfo: {
      [currentUid]: currentInfo,
      [otherUid]: otherInfo,
    },
    lastMessage: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(chatRef, newChat);

  return {
    id: chatId,
    ...newChat,
    createdAt: null as unknown as Chat["createdAt"],
    updatedAt: null as unknown as Chat["updatedAt"],
  } as unknown as Chat;
}

/** Fetch all chats a user is a participant in, ordered by most recent. */
export async function getUserChats(uid: string): Promise<Chat[]> {
  const chatsRef = collection(db, "chats");
  const q = query(
    chatsRef,
    where("participants", "array-contains", uid),
    orderBy("updatedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Chat);
}

// ─── Chat actions (per-user) ────────────────────────────────

/** Toggle pin state for a chat */
export async function pinChat(chatId: string, uid: string, pinned: boolean): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`pinned.${uid}`]: pinned || deleteField(),
  });
}

/** Toggle archive state for a chat */
export async function archiveChat(chatId: string, uid: string, archived: boolean): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`archived.${uid}`]: archived || deleteField(),
  });
}

/** Toggle a chat in a specific folder */
export async function toggleChatFolder(chatId: string, uid: string, folderId: string, add: boolean): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`folder.${uid}`]: add ? arrayUnion(folderId) : arrayRemove(folderId),
  });
}

/** Reset unread message count and update lastRead timestamp for a user in a chat */
export async function markChatAsRead(chatId: string, uid: string): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`unreadCount.${uid}`]: 0,
    [`lastRead.${uid}`]: serverTimestamp(),
  });
}

/** Update the typing timestamp for a user in a chat */
export async function updateTypingStatus(chatId: string, uid: string): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`typing.${uid}`]: serverTimestamp(),
  });
}

/** Delete a DM chat */
export async function deleteChat(chatId: string): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  await deleteDoc(chatRef);
}

/** Leave a group chat */
export async function leaveGroup(chatId: string, uid: string): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    participants: arrayRemove(uid),
    [`participantInfo.${uid}`]: deleteField(),
    [`pinned.${uid}`]: deleteField(),
    [`archived.${uid}`]: deleteField(),
    [`folder.${uid}`]: deleteField(),
  });
}
