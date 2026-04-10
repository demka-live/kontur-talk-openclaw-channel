/**
 * Lightweight setup-only entry point.
 *
 * Loaded by OpenClaw when the channel is disabled/unconfigured
 * to provide onboarding and config surfaces without pulling in
 * heavy runtime dependencies.
 */

import { defineSetupPluginEntry } from "./src/sdk.js";
import { konturTalkPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(konturTalkPlugin);
