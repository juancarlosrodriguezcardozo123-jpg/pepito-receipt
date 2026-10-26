import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (d: React.ReactNode) =>
  function Icon(props: P) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        {d}
      </svg>
    );
  };

export const IconHome = base(<><path d="M3 10.5 12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" /></>);
export const IconFile = base(<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5" /></>);
export const IconCompare = base(<><rect x="3" y="4" width="7" height="16" rx="1" /><rect x="14" y="4" width="7" height="16" rx="1" /><path d="M6 9h1M6 13h1M17 9h1M17 13h1" /></>);
export const IconSpark = base(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6 6 2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></>);
export const IconHistory = base(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>);
export const IconUser = base(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>);
export const IconShield = base(<><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /></>);
export const IconUpload = base(<><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>);
export const IconTrash = base(<><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></>);
export const IconDownload = base(<><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>);
export const IconSearch = base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const IconSun = base(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const IconMoon = base(<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />);
export const IconMenu = base(<><path d="M4 6h16M4 12h16M4 18h16" /></>);
export const IconX = base(<><path d="M6 6l12 12M18 6 6 18" /></>);
export const IconLogout = base(<><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" /></>);
export const IconInfo = base(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>);
export const IconAlert = base(<><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></>);
export const IconCheck = base(<path d="m5 12 4.5 4.5L19 7" />);
export const IconArrowRight = base(<><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>);
export const IconLayers = base(<><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>);
export const IconPlug = base(<><path d="M9 3v5M15 3v5" /><path d="M6 8h12v3a6 6 0 0 1-12 0z" /><path d="M12 17v4" /></>);
export const IconBug = base(<><rect x="7" y="7" width="10" height="13" rx="5" /><path d="M12 7V4M4 13h3M17 13h3M5 7l2 2M19 7l-2 2M5 19l2-2M19 19l-2-2" /></>);
export const IconChart = base(<><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-5M12 16V8M16 16v-3" /></>);
