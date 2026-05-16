import { useAppStore } from "@/store/appStore";
import { IconArrow, IconCheck, IconRoute } from "./icons";

const formatDistance = (m: number): string => {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h} h ${rem} min`;
};

/**
 * Visual surface for the navigation state machine. The hook
 * `useNavigation` lives in App.tsx where it can be shared across
 * voice + manual triggers; this component only renders state.
 */
export const NavigationEngine = (): JSX.Element => {
  const route = useAppStore((s) => s.route);
  const stepIndex = useAppStore((s) => s.currentStepIndex);
  const navState = useAppStore((s) => s.navState);

  if (!route) {
    return (
      <section
        className="panel"
        aria-label="Navigation"
        role="region"
      >
        <p className="kicker mb-2">Route</p>
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
          <IconRoute size={22} className="text-accent" />
          Navigation
        </h2>
        <p className="text-text-muted">
          No active route. Say{" "}
          <em className="text-text">"Assistant, take me to ..."</em> or
          type a destination below to begin.
        </p>
      </section>
    );
  }

  const remainingMeters = route.steps
    .slice(stepIndex)
    .reduce((acc, s) => acc + s.distanceMeters, 0);
  const remainingSeconds = route.steps
    .slice(stepIndex)
    .reduce((acc, s) => acc + s.durationSeconds, 0);

  const progress =
    route.totalDistanceMeters > 0
      ? Math.min(
          100,
          Math.round(
            (1 - remainingMeters / route.totalDistanceMeters) * 100,
          ),
        )
      : 0;

  return (
    <section
      className="panel panel-accent shadow-glow animate-fade-in"
      aria-label="Navigation"
      role="region"
    >
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="kicker">Route</p>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <IconRoute size={22} className="text-accent" />
            <span className="truncate">{route.destinationName}</span>
          </h2>
        </div>
        <span
          className={`chip ${
            navState === "ARRIVED" ? "chip-active" : "chip-active"
          }`}
        >
          {navState}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat
          label="Remaining"
          value={formatDistance(remainingMeters)}
          accent
        />
        <Stat label="ETA" value={formatDuration(remainingSeconds)} />
        <Stat
          label="Step"
          value={`${stepIndex + 1} / ${route.steps.length}`}
        />
      </div>

      {/* Progress bar */}
      <div
        className="h-2.5 rounded-full bg-ink-card-2 overflow-hidden mb-5"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Route progress: ${progress} percent`}
      >
        <div
          className="h-full bg-accent-gradient transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current step hero */}
      <div
        className="p-5 rounded-2xl bg-ink-card-2/70 border border-accent/30"
        aria-live="polite"
      >
        <p className="kicker mb-2 flex items-center gap-2">
          {navState === "ARRIVED" ? (
            <>
              <IconCheck size={14} /> Arrived
            </>
          ) : (
            <>
              <IconArrow size={14} /> Current step
            </>
          )}
        </p>
        <p className="text-xl md:text-2xl font-bold leading-snug">
          {navState === "ARRIVED"
            ? `You have arrived at ${route.destinationName}.`
            : route.steps[stepIndex]?.instruction ?? "—"}
        </p>
        {route.steps[stepIndex] && navState !== "ARRIVED" && (
          <p className="text-sm text-text-muted mt-2 num">
            {formatDistance(route.steps[stepIndex].distanceMeters)} ·{" "}
            {formatDuration(route.steps[stepIndex].durationSeconds)}
          </p>
        )}
      </div>
    </section>
  );
};

const Stat = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}): JSX.Element => (
  <div className="p-3 rounded-2xl bg-ink-card-2/70 border border-ink-border">
    <p className="text-xs uppercase tracking-wider text-text-subtle">
      {label}
    </p>
    <p
      className={`num text-2xl font-bold mt-1 ${
        accent ? "text-accent" : "text-text"
      }`}
    >
      {value}
    </p>
  </div>
);

export default NavigationEngine;
