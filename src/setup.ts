/**
 * Setup wizard for `openclaw onboard` interactive setup flow.
 */

import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";

const CHANNEL_ID = "kontur-talk";

export const konturTalkSetupWizard = {
  channel: CHANNEL_ID,
  status: {
    configuredLabel: "Connected",
    unconfiguredLabel: "Not configured",
    resolveConfigured: ({ cfg }: { cfg: OpenClawConfig }) => {
      const section = (cfg.channels as Record<string, any>)?.[CHANNEL_ID];
      return Boolean(section?.token);
    },
  },
  credentials: [
    {
      inputKey: "token",
      providerHint: CHANNEL_ID,
      credentialLabel: "Bot JWT token",
      preferredEnvVar: "KONTUR_TALK_BOT_TOKEN",
      envPrompt: "Use KONTUR_TALK_BOT_TOKEN from environment?",
      keepPrompt: "Keep current token?",
      inputPrompt:
        "Enter your Kontur Talk bot JWT token (created in Толк.Чаты space settings):",
      inspect: ({
        cfg,
      }: {
        cfg: OpenClawConfig;
        accountId?: string | null;
      }) => {
        const token = (cfg.channels as Record<string, any>)?.[CHANNEL_ID]
          ?.token;
        return {
          accountConfigured: Boolean(token),
          hasConfiguredValue: Boolean(token),
        };
      },
    },
  ],
  textInputs: [
    {
      inputKey: "baseUrl",
      label: "API Base URL",
      prompt: "Enter the Talk API base URL (default: https://chat.ktalk.ru):",
      defaultValue: "https://chat.ktalk.ru",
      shouldPrompt: ({
        cfg,
      }: {
        cfg: OpenClawConfig;
        accountId?: string | null;
      }) => {
        const section = (cfg.channels as Record<string, any>)?.[CHANNEL_ID];
        return !section?.baseUrl;
      },
    },
  ],
};
