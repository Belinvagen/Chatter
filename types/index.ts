import type { User as FirebaseUser } from "firebase/auth";
import type { Timestamp } from "firebase/firestore";

/** Application-level user object */
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/** Firestore user profile document (users/{uid}) */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  status: string;
  isOnline?: boolean;
  lastSeen?: Timestamp;
  createdAt: number;
  updatedAt: number;
}

/** Auth context value exposed to the component tree */
export interface AuthContextValue {
  user: FirebaseUser | null;
  loading: boolean;
}

// ─── Messaging types ────────────────────────────────────────

/** Denormalized participant info stored on the chat document */
export interface ParticipantInfo {
  displayName: string;
  avatarUrl: string;
}

/** Group permission settings controlled by the admin */
export interface GroupPermissions {
  /** Who can edit group name/avatar: "admin" or "everyone" */
  canEditInfo: "admin" | "everyone";
  /** Who can add new members: "admin" or "everyone" */
  canAddMembers: "admin" | "everyone";
}

/** Firestore chat document (chats/{chatId}) — supports DMs and groups */
export interface Chat {
  id: string;
  type: "dm" | "group";
  participants: string[];
  participantInfo: Record<string, ParticipantInfo>;
  lastMessage: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: Timestamp | null;
  } | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // ── Group-specific fields ──
  /** Group name (only for type: "group") */
  name?: string;
  /** Group avatar URL */
  groupAvatarUrl?: string;
  /** UID of the group admin/creator */
  adminUid?: string;
  /** If true, this group uses Topics like Telegram */
  isSuperGroup?: boolean;
  /** Permission settings for the group */
  permissions?: GroupPermissions;

  // ── Per-user state (keyed by uid) ──
  /** Per-user pin state: { [uid]: true } */
  pinned?: Record<string, boolean>;
  /** Per-user archive state: { [uid]: true } */
  archived?: Record<string, boolean>;
  /** Per-user folder assignment: { [uid]: folderId[] } */
  folder?: Record<string, string[]>;
  /** Per-user unread message count: { [uid]: count } */
  unreadCount?: Record<string, number>;
  /** Timestamp of the last read message by each user: { [uid]: Timestamp } */
  lastRead?: Record<string, Timestamp>;
  /** Timestamp of the last time a user was typing: { [uid]: Timestamp } */
  typing?: Record<string, Timestamp>;
}

/** User folder (stored in users/{uid}/folders) */
export interface Folder {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: Timestamp;
}

/** Firestore topic document (chats/{chatId}/topics/{topicId}) */
export interface Topic {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp;
}

/** Firestore message document (chats/{chatId}/messages/{messageId}) */
export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Timestamp | null;
  /** Topic this message belongs to (only for Super Groups) */
  topicId?: string;
  /** Type of message: defaults to 'text' if missing */
  type?: "text" | "image" | "video" | "file" | "audio";
  /** Download URL for the attached file */
  fileUrl?: string;
  /** Original file name */
  fileName?: string;
  /** File size in bytes */
  fileSize?: number;

  /** The message this is replying to, if any */
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
    type?: string;
  };

  /** Original sender name if this message was forwarded */
  forwardedFrom?: {
    senderName: string;
  };

  /** True if the message has been edited */
  isEdited?: boolean;

  /** Users who have deleted this message for themselves */
  deletedFor?: string[];

  /** Client-side only — marks optimistic messages before server confirmation */
  pending?: boolean;
}
