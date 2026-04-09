/**
 * Inbound message handler.
 *
 * Converts incoming Толк.Чаты messages into the shape OpenClaw
 * expects for channel inbound dispatch, including mention detection,
 * thread mapping, and media downloads.
 */

import type { TalkMessage, TalkTextMessage, TalkMediaMessage, ResolvedAccount } from "./types.js";
import { KonturTalkClient } from "./client.js";

export interface InboundContext {
  account: ResolvedAccount;
  botUserId: string;
  onTextMessage: (params: {
    conversationId: string;
    senderId: string;
    text: string;
    threadId?: string | null;
    replyToId?: string | null;
    messageId: string;
    isDirect: boolean;
    timestamp: number;
    wasMentioned: boolean;
  }) => Promise<void>;
  onMediaMessage?: (params: {
    conversationId: string;
    senderId: string;
    mediaType: string;
    mediaUrl: string;
    threadId?: string | null;
    messageId: string;
    isDirect: boolean;
    timestamp: number;
  }) => Promise<void>;
  logger: {
    info: (...a: any[]) => void;
    warn: (...a: any[]) => void;
    debug: (...a: any[]) => void;
  };
}

export function createInboundHandler(ctx: InboundContext) {
  return async (message: TalkMessage): Promise<void> => {
    if (message.user_id === ctx.botUserId) return;

    const isDirect = message.room_is_direct;
    const wasMentioned = checkMention(message, ctx.botUserId);

    if (!isDirect && ctx.account.requireMention && !wasMentioned) {
      ctx.logger.debug(
        `[kontur-talk] skipping group message without mention from ${message.user_id}`,
      );
      return;
    }

    switch (message.message_type) {
      case "m.text": {
        const textMsg = message as TalkTextMessage;
        const cleanedText = stripMention(textMsg.body, ctx.botUserId);
        await ctx.onTextMessage({
          conversationId: message.room_id,
          senderId: message.user_id,
          text: cleanedText,
          threadId: message.thread_id,
          replyToId: message.reply_id,
          messageId: message.event_id,
          isDirect,
          timestamp: message.timestamp,
          wasMentioned,
        });
        break;
      }
      case "m.image":
      case "m.video":
      case "m.file":
      case "m.audio": {
        if (ctx.onMediaMessage) {
          const mediaMsg = message as TalkMediaMessage;
          await ctx.onMediaMessage({
            conversationId: message.room_id,
            senderId: message.user_id,
            mediaType: message.message_type,
            mediaUrl: mediaMsg.media_url,
            threadId: message.thread_id,
            messageId: message.event_id,
            isDirect,
            timestamp: message.timestamp,
          });
        }
        break;
      }
      case "msg.call_start":
      case "msg.call_end":
        break;
      default:
        ctx.logger.debug(
          `[kontur-talk] ignoring unsupported message_type: ${message.message_type}`,
        );
    }
  };
}

function checkMention(message: TalkMessage, botUserId: string): boolean {
  if (message.mentions === "all") return true;
  if (Array.isArray(message.mentions) && message.mentions.includes(botUserId)) {
    return true;
  }
  if ("body" in message && typeof (message as any).body === "string") {
    const body: string = (message as any).body;
    if (body.includes(botUserId)) return true;
    const localPart = botUserId.split(":")[0]?.replace(/^@/, "");
    if (localPart && body.toLowerCase().includes(localPart.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function stripMention(text: string, botUserId: string): string {
  let result = text.replace(new RegExp(escapeRegex(botUserId), "g"), "").trim();
  const localPart = botUserId.split(":")[0]?.replace(/^@/, "");
  if (localPart) {
    result = result
      .replace(new RegExp(`@${escapeRegex(localPart)}\\b`, "gi"), "")
      .trim();
  }
  return result || text;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
