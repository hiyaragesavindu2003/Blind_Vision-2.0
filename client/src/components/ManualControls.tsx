import { useAppStore } from "@/store/appStore";
import { useElevenLabs } from "@/hooks/useElevenLabs";
import { VOICE_SCRIPTS } from "@/constants/voiceScripts";
import {
  IconCamera,
  IconCameraOff,
  IconMic,
  IconMicOff,
  IconNavigation,
  IconPhone,
  IconRepeat,
  IconStop,
} from "./icons";

interface ManualControlsProps {
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onSos: () => void;
}

interface PadButtonProps {
  icon: JSX.Element;
  label: string;
  ariaLabel: string;
  onClick: () => void;
  ariaPressed?: boolean;
  variant?: "default" | "primary" | "warning";
}

const PadButton = ({
  icon,
  label,
  ariaLabel,
  onClick,
  ariaPressed,
  variant = "default",
}: PadButtonProps): JSX.Element => {
  const cls =
    variant === "primary"
      ? "btn-primary"
      : variant === "warning"
      ? "btn-warning"
      : "btn-secondary";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={`${cls} flex-col gap-1 py-4 text-base`}
    >
      <span className="text-2xl flex items-center justify-center">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
};

/**
 * Touch-accessible control panel. Each button is min-80×80 px and labeled
 * for screen readers. Mirrors the voice command surface so users are never
 * blocked by speech-recognition issues.
 */
export const ManualControls = ({
  onStartNavigation,
  onStopNavigation,
  onSos,
}: ManualControlsProps): JSX.Element => {
  const muted = useAppStore((s) => s.muted);
  const cameraOn = useAppStore((s) => s.cameraOn);
  const toggleMuted = useAppStore((s) => s.toggleMuted);
  const toggleCamera = useAppStore((s) => s.toggleCamera);
  const navState = useAppStore((s) => s.navState);
  const { speak, repeatLast } = useElevenLabs();

  const handleToggleMute = (): void => {
    const becomingMuted = !muted;
    if (!becomingMuted) {
      toggleMuted();
      speak(VOICE_SCRIPTS.voiceUnmuted);
    } else {
      speak(VOICE_SCRIPTS.voiceMuted);
      window.setTimeout(() => toggleMuted(), 500);
    }
  };

  const handleToggleCamera = (): void => {
    toggleCamera();
    speak(cameraOn ? VOICE_SCRIPTS.cameraOff : VOICE_SCRIPTS.cameraOn);
  };

  const navActive =
    navState === "NAVIGATING" || navState === "RECALCULATING";

  return (
    <section
      className="panel"
      aria-label="Manual Controls"
      role="region"
    >
      <p className="kicker mb-2">Controls</p>
      <h2 className="text-2xl font-bold mb-5">Manual</h2>

      <div className="grid grid-cols-2 gap-3">
        <PadButton
          icon={<IconNavigation size={22} />}
          label="Navigate"
          ariaLabel="Start Navigation"
          onClick={onStartNavigation}
          variant="primary"
        />
        <PadButton
          icon={<IconStop size={22} />}
          label="Stop"
          ariaLabel="Stop Navigation"
          ariaPressed={!navActive}
          onClick={onStopNavigation}
        />
        <PadButton
          icon={cameraOn ? <IconCamera size={22} /> : <IconCameraOff size={22} />}
          label={cameraOn ? "Camera On" : "Camera Off"}
          ariaLabel={cameraOn ? "Disable camera" : "Enable camera"}
          ariaPressed={cameraOn}
          onClick={handleToggleCamera}
        />
        <PadButton
          icon={<IconRepeat size={22} />}
          label="Repeat"
          ariaLabel="Repeat last instruction"
          onClick={repeatLast}
        />
        <PadButton
          icon={muted ? <IconMicOff size={22} /> : <IconMic size={22} />}
          label={muted ? "Unmute" : "Mute"}
          ariaLabel={muted ? "Unmute voice assistant" : "Mute voice assistant"}
          ariaPressed={muted}
          onClick={handleToggleMute}
        />
        <PadButton
          icon={<IconPhone size={22} />}
          label="SOS"
          ariaLabel="Call for help. Sends SOS."
          onClick={onSos}
          variant="warning"
        />
      </div>
    </section>
  );
};

export default ManualControls;
