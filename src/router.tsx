import { QueryClient } from "@tanstack/react-query";
import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Desktop shell (Electron) loads from file:// where path history is unusable.
  const useHashHistory =
    import.meta.env['VITE_ROUTER_HISTORY'] === "hash" ||
    (typeof window !== "undefined" && window.location.protocol === "file:");

  const router = createRouter({
    routeTree,
    ...(useHashHistory ? { history: createHashHistory() } : {}),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
