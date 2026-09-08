"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AdaptiveImage from "@/ui/components/adaptive-image";

import { useAccount } from "@/modules/account";
import { useAuth } from "@/modules/auth";
import { useBackgroundActions, useBackgroundState } from "@/modules/background";
import { ErrorBoundaryCore } from "@/modules/error-boundary";
import { useLoadingActions, useLoadingState } from "@/modules/loading";
import {
  ModalContainer,
  useModalActions,
  useModalState,
} from "@/modules/modal";
import {
  NavSurfaceHeader,
  NavSurfaceShell,
  createSurfaceFlowDefinition,
  useNavigationActions,
  useNavigationGuard,
  useNavigationOperations,
  useNavigationState,
  useRegisterBreadcrumbOverride,
} from "@/modules/nav";
import {
  useNotificationActions,
  useNotificationState,
  useToast,
} from "@/modules/notification";
import {
  DYNAMIC_SOURCE,
  REGISTRY_TYPES,
  useContextMenuRegistration,
  useControlsRegistration,
  useModalRegistration,
  useNavHudRegistration,
  useRegistryActions,
  useRegistryDiagnostics,
  useRegistryEntries,
  validateRegistryValue,
} from "@/modules/registry";
import { cn } from "@/shared/utils";
import { Button, Checkbox, Input } from "@/ui/primitives";
import Icon from "@/ui/primitives/icon";

const REGISTRATION_OPTIONS = Object.freeze({ source: "modules-workbench" });
const MODULES = Object.freeze([
  ["nav", "Navigation", "solar:compass-bold"],
  ["registry", "Registry", "solar:database-bold"],
  ["background", "Background", "solar:gallery-bold"],
  ["controls", "Controls", "solar:slider-minimalistic-horizontal-bold"],
  ["auth", "Auth", "solar:shield-keyhole-bold"],
  ["account", "Account", "solar:user-circle-bold"],
  ["notification", "Notification", "solar:bell-bold"],
  ["modal", "Modal", "solar:maximize-square-bold"],
  ["context-menu", "Context menu", "solar:menu-dots-square-bold"],
  ["loading", "Loading", "solar:hourglass-bold"],
  ["error-boundary", "Error boundary", "solar:shield-warning-bold"],
  ["flows", "Flows", "solar:layers-bold"],
]);
const BACKGROUNDS = Object.freeze({
  ember:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'%3E%3Cdefs%3E%3CradialGradient id='a'%3E%3Cstop stop-color='%23fb923c'/%3E%3Cstop offset='1' stop-color='%23181717'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23a)'/%3E%3C/svg%3E",
  ocean:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'%3E%3Cdefs%3E%3CradialGradient id='a'%3E%3Cstop stop-color='%2338bdf8'/%3E%3Cstop offset='1' stop-color='%230c1222'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23a)'/%3E%3C/svg%3E",
  violet:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'%3E%3Cdefs%3E%3CradialGradient id='a'%3E%3Cstop stop-color='%23c084fc'/%3E%3Cstop offset='1' stop-color='%23140f20'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23a)'/%3E%3C/svg%3E",
});

function Panel({ children, className = "" }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

function State({ label, value, tone = "default" }) {
  const tones = {
    default: "border-white/10 text-white/70",
    live: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    danger: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  };
  return (
    <div className={cn("rounded-xl border px-3 py-2", tones[tone])}>
      <span className="block font-mono text-xs uppercase text-white/50">
        {label}
      </span>
      <strong className="mt-1 block truncate font-mono text-xs">
        {String(value)}
      </strong>
    </div>
  );
}

function NavSurface({ close, input }) {
  const [step, setStep] = useState(1);
  return (
    <NavSurfaceShell className="space-y-4 p-4 text-white">
      <NavSurfaceHeader
        title={input?.flow ? `Surface flow · ${step}/3` : "Navigation surface"}
        description="Nav surface stack üzerinde çalışır"
        onClose={() => close({ cancelled: true })}
      />
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-xs text-white/70">
        {input?.flow ? (
          <>
            <div className="mb-4 flex gap-1">
              {[1, 2, 3].map((item) => (
                <span
                  key={item}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    item <= step ? "bg-white" : "bg-white/15",
                  )}
                />
              ))}
            </div>
            <div>Step {step}: state remains inside the surface flow</div>
          </>
        ) : (
          <div>Surface received: {input?.message || "no input"}</div>
        )}
      </div>
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          disabled={step === 1 || !input?.flow}
          onClick={() => setStep((value) => value - 1)}
          className="rounded-lg ring-1 ring-inset ring-white/5 bg-white/5 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
        >
          Back
        </Button>
        {input?.flow && step < 3 ? (
          <Button
            type="button"
            onClick={() => setStep((value) => value + 1)}
            className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => close({ success: true, step, input })}
            className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
          >
            Complete
          </Button>
        )}
      </div>
    </NavSurfaceShell>
  );
}

