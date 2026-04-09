/**
 * Kontur Talk channel plugin object.
 *
 * Uses the OpenClaw SDK's createChatChannelPlugin / createChannelPluginBase
 * builders to expose config resolution, DM security, threading, and outbound.
 */

import {
  createChatChannelPlugin,
  createChannelPluginBase,
} from "openclaw/plugin-sdk/channel-core";
import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
import { KonturTalkClient } from "./client.js";
import type { ResolvedAccount } from "./types.js";

const CHANNEL_ID = "kontur-talk";
const DEFAULT_BASE_URL = "https://chat.ktalk.ru";
const DEFAULT_POLLING_TIMEOUT = 30;

function getSection(cfg: OpenClawConfig): Record<string, any> | undefined {
  return (cfg.channels as Record<string, any>)?.[CHANNEL_ID];
}

export function resolveAccount(
  cfg: OpenClawConfig,
  accountId?: string | null,
): ResolvedAccount {
  const section = getSection(cfg);
  const token = section?.token;
  if (!token) throw new Error("kontur-talk: token is required");
  return {
    accountId: accountId ?? null,
    token,
    baseUrl: section?.baseUrl ?? DEFAULT_BASE_URL,
    pollingTimeout: section?.pollingTimeout ?? DEFAULT_POLLING_TIMEOUT,
    allowFrom: section?.allowFrom ?? [],
    dmPolicy: section?.dmSecurity,
    requireMention: section?.requireMention ?? true,
  };
}

export function createClient(account: ResolvedAccount): KonturTalkClient {
  return new KonturTalkClient({
    baseUrl: account.baseUrl,
    token: account.token,
  });
}

export const konturTalkPlugin = createChatChannelPlugin<ResolvedAccount>({
  base: createChannelPluginBase({
    id: CHANNEL_ID,
    setup: {
      resolveAccount,
      inspectAccount(cfg: OpenClawConfig, _accountId?: string | null) {
        const section = getSection(cfg);
        return {
          enabled: Boolean(section?.token),
          configured: Boolean(section?.token),
          tokenStatus: section?.token ? "available" : "missing",
        };
      },
    },
  }),

  security: {
    dm: {
      channelKey: CHANNEL_ID,
      resolvePolicy: (account: ResolvedAccount) => account.dmPolicy,
      resolveAllowFrom: (account: ResolvedAccount) => account.allowFrom,
      defaultPolicy: "allowlist",
    },
  },

  pairing: {
    text: {
      idLabel: "Kontur Talk user ID",
      message: "Send this code to verify your identity:",
      notify: async ({ target, code }: { target: string; code: string }) => {
        // Pairing currently not needed since the bot operates via long-polling,
        // but provided for SDK completeness.
        console.warn(
          `[kontur-talk] pairing code ${code} for ${target} — manual delivery required`,
        );
      },
    },
  },

  threading: { topLevelReplyToMode: "reply" },

  outbound: {
    attachedResults: {
      sendText: async (params: {
        to: string;
        text: string;
        threadId?: string | null;
        account: ResolvedAccount;
      }) => {
        const client = createClient(params.account);
        const result = await client.sendMessage({
          room_id: params.to,
          message: params.text,
          format: "markdown",
          thread_id: params.threadId ?? null,
        });
        return { messageId: result.event_id };
      },
    },
    base: {
      sendMedia: async (params: {
        to: string;
        filePath: string;
        account: ResolvedAccount;
      }) => {
        const client = createClient(params.account);
        const fs = await import("node:fs");
        const path = await import("node:path");
        const buf = fs.readFileSync(params.filePath);
        const filename = path.basename(params.filePath);

        const ext = path.extname(filename).toLowerCase();
        const mimeMap: Record<string, string> = {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
        };
        const contentType = mimeMap[ext] ?? "image/png";

        const uploadResult = await client.uploadImage(buf, filename, contentType);

        await client.sendMessage({
          room_id: params.to,
          message: uploadResult.url,
          format: "plain",
        });
      },
    },
  },
});
