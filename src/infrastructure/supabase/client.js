import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "@/infrastructure/env";

let browserClient = null;

export function createBrowserSupabaseClient() {
  if (browserClient) return browserClient;

  const { publishableKey, url } = requireSupabasePublicConfig();
  browserClient = createBrowserClient(url, publishableKey, {
    auth: {
      experimental: { passkey: true },
      flowType: "pkce",
    },
  });

  return browserClient;
}
