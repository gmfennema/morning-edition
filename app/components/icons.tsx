import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const baseStroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function SvgIcon({ size = 18, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...baseStroke}
      {...props}
    >
      {children}
    </svg>
  );
}

function Audio(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M6 9v6" />
      <path d="M10 7v10" />
      <path d="M14 5v14" />
      <path d="M18 9v6" />
    </SvgIcon>
  );
}

function FieldIntel(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx={12} cy={12} r={4} />
      <path d="M12 5v2" />
      <path d="M12 17v2" />
      <path d="M5 12h2" />
      <path d="M17 12h2" />
      <path d="m8 8 1.5 1.5" />
      <path d="m14.5 14.5 1.5 1.5" />
    </SvgIcon>
  );
}

function Newsletter(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x={4} y={6} width={16} height={12} rx={1.5} />
      <path d="m4 8 8 5 8-5" />
    </SvgIcon>
  );
}

function Weather(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx={8} cy={10} r={3} />
      <path d="M8 4v1" />
      <path d="M4 10H3" />
      <path d="M8 16v1" />
      <path d="M13 10h-1" />
      <path d="M6 6 5 5" />
      <path d="m11 15 1 1" />
      <path d="M16 15h3a2.5 2.5 0 0 0 0-5 3 3 0 0 0-2.8-2" />
      <path d="M13 12a3 3 0 0 0-3-3" />
    </SvgIcon>
  );
}

function Mission(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x={5} y={6} width={14} height={12} rx={2} />
      <path d="M5 10h14" />
      <path d="M9 2v4" />
      <path d="M15 2v4" />
      <path d="m10.5 13.5 1.5 1.5 3-3" />
    </SvgIcon>
  );
}

function Balances(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx={9} cy={9} r={4} />
      <path d="M7.5 9.5c.6.5 1.4.5 2 0 .6-.5.6-1.3 0-1.8-.6-.5-1.4-.5-2 0" />
      <path d="M9 13v2" />
      <path d="M15 12c0-1.1.9-2 2-2h2" />
      <path d="M15 16h5" />
      <path d="M17 18v-6" />
    </SvgIcon>
  );
}

function Storage(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x={4} y={6} width={16} height={4} rx={1} />
      <rect x={4} y={14} width={16} height={4} rx={1} />
      <path d="M8 8h0" />
      <path d="M8 16h0" />
      <path d="M12 8h0" />
      <path d="M12 16h0" />
    </SvgIcon>
  );
}

function Metrics(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 17l3.5-4.5 2.5 3L17 8l2 3" />
      <path d="M5 5v14h14" />
    </SvgIcon>
  );
}

function ProjectPulse(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x={6} y={4} width={12} height={16} rx={2} />
      <path d="M9 4v2" />
      <path d="M15 4v2" />
      <path d="M9 10h4" />
      <path d="M9 14h6" />
      <path d="M9 18h4" />
      <path d="m12 7 1 1 2-2" />
    </SvgIcon>
  );
}

export const Icons = {
  Audio,
  FieldIntel,
  Newsletter,
  Weather,
  Mission,
  Balances,
  Storage,
  Metrics,
  ProjectPulse,
};

export type { IconProps };
