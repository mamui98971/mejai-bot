// ============================================================
// PROJECT MEJAI — LINE Messaging API Helpers
// Reply, push, and Flex Message builders.
// ============================================================

import { messagingApi } from '@line/bot-sdk';
import { env } from '../config/env';

const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
});

/**
 * Reply with a simple text message.
 */
export async function replyText(
  replyToken: string,
  text: string
) {
  return lineClient.replyMessage({
    replyToken,
    messages: [{ type: 'text', text }],
  });
}

/**
 * Reply with multiple text messages.
 */
export async function replyTexts(
  replyToken: string,
  texts: string[]
) {
  return lineClient.replyMessage({
    replyToken,
    messages: texts.map((text) => ({ type: 'text' as const, text })),
  });
}

/**
 * Reply with a Flex Message (rich UI).
 */
export async function replyFlex(
  replyToken: string,
  altText: string,
  contents: any
) {
  return lineClient.replyMessage({
    replyToken,
    messages: [
      {
        type: 'flex',
        altText,
        contents,
      },
    ],
  });
}

/**
 * Reply with quick reply buttons.
 */
export async function replyWithQuickReplies(
  replyToken: string,
  text: string,
  quickReplyItems: string[]
) {
  return lineClient.replyMessage({
    replyToken,
    messages: [
      {
        type: 'text',
        text,
        quickReply: {
          items: quickReplyItems.map((label) => ({
            type: 'action' as const,
            action: {
              type: 'message' as const,
              label: label.substring(0, 20), // LINE limit: 20 chars
              text: label,
            },
          })),
        },
      },
    ],
  });
}

/**
 * Push a message to a user (uses monthly quota).
 * Used for daily horoscope, scheduled reminders, etc.
 */
export async function pushText(
  userId: string,
  text: string
) {
  return lineClient.pushMessage({
    to: userId,
    messages: [{ type: 'text', text }],
  });
}

/**
 * Get user profile from LINE.
 */
export async function getUserProfile(
  userId: string
): Promise<{ displayName: string; pictureUrl?: string }> {
  const profile = await lineClient.getProfile(userId);
  return {
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
  };
}

/**
 * Get image content from LINE message.
 * Returns base64-encoded image data.
 */
export async function getMessageContent(
  messageId: string
): Promise<Buffer> {
  const blobClient = new messagingApi.MessagingApiBlobClient({
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
  });
  const response = await blobClient.getMessageContent(messageId);
  const chunks: Buffer[] = [];
  const reader = (response as any).body?.getReader?.();
  
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }
  
  // Fallback: treat as readable stream
  return new Promise((resolve, reject) => {
    const stream = response as any;
    const bufs: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => bufs.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(bufs)));
    stream.on('error', reject);
  });
}

export { lineClient };