function ModalWorkbenchSurface({ close, data }) {
  const [favorite, setFavorite] = useState(false);
  return (
    <ModalContainer
      close={close}
      header={{ title: data?.title || "Workbench surface", showClose: true }}
      footer={{
        right: (
          <Button
            type="button"
            onClick={() => close({ accepted: true, favorite })}
            className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
          >
            Resolve
          </Button>
        ),
      }}
    >
      <div className="space-y-4 p-5 text-sm text-white/70">
        <Button
          type="button"
          onClick={() => setFavorite((value) => !value)}
          className="rounded-lg ring-1 ring-inset ring-white/5 bg-white/5 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
        >
          {favorite ? "Favorite" : "Not favorite"}
        </Button>
        <p>Responsive position, stack state and promise settlement are live</p>
      </div>
    </ModalContainer>
  );
}

function ErrorProbe({ crash }) {
  if (crash) throw new Error("Modules workbench probe");
  return (
    <span className="font-mono text-xs text-emerald-300">healthy child</span>
  );
}

function WorkbenchOperationHud({ operation }) {
  const progress = Math.round(Number(operation.progress || 0) * 100);
  return (
    <div className="flex w-full items-center gap-3 px-1 text-white">
      <span className="font-mono text-xs text-white/50">job</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {operation.label}
      </span>
      <span className="font-mono text-xs text-emerald-200">{progress}%</span>
      <span className="h-1 w-20 overflow-hidden rounded-full bg-white/10">
        <span
          className="block h-full bg-emerald-300"
          style={{ width: progress + "%" }}
        />
      </span>
    </div>
  );
}

const NAV_FLOW = createSurfaceFlowDefinition({
  id: "modules-workbench-flow",
  createSurface: ({ input }) => ({
    component: NavSurface,
    props: { input: { ...input, flow: true } },
    title: "Workbench flow",
  }),
});

