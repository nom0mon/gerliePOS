/**
 * Lightweight inline-SVG icon set (stroke-based, Lucide/Feather style).
 *
 * Inline SVG is used instead of an icon-font or emoji so glyphs are crisp at any
 * size, inherit color via `currentColor`, and add zero runtime dependencies —
 * keeping the offline/PWA footprint minimal.
 */
import type { SVGProps } from 'react';

export type IconName =
  | 'receipt'
  | 'coffee'
  | 'chart'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'close'
  | 'cash'
  | 'gcash'
  | 'check'
  | 'print'
  | 'chevron-left'
  | 'chevron-right'
  | 'bag'
  | 'menu'
  | 'edit'
  | 'box'
  | 'ban'
  | 'lock';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  /** Pixel size for width & height. Default 24. */
  size?: number;
}

/** SVG path/children for each icon, drawn on a 24×24 viewBox. */
const PATHS: Record<IconName, JSX.Element> = {
  receipt: (
    <>
      <path d="M4 3.5h16v17l-2.5-1.5L15 20.5 12 19l-3 1.5L6.5 19 4 20.5z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  coffee: (
    <>
      <path d="M5 9h11v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z" />
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8 2.5c-.6.8-.6 1.7 0 2.5M11.5 2.5c-.6.8-.6 1.7 0 2.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V8M17 20v-9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  cash: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9v6M18 9v6" />
    </>
  ),
  gcash: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <path d="M13 13h3v3M19 16v4M13 19h3M20 13h.01M16 20h4" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  print: (
    <>
      <path d="M7 8V3h10v5" />
      <path d="M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <rect x="7" y="15" width="10" height="6" rx="1" />
    </>
  ),
  'chevron-left': <path d="M15 6l-6 6 6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  bag: (
    <>
      <path d="M6 8h12l-1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  edit: (
    <>
      <path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17z" />
      <path d="M14 6l3 3" />
    </>
  ),
  box: (
    <>
      <path d="M4 8l8-4 8 4v8l-8 4-8-4z" />
      <path d="M4 8l8 4 8-4M12 12v8" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6l12 12" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
};

export default function Icon({ name, size = 24, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
