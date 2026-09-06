import { EVENT_TYPES, globalEvents } from "@/shared";

export async function requestJson(path, options = {}) {
  const {
    notifyOnError = true,
    notifyOnUnauthorized = true,
    ...requestOptions
  } = options;
  const response = await fetch(path, {
    ...requestOptions,
    headers: {
      ...(requestOptions.body ? { "content-type": "application/json" } : {}),
      ...requestOptions.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      payload.error || `Request failed with status ${response.status}`,
    );
    error.status = response.status;
    error.payload = payload;

    if (notifyOnError && (response.status !== 401 || notifyOnUnauthorized)) {
      globalEvents.emit(
        response.status === 401
          ? EVENT_TYPES.API_UNAUTHORIZED
          : EVENT_TYPES.API_ERROR,
        { error, path, source: "app", status: response.status },
      );
    }
    throw error;
  }

  return payload;
}
