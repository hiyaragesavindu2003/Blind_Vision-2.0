import { useAppStore } from "@/store/appStore";
import {
  IconCamera,
  IconCameraOff,
  IconCompass,
  IconMic,
  IconMicOff,
  IconNavigation,
  IconShield,
  IconWifi,
  IconWifiOff,
} from "./icons";

interface RowProps {
  icon: JSX.Element;
  label: string;
  value: string;
  tone?: "active" | "passive" | "warning" | "emergency" | "idle";
  hint?: string;
}

const toneClass = (tone: RowProps["tone"] = "idle"): string => {
  switch (tone) {
    case "active":
      return "dot-active";
    case "passive":
      return "dot-passive";
    case "warning":
      return "dot-warning";
    case "emergency":
      return "dot-emergency";
    default:
      return "dot-idle";
  }
};

const Row = ({ icon, label, value, tone, hint }: RowProps): JSX.Element => (
  <li className="flex items-center gap-3 py-2.5 px-1 border-b border-ink-border/60 last:border-b-0">
    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-ink-card-2 text-text-muted">
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-xs uppercase tracking-wide text-text-subtle">
        {label}
      </p>
      <p className="text-base font-semibold truncate">{value}</p>
      {hint && (
        <p className="text-xs text-text-subtle mt-0.5 truncate">{hint}</p>
      )}
    </div>
    <span
      className={`status-dot ${toneClass(tone)} animate-slow-blink`}
      aria-hidden="true"
    />
  </li>
);

/**
 * Status side-panel: live system state, screen-reader friendly via ARIA
 * label and `aria-live="polite"` parent (configured in App).
 */
export const StatusDisplay = (): JSX.Element => {
  const navState = useAppStore((s) => s.navState);
  const listening = useAppStore((s) => s.listeningMode);
  const cameraOn = useAppStore((s) => s.cameraOn);
  const online = useAppStore((s) => s.online);
  const positionAccuracy = useAppStore((s) => s.positionAccuracy);
  const lastSpoken = useAppStore((s) => s.lastSpoken);
  const muted = useAppStore((s) => s.muted);
  const appMode = useAppStore((s) => s.appMode);

  const accuracyText =
    positionAccuracy === null
      ? "Locating…"
      : positionAccuracy < 30
      ? `±${Math.round(positionAccuracy)} m (good)`
      : `±${Math.round(positionAccuracy)} m`;

  const accuracyTone: RowProps["tone"] =
    positionAccuracy !== null && positionAccuracy < 30 ? "active" : "warning";

  const voiceTone: RowProps["tone"] =
    listening === "ACTIVE"
      ? "active"
      : listening === "PASSIVE"
      ? "passive"
      : muted
      ? "warning"
      : "idle";

  const navTone: RowProps["tone"] =
    navState === "NAVIGATING"
      ? "active"
      : navState === "EMERGENCY_STOPPED"
      ? "emergency"
      : "idle";

  return (
    <section
      className="panel"
      aria-label="Application status"
      role="region"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="kicker">System</p>
          <h2 className="text-2xl font-bold">Status</h2>
        </div>
        <span
          className={`chip ${
            appMode === "EMERGENCY"
              ? "chip-emergency"
              : appMode === "NAVIGATING"
              ? "chip-active"
              : ""
          }`}
        >
          <IconShield size={14} />
          {appMode}
        </span>
      </div>

      <ul className="text-sm">
        <Row
          icon={muted ? <IconMicOff size={18} /> : <IconMic size={18} />}
          label="Voice"
          value={listening + (muted ? " · muted" : "")}
          tone={voiceTone}
        />
        <Row
          icon={<IconNavigation size={18} />}
          label="Navigation"
          value={navState}
          tone={navTone}
        />
        <Row
          icon={cameraOn ? <IconCamera size={18} /> : <IconCameraOff size={18} />}
          label="Camera"
          value={cameraOn ? "ON" : "OFF"}
          tone={cameraOn ? "active" : "idle"}
        />
        <Row
          icon={online ? <IconWifi size={18} /> : <IconWifiOff size={18} />}
          label="Network"
          value={online ? "Online" : "Offline"}
          tone={online ? "active" : "warning"}
        />
        <Row
          icon={<IconCompass size={18} />}
          label="GPS"
          value={accuracyText}
          tone={accuracyTone}
        />
      </ul>

      <div className="mt-5 p-4 rounded-2xl bg-ink-card-2/70 border border-ink-border">
        <p className="kicker text-text-muted">Last spoken</p>
        <p className="text-base mt-1.5 break-words leading-snug">
          {lastSpoken?.text ?? (
            <span className="text-text-subtle italic">No messages yet</span>
          )}
        </p>
      </div>
    </section>
  );
};

export default StatusDisplay;
