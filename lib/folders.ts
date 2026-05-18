import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const FOLDER_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
];

/** Create a new folder for the user */
export async function createFolder(
  uid: string,
  name: string,
  order: number
): Promise<string> {
  const foldersRef = collection(db, "users", uid, "folders");
  const color = FOLDER_COLORS[order % FOLDER_COLORS.length];
  const docRef = await addDoc(foldersRef, {
    name,
    color,
    order,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Rename a folder */
export async function renameFolder(
  uid: string,
  folderId: string,
  name: string
): Promise<void> {
  const folderRef = doc(db, "users", uid, "folders", folderId);
  await updateDoc(folderRef, { name });
}

/** Delete a folder */
export async function deleteFolder(
  uid: string,
  folderId: string
): Promise<void> {
  const folderRef = doc(db, "users", uid, "folders", folderId);
  await deleteDoc(folderRef);
}

/** Build a Firestore query for the user's folders */
export function foldersQuery(uid: string) {
  const foldersRef = collection(db, "users", uid, "folders");
  return query(foldersRef, orderBy("order", "asc"));
}

export { FOLDER_COLORS };