export default function ModulesWorkbench() {
  const pathname = usePathname();
  const [active, setActive] = useState("nav");
  const [logs, setLogs] = useState([]);
  const [guard, setGuard] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState(false);
  const [selectionCount, setSelectionCount] = useState(3);
  const [customHud, setCustomHud] = useState(false);
  const [hudSamples, setHudSamples] = useState({
    image: false,
    interactive: false,
    priorityBase: false,
    priorityOverride: false,
    text: false,
  });
  const [controls, setControls] = useState({
    pair0: true,
    pair1: false,
    orphan: false,
  });
  const [minimumDuration, setMinimumDuration] = useState(1200);
  const [accountDraft, setAccountDraft] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [crash, setCrash] = useState(false);
  const timers = useRef([]);

  const auth = useAuth();
  const account = useAccount();
  const background = useBackgroundState();
  const backgroundActions = useBackgroundActions();
  const loading = useLoadingState();
  const loadingActions = useLoadingActions();
  const modal = useModalState();
  const { openModal } = useModalActions();
  const navState = useNavigationState();
  const navActions = useNavigationActions();
  const operations = useNavigationOperations();
  const notifications = useNotificationState();
  const { dismissNotification } = useNotificationActions();
  const toast = useToast();
  const { register, unregister } = useRegistryActions();
  const diagnostics = useRegistryDiagnostics();
  const navEntries = useRegistryEntries(REGISTRY_TYPES.NAV);
  const navHudEntries = useRegistryEntries(REGISTRY_TYPES.NAV_HUD);
  const controlsEntries = useRegistryEntries(REGISTRY_TYPES.CONTROLS);

  const log = useCallback((event, value = null) => {
    setLogs((current) => [
      {
        event,
        time: new Date().toLocaleTimeString(),
        value:
          value == null
            ? null
            : typeof value === "string"
              ? value
              : JSON.stringify(value),
      },
      ...current.slice(0, 17),
    ]);
  }, []);
  const schedule = useCallback((callback, delay) => {
    const timer = setTimeout(callback, delay);
    timers.current.push(timer);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(
    () => () => {
      navActions.clearHud("modules-custom-hud");
      navActions.clearSelectionMode();
      unregister(REGISTRY_TYPES.NAV, "modules-dynamic-nav", {
        source: DYNAMIC_SOURCE,
      });
    },
    [navActions, unregister],
  );

  useNavigationGuard({
    when: active === "nav" && guard,
    message: "Workbench guard is active",
    onBlock: ({ to }) => log("guard:blocked", to),
  });
  useRegisterBreadcrumbOverride(
    active === "nav" && breadcrumb
      ? {
          path: pathname,
          title: "Workbench breadcrumb",
          icon: "solar:pin-bold",
        }
      : undefined,
  );

  const modalConfig = useMemo(
    () => ({ MODULES_WORKBENCH_MODAL: ModalWorkbenchSurface }),
    [],
  );
  const contextConfig = useMemo(
    () => ({
      target: "[data-workbench-context]",
      priority: 500,
      header: { eyebrow: "Registry descriptor", title: "Context actions" },
      items: [
        {
          key: "open-modal",
          icon: "solar:maximize-square-bold",
          label: "Open modal",
          onSelect: async () => {
            const result = await openModal(
              "MODULES_WORKBENCH_MODAL",
              { mobile: "bottom", desktop: "center" },
              { data: { title: "Context → Modal" } },
            );
            log("context:modal", result);
            if (result?.accepted)
              toast.success("Context flow resolved", {
                allowInProduction: true,
              });
          },
        },
        {
          key: "toast",
          icon: "solar:bell-bold",
          label: "Toast",
          onSelect: () =>
            toast.info("Context menu action", { allowInProduction: true }),
        },
        "separator",
        { key: "locked", label: "Disabled action", disabled: true },
      ],
    }),
    [log, openModal, toast],
  );
  const controlsConfig = useMemo(() => {
    const entries = [];
    if (controls.pair0) {
      entries.push(
        {
          id: "workbench-left-0",
          path: pathname,
          side: "left",
          order: 0,
          content: (
            <Button
              type="button"
              onClick={() => log("controls:left")}
              className="rounded-full bg-white px-3 py-2 text-xs font-bold text-black"
            >
              Filter
            </Button>
          ),
        },
        {
          id: "workbench-right-0",
          path: pathname,
          side: "right",
          order: 0,
          content: (
            <Button
              type="button"
              onClick={() => log("controls:right")}
              className="rounded-full border border-white/15 px-3 py-2 text-xs text-white"
            >
              View
            </Button>
          ),
        },
      );
    }
    if (controls.pair1) {
      entries.push(
        {
          id: "workbench-left-1",
          path: pathname,
          side: "left",
          order: 1,
          content: (
            <span className="rounded-full border border-sky-300/30 px-3 py-2 font-mono text-xs text-sky-200">
              Page
            </span>
          ),
        },
        {
          id: "workbench-right-1",
          path: pathname,
          side: "right",
          order: 1,
          content: (
            <span className="rounded-full border border-sky-300/30 px-3 py-2 font-mono text-xs text-sky-200">
              1 / 8
            </span>
          ),
        },
      );
    }
    if (controls.orphan) {
      entries.push({
        id: "workbench-orphan",
        path: pathname,
        side: "left",
        order: 9,
        content: <span>orphan</span>,
      });
    }
    return entries;
  }, [controls, log, pathname]);
  const navHudConfig = useMemo(() => {
    const samples = [];
    if (hudSamples.image) {
      samples.push({
        id: "workbench-hud-image",
        content: (
          <AdaptiveImage
            alt="Warm radial preview"
            className="h-11 w-full rounded-lg object-cover"
            src={BACKGROUNDS.ember}
          />
        ),
        registry: { priority: 100 },
      });
    }
    if (hudSamples.text) {
      samples.push({
        id: "workbench-hud-text",
        content: (
          <p className="w-full px-1 text-sm font-medium text-white">
            A single line of JSX owns this card
          </p>
        ),
        registry: { priority: 200 },
      });
    }
    if (hudSamples.interactive) {
      samples.push({
        id: "workbench-hud-interactive",
        content: (
          <div className="flex w-full items-center justify-between gap-3 px-1">
            <span className="text-sm font-semibold text-sky-100">Live JSX</span>
            <Button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setHudSamples((current) => ({
                  ...current,
                  interactive: false,
                }));
                log("nav:hud:interactive-dismiss");
              }}
              className="rounded-full border border-sky-200/30 px-3 py-1.5 text-xs text-sky-100"
            >
              Dismiss
            </Button>
          </div>
        ),
        registry: { priority: 300 },
      });
    }
    if (hudSamples.priorityBase) {
      samples.push({
        id: "workbench-hud-priority-base",
        content: (
          <div className="w-full px-1 font-mono text-xs text-amber-100">
            Registry priority 400
          </div>
        ),
        registry: { priority: 400 },
      });
    }
    if (hudSamples.priorityOverride) {
      samples.push({
        id: "workbench-hud-priority-override",
        content: (
          <div className="w-full px-1 font-mono text-xs text-fuchsia-100">
            Registry priority 900
          </div>
        ),
        registry: { priority: 900 },
      });
    }
    return samples;
  }, [hudSamples, log]);

  useModalRegistration(
    active === "modal" || active === "context-menu" || active === "flows"
      ? modalConfig
      : null,
    REGISTRATION_OPTIONS,
  );
  useContextMenuRegistration(
    active === "context-menu" || active === "flows" ? contextConfig : null,
    REGISTRATION_OPTIONS,
  );
  useControlsRegistration(
    active === "controls" ? controlsConfig : null,
    REGISTRATION_OPTIONS,
  );
  useNavHudRegistration(
    active === "nav" ? navHudConfig : null,
    REGISTRATION_OPTIONS,
  );

  const runOperation = () => {
    const operation = operations.start({
      hud: WorkbenchOperationHud,
      label: "Workbench operation",
      progress: 0.05,
    });
    if (!operation) return;
    log("operation:start", operation.id);
    schedule(() => operations.update(operation.id, { progress: 0.48 }), 350);
    schedule(() => operations.update(operation.id, { progress: 0.82 }), 700);
    schedule(() => {
      operations.complete(operation.id, { success: true });
      log("operation:complete", operation.id);
    }, 1050);
  };
  const runLoading = () => {
    loadingActions.startLoading({
      minDuration: Number(minimumDuration),
      showOverlay: true,
    });
    log("loading:start", minimumDuration);
    schedule(() => {
      loadingActions.stopLoading();
      log("loading:stop");
    }, 350);
  };
  const registerDynamicNav = (priority) => {
    const handle = register(
      REGISTRY_TYPES.NAV,
      "modules-dynamic-nav",
      {
        description: `Dynamic priority ${priority}`,
        icon: "solar:flask-bold",
        path: "/modules/dynamic",
        title: "Workbench dynamic entry",
      },
      DYNAMIC_SOURCE,
      { priority },
    );
    log("registry:register", { priority, accepted: Boolean(handle) });
  };
  const setSelection = () => {
    navActions.setSelectionMode({
      isActive: true,
      content: (
        <div className="flex w-full items-center justify-between gap-3 px-1">
          <span className="text-sm font-semibold text-white">
            {selectionCount} selected
          </span>
          <Button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navActions.clearSelectionMode();
            }}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white"
          >
            Clear
          </Button>
        </div>
      ),
      count: selectionCount,
      title: `${selectionCount} selected`,
      actions: [
        { key: "all", label: "All", onClick: () => setSelectionCount(24) },
        {
          key: "clear",
          label: "Clear",
          onClick: () => navActions.clearSelectionMode(),
        },
      ],
      onCancel: () => navActions.clearSelectionMode(),
    });
    log("nav:selection-mode", selectionCount);
  };
  const setHud = () => {
    const next = !customHud;
    setCustomHud(next);
    if (!next) {
      navActions.clearHud("modules-custom-hud");
      return;
    }
    navActions.setHud({
      id: "modules-custom-hud",
      isActive: true,
      content: (
        <div className="flex w-full items-center justify-between gap-3 px-1">
          <span className="text-sm font-semibold text-white">
            Direct JSX HUD
          </span>
          <Button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setCustomHud(false);
              navActions.clearHud("modules-custom-hud");
            }}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white"
          >
            Dismiss
          </Button>
        </div>
      ),
      title: "Custom command HUD",
      description: "Registered directly through NavigationActions",
      icon: "solar:bolt-bold",
      actions: [
        { key: "ping", label: "Ping", onClick: () => log("nav:hud:ping") },
        { key: "close", label: "Close", onClick: () => setHud() },
      ],
    });
    log("nav:custom-hud");
  };

  const authAal =
    typeof auth.aal === "object" ? auth.aal?.currentLevel : auth.aal;
  const notificationCount = Object.keys(
    notifications.notifications || {},
  ).length;
  const snapshot = {
    nav: {
      compactLocked: navState.compactLocked,
      expanded: navState.expanded,
      hud: navState.hud?.id || null,
      operations: operations.entries.length,
      surfaces: navState.surfaceStack?.length || 0,
    },
    registry: {
      diagnostics: diagnostics.length,
      nav: navEntries.length,
      controls: controlsEntries.length,
    },
    runtime: {
      background: background.hasBackground,
      loading: loading.isLoading,
      modal: modal.modalStack?.length || 0,
      notifications: notificationCount,
    },
  };

  let stage = null;
  if (active === "nav") {
    stage = (
      <div className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
        <Panel className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Button
              type="button"
              onClick={setSelection}
              className="rounded-xl border border-white/10 p-3 text-left text-xs text-white"
            >
              Selection HUD · {selectionCount}
            </Button>
            <Button
              type="button"
              onClick={setHud}
              className="rounded-xl border border-white/10 p-3 text-left text-xs text-white"
            >
              Custom HUD · {customHud ? "on" : "off"}
            </Button>
            {[
              ["image", "Image"],
              ["text", "Text"],
              ["interactive", "Interactive"],
              ["priorityBase", "Priority 400"],
              ["priorityOverride", "Priority 900"],
            ].map(([key, label]) => (
              <Button
                key={key}
                type="button"
                aria-pressed={hudSamples[key]}
                onClick={() =>
                  setHudSamples((current) => ({
                    ...current,
                    [key]: !current[key],
                  }))
                }
                className={cn(
                  "rounded-xl border p-3 text-left text-xs",
                  hudSamples[key]
                    ? "border-white bg-white text-black"
                    : "border-white/10 text-white",
                )}
              >
                {label}
              </Button>
            ))}
            <Button
              type="button"
              onClick={runOperation}
              className="rounded-xl border border-white/10 p-3 text-left text-xs text-white"
            >
              Operation lifecycle
            </Button>
            <Button
              type="button"
              onClick={() =>
                navActions.openSurface({
                  component: NavSurface,
                  props: { input: { message: "manual surface" } },
                  title: "Manual surface",
                })
              }
              className="rounded-xl border border-white/10 p-3 text-left text-xs text-white"
            >
              openSurface()
            </Button>
            <Button
              type="button"
              onClick={() =>
                navActions.openSurfaceFlow(NAV_FLOW, { message: "flow input" })
              }
              className="rounded-xl border border-white/10 p-3 text-left text-xs text-white"
            >
              3-step flow
            </Button>
            <Button
              type="button"
              onClick={navActions.toggle}
              className="rounded-xl border border-white/10 p-3 text-left text-xs text-white"
            >
              Dock expand/collapse
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setGuard((value) => !value)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs",
                guard
                  ? "bg-amber-300 text-black"
                  : "border border-white/10 text-white",
              )}
            >
              Guard {guard ? "on" : "off"}
            </Button>
            <Button
              type="button"
              onClick={() => setBreadcrumb((value) => !value)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
            >
              Breadcrumb
            </Button>
            <Button
              type="button"
              onClick={() => navActions.setCompactLock("workbench", true)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
            >
              Lock compact
            </Button>
            <Button
              type="button"
              onClick={() => navActions.setCompactLock("workbench", false)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
            >
              Unlock
            </Button>
          </div>
        </Panel>
        <Panel className="grid grid-cols-2 gap-2">
          <State
            label="HUD"
            value={navState.hud?.id || "none"}
            tone={navState.hud ? "live" : "default"}
          />
          <State
            label="Registry HUDs"
            value={Object.keys(navHudEntries).length}
            tone={Object.keys(navHudEntries).length ? "live" : "default"}
          />
          <State
            label="Surface stack"
            value={navState.surfaceStack?.length || 0}
            tone={navState.surfaceStack?.length ? "live" : "default"}
          />
          <State
            label="Guard"
            value={guard ? "armed" : "off"}
            tone={guard ? "warning" : "default"}
          />
          <State
            label="Compact"
            value={navState.compactLocked ? "locked" : "free"}
            tone={navState.compactLocked ? "warning" : "default"}
          />
        </Panel>
      </div>
    );
  } else if (active === "registry") {
    stage = (
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => registerDynamicNav(20)}
              className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
            >
              Register priority 20
            </Button>
            <Button
              type="button"
              onClick={() => registerDynamicNav(900)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
            >
              Override priority 900
            </Button>
            <Button
              type="button"
              onClick={() => {
                unregister(REGISTRY_TYPES.NAV, "modules-dynamic-nav", {
                  source: DYNAMIC_SOURCE,
                });
                log("registry:dispose");
              }}
              className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-200"
            >
              Dispose
            </Button>
          </div>
          <Button
            type="button"
            onClick={() =>
              log(
                "registry:validate",
                validateRegistryValue(REGISTRY_TYPES.BACKGROUND, {
                  image: BACKGROUNDS.ocean,
                }),
              )
            }
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
          >
            Validate background descriptor
          </Button>
        </Panel>
        <Panel className="grid grid-cols-3 gap-2">
          <State label="NAV entries" value={navEntries.length} />
          <State label="Diagnostics" value={diagnostics.length} />
          <State label="Source" value={DYNAMIC_SOURCE} />
        </Panel>
      </div>
    );
  } else if (active === "background") {
    stage = (
      <Panel className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(BACKGROUNDS).map(([name, image]) => (
            <Button
              key={name}
              type="button"
              onClick={() => {
                backgroundActions.setBackground({
                  image,
                  overlayOpacity: 0.42,
                  fadeEdges: 24,
                  noiseOpacity: 0.05,
                });
                log("background:set", name);
              }}
              className={cn(
                "aspect-video rounded-xl bg-linear-to-br",
                name === "ember"
                  ? "from-orange-400 to-stone-950"
                  : name === "ocean"
                    ? "from-sky-400 to-slate-950"
                    : "from-violet-400 to-fuchsia-950",
              )}
            >
              <span className="sr-only">{name}</span>
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={backgroundActions.toggleMute}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
          >
            Mute
          </Button>
          <Button
            type="button"
            onClick={backgroundActions.toggleLoop}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
          >
            Loop
          </Button>
          <Button
            type="button"
            onClick={backgroundActions.resetBackground}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
          >
            Reset
          </Button>
        </div>
      </Panel>
    );
  } else if (active === "controls") {
    stage = (
      <div className="grid gap-4 xl:grid-cols-[1fr_.7fr]">
        <Panel className="space-y-3">
          {[
            ["pair0", "Order 0 pair"],
            ["pair1", "Order 1 pair"],
            ["orphan", "Unpaired left control"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70"
            >
              {label}
              <Checkbox
                checked={controls[key]}
                onChange={(event) =>
                  setControls((current) => ({
                    ...current,
                    [key]: event.target.checked,
                  }))
                }
              />
            </label>
          ))}
        </Panel>
        <Panel className="grid grid-cols-2 gap-2">
          <State label="Registered" value={controlsEntries.length} />
          <State
            label="Pair contract"
            value={controls.orphan ? "reject orphan" : "symmetric"}
            tone={controls.orphan ? "warning" : "live"}
          />
        </Panel>
      </div>
    );
  } else if (active === "auth") {
    stage = (
      <div className="grid gap-4 xl:grid-cols-[1fr_.7fr]">
        <Panel className="space-y-3">
          <div className="font-mono text-4xl font-bold">
            {auth.isAuthenticated ? "AUTHENTICATED" : "GUEST"}
          </div>
          <div className="flex flex-wrap gap-2">
            <State label="ready" value={auth.isReady} />
            <State label="AAL" value={authAal || "—"} />
            <State label="user" value={auth.user?.email || "none"} />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() =>
                void auth.refresh().then(() => log("auth:refresh"))
              }
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
            >
              Refresh session
            </Button>
            {auth.isAuthenticated ? (
              <Button
                type="button"
                onClick={() =>
                  void auth.signOut().then(() => log("auth:signout"))
                }
                className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-200"
              >
                Sign out
              </Button>
            ) : null}
          </div>
        </Panel>
        <Panel className="font-mono text-xs leading-6 text-white/50">
          Session, provider readiness and MFA assurance are read from the real
          AuthProvider
        </Panel>
      </div>
    );
  } else if (active === "account") {
    stage = (
      <div className="grid gap-4 xl:grid-cols-[1fr_.7fr]">
        <Panel className="space-y-3">
          <State
            label="account"
            value={
              account.account?.username ||
              account.account?.displayName ||
              account.profile?.username ||
              account.profile?.display_name ||
              "none"
            }
          />
          <Input
            value={accountDraft}
            onChange={(event) => setAccountDraft(event.target.value)}
            placeholder="display name patch"
            className="w-full"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() =>
                void account
                  .refresh()
                  .then(() => log("account:refresh"))
                  .catch((error) => log("account:error", error.message))
              }
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
            >
              Refresh
            </Button>
            <Button
              type="button"
              disabled={!accountDraft.trim()}
              onClick={() =>
                void account
                  .update({ display_name: accountDraft.trim() })
                  .then(() => log("account:update"))
                  .catch((error) => log("account:error", error.message))
              }
              className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black disabled:opacity-50"
            >
              Apply patch
            </Button>
          </div>
        </Panel>
        <Panel className="grid grid-cols-2 gap-2">
          <State label="loading" value={account.isLoading} />
          <State
            label="error"
            value={account.error?.message || "none"}
            tone={account.error ? "danger" : "default"}
          />
        </Panel>
      </div>
    );
  } else if (active === "notification") {
    stage = (
      <Panel className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["success", "solar:check-circle-bold"],
            ["info", "solar:info-circle-bold"],
            ["warning", "solar:danger-triangle-bold"],
            ["error", "material-symbols:close-rounded"],
          ].map(([type, icon]) => (
            <Button
              key={type}
              type="button"
              onClick={() => {
                toast[type](`${type} toast`, {
                  allowInProduction: true,
                  description: "Real notification provider",
                  dedupeKey: `workbench-${type}`,
                });
                log(`toast:${type}`);
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 p-4 text-xs text-white"
            >
              <Icon icon={icon} size={17} />
              {type}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <State
            label="active"
            value={notificationCount}
            tone={notificationCount ? "live" : "default"}
          />
          <Button
            type="button"
            onClick={() =>
              Object.keys(notifications.notifications || {}).forEach(
                dismissNotification,
              )
            }
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
          >
            Dismiss all
          </Button>
        </div>
      </Panel>
    );
  } else if (active === "modal") {
    stage = (
      <Panel className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {["center", "bottom", "top"].map((position) => (
            <Button
              key={position}
              type="button"
              onClick={async () => {
                const result = await openModal(
                  "MODULES_WORKBENCH_MODAL",
                  position,
                  { data: { title: `Modal · ${position}` } },
                );
                log("modal:result", result);
              }}
              className="rounded-xl border border-white/10 px-4 py-3 text-xs text-white"
            >
              {position}
            </Button>
          ))}
          <Button
            type="button"
            onClick={() =>
              void openModal(
                "MODULES_WORKBENCH_MODAL",
                { mobile: "bottom", desktop: "center" },
                { data: { title: "Responsive modal" } },
              ).then((result) => log("modal:responsive", result))
            }
            className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-black"
          >
            responsive
          </Button>
        </div>
        <State
          label="stack depth"
          value={modal.modalStack?.length || 0}
          tone={modal.modalStack?.length ? "live" : "default"}
        />
      </Panel>
    );
  } else if (active === "context-menu") {
    stage = (
      <Panel className="space-y-3">
        <div
          data-workbench-context
          className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 font-mono text-sm text-white/50"
        >
          Right click · context descriptor
        </div>
        <State
          label="registered menus"
          value="target + priority + disabled + flow"
        />
      </Panel>
    );
  } else if (active === "loading") {
    stage = (
      <div className="grid gap-4 xl:grid-cols-[1fr_.7fr]">
        <Panel className="space-y-4">
          <label className="block text-xs text-white/50">
            Minimum duration · {minimumDuration}ms
            <Input
              type="range"
              min="0"
              max="3000"
              step="100"
              value={minimumDuration}
              onChange={(event) => setMinimumDuration(event.target.value)}
              className="mt-3 w-full"
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={runLoading}
              className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
            >
              Start then stop at 350ms
            </Button>
            <Button
              type="button"
              onClick={loadingActions.stopLoading}
              className="rounded-lg ring-1 ring-inset ring-white/5 bg-white/5 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              Force stop
            </Button>
          </div>
        </Panel>
        <Panel className="grid grid-cols-2 gap-2">
          <State
            label="running"
            value={loading.isLoading}
            tone={loading.isLoading ? "live" : "default"}
          />
          <State label="overlay" value={loading.showOverlay} />
          <State label="min duration" value={loading.minDuration} />
        </Panel>
      </div>
    );
  } else if (active === "error-boundary") {
    stage = (
      <Panel>
        <ErrorBoundaryCore
          key={errorKey}
          silent
          fallback={({ resetError }) => (
            <Button
              type="button"
              onClick={() => {
                resetError();
                setCrash(false);
                setErrorKey((value) => value + 1);
                log("boundary:recover");
              }}
              className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
            >
              Recover isolated child
            </Button>
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <ErrorProbe crash={crash} />
            <Button
              type="button"
              onClick={() => {
                setCrash(true);
                log("boundary:throw");
              }}
              className="rounded-lg bg-rose-400 px-4 py-3 text-sm font-bold text-black"
            >
              Throw from child
            </Button>
          </div>
        </ErrorBoundaryCore>
      </Panel>
    );
  } else {
    stage = (
      <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
        <Panel className="space-y-3">
          <Button
            type="button"
            onClick={() => {
              backgroundActions.setBackground({
                image: BACKGROUNDS.violet,
                overlayOpacity: 0.45,
              });
              loadingActions.startLoading({
                minDuration: 700,
                showOverlay: true,
              });
              const operation = operations.start({
                label: "cross-module flow",
                progress: 0.2,
              });
              schedule(() => {
                loadingActions.stopLoading();
                operations.complete(operation.id, { success: true });
                toast.success("Flow settled", { allowInProduction: true });
                log("flow:background→loading→operation→toast");
              }, 800);
            }}
            className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-black"
          >
            Background → Loading → Nav operation → Toast
          </Button>
          <Button
            type="button"
            onClick={() => {
              navActions.openSurface({
                component: NavSurface,
                props: { input: { message: "cross-module surface" } },
                title: "Flow surface",
              });
              log("flow:nav-surface");
            }}
            className="ml-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white"
          >
            Open Nav surface
          </Button>
        </Panel>
        <Panel className="font-mono text-xs leading-6 text-white/50">
          Context menu also opens the registered modal and resolves into a toast
          when accepted
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#08080a] text-white">
      <aside className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-white/10 py-3">
        {MODULES.map(([id, label, icon]) => (
          <Button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => {
              setActive(id);
              setCrash(false);
              setErrorKey((value) => value + 1);
            }}
            className={cn(
              "flex size-10 items-center justify-center rounded-xl text-white/50 hover:bg-white/10 hover:text-white",
              active === id &&
                "bg-white text-black hover:bg-white hover:text-black",
            )}
          >
            <Icon icon={icon} size={19} />
          </Button>
        ))}
      </aside>
      <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
        <div className="flex w-full flex-col gap-4">
          {stage}
          <Panel className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="font-mono text-xs text-white/50 uppercase">
                Lifecycle log
              </span>
              <Button
                type="button"
                onClick={() => setLogs([])}
                className="font-mono text-xs text-white/50 underline"
              >
                clear
              </Button>
            </div>
            <div className="max-h-56 overflow-auto font-mono text-xs">
              {logs.length ? (
                logs.map((entry, index) => (
                  <div
                    key={`${entry.time}-${index}`}
                    className="grid grid-cols-[5rem_11rem_1fr] gap-3 border-b border-white/10 px-4 py-2 text-white/70"
                  >
                    <span className="text-white/50">{entry.time}</span>
                    <span className="text-white">{entry.event}</span>
                    <span className="break-all text-white/50">
                      {entry.value}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-white/50">
                  Run a scenario to inspect its lifecycle
                </div>
              )}
            </div>
          </Panel>
          <details className="rounded-xl border border-white/10 bg-white/5">
            <summary className="cursor-pointer px-4 py-3 font-mono text-xs text-white/50 uppercase">
              Runtime snapshot
            </summary>
            <pre className="max-h-96 overflow-auto border-t border-white/10 p-4 text-xs leading-6 text-white/50">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </details>
        </div>
      </main>
    </div>
  );
}
