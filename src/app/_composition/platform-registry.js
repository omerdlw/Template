import { REGISTRY_SOURCES, REGISTRY_TYPES } from "@/modules/registry/contract";

export const PLATFORM_REGISTRY_ENTRIES = Object.freeze([
  {
    source: REGISTRY_SOURCES.STATIC,
    type: REGISTRY_TYPES.NAV,
    items: {
      "/": {
        description: "Template overview",
        icon: "solar:home-2-bold",
        path: "/",
        title: "Home",
      },
      "/account": {
        description: "Profile and security",
        icon: "solar:user-circle-bold",
        path: "/account",
        title: "Account",
      },
    },
  },
]);
