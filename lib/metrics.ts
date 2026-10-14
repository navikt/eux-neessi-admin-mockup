import "server-only";

import { collectDefaultMetrics, Registry } from "prom-client";

declare global {
  var __NEESSI_ADMIN_METRICS_REGISTRY__: Registry | undefined;
}

function createRegistry(): Registry {
  const registry = new Registry();
  registry.setDefaultLabels({
    app: "eux-neessi-admin",
    env: process.env.NEXT_PUBLIC_ENV ?? "local",
  });
  collectDefaultMetrics({ register: registry });
  return registry;
}

export const registry: Registry =
  globalThis.__NEESSI_ADMIN_METRICS_REGISTRY__ ??
  (globalThis.__NEESSI_ADMIN_METRICS_REGISTRY__ = createRegistry());
