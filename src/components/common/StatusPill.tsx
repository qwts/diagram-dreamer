import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "lagoon" | "danger" | "warning" | "success";

const tones: Record<Tone, string> = {
  neutral: "text-slate border-border bg-muted",
  lagoon: "text-lagoon border-lagoon/40 bg-lagoon-surface",
  danger: "text-danger border-danger/40 bg-danger-surface",
  warning: "text-warning border-warning/40 bg-warning-surface",
  success: "text-success border-success/40 bg-success-surface",
};

/** Status is never signalled by color alone — an icon and a label are always present. */
export function StatusPill({
  tone = "neutral",
  icon,
  children,
  className,
  ...rest
}: {
  tone?: Tone;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-xs rounded-sm border px-xs py-2xs text-body-sm font-medium",
        tones[tone],
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="flex items-center">
        {icon}
      </span>
      <span>{children}</span>
    </span>
  );
}
