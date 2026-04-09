/**
 * Long-polling service that continuously fetches messages from the
 * Kontur Talk Bot API and dispatches them to the inbound handler.
 *
 * Registered as an OpenClaw background service so it starts/stops
 * together with the gateway lifecycle.
 */

import { KonturTalkClient } from "./client.js";
import type { TalkMessage, ResolvedAccount } from "./types.js";

export type InboundDispatcher = (message: TalkMessage) => Promise<void>;

export interface PollerOptions {
  account: ResolvedAccount;
  dispatch: InboundDispatcher;
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

export class KonturTalkPoller {
  private running = false;
  private readonly client: KonturTalkClient;
  private readonly dispatch: InboundDispatcher;
  private readonly timeout: number;
  private readonly logger: PollerOptions["logger"];

  constructor(opts: PollerOptions) {
    this.client = new KonturTalkClient({
      baseUrl: opts.account.baseUrl,
      token: opts.account.token,
    });
    this.dispatch = opts.dispatch;
    this.timeout = opts.account.pollingTimeout;
    this.logger = opts.logger;
  }

  async start(): Promise<void> {
    this.running = true;
    this.logger.info("[kontur-talk] poller started");

    while (this.running) {
      try {
        const messages = await this.client.getUpdates(this.timeout);
        for (const msg of messages) {
          try {
            await this.dispatch(msg);
          } catch (err) {
            this.logger.error(`[kontur-talk] dispatch error: ${String(err)}`);
          }
        }
      } catch (err: any) {
        if (!this.running) break;
        if (err?.name === "AbortError") continue;
        this.logger.warn(`[kontur-talk] polling error, retrying in 5s: ${String(err)}`);
        await sleep(5000);
      }
    }

    this.logger.info("[kontur-talk] poller stopped");
  }

  stop(): void {
    this.running = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
