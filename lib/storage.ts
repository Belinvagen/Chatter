import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Upload an attachment to Firebase Storage and return its metadata.
 * Path: chats/{chatId}/attachments/{timestamp}_{filename}
 */
export async function uploadMessageAttachment(
  chatId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const timestamp = Date.now();
  // Sanitize filename to avoid weird characters in URL
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `chats/${chatId}/attachments/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          url,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }
    );
  });
}
