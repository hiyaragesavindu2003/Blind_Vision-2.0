import type { SVGProps } from "react";

/**
 * Lucide-style inline SVG icons. All marked aria-hidden because they are
 * decorative — adjacent text/aria-labels carry the real semantics.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
});

export const IconMic = ({ size = 22, ...rest }: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <path d="M12 19v3" />
  </svg>
);

export const IconMicOff = ({
  size = 22,
  ...rest
}: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <path d="M15 9.34V5a3 3 0 0 0-5.94-.6" />
    <path d="M5 10a7 7 0 0 0 12 4.95" />
    <path d="M12 19v3" />
  </svg>
);

export const IconCamera = ({
  size = 22,
  ...rest
}: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export const IconCameraOff = ({
  size = 22,
  ...rest
}: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M21 16.5V9a2 2 0 0 0-2-2h-3l-2-3h-4" />
    <path d="M3 8.5V18a2 2 0 0 0 2 2h12" />
    <path d="M9.5 9.5a4 4 0 1 0 5 5" />
  </svg>
);

export const IconNavigation = ({
  size = 22,
  ...rest
}: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
  </svg>
);

export const IconStop = ({ size = 22, ...rest }: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

export const IconRepeat = ({
  size = 22,
  ...rest
}: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

export const IconAlert = ({ size = 22, ...rest }: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconPhone = ({ size = 22, ...rest }: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const IconCompass = ({
  size = 22,
  ...rest
}: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

export const IconPin = ({ size = 22, ...rest }: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const IconWifi = ({ size = 22, ...rest }: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

export const IconWifiOff = ({
  size = 22,
  ...rest
}: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A11 11 0 0 1 19 12.55" />
    <path d="M5 12.55a11 11 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a16 16 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

export const IconShield = ({
  size = 22,
  ...rest
}: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const IconSparkle = ({
  size = 22,
  ...rest
}: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </svg>
);

export const IconRoute = ({ size = 22, ...rest }: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <circle cx="6" cy="19" r="3" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="18" cy="5" r="3" />
  </svg>
);

export const IconArrow = ({ size = 22, ...rest }: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const IconCheck = ({ size = 22, ...rest }: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconLogo = ({ size = 28, ...rest }: IconProps): JSX.Element => (
  <svg {...base(size)} {...rest}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);
