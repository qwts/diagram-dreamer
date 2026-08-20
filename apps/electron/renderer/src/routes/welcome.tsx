import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FileText, FolderOpen, Shapes } from "lucide-react";
import { VellumButton } from "@/components/common/VellumButton";
import { recentFiles, templates } from "@/fixtures";
import { testIds } from "@/testids";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
});

function WelcomePage() {
  const { t } = useTranslation();

  return (
    <main
      data-testid={testIds.welcome.root}
      className="mx-auto flex min-h-screen w-full max-w-page flex-col gap-xl px-md py-xl"
    >
      <header>
        <h1 className="text-h1 text-ink">{t("welcome.title")}</h1>
        <p className="mt-xs text-body-md text-slate">{t("welcome.subtitle")}</p>
        <div className="mt-md">
          <VellumButton variant="primary" size="md" data-testid={testIds.welcome.openFile}>
            <FolderOpen className="size-4" aria-hidden="true" />
            {t("welcome.openFile")}
          </VellumButton>
        </div>
      </header>

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="text-h2 text-ink">
          {t("welcome.recent.title")}
        </h2>
        {recentFiles.length === 0 ? (
          <p data-testid={testIds.welcome.recentEmpty} className="mt-sm text-body-sm text-slate">
            {t("welcome.recent.empty")}
          </p>
        ) : (
          <ul
            data-testid={testIds.welcome.recentList}
            className="mt-sm divide-y divide-border overflow-hidden rounded-md border border-border bg-surface-raised"
          >
            {recentFiles.map((file) => (
              <li key={file.id}>
                <Link
                  to="/"
                  data-testid={testIds.welcome.recentItem}
                  className="flex items-center gap-sm px-md py-sm vellum-motion transition-colors hover:bg-muted"
                >
                  <FileText className="size-4 shrink-0 text-slate" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-md text-ink">{file.fileName}</span>
                    <span className="block truncate font-mono text-body-sm text-slate">
                      {file.filePath}
                    </span>
                  </span>
                  <span className="text-body-sm text-slate">{t(file.openedAtKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="templates-heading">
        <h2 id="templates-heading" className="text-h2 text-ink">
          {t("welcome.templates.title")}
        </h2>
        <ul
          data-testid={testIds.welcome.templateGrid}
          className="mt-sm grid gap-md sm:grid-cols-2 lg:grid-cols-3"
        >
          {templates.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                data-testid={testIds.welcome.templateCard}
                className="h-full w-full rounded-md border border-border bg-surface-raised p-md text-start vellum-motion transition-colors hover:border-lagoon/50"
              >
                <span className="flex items-center gap-sm">
                  <Shapes className="size-4 text-slate" aria-hidden="true" />
                  <span className="text-body-md font-medium text-ink">{t(template.nameKey)}</span>
                </span>
                <span className="mt-xs block text-body-sm text-slate">
                  {t(template.descriptionKey)}
                </span>
                <span className="mt-sm block font-mono text-body-sm text-slate">
                  {template.diagramType}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
