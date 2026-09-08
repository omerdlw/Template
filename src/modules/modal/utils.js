export function resolveModalHeader(configOrModalType = {}, legacyConfig = {}) {
  const config =
    configOrModalType &&
    typeof configOrModalType === "object" &&
    !Array.isArray(configOrModalType)
      ? configOrModalType
      : legacyConfig;
  const header =
    config?.header && typeof config.header === "object" ? config.header : {};
  return {
    title: header.title ?? config?.title ?? null,
    actions: header.actions ?? config?.actions ?? null,
    showClose: header.showClose ?? config?.showClose,
  };
}
