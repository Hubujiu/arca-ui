import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden={props["aria-label"] ? undefined : true}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {children}
    </svg>
  );
}

const stroke = { stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.8 };

export const PortalIcon = (props: IconProps) => <Icon {...props}><rect x="3" y="3" width="18" height="18" rx="5" {...stroke}/><path d="M8 8h3v3H8zM13 8h3v3h-3zM8 13h3v3H8zM13 13h3v3h-3z" fill="currentColor"/></Icon>;
export const HomeIcon = (props: IconProps) => <Icon {...props}><path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" {...stroke}/></Icon>;
export const SettingsIcon = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="3" {...stroke}/><path d="M19 13.5v-3l-2.1-.7-.7-1.7 1-2-2.1-2.1-2 1-1.7-.7L10.5 2h-3l-.7 2.1-1.7.7-2-1L1 5.9l1 2-.7 1.7L0 10.5v3l2.1.7.7 1.7-1 2L3.9 20l2-1 1.7.7.9 2.3h3l.7-2.1 1.7-.7 2 1 2.1-2.1-1-2 .7-1.7z" transform="translate(2.25 .05) scale(.81)" {...stroke}/></Icon>;
export const LogoutIcon = (props: IconProps) => <Icon {...props}><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M14 8l4 4-4 4M8 12h10" {...stroke}/></Icon>;
export const MenuIcon = (props: IconProps) => <Icon {...props}><path d="M4 7h16M4 12h16M4 17h16" {...stroke}/></Icon>;
export const CloseIcon = (props: IconProps) => <Icon {...props}><path d="m6 6 12 12M18 6 6 18" {...stroke}/></Icon>;
export const ArrowRightIcon = (props: IconProps) => <Icon {...props}><path d="M5 12h14M14 7l5 5-5 5" {...stroke}/></Icon>;
export const ChevronRightIcon = (props: IconProps) => <Icon {...props}><path d="m9 6 6 6-6 6" {...stroke}/></Icon>;
export const CheckIcon = (props: IconProps) => <Icon {...props}><path d="m5 12 4 4L19 6" {...stroke}/></Icon>;
export const AlertIcon = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="9" {...stroke}/><path d="M12 7v6M12 17h.01" {...stroke}/></Icon>;
export const InfoIcon = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="9" {...stroke}/><path d="M12 11v6M12 7h.01" {...stroke}/></Icon>;
export const SearchIcon = (props: IconProps) => <Icon {...props}><circle cx="10.5" cy="10.5" r="6.5" {...stroke}/><path d="m15.5 15.5 4 4" {...stroke}/></Icon>;
export const UserIcon = (props: IconProps) => <Icon {...props}><circle cx="12" cy="8" r="4" {...stroke}/><path d="M4 21a8 8 0 0 1 16 0" {...stroke}/></Icon>;
export const ExternalIcon = (props: IconProps) => <Icon {...props}><path d="M14 4h6v6M20 4l-9 9M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" {...stroke}/></Icon>;
export const MotionIcon = (props: IconProps) => <Icon {...props}><path d="M4 7h9a3 3 0 1 0-3-3M4 12h15a3 3 0 1 1-3 3M4 17h7" {...stroke}/></Icon>;
export const DensityIcon = (props: IconProps) => <Icon {...props}><path d="M5 5h14M5 12h14M5 19h14" {...stroke}/><circle cx="8" cy="5" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="19" r="2" fill="currentColor"/></Icon>;
export const ModuleIcon = (props: IconProps) => <Icon {...props}><rect x="4" y="4" width="6" height="6" rx="1.5" {...stroke}/><rect x="14" y="4" width="6" height="6" rx="1.5" {...stroke}/><rect x="4" y="14" width="6" height="6" rx="1.5" {...stroke}/><rect x="14" y="14" width="6" height="6" rx="1.5" {...stroke}/></Icon>;
export const SpinnerIcon = (props: IconProps) => <Icon {...props}><path d="M21 12a9 9 0 1 1-6.2-8.6" {...stroke}/></Icon>;
