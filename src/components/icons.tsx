import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export const DashboardIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="4" y="4" width="10" height="10" />
    <rect x="18" y="4" width="10" height="10" />
    <rect x="4" y="18" width="10" height="10" />
    <rect x="18" y="18" width="10" height="10" />
  </svg>
);

export const JobBoardIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="3" y="7" width="26" height="20" rx="2" />
    <path d="M10 7V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
    <path d="M3 13h26" />
    <path d="M12 18h8" />
  </svg>
);

export const BusinessIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="4" y="2" width="24" height="28" rx="2" />
    <line x1="9" y1="6" x2="13" y2="6" />
    <line x1="19" y1="6" x2="23" y2="6" />
    <line x1="9" y1="12" x2="13" y2="12" />
    <line x1="19" y1="12" x2="23" y2="12" />
    <line x1="9" y1="18" x2="13" y2="18" />
    <line x1="19" y1="18" x2="23" y2="18" />
    <line x1="9" y1="24" x2="13" y2="24" />
    <line x1="19" y1="24" x2="23" y2="24" />
  </svg>
);

export const DocsIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v24a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V16z" />
    <polyline points="14 2 14 16 28 16" />
    <line x1="8" y1="22" x2="24" y2="22" />
    <line x1="8" y1="26" x2="20" y2="26" />
  </svg>
);

export const ProfileIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M28 29v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="16" cy="11" r="6" />
  </svg>
);

export const StrategyIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="16" cy="16" r="13" />
    <polygon points="16 7 20 16 16 25 12 16" />
  </svg>
);

export const BrainIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Modern double four-point sparkle AI logo */}
    <path d="M16 3c0 6.627-5.373 12-12 12 6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" />
    <path d="M26 6c0 2.21-1.79 4-4 4 2.21 0 4 1.79 4 4 0-2.21 1.79-4 4-4-2.21 0-4-1.79-4-4z" />
  </svg>
);

export const MetricsIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <line x1="3" y1="29" x2="29" y2="29" />
    <line x1="3" y1="3" x2="3" y2="29" />
    <rect x="7" y="14" width="4" height="15" />
    <rect x="14" y="8" width="4" height="21" />
    <rect x="21" y="3" width="4" height="26" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="16" cy="16" r="4" />
    <path d="M26.4 18.4l1.8.8-1.5 2.6-1.8-.8c-.7.6-1.6 1-2.6 1.3l-.3 2h-3l-.3-2c-1-.3-1.9-.7-2.6-1.3l-1.8.8-1.5-2.6 1.8-.8c-.3-.7-.5-1.5-.5-2.4s.2-1.7.5-2.4l-1.8-.8 1.5-2.6 1.8.8c.7-.6 1.6-1 2.6-1.3l.3-2h3l.3 2c1 .3 1.9.7 2.6 1.3l1.8-.8 1.5 2.6-1.8.8c.3.7.5 1.5.5 2.4s-.2 1.7-.5 2.4z" />
  </svg>
);

export const RocketIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Clean geometric diamond shape representing Zenith (the summit/apex point) */}
    <path d="M16 2L6 12h20z" />
    <path d="M6 12l10 17 10-17" />
    <line x1="16" y1="2" x2="16" y2="29" />
    <line x1="6" y1="12" x2="26" y2="12" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polyline points="3 6 5 6 29 6" />
    <path d="M19 6v-2a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v2" />
    <path d="M10 11v14a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V11" />
    <line x1="12" y1="15" x2="12" y2="25" />
    <line x1="16" y1="15" x2="16" y2="25" />
    <line x1="20" y1="15" x2="20" y2="25" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <line x1="16" y1="5" x2="16" y2="27" />
    <line x1="5" y1="16" x2="27" y2="16" />
  </svg>
);

export const SaveIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M26 30H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h15l7 7v19a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 29 7 29 7 21" />
    <rect x="7" y="2" width="10" height="7" />
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 20h9l9-9-4.5-4.5-9 9v4.5z" />
    <path d="M18 5H4a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V14" />
  </svg>
);

