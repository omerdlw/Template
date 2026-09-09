"use client";

import { createRouteRegistry } from "@/modules/registry";

export const HomeRegistry = createRouteRegistry({
  displayName: "HomeRegistry",
  resolveConfig: ({ isLoading = false } = {}) => ({
    loading: { isLoading },
  }),
});

export default HomeRegistry;
