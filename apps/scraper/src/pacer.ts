import { jitter, nap, Aborted } from "./util";

/**
 * Keeps us fast but polite. Starts at the configured concurrency, then adapts:
 *  - a block (CAPTCHA, /sorry/, 429) drops to one worker and pauses everyone with exponential backoff (1 min, 2, 4... up to 15)
 *  - a long run of clean pages earns one worker back, up to the configured maximum.
 */
export class Pacer {
  allowed: number;
  private cooldownUntil = 0;
  private blocks = 0;
  private streak = 0;
  constructor(
    readonly max: number,
    private minDelay: number,
    private maxDelay: number,
    private signal: AbortSignal,
    private onCooldown: (ms: number, blocks: number) => void,
  ) {
    this.allowed = max;
  }

  /** Call before every page load. `slot` is the worker's index; slots above `allowed` idle. */
  async gate(slot: number) {
    for (;;) {
      if (this.signal.aborted) throw new Aborted();
      const wait = this.cooldownUntil - Date.now();
      if (wait > 0) {
        await nap(Math.min(wait, 5000), this.signal);
        continue;
      }
      if (slot >= this.allowed) {
        await nap(1000, this.signal);
        continue;
      }
      break;
    }
    await nap(jitter(this.minDelay, this.maxDelay), this.signal);
  }

  ok() {
    if (++this.streak >= 25) {
      this.streak = 0;
      if (this.allowed < this.max) this.allowed++;
      else if (this.blocks > 0) this.blocks--;
    }
  }

  blocked() {
    this.streak = 0;
    this.allowed = 1;
    const ms = Math.min(60_000 * 2 ** this.blocks, 15 * 60_000);
    this.blocks++;
    this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + ms);
    this.onCooldown(ms, this.blocks);
    return this.blocks;
  }

  get blockCount() {
    return this.blocks;
  }
}
