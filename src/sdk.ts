/**
 * SDK bridge — resolves openclaw/plugin-sdk/channel-core at runtime.
 *
 * OpenClaw loads external .ts plugins via jiti. Subpath imports like
 * `openclaw/plugin-sdk/channel-core` break in certain global-install
 * layouts because jiti's alias prefix-matches the shorter
 * `openclaw/plugin-sdk` first, appending the rest as a file path.
 *
 * This bridge resolves the actual channel-core.js file by walking up
 * from the root-alias.cjs location (which require always finds), and
 * loading the sibling channel-core.js directly.
 */

import type { ChannelPlugin, OpenClawConfig } from "openclaw/plugin-sdk/core";

export type { ChannelPlugin, OpenClawConfig };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rootAlias = require.resolve("openclaw/plugin-sdk");
const pluginSdkDir = path.dirname(rootAlias);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const channelCore = require(path.join(pluginSdkDir, "channel-core.js"));

export const defineChannelPluginEntry: typeof import("openclaw/plugin-sdk/core").defineChannelPluginEntry =
  channelCore.defineChannelPluginEntry;

export const defineSetupPluginEntry: typeof import("openclaw/plugin-sdk/core").defineSetupPluginEntry =
  channelCore.defineSetupPluginEntry;

export const createChatChannelPlugin: typeof import("openclaw/plugin-sdk/core").createChatChannelPlugin =
  channelCore.createChatChannelPlugin;

export const createChannelPluginBase: typeof import("openclaw/plugin-sdk/core").createChannelPluginBase =
  channelCore.createChannelPluginBase;
