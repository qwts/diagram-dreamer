import { GripVertical } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

/**
 * react-resizable-panels v4 renders its own `data-testid` on the group, panels
 * and separators, derived from the `id` prop (falling back to React's useId,
 * which yields values like `_r_2_`). It wins over any `data-testid` passed in,
 * so ids from the registry were being silently discarded — the split pane and
 * its handle had no addressable testid at all until a Playwright gate caught it.
 *
 * Forwarding the registry id as `id` restores it: the library then renders
 * exactly that value as `data-testid`. It also gives the group a stable
 * layout-persistence key instead of a per-render one, which is what the library
 * wants anyway.
 */
function withRegistryTestId<P extends { id?: string | undefined }>(
  props: P & { "data-testid"?: string | undefined },
): P {
  const { "data-testid": testId, ...rest } = props;
  return (testId === undefined ? rest : { ...rest, id: testId }) as P;
}

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof Group> & { "data-testid"?: string | undefined }) => (
  <Group
    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
    {...withRegistryTestId(props)}
  />
);

const ResizablePanel = Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean | undefined;
  "data-testid"?: string | undefined;
}) => (
  <Separator
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className,
    )}
    {...withRegistryTestId(props)}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
