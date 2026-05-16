/**
 * Centralized voice script strings — keep all user-spoken phrases here.
 * Avoid hardcoding strings in components.
 */

export const VOICE_SCRIPTS = {
  // Wake / listening
  wakeAcknowledged: "Yes?",
  notUnderstood: "I didn't understand that. Please repeat.",
  noisyEnvironment:
    "It's noisy here. Please speak clearly and try again.",

  // Navigation
  calculatingRoute: "Calculating route. Please wait.",
  pleaseWait: "Please wait.",
  destinationNotFound:
    "I couldn't find that destination. Please try a different name.",
  routeFar: (km: number) =>
    `This destination is ${km.toFixed(1)} kilometers away. It may be too far to walk. Do you want to continue?`,
  routeStarted: (name: string) =>
    `Starting navigation to ${name}.`,
  recalculating: "Recalculating route. Please wait.",
  distanceRemaining: (m: number) =>
    `You are ${Math.round(m)} meters from your destination.`,
  arrived: (name: string) => `You have arrived at ${name}.`,
  navigationStopped: "Navigation stopped.",
  lostUser:
    "You seem to be lost. Please stop and ask for help, or try again.",

  // Connection / offline
  connectionLost:
    "Internet connection lost. Using cached route. Some features may be limited.",
  connectionRestored: "Internet connection restored.",

  // Emergency
  emergencyActivated:
    "Emergency stop activated. All systems paused.",
  emergencyResumed: "Emergency stopped resumed. Systems active.",
  callingHelp: "Calling your emergency contact now.",
  shareLocation: "Sharing your current location.",

  // Camera / obstacles
  pathClear: "Path ahead is clear.",
  cameraOn: "Camera enabled. Watching for obstacles.",
  cameraOff: "Camera disabled.",
  obstacleAhead: (label: string, dir: string) =>
    `${label} ${dir}. Please be careful.`,
  vehicleWarning: (dir: string) =>
    `Warning: Vehicle approaching ${dir}.`,
  stairsAhead: "Stairs detected directly ahead. Please stop.",
  personPassing: (dir: string) => `Person passing ${dir}.`,

  // Voice / mute
  voiceMuted: "Voice assistant muted.",
  voiceUnmuted: "Voice assistant resumed.",
  micDenied:
    "Microphone access is required for voice control. Please enable it in your browser.",
  cameraDenied:
    "Camera access is required for obstacle detection. Please enable it in your browser.",

  // Favorites
  locationSaved: (name: string) => `Saved location ${name}.`,
  takingYouTo: (name: string) => `Taking you to ${name}.`,

  // Generic errors
  serverError:
    "I'm having trouble connecting to the server. Please try again.",
  unknownAction: "I'm not sure how to help with that.",

  // Welcome
  welcome:
    "AI Navigation Assistant ready. Say 'assistant' followed by your request.",
} as const;

export const HIGH_PRIORITY_OBJECTS = new Set([
  "car",
  "truck",
  "bus",
  "motorcycle",
  "stairs",
  "stop sign",
  "fire hydrant",
]);

export const MEDIUM_PRIORITY_OBJECTS = new Set([
  "person",
  "bicycle",
  "pole",
  "wall",
  "bench",
  "traffic light",
  "parking meter",
]);
