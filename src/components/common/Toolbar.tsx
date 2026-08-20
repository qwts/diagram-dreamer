import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  label: string;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}

/** Arrow-key navigable toolbar (role=toolbar) with roving focus. */
export function Toolbar({ label, children, className, ...rest }: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const items = Array.from(
      ref.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const rtl = getComputedStyle(ref.current!).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    let next = current;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === forward) next = current < 0 ? 0 : (current + 1) % items.length;
    else next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={label}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className={cn("flex items-center gap-xs", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
