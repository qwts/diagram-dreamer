import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ThemeProvider } from "../components/common/ThemeProvider";
import { VellumButton } from "../components/common/VellumButton";

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation();
  console.error(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-md">
      <div className="max-w-md text-center">
        <h1 className="text-h1 text-ink">{t("error.title")}</h1>
        <p className="mt-sm text-body-md text-slate">{t("error.body")}</p>
        <div className="mt-lg flex justify-center">
          <VellumButton variant="primary" size="md" onClick={reset}>
            {t("error.retry")}
          </VellumButton>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <ThemeProvider>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </ThemeProvider>
  );
}
