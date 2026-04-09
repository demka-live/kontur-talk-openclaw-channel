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
import type { ChannelPlugin } from "openclaw/plugin-sdk/channel-core";
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

const base = {
  ...createChannelPluginBase<ResolvedAccount>({
    id: CHANNEL_ID,
    capabilities: {
      chatTypes: ["direct", "group"] as const,
      threads: true,
      media: true,
      reply: true,
    },
    setup: {
      applyAccountConfig: ({ cfg, input }) => {
        const channels = { ...(cfg.channels as Record<string, any>) };
        const section = { ...channels[CHANNEL_ID] };
        if (input.token) section.token = input.token;
        if (input.httpUrl) section.baseUrl = input.httpUrl;
        channels[CHANNEL_ID] = section;
        return { ...cfg, channels } as OpenClawConfig;
      },
      validateInput: ({ input }) => {
        if (!input.token) return "Token is required";
        return null;
      },
    },
    config: {
      listAccountIds: (_cfg) => ["default"],
      resolveAccount: (cfg, accountId) => resolveAccount(cfg, accountId),
      inspectAccount: (cfg, _accountId) => {
        const section = getSection(cfg);
        return {
          enabled: Boolean(section?.token),
          configured: Boolean(section?.token),
          tokenStatus: section?.token ? "available" : "missing",
        };
      },
    },
  }),
  capabilities: {
    chatTypes: ["direct", "group"] as Array<"direct" | "group" | "channel" | "thread">,
    threads: true,
    media: true,
    reply: true,
  },
  config: {
    listAccountIds: (_cfg: OpenClawConfig) => ["default"],
    resolveAccount: (cfg: OpenClawConfig, accountId?: string | null) => resolveAccount(cfg, accountId),
    inspectAccount: (cfg: OpenClawConfig, _accountId?: string | null) => {
      const section = getSection(cfg);
      return {
        enabled: Boolean(section?.token),
        configured: Boolean(section?.token),
        tokenStatus: section?.token ? "available" : "missing",
      };
    },
  },
};

export const konturTalkPlugin: ChannelPlugin<ResolvedAccount> = createChatChannelPlugin<ResolvedAccount>({
  base,

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
      notify: async (params) => {
        console.warn(
          `[kontur-talk] pairing notification for ${params.id}: ${params.message}`,
        );
      },
    },
  },

  threading: { topLevelReplyToMode: "reply" },

  outbound: {
    attachedResults: {
      channel: CHANNEL_ID,
      sendText: async (ctx) => {
        const account = resolveAccount(ctx.cfg, ctx.accountId);
        const client = createClient(account);
        const result = await client.sendMessage({
          room_id: ctx.to,
          message: ctx.text,
          format: "markdown",
          thread_id: ctx.threadId != null ? String(ctx.threadId) : null,
        });
        return { messageId: result.event_id };
      },
    },
    base: {
      deliveryMode: "direct",
    },
  },
});
