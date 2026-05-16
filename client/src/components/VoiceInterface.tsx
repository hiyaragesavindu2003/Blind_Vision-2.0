import { useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useElevenLabs } from "@/hooks/useElevenLabs";
import { classifyCommand } from "@/services/commandClassifier";
import { checkTranscript } from "@/utils/noiseFilter";
import { VOICE_SCRIPTS } from "@/constants/voiceScripts";
import { IconMic, IconAlert, IconSparkle } from "./icons";
import type { ClassifiedCommand } from "@shared/types";

interface VoiceInterfaceProps {
  enabled: boolean;
  onCommand: (cmd: ClassifiedCommand) => void;
}

const Waveform = ({ active }: { active: boolean }): JSX.Element => (
  <div
    className="flex items-end justify-center gap-1.5 h-10"
    aria-hidden="true"
  >
    {[1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        className={`w-1.5 rounded-full bg-accent origin-bottom transition-all ${
          active
            ? `h-full animate-waveform-${i}`
            : "h-2 opacity-50"
        }`}
      />
    ))}
  </div>
);

/**
 * Hero voice control card. Combines the wake-word listener, a manual
 * push-to-talk fallback, an animated waveform, and a live transcript readout.
 */
export const VoiceInterface = ({
  enabled,
  onCommand,
}: VoiceInterfaceProps): JSX.Element => {
  const language = useAppStore((s) => s.language);
  const listeningMode = useAppStore((s) => s.listeningMode);
  const lastTranscript = useAppStore((s) => s.lastTranscript);
  const micPermission = useAppStore((s) => s.micPermission);
  const { speak, speakHigh } = useElevenLabs();
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playWakeChime = (): void => {
    try {
      if (!audioCtxRef.current) {
        const Ctor =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window.AudioContext || (window as any).webkitAudioContext) as
            | typeof AudioContext
            | undefined;
        if (!Ctor) return;
        audioCtxRef.current = new Ctor();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        1320,
        ctx.currentTime + 0.12,
      );
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.18,
      );
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // ignore
    }
  };

  const { startActive, supported } = useVoiceRecognition({
    enabled,
    language: `${language}-${language === "en" ? "US" : language.toUpperCase()}`,
    onWake: () => {
      playWakeChime();
    },
    onCommand: (text, confidence) => {
      const check = checkTranscript(text, confidence);
      if (!check.ok) {
        if (check.reason === "low_confidence") {
          speak(VOICE_SCRIPTS.notUnderstood);
        }
        return;
      }
      void classifyCommand(text, language)
        .then((cmd) => {
          if (cmd.category === "IRRELEVANT") return;
          onCommand(cmd);
        })
        .catch(() => {
          speak(VOICE_SCRIPTS.serverError);
        });
    },
    onError: (msg) => {
      if (msg === "microphone_denied") speakHigh(VOICE_SCRIPTS.micDenied);
    },
  });

  const handlePushToTalk = (): void => {
    if (!enabled) {
      speakHigh(
        "Voice is not enabled. Please tap the Enable Voice button at the top.",
      );
      return;
    }
    playWakeChime();
    startActive();
  };

  const isActive = listeningMode === "ACTIVE";
  const isPassive = listeningMode === "PASSIVE";

  const statusLabel = isActive
    ? "Listening — speak now"
    : isPassive
    ? "Awake — say 'assistant' or tap below"
    : enabled
    ? "Starting up…"
    : "Voice control is disabled";

  return (
    <section
      className={`panel ${
        isActive ? "panel-accent shadow-glow" : ""
      } animate-fade-in`}
      aria-label="Voice control"
      role="region"
    >
      <div className="flex items-center gap-4 mb-5">
        <span
          className={`flex items-center justify-center w-12 h-12 rounded-2xl ${
            isActive
              ? "bg-accent text-black animate-pulse-glow"
              : isPassive
              ? "bg-accent/10 text-accent"
              : "bg-ink-card-2 text-text-subtle"
          }`}
          aria-hidden="true"
        >
          <IconMic size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="kicker">Voice control</p>
          <p className="text-xl md:text-2xl font-bold mt-0.5" aria-live="polite">
            {statusLabel}
          </p>
        </div>
        <Waveform active={isActive} />
      </div>

      <button
        type="button"
        onClick={handlePushToTalk}
        disabled={!enabled || !supported}
        aria-label="Push to talk. Tap and then speak your command."
        aria-pressed={isActive}
        className={`btn-primary w-full text-2xl py-5 ${
          isActive ? "animate-pulse-glow" : ""
        }`}
      >
        <IconMic size={26} />
        {isActive ? "Listening… speak now" : "Tap to Speak"}
      </button>

      <div
        className="mt-5 p-4 rounded-2xl border border-ink-border bg-ink-card-2/60 min-h-[78px] relative overflow-hidden"
        aria-live="polite"
        aria-label="Live transcript"
      >
        {isActive && (
          <span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/10 to-transparent animate-sweep"
            aria-hidden="true"
          />
        )}
        <p className="kicker text-text-muted mb-1 relative">
          Heard
        </p>
        <p className="text-base md:text-lg break-words relative">
          {lastTranscript || (
            <span className="text-text-subtle italic">
              {enabled
                ? "Waiting for speech…"
                : "Voice is disabled."}
            </span>
          )}
        </p>
      </div>

      {/* Hint chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          "Take me to ...",
          "What's around me?",
          "Camera",
          "Repeat",
          "Mute",
        ].map((s) => (
          <span
            key={s}
            className="chip text-text-muted"
            aria-hidden="true"
          >
            <IconSparkle size={12} className="text-accent" />
            {s}
          </span>
        ))}
      </div>

      {!supported && (
        <div
          className="mt-4 p-3 rounded-xl border border-warning/40 bg-warning/10 text-warning flex items-start gap-3"
          role="alert"
        >
          <IconAlert size={18} className="mt-1 flex-shrink-0" />
          <p className="text-sm">
            Speech recognition is not supported in this browser. Please use
            <strong> Chrome</strong> or <strong>Edge</strong>, or use the
            destination input below.
          </p>
        </div>
      )}
      {supported && micPermission === "denied" && (
        <div
          className="mt-4 p-3 rounded-xl border border-warning/40 bg-warning/10 text-warning flex items-start gap-3"
          role="alert"
        >
          <IconAlert size={18} className="mt-1 flex-shrink-0" />
          <p className="text-sm">
            Microphone access was blocked. Click the lock icon in your browser
            address bar, allow microphone, then reload.
          </p>
        </div>
      )}
    </section>
  );
};

export default VoiceInterface;
