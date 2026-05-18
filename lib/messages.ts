import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  increment,
  serverTimestamp,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Send a text message to a chat.
 * Also updates the chat's lastMessage + updatedAt for sidebar ordering.
 * Optionally attaches a topicId for super group messages.
 */
export interface AttachmentData {
  type: "image" | "video" | "file" | "audio";
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

export interface ReplyToData {
  id: string;
  senderName: string;
  text: string;
  type?: string;
}

/**
 * Send a message (text or attachment) to a chat.
 * Also updates the chat's lastMessage + updatedAt for sidebar ordering.
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  topicId?: string,
  attachment?: AttachmentData,
  replyTo?: ReplyToData,
  forwardedFrom?: { senderName: string }
): Promise<string> {
  const messagesRef = collection(db, "chats", chatId, "messages");

  const messageData: Record<string, unknown> = {
    text,
    senderId,
    senderName,
    timestamp: serverTimestamp(),
  };

  if (topicId) messageData.topicId = topicId;

  if (attachment) {
    messageData.type = attachment.type;
    messageData.fileUrl = attachment.fileUrl;
    messageData.fileName = attachment.fileName;
    messageData.fileSize = attachment.fileSize;
  } else {
    messageData.type = "text";
  }

  if (replyTo) {
    messageData.replyTo = replyTo;
  }

  if (forwardedFrom) {
    messageData.forwardedFrom = forwardedFrom;
  }

  const messageDoc = await addDoc(messagesRef, messageData);

  // Fetch chat to get participants
  const chatRef = doc(db, "chats", chatId);
  const chatDoc = await getDoc(chatRef);
  const participants = chatDoc.data()?.participants || [];

  // Generate a preview string for the sidebar
  let previewText = text;
  if (!text && attachment) {
    switch (attachment.type) {
      case "image": previewText = "📷 Photo"; break;
      case "video": previewText = "🎥 Video"; break;
      case "audio": previewText = "🎙️ Voice message"; break;
      case "file": previewText = `📎 ${attachment.fileName}`; break;
    }
  }

  // Update the parent chat's lastMessage for sidebar preview and increment unreadCounts
  const updates: Record<string, any> = {
    lastMessage: {
      text: previewText,
      senderId,
      senderName,
      timestamp: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  };

  participants.forEach((p: string) => {
    if (p !== senderId) {
      updates[`unreadCount.${p}`] = increment(1);
    }
  });

  await updateDoc(chatRef, updates);

  return messageDoc.id;
}

export async function editMessage(chatId: string, messageId: string, newText: string): Promise<void> {
  const messageRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(messageRef, {
    text: newText,
    isEdited: true,
  });

  // Note: we don't update chat.lastMessage here to avoid complex logic.
  // Last message preview will just stay as is, or update if it happens to be the last one and the user sends another.
}

import { deleteDoc, arrayUnion } from "firebase/firestore";

export async function deleteMessageForEveryone(chatId: string, messageId: string): Promise<void> {
  const messageRef = doc(db, "chats", chatId, "messages", messageId);
  await deleteDoc(messageRef);
}

export async function deleteMessageForMe(chatId: string, messageId: string, uid: string): Promise<void> {
  const messageRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(messageRef, {
    deletedFor: arrayUnion(uid)
  });
}

/**
 * Build a Firestore query for messages in a chat, ordered by time.
 * If topicId is provided, filters messages to that specific topic.
 */
export function messagesQuery(chatId: string, topicId?: string) {
  const messagesRef = collection(db, "chats", chatId, "messages");
  if (topicId) {
    return query(
      messagesRef,
      where("topicId", "==", topicId),
      orderBy("timestamp", "asc")
    );
  }
  return query(messagesRef, orderBy("timestamp", "asc"));
}
