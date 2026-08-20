import { useTranslation } from "react-i18next";
import { FileStack } from "lucide-react";
import { DiagramFrame } from "./DiagramFrame";
import { testIds } from "@/testids";
import type { DiagramBlock } from "@/types/shell";

interface PreviewPaneProps {
  blocks: DiagramBlock[];
  onCopy?: ((blockId: string) => void) | undefined;
  onExportSvg?: ((blockId: string) => void) | undefined;
  onExportPng?: ((blockId: string) => void) | undefined;
  onAskAgent?: ((blockId: string) => void) | undefined;
}

export function PreviewPane({ blocks, ...handlers }: PreviewPaneProps) {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t("workspace.region.preview")}
      data-testid={testIds.preview.root}
      className="flex h-full min-h-0 flex-col bg-paper"
    >
      <div className="flex items-center justify-between border-b border-border bg-surface-raised px-md py-sm">
        <span className="text-label-caps text-slate">{t("preview.title")}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-lg" tabIndex={0}>
        {blocks.length === 0 ? (
          <div
            data-testid={testIds.preview.empty}
            className="mx-auto max-w-md rounded-md border border-dashed border-border bg-surface-raised p-xl text-center"
          >
            <FileStack className="mx-auto size-6 text-slate" aria-hidden="true" />
            <h2 className="mt-sm text-h2 text-ink">{t("preview.empty.title")}</h2>
            <p className="mt-xs text-body-sm text-slate">{t("preview.empty.body")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-lg">
            {blocks.map((block) => (
              <DiagramFrame key={block.id} block={block} {...handlers} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
