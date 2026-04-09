/**
 * Толк.Чаты Bot API type definitions.
 *
 * Based on the official API documentation:
 * https://chat.ktalk.ru/_matrix/client/strangler/api/v1
 */

export interface TalkBaseMessage {
  event_id: string;
  user_id: string;
  room_id: string;
  room_is_direct: boolean;
  type: "m.room.message";
  timestamp: number;
  message_type: string;
  thread_id: string | null;
  reply_id: string | null;
  forward_from: TalkForwardFrom | null;
  mentions: string[] | "all" | null;
}

export interface TalkForwardFrom {
  user_id: string;
  room_id: string;
}

export interface TalkTextMessage extends TalkBaseMessage {
  message_type: "m.text";
  body: string;
  formatted_body: string | null;
}

export interface TalkMediaMessage extends TalkBaseMessage {
  message_type: "m.image" | "m.video" | "m.file" | "m.audio";
  media_url: string;
}

export interface TalkCallMessage extends TalkBaseMessage {
  message_type: "msg.call_start" | "msg.call_end";
  call_room_name: string;
}

export type TalkMessage = TalkTextMessage | TalkMediaMessage | TalkCallMessage;

export interface TalkUpdatesResponse {
  updates: TalkMessage[];
}

export interface TalkThreadMessagesRequest {
  room_id: string;
  thread_id: string;
  limit: number;
  offset: number;
}

export interface TalkThreadMessagesResponse {
  messages: TalkMessage[];
}

export interface TalkSendMessageRequest {
  room_id: string;
  thread_id?: string | null;
  format: "plain" | "html" | "markdown";
  message: string;
  mentions?: string[];
}

export interface TalkSendMessageResponse {
  event_id: string;
}

export interface TalkUploadResponse {
  url: string;
}

export interface TalkDownloadMediaRequest {
  url: string;
}

export interface TalkApiError {
  detail:
    | { errcode: string; error: string }
    | Array<{ loc: string[]; msg: string; type: string }>;
}

export interface KonturTalkConfig {
  token: string;
  baseUrl: string;
  pollingTimeout: number;
  allowFrom: string[];
  dmSecurity: "open" | "allowlist";
  requireMention: boolean;
}

export interface ResolvedAccount {
  accountId: string | null;
  token: string;
  baseUrl: string;
  pollingTimeout: number;
  allowFrom: string[];
  dmPolicy: string | undefined;
  requireMention: boolean;
}
