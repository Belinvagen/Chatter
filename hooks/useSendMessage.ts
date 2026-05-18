"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessage } from "@/lib/messages";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@/types";
import { Timestamp } from "firebase/firestore";

import type { AttachmentData, ReplyToData } from "@/lib/messages";

interface SendMessageVars {
  chatId: string;
  text: string;
  topicId?: string;
  attachment?: AttachmentData;
  replyTo?: ReplyToData;
}

/**
 * Mutation hook for sending messages with optimistic updates.
 * Supports optional topicId for super group messages.
 */
export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, text, topicId, attachment, replyTo }: SendMessageVars) => {
      if (!user) throw new Error("Not authenticated");
      return sendMessage(chatId, user.uid, user.displayName ?? "User", text, topicId, attachment, replyTo);
    },

    onMutate: async ({ chatId, text, topicId, attachment, replyTo }) => {
      if (!user) return;

      const cacheKey = ["messages", chatId, topicId ?? "__all__"];
      await queryClient.cancelQueries({ queryKey: cacheKey });

      const previousMessages = queryClient.getQueryData<Message[]>(cacheKey);

      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        text,
        senderId: user.uid,
        senderName: user.displayName ?? "User",
        timestamp: Timestamp.now(),
        topicId,
        type: attachment ? attachment.type : "text",
        fileUrl: attachment ? attachment.fileUrl : undefined,
        fileName: attachment ? attachment.fileName : undefined,
        fileSize: attachment ? attachment.fileSize : undefined,
        replyTo,
        pending: true,
      };

      queryClient.setQueryData<Message[]>(
        cacheKey,
        (old = []) => [...old, optimisticMessage]
      );

      return { previousMessages, cacheKey };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousMessages && context.cacheKey) {
        queryClient.setQueryData(context.cacheKey, context.previousMessages);
      }
    },
  });
}
