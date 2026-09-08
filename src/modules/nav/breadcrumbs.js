"use client";

import {
  createContext,
  createElement,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  NAV_BREADCRUMBS_TRANSITION,
  NAV_COMPOSITOR_STYLE,
  navBreadcrumbsVariants,
} from "./motion";
import { formatSlugTitle, normalizePath } from "./routing";
import { cn } from "@/shared/utils";
import Iconify from "@/ui/primitives/icon";
function useRequiredContext(context, hookName, providerName) {
  const value = useContext(context);
  if (value === null) {
    throw new Error(`${hookName} must be used within ${providerName}`);
  }
  return value;
}
function createRootBreadcrumb(root, isCurrent) {
  return {
    id: root?.id || "home",
    title: root?.title || "Home",
    path: root?.path || "/",
    icon: root?.icon || null,
    isCurrent,
    level: 0,
  };
}
function createGenericBreadcrumbs(segments, overrides, resolveSegment) {
  let currentPath = "";
  return segments.map((segment, index) => {
    currentPath += `/${segment}`;
    const fallback = {
      id: `segment-${segment}-${index}`,
      title: formatSlugTitle(segment),
      path: currentPath,
      icon: null,
      isCurrent: index === segments.length - 1,
      level: index + 1,
    };
    const resolvedSegment = resolveSegment?.({
      ...fallback,
      index,
      segment,
      segments,
    });
    return {
      ...fallback,
      ...(resolvedSegment && typeof resolvedSegment === "object"
        ? resolvedSegment
        : {}),
      ...(overrides[currentPath] || {}),
    };
  });
}
export function resolveRouteBreadcrumbs(
  pathname = "",
  overrides = {},
  config = {},
) {
  const normalizedPath = normalizePath(pathname) || "/";
  const rootBreadcrumb = createRootBreadcrumb(
    config.root,
    normalizedPath === "/",
  );
  if (normalizedPath === "/") {
    return [rootBreadcrumb];
  }
  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length === 0) return [rootBreadcrumb];
  const resolvedPath = config.resolvePath?.({
    overrides,
    pathname: normalizedPath,
    root: rootBreadcrumb,
    segments,
  });
  if (Array.isArray(resolvedPath)) {
    return [rootBreadcrumb, ...resolvedPath];
  }
  return [
    rootBreadcrumb,
    ...createGenericBreadcrumbs(segments, overrides, config.resolveSegment),
  ];
}
const BreadcrumbStateContext = createContext(null);
const BreadcrumbActionsContext = createContext(null);
const BreadcrumbConfigContext = createContext({});
export function BreadcrumbProvider({ children, config = null }) {
  const [overrides, setOverrides] = useState({});
  const registerOverride = useCallback((path, config) => {
    if (!path || !config) return;
    const normalizedPath = String(path).trim().replace(/\/+$/, "") || "/";
    setOverrides((currentOverrides) => {
      const existing = currentOverrides[normalizedPath];
      if (existing?.title === config.title && existing?.icon === config.icon) {
        return currentOverrides;
      }
      return {
        ...currentOverrides,
        [normalizedPath]: {
          title: config.title || null,
          icon: config.icon || null,
        },
      };
    });
  }, []);
  const unregisterOverride = useCallback((path) => {
    if (!path) return;
    const normalizedPath = String(path).trim().replace(/\/+$/, "") || "/";
    setOverrides((currentOverrides) => {
      if (!currentOverrides[normalizedPath]) return currentOverrides;
      const nextOverrides = {
        ...currentOverrides,
      };
      delete nextOverrides[normalizedPath];
      return nextOverrides;
    });
  }, []);
  const actions = useMemo(
    () => ({
      registerOverride,
      unregisterOverride,
    }),
    [registerOverride, unregisterOverride],
  );
  return createElement(
    BreadcrumbConfigContext.Provider,
    {
      value: config || {},
    },
    createElement(
      BreadcrumbActionsContext.Provider,
      {
        value: actions,
      },
      createElement(
        BreadcrumbStateContext.Provider,
        {
          value: overrides,
        },
        children,
      ),
    ),
  );
}
export function useBreadcrumbOverrides() {
  return useRequiredContext(
    BreadcrumbStateContext,
    "useBreadcrumbOverrides",
    "BreadcrumbProvider",
  );
}
export function useBreadcrumbActions() {
  return useRequiredContext(
    BreadcrumbActionsContext,
    "useBreadcrumbActions",
    "BreadcrumbProvider",
  );
}
export function useNavBreadcrumbs() {
  const pathname = usePathname();
  const router = useRouter();
  const overrides = useBreadcrumbOverrides();
  const config = useContext(BreadcrumbConfigContext);
  const breadcrumbs = useMemo(
    () => resolveRouteBreadcrumbs(pathname, overrides, config || {}),
    [config, pathname, overrides],
  );
  const current = breadcrumbs[breadcrumbs.length - 1] || null;
  const parent =
    breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;
  const canGoBack = breadcrumbs.length > 1;
  const goBack = useCallback(() => {
    if (parent?.path) {
      router.push(parent.path);
    } else {
      router.back();
    }
  }, [parent, router]);
  return {
    breadcrumbs,
    canGoBack,
    current,
    goBack,
    parent,
  };
}
export function useRegisterBreadcrumbOverride({
  icon = null,
  path,
  title = null,
} = {}) {
  const { registerOverride, unregisterOverride } = useBreadcrumbActions();
  useEffect(() => {
    if (!path || (!title && !icon)) return undefined;
    registerOverride(path, {
      title,
      icon,
    });
    return () => {
      unregisterOverride(path);
    };
  }, [icon, path, registerOverride, title, unregisterOverride]);
}
export const NavBreadcrumbsCard = memo(function NavBreadcrumbsCard({
  className = "",
  maxItems = 4,
}) {
  const { breadcrumbs } = useNavBreadcrumbs();
  if (!breadcrumbs || breadcrumbs.length <= 1) {
    return null;
  }
  const itemsToRender =
    breadcrumbs.length > maxItems
      ? [
          breadcrumbs[0],
          {
            id: "ellipsis",
            title: "...",
            isEllipsis: true,
          },
          ...breadcrumbs.slice(-2),
        ]
      : breadcrumbs;
  return (
    <motion.div
      variants={navBreadcrumbsVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={NAV_BREADCRUMBS_TRANSITION}
      style={NAV_COMPOSITOR_STYLE}
      className={cn(
        "absolute inset-x-0 top-[calc(100%+4px)] z-10 flex h-[40px] w-full items-center justify-center rounded-[20px] bg-black/60 px-4 text-xs ring-1 ring-white/10 select-none ring-inset",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <nav
        aria-label="Breadcrumbs"
        className="flex scrollbar-none items-center gap-1.5 overflow-x-auto"
      >
        {itemsToRender.map((crumb, index) => {
          const isLast = index === itemsToRender.length - 1;
          if (crumb.isEllipsis) {
            return (
              <span key="ellipsis" className="px-0.5 text-white/50 select-none">
                ...
              </span>
            );
          }
          return (
            <motion.div
              layout="position"
              key={crumb.id || crumb.path}
              className="flex items-center gap-1.5"
            >
              {isLast ? (
                <span className="max-w-[180px] truncate font-medium text-white">
                  {crumb.title}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="max-w-[140px] truncate text-white/70 hover:text-white"
                >
                  {crumb.title}
                </Link>
              )}

              {!isLast && (
                <Iconify
                  icon="solar:alt-arrow-right-linear"
                  size={10}
                  className="shrink-0 text-white/50"
                />
              )}
            </motion.div>
          );
        })}
      </nav>
    </motion.div>
  );
});
