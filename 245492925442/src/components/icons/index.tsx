import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & { className?: string };

function Svg({ children, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function BarsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </Svg>
  );
}

export function CheckSquareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <polyline points="9 12 11.5 14.5 15 10" />
    </Svg>
  );
}

export function BanIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" />
    </Svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8" cy="10" r="2" />
      <polyline points="7 17 12 12 17 17" />
    </Svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </Svg>
  );
}

export function TimesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </Svg>
  );
}

export function CogIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a7.9 7.9 0 000-6l-2.1-.4a6.9 6.9 0 00-1.2-2.1l1-1.9a8 8 0 00-5.2-2l-.9 1.9a6.9 6.9 0 00-2.4 0L7.7 2.6a8 8 0 00-5.2 2l1 1.9a6.9 6.9 0 00-1.2 2.1l-2.1.4a7.9 7.9 0 000 6l2.1.4a6.9 6.9 0 001.2 2.1l-1 1.9a8 8 0 005.2 2l.9-1.9a6.9 6.9 0 002.4 0l.9 1.9a8 8 0 005.2-2l-1-1.9a6.9 6.9 0 001.2-2.1z" />
    </Svg>
  );
}

export function QuestionCircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 114 2c0 1.5-2 2-2 3" />
      <circle cx="12" cy="17" r="1" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="9 6 15 12 9 18" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="6 9 12 15 18 9" />
    </Svg>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="18 15 12 9 6 15" />
    </Svg>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </Svg>
  );
}

export function FileCodeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="10 13 8 15 10 17" />
      <polyline points="14 13 16 15 14 17" />
    </Svg>
  );
}

export function LinkSlashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Svg>
  );
}
