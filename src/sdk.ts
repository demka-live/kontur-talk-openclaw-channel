/**
 * SDK bridge — runtime imports from openclaw/plugin-sdk root alias.
 *
 * OpenClaw loads external plugins via jiti, which maps
 * `openclaw/plugin-sdk` to the root-alias.cjs proxy.
 * Subpath imports like `openclaw/plugin-sdk/channel-core` may fail
 * in some installation layouts (double node_modules, global installs).
 *
 * This module imports from the root barrel at runtime via require()
 * and re-exports the symbols the plugin needs, while keeping full
 * TypeScript types via devDependency type imports.
 */

import type { ChannelPlugin, OpenClawConfig } from "openclaw/plugin-sdk/core";

export type { ChannelPlugin, OpenClawConfig };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sdk = require("openclaw/plugin-sdk");

export const defineChannelPluginEntry: typeof import("openclaw/plugin-sdk/core").defineChannelPluginEntry =
  sdk.defineChannelPluginEntry;

export const defineSetupPluginEntry: typeof import("openclaw/plugin-sdk/core").defineSetupPluginEntry =
  sdk.defineSetupPluginEntry;

export const createChatChannelPlugin: typeof import("openclaw/plugin-sdk/core").createChatChannelPlugin =
  sdk.createChatChannelPlugin;

export const createChannelPluginBase: typeof import("openclaw/plugin-sdk/core").createChannelPluginBase =
  sdk.createChannelPluginBase;
