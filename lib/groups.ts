import {
  doc,
  collection,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { ParticipantInfo, Chat, GroupPermissions } from "@/types";

const DEFAULT_PERMISSIONS: GroupPermissions = {
  canEditInfo: "admin",
  canAddMembers: "everyone",
};

/**
 * Create a new group chat.
 */
export async function createGroup(
  name: string,
  adminUid: string,
  memberUids: string[],
  participantInfoMap: Record<string, ParticipantInfo>,
  isSuperGroup: boolean,
  avatarFile?: File | null
): Promise<Chat> {
  const allParticipants = Array.from(new Set([adminUid, ...memberUids])).sort();

  let groupAvatarUrl = "";
  if (avatarFile) {
    const ext = avatarFile.name.split(".").pop() ?? "png";
    const storageRef = ref(storage, `groups/${Date.now()}_avatar.${ext}`);
    await uploadBytes(storageRef, avatarFile);
    groupAvatarUrl = await getDownloadURL(storageRef);
  }

  const chatData = {
    type: "group" as const,
    name,
    groupAvatarUrl,
    adminUid,
    isSuperGroup,
    permissions: DEFAULT_PERMISSIONS,
    participants: allParticipants,
    participantInfo: participantInfoMap,
    lastMessage: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const chatRef = await addDoc(collection(db, "chats"), chatData);

  if (isSuperGroup) {
    const topicsRef = collection(db, "chats", chatRef.id, "topics");
    await addDoc(topicsRef, {
      name: "General",
      createdBy: adminUid,
      createdAt: serverTimestamp(),
    });
  }

  return {
    id: chatRef.id,
    ...chatData,
    createdAt: null as unknown as Chat["createdAt"],
    updatedAt: null as unknown as Chat["updatedAt"],
  };
}

/**
 * Update group details (name, avatar).
 */
export async function updateGroupInfo(
  chatId: string,
  data: { name?: string; groupAvatarUrl?: string }
): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Upload a new group avatar and update the chat document.
 */
export async function updateGroupAvatar(
  chatId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const storageRef = ref(storage, `groups/${chatId}/avatar.${ext}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateGroupInfo(chatId, { groupAvatarUrl: url });
  return url;
}

/**
 * Update group permissions (admin only).
 */
export async function updateGroupPermissions(
  chatId: string,
  permissions: Partial<GroupPermissions>
): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (permissions.canEditInfo !== undefined) {
    updates["permissions.canEditInfo"] = permissions.canEditInfo;
  }
  if (permissions.canAddMembers !== undefined) {
    updates["permissions.canAddMembers"] = permissions.canAddMembers;
  }
  await updateDoc(chatRef, updates);
}

/**
 * Add members to a group.
 */
export async function addGroupMembers(
  chatId: string,
  newMembers: { uid: string; info: ParticipantInfo }[]
): Promise<void> {
  const chatRef = doc(db, "chats", chatId);

  const infoUpdates: Record<string, ParticipantInfo> = {};
  const uids: string[] = [];
  for (const m of newMembers) {
    infoUpdates[`participantInfo.${m.uid}`] = m.info;
    uids.push(m.uid);
  }

  await updateDoc(chatRef, {
    participants: arrayUnion(...uids),
    ...infoUpdates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Add a new topic to a super group.
 */
export async function addTopic(
  chatId: string,
  name: string,
  createdBy: string
): Promise<string> {
  const topicsRef = collection(db, "chats", chatId, "topics");
  const topicDoc = await addDoc(topicsRef, {
    name,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return topicDoc.id;
}

/** Build a Firestore query for topics in a chat. */
export function topicsQuery(chatId: string) {
  const topicsRef = collection(db, "chats", chatId, "topics");
  return query(topicsRef, orderBy("createdAt", "asc"));
}
