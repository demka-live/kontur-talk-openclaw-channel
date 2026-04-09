/**
 * Main entry point for the Kontur Talk channel plugin.
 *
 * Loaded by OpenClaw during full runtime startup.
 * Registers the channel, the long-polling background service, and CLI commands.
 */

import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { konturTalkPlugin, resolveAccount, createClient } from "./src/channel.js";
import { KonturTalkPoller } from "./src/poller.js";
import { createInboundHandler } from "./src/inbound.js";
import type { ResolvedAccount } from "./src/types.js";

export default defineChannelPluginEntry({
  id: "kontur-talk",
  name: "Kontur Talk",
  description:
    "Channel plugin for Kontur Talk (Толк.Чаты) messenger via Bot API long-polling",
  plugin: konturTalkPlugin,

  registerCliMetadata(api) {
    api.registerCli(
      ({ program }) => {
        program
          .command("kontur-talk")
          .description("Kontur Talk channel management");
      },
      {
        descriptors: [
          {
            name: "kontur-talk",
            description: "Kontur Talk channel management",
            hasSubcommands: false,
          },
        ],
      },
    );
  },

  registerFull(api) {
    let poller: KonturTalkPoller | null = null;

    let account: ResolvedAccount;
    try {
      account = resolveAccount(api.config);
    } catch {
      api.logger.warn(
        "[kontur-talk] channel not configured — skipping service registration",
      );
      return;
    }

    const botTokenPayload = decodeJwtPayload(account.token);
    const botUserId = botTokenPayload?.sub ?? "unknown-bot";

    const inboundHandler = createInboundHandler({
      account,
      botUserId,
      onTextMessage: async (params) => {
        api.logger.info(
          `[kontur-talk] text from ${params.senderId} in ${params.conversationId}: ${params.text.slice(0, 80)}`,
        );
        // Dispatch to OpenClaw's inbound pipeline.
        // The actual dispatch method depends on how the host runtime
        // exposes the inbound record-and-dispatch surface.
        // Plugins using `api.runtime.channel.inbound?.dispatch(...)` or
        // the registered inbound handler will pick this up.
      },
      onMediaMessage: async (params) => {
        api.logger.info(
          `[kontur-talk] media (${params.mediaType}) from ${params.senderId} in ${params.conversationId}`,
        );
      },
      logger: api.logger,
    });

    api.registerService({
      name: "kontur-talk-poller",
      async start() {
        poller = new KonturTalkPoller({
          account,
          dispatch: inboundHandler,
          logger: api.logger,
        });
        poller.start().catch((err) => {
          api.logger.error("[kontur-talk] poller crashed:", err);
        });
      },
      async stop() {
        poller?.stop();
      },
    });
  },
});

/**
 * Decode the payload section of a JWT token without verification.
 * Used only to extract the bot `sub` claim for self-message filtering.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = Buffer.from(parts[1]!, "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
