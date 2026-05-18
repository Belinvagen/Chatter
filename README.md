# Chatter 💬

Chatter is a clean, fast real-time messaging application with a fresh light-green design. Built to deliver instant conversations with a polished, modern user experience.

## ✨ Features

- **Real-Time Messaging:** Powered by Firestore live listeners — messages appear instantly.
- **Online Presence & Typing Indicators:** See when contacts are online and when they're composing a message.
- **Rich Attachments:** Send images, videos, files, and voice messages with a built-in audio player.
- **Advanced Deletion:**
  - Delete for Me or Delete for Everyone.
  - 5-second undo window after deleting.
  - Group admin can moderate all messages.
- **Organized Groups:** Supergroups with nested Topics to keep conversations structured.
- **Message Forwarding & Replies:** Full context-preserving message interactions.
- **Folders & Archive:** Organize your chats into custom folders or archive old conversations.
- **Light Green Theme:** A clean, modern design built for all-day comfortable reading.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Backend:** Firebase (Firestore, Auth, Storage)
- **State Management:** TanStack Query + React Context

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project (Firestore, Auth, Storage enabled)

### Setup

1. Clone the repo:
   ```bash
   git clone <your-repo-url>
   cd chatter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` with your Firebase config:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3001](http://localhost:3001) in your browser.

## 📄 License

MIT
