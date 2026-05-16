import type { TtsPriority } from "@shared/types";

interface QueueEntry {
  id: string;
  text: string;
  priority: TtsPriority;
  fetchAudio: (text: string) => Promise<Blob>;
  onSpeak?: (text: string) => void;
  onError?: (err: unknown) => void;
}

/**
 * AudioQueue serializes TTS playback while honoring priority.
 *
 * Behavior:
 * - HIGH priority interrupts the currently playing clip and jumps to the front.
 * - MEDIUM/LOW append to the tail.
 * - Identical text already speaking or pending is deduped.
 * - When muted, enqueued items are dropped (callers should record them in state).
 */
export class AudioQueue {
  private queue: QueueEntry[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;
  private currentEntry: QueueEntry | null = null;
  private muted = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.flush();
  }

  isMuted(): boolean {
    return this.muted;
  }

  enqueue(entry: QueueEntry): void {
    if (this.muted) return;

    if (
      this.currentEntry?.text === entry.text &&
      this.currentEntry.priority === entry.priority
    ) {
      return;
    }
    if (this.queue.some((q) => q.text === entry.text)) return;

    if (entry.priority === "HIGH") {
      this.stopCurrent();
      this.queue.unshift(entry);
    } else {
      this.queue.push(entry);
    }

    if (!this.isPlaying) void this.processNext();
  }

  flush(): void {
    this.queue = [];
    this.stopCurrent();
  }

  private stopCurrent(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = "";
      } catch {
        // ignore
      }
    }
    this.currentAudio = null;
    this.currentEntry = null;
    this.isPlaying = false;
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }
    if (this.muted) {
      this.queue = [];
      this.isPlaying = false;
      return;
    }

    const entry = this.queue.shift()!;
    this.currentEntry = entry;
    this.isPlaying = true;

    try {
      const blob = await entry.fetchAudio(entry.text);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudio = audio;
      entry.onSpeak?.(entry.text);

      await new Promise<void>((resolve) => {
        const cleanup = (): void => {
          URL.revokeObjectURL(url);
          audio.removeEventListener("ended", cleanup);
          audio.removeEventListener("error", cleanup);
          resolve();
        };
        audio.addEventListener("ended", cleanup);
        audio.addEventListener("error", cleanup);
        audio.play().catch((err) => {
          entry.onError?.(err);
          cleanup();
        });
      });
    } catch (err) {
      entry.onError?.(err);
    } finally {
      this.currentAudio = null;
      this.currentEntry = null;
      void this.processNext();
    }
  }
}

export const audioQueue = new AudioQueue();
