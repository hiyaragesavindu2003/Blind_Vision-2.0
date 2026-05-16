import { useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { useElevenLabs } from "@/hooks/useElevenLabs";
import { audioQueue } from "@/utils/audioQueue";
import { VOICE_SCRIPTS } from "@/constants/voiceScripts";
import { IconAlert, IconCheck } from "./icons";

interface EmergencyStopProps {
  onActivate?: () => void;
}

/**
 * Big, hard-to-miss emergency button. Requires a double-tap within 1 second
 * to prevent accidental activation. Once triggered, flushes the audio queue,
 * sets navigation state to EMERGENCY_STOPPED, and disables camera inference.
 */
export const EmergencyStop = ({
  onActivate,
}: EmergencyStopProps): JSX.Element => {
  const emergencyStop = useAppStore((s) => s.emergencyStop);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const setNavState = useAppStore((s) => s.setNavState);
  const appMode = useAppStore((s) => s.appMode);
  const { speakHigh } = useElevenLabs();
  const lastTapRef = useRef<number>(0);

  const trigger = (): void => {
    audioQueue.flush();
    emergencyStop();
    speakHigh(VOICE_SCRIPTS.emergencyActivated);
    onActivate?.();
  };

  const handleClick = (): void => {
    const now = Date.now();
    if (now - lastTapRef.current < 1_000) {
      trigger();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      speakHigh("Tap again to confirm emergency stop.");
    }
  };

  const handleResume = (): void => {
    setAppMode("READY");
    setNavState("IDLE");
    speakHigh(VOICE_SCRIPTS.emergencyResumed);
  };

  if (appMode === "EMERGENCY") {
    return (
      <div
        className="panel panel-emergency text-center animate-fade-in"
        role="alert"
        aria-live="assertive"
      >
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emergency/20 text-emergency mb-3">
          <IconAlert size={32} />
        </span>
        <p className="kicker text-emergency mb-1">Halt</p>
        <h2 className="text-2xl font-black text-emergency mb-3">
          EMERGENCY STOPPED
        </h2>
        <p className="text-sm text-text-muted mb-5">
          All systems are paused. Tap below to resume.
        </p>
        <button
          type="button"
          onClick={handleResume}
          aria-label="Resume systems after emergency stop"
          className="btn-primary w-full"
        >
          <IconCheck size={20} />
          Resume Systems
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Emergency stop. Double tap within one second to confirm."
        className="btn-emergency w-full text-3xl py-7 animate-pulse-glow"
      >
        <IconAlert size={28} />
        EMERGENCY STOP
      </button>
      <p className="text-center text-xs text-text-subtle">
        Double-tap to confirm
      </p>
    </div>
  );
};

export default EmergencyStop;
