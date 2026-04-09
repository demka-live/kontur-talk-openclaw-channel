/**
 * Толк.Чаты Bot API HTTP client.
 *
 * Wraps all endpoints described in the official Bot API documentation.
 * Every instance is scoped to a single bot JWT token.
 */

import type {
  TalkMessage,
  TalkSendMessageRequest,
  TalkSendMessageResponse,
  TalkThreadMessagesResponse,
  TalkUploadResponse,
} from "./types.js";

const API_PREFIX = "/_matrix/client/strangler/api/v1/bot";

export class KonturTalkClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(opts: { baseUrl: string; token: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.token = opts.token;
  }

  private url(path: string): string {
    return `${this.baseUrl}${API_PREFIX}/${this.token}${path}`;
  }

  /**
   * Long-poll for new messages (GET /get_updates).
   * Returns an empty array on timeout or transient errors.
   */
  async getUpdates(timeout: number = 30): Promise<TalkMessage[]> {
    const controller = new AbortController();
    const hardTimeout = setTimeout(
      () => controller.abort(),
      (timeout + 10) * 1000,
    );

    try {
      const res = await fetch(
        `${this.url("/get_updates")}?timeout=${timeout}`,
        { signal: controller.signal },
      );
      if (!res.ok) {
        throw new Error(`get_updates failed: ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as { updates: TalkMessage[] };
      return data.updates ?? [];
    } finally {
      clearTimeout(hardTimeout);
    }
  }

  /**
   * Send a text message to a room or thread (POST /send_message).
   */
  async sendMessage(
    req: TalkSendMessageRequest,
  ): Promise<TalkSendMessageResponse> {
    const res = await fetch(this.url("/send_message"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`send_message failed: ${res.status} ${body}`);
    }
    return (await res.json()) as TalkSendMessageResponse;
  }

  /**
   * Retrieve messages from a thread (POST /get_messages_in_thread).
   */
  async getMessagesInThread(
    roomId: string,
    threadId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<TalkThreadMessagesResponse> {
    const res = await fetch(this.url("/get_messages_in_thread"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_id: roomId,
        thread_id: threadId,
        limit,
        offset,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`get_messages_in_thread failed: ${res.status} ${body}`);
    }
    return (await res.json()) as TalkThreadMessagesResponse;
  }

  /**
   * Upload an image and receive an MXC URL (POST /upload_image).
   */
  async uploadImage(
    imageBuffer: Buffer,
    filename: string,
    contentType: string = "image/png",
  ): Promise<TalkUploadResponse> {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: contentType });
    formData.append("image", blob, filename);

    const res = await fetch(this.url("/upload_image"), {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`upload_image failed: ${res.status} ${body}`);
    }
    return (await res.json()) as TalkUploadResponse;
  }

  /**
   * Download media by MXC URL (POST /download_media).
   * Returns the raw Response so callers can stream or buffer.
   */
  async downloadMedia(mxcUrl: string): Promise<Response> {
    const res = await fetch(this.url("/download_media"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: mxcUrl }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`download_media failed: ${res.status} ${body}`);
    }
    return res;
  }
}
