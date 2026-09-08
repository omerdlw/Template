function normalizeValue(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

export function getSupabasePublicConfig() {
  const url = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = normalizeValue(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!url || !publishableKey) return null;
  return { publishableKey, url };
}

export function isSupabaseConfigured() {
  return Boolean(getSupabasePublicConfig());
}

export function requireSupabasePublicConfig() {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set the public URL and publishable key",
    );
  }
  return config;
}

export function requireSupabaseSecretKey() {
  const secretKey = String(process.env.SUPABASE_SECRET_KEY || "").trim();
  if (!secretKey)
    throw new Error("SUPABASE_SECRET_KEY is required on the server");
  return secretKey;
}

export function getSiteUrl() {
  return String(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ).replace(/\/$/, "");
}
