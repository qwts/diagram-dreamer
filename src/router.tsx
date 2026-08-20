import { createRouter, type RouterHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/** The host supplies history; the shell never chooses it. */
export const getRouter = ({ history }: { history: RouterHistory }) =>
  createRouter({
    routeTree,
    history,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
