import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon";

export interface VellumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "bg-lagoon text-on-lagoon hover:bg-lagoon-hover border border-transparent",
  // DESIGN.md defines this as "paper-on-paper with a border", so the border is
  // the only thing identifying it as a control — it takes border-strong (3:1)
  // rather than the soft divider border (WCAG 1.4.11).
  secondary: "bg-surface-raised text-ink border border-border-strong hover:bg-muted",
  ghost: "bg-transparent text-slate border border-transparent hover:bg-muted hover:text-ink",
  danger: "bg-danger-surface text-danger border border-danger/30 hover:bg-danger-surface",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-sm text-body-sm gap-xs",
  md: "h-10 px-md text-body-md gap-sm",
  icon: "h-8 w-8 justify-center",
};

export const VellumButton = forwardRef<HTMLButtonElement, VellumButtonProps>(
  ({ className, variant = "secondary", size = "sm", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex select-none items-center rounded-sm font-medium vellum-motion transition-colors disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
VellumButton.displayName = "VellumButton";