export const WarningIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polygon points="16 3 29 27 3 27" />
    <line x1="16" y1="10" x2="16" y2="19" />
    <line x1="16" y1="23" x2="16.01" y2="23" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="5" y="11" width="22" height="18" rx="2" />
    <path d="M9 11V7a7 7 0 0 1 14 0v4" />
  </svg>
);

export const UnlockIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="5" y="11" width="22" height="18" rx="2" />
    <path d="M9 11V7a7 7 0 0 1 12.5-4.5" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="4" y="6" width="24" height="22" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="24" y1="2" x2="24" y2="6" />
    <line x1="4" y1="12" x2="28" y2="12" />
  </svg>
);

export const RobotIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="6" y="9" width="20" height="16" rx="2" />
    <path d="M10 25v4m12-4v4M12 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    <circle cx="20" cy="16" r="1.5" fill="currentColor" />
    <line x1="10" y1="21" x2="22" y2="21" />
  </svg>
);

export const ShieldIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M16 28s10-5 10-14V7l-10-4L6 7v7c0 9 10 14 10 14z" />
  </svg>
);

export const TargetIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="16" cy="16" r="12" />
    <circle cx="16" cy="16" r="8" />
    <circle cx="16" cy="16" r="4" />
  </svg>
);

export const ChartIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M3 29h26M4 24l7-7 6 6 11-11" />
    <polyline points="22 12 28 12 28 18" />
  </svg>
);

export const LightningIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polygon points="19 2 9 17 15 17 13 30 23 15 17 15" />
  </svg>
);

export const CopyIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="9" y="9" width="18" height="18" rx="2" ry="2" />
    <path d="M5 23H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h17a2 2 0 0 1 2 2v1" />
  </svg>
);

export const ProhibitedIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="16" cy="16" r="12" />
    <line x1="8" y1="8" x2="24" y2="24" />
  </svg>
);

export const ArchiveIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="4" y="10" width="24" height="18" rx="2" ry="2" />
    <path d="M4 10 L16 3 L28 10" />
    <line x1="12" y1="17" x2="20" y2="17" />
  </svg>
);

export const LinkIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M15 7h-4a8 8 0 0 0-8 8v0a8 8 0 0 0 8 8h4m2-16h4a8 8 0 0 1 8 8v0a8 8 0 0 1-8 8h-4M9 15h14" />
  </svg>
);

export const MoneyIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="3" y="6" width="26" height="20" rx="2" />
    <circle cx="16" cy="16" r="5" />
    <path d="M16 11 v10" />
    <path d="M13 13 h6" />
    <path d="M13 19 h6" />
  </svg>
);

export const InstitutionIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M3 28h26M6 28V14M11 28V14M16 28V14M21 28V14M26 28V14M3 14h26M16 3 L3 14h26Z" />
  </svg>
);

export const HandshakeIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M10 20 L3 13 a4.24 4.24 0 1 1 6-6 l7 7" />
    <path d="M22 20 L29 13 a4.24 4.24 0 1 0-6-6 l-7 7" />
    <path d="M16 14 l-4-4 m8 8 l-4-4" />
  </svg>
);

export const StopIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" className={className} {...props}>
    <rect x="6" y="6" width="20" height="20" rx="2" />
  </svg>
);

export const ChatIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M26 4H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h4l6 4 6-4h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="13" cy="13" r="8" />
    <line x1="19" y1="19" x2="29" y2="29" />
  </svg>
);

export const ClipboardIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M24 4h-4a2 2 0 0 0-4 0h-4a4 4 0 0 0-4 4v20a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4V8a4 4 0 0 0-4-4z" />
    <rect x="13" y="2" width="6" height="4" rx="1" />
  </svg>
);

export const RocketLaunchIcon: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M4.5 27.5L8 24l-3-3 3.5-3.5 5 2-1 6.5z" />
    <path d="M13.5 18.5l14-14c.5 1.5.5 4.5-1.5 6.5l-9 9-3.5-1.5z" />
    <path d="M19.5 6.5l6 6" />
    <path d="M9.5 22.5L2.5 29.5" />
    <circle cx="21.5" cy="10.5" r="1.5" fill="currentColor" />
  </svg>
);
