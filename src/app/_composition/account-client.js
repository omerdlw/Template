import { requestJson } from "@/infrastructure/http/client";

export const accountClient = Object.freeze({
  getCurrentAccount: () =>
    requestJson("/api/account/me", { notifyOnUnauthorized: false }),
  updateCurrentAccount: (patch) =>
    requestJson("/api/account/me", {
      body: JSON.stringify(patch),
      method: "PATCH",
    }),
});
