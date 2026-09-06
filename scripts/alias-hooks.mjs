import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "src");
const require = createRequire(path.join(rootDir, "package.json"));

let esbuild;
try {
  esbuild = require("esbuild");
} catch {
  esbuild = null;
}

function tryResolveFile(filePath) {
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) return filePath;
    if (stat.isDirectory()) {
      const indexJs = path.join(filePath, "index.js");
      if (fs.existsSync(indexJs)) return indexJs;
      const indexMjs = path.join(filePath, "index.mjs");
      if (fs.existsSync(indexMjs)) return indexMjs;
    }
  }
  if (fs.existsSync(`${filePath}.js`)) return `${filePath}.js`;
  if (fs.existsSync(`${filePath}.mjs`)) return `${filePath}.mjs`;
  if (fs.existsSync(`${filePath}.json`)) return `${filePath}.json`;
  return null;
}

function virtualModule(source) {
  return {
    url: `data:text/javascript,${encodeURIComponent(source)}`,
    shortCircuit: true,
  };
}

export function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return virtualModule("export default {};");
  }

  if (specifier === "next/navigation") {
    return virtualModule(
      'export function usePathname() { return "/"; } export function useRouter() { return { push() {}, replace() {}, prefetch() {} }; } export function useSearchParams() { return new URLSearchParams(); } export const redirect = () => {}; export const notFound = () => {};',
    );
  }

  if (specifier === "next/link") {
    return virtualModule(
      "export default function Link(props) { return props.children; }",
    );
  }

  if (specifier === "next/image") {
    return virtualModule(
      "export default function Image(props) { return props.children || null; }",
    );
  }

  if (specifier === "next/headers") {
    return virtualModule(
      "export async function cookies() { return { get() { return undefined; }, getAll() { return []; }, set() {} }; } export async function headers() { return new Headers(); }",
    );
  }

  if (specifier === "next/server") {
    const nextServerPath = path.join(
      rootDir,
      "node_modules",
      "next",
      "server.js",
    );
    if (fs.existsSync(nextServerPath)) {
      return {
        url: pathToFileURL(nextServerPath).href,
        shortCircuit: true,
      };
    }
  }

  let targetPath = null;
  if (specifier.startsWith("@/")) {
    targetPath = path.join(sourceDir, specifier.slice(2));
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentDir = context.parentURL
      ? path.dirname(fileURLToPath(context.parentURL))
      : rootDir;
    targetPath = path.resolve(parentDir, specifier);
  }

  if (targetPath) {
    const resolvedPath = tryResolveFile(targetPath);
    if (resolvedPath) {
      return {
        url: pathToFileURL(resolvedPath).href,
        shortCircuit: true,
      };
    }
  }

  return nextResolve(specifier, context);
}

function transformResult(url, result) {
  if (
    !url.startsWith("file://") ||
    !url.includes(rootDir) ||
    url.includes("node_modules")
  ) {
    return result;
  }

  const source =
    typeof result.source === "string"
      ? result.source
      : result.source
        ? Buffer.from(result.source).toString("utf8")
        : null;

  if (!source?.includes("<") || !esbuild) return result;

  const transformed = esbuild.transformSync(source, {
    loader: "jsx",
    jsx: "automatic",
  });

  return {
    format: "module",
    source: transformed.code,
    shortCircuit: true,
  };
}

export async function load(url, context, nextLoad) {
  return transformResult(url, await nextLoad(url, context));
}

export function loadSync(url, context, nextLoad) {
  return transformResult(url, nextLoad(url, context));
}
