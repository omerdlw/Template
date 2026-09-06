import { access, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MODULE_CATALOG,
  MODULE_INTERFACE_LEVELS,
  MODULE_RUNTIMES,
} from "../src/modules/catalog.js";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceDirectory = path.join(projectRoot, "src");
const modulesDirectory = path.join(sourceDirectory, "modules");
const testsDirectory = path.join(projectRoot, "tests");
const snapshotPath = path.join(modulesDirectory, "public-exports.json");
const shouldWriteSnapshot = process.argv.includes("--write-snapshot");
const platformModules = new Set([
  "background",
  "context-menu",
  "controls",
  "error-boundary",
  "loading",
  "modal",
  "nav",
  "notification",
  "platform-inspector",
  "registry",
]);
const publicInterfaceLevels = new Set([
  MODULE_INTERFACE_LEVELS.EXPERIMENTAL,
  MODULE_INTERFACE_LEVELS.STABLE,
]);
const supportedRuntimes = new Set(Object.values(MODULE_RUNTIMES));

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function pathIsFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function collectSourceFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(entryPath);
      return entry.isFile() && /\.(?:js|jsx|mjs)$/.test(entry.name)
        ? [entryPath]
        : [];
    }),
  );

  return files.flat();
}

function extractImportSpecifiers(source) {
  const specifiers = new Set();
  const patterns = [
    /\bimport\s+(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/gs,
    /\bexport\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/gs,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  patterns.forEach((pattern) => {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  });

  return [...specifiers];
}

function resolveProjectImport(sourceFile, specifier) {
  if (specifier.startsWith("@/")) {
    return path.resolve(sourceDirectory, specifier.slice(2));
  }
  if (specifier.startsWith(".")) {
    return path.resolve(path.dirname(sourceFile), specifier);
  }
  return null;
}

async function resolveSourceFile(sourceFile, specifier) {
  const unresolvedPath = resolveProjectImport(sourceFile, specifier);
  if (!unresolvedPath) return null;

  const candidates = [
    unresolvedPath,
    `${unresolvedPath}.js`,
    `${unresolvedPath}.jsx`,
    `${unresolvedPath}.mjs`,
    path.join(unresolvedPath, "index.js"),
  ];

  for (const candidate of candidates) {
    if (await pathIsFile(candidate)) return candidate;
  }
  return null;
}

function isInside(parentDirectory, targetPath) {
  const relativePath = path.relative(parentDirectory, targetPath);
  return Boolean(
    relativePath &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath),
  );
}

function getArea(resolvedPath) {
  if (!isInside(sourceDirectory, resolvedPath)) return null;
  return (
    path.relative(sourceDirectory, resolvedPath).split(path.sep)[0] || null
  );
}

function getModuleName(resolvedPath) {
  if (!isInside(modulesDirectory, resolvedPath)) return null;
  const moduleName = path
    .relative(modulesDirectory, resolvedPath)
    .split(path.sep)[0];
  return MODULE_CATALOG[moduleName] ? moduleName : null;
}

function isClientSource(source) {
  return /^\s*["']use client["']\s*;/u.test(source);
}

function isServerOnlySource(source) {
  return /(?:^|\n)\s*import\s+["']server-only["']\s*;/u.test(source);
}

function getEntrypointForTarget(moduleName, resolvedImport) {
  const moduleDirectory = path.join(modulesDirectory, moduleName);
  const definition = MODULE_CATALOG[moduleName];

  for (const [entrypointName, entrypoint] of Object.entries(
    definition.entrypoints,
  )) {
    const entrypointFile = path.join(moduleDirectory, entrypoint.file);
    const importCandidates = new Set([
      entrypointFile,
      entrypointFile.replace(/\.(?:js|jsx|mjs)$/, ""),
    ]);
    if (entrypointName === ".") {
      importCandidates.add(moduleDirectory);
      importCandidates.add(path.join(moduleDirectory, "index"));
    }
    if (importCandidates.has(resolvedImport)) {
      return { entrypoint, entrypointName };
    }
  }

  return null;
}

function findCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const active = new Set();
  const stack = [];

  function visit(moduleName) {
    if (active.has(moduleName)) {
      const cycleStart = stack.indexOf(moduleName);
      cycles.push([...stack.slice(cycleStart), moduleName]);
      return;
    }
    if (visited.has(moduleName)) return;

    visited.add(moduleName);
    active.add(moduleName);
    stack.push(moduleName);
    for (const dependency of graph.get(moduleName) || []) visit(dependency);
    stack.pop();
    active.delete(moduleName);
  }

  for (const moduleName of graph.keys()) visit(moduleName);
  return cycles;
}

const exportCache = new Map();

async function collectPublicExports(entrypointFile, activeFiles = new Set()) {
  if (exportCache.has(entrypointFile)) {
    return new Set(exportCache.get(entrypointFile));
  }
  if (activeFiles.has(entrypointFile)) return new Set();

  const nextActiveFiles = new Set(activeFiles).add(entrypointFile);
  const source = await readFile(entrypointFile, "utf8");
  const exportNames = new Set();

  for (const match of source.matchAll(
    /\bexport\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    exportNames.add(match[1]);
  }
  for (const match of source.matchAll(
    /\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    exportNames.add(match[1]);
  }
  if (/\bexport\s+default\b/.test(source)) exportNames.add("default");

  for (const match of source.matchAll(
    /\bexport\s*\{([\s\S]*?)\}\s*(?:from\s*["'][^"']+["'])?\s*;/g,
  )) {
    match[1]
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => {
        const parts = entry.split(/\s+as\s+/);
        const publicName = parts[parts.length - 1]?.trim();
        if (publicName) exportNames.add(publicName);
      });
  }

  for (const match of source.matchAll(
    /\bexport\s*\*\s*from\s*["']([^"']+)["']\s*;/g,
  )) {
    const targetFile = await resolveSourceFile(entrypointFile, match[1]);
    if (!targetFile) continue;
    const targetExports = await collectPublicExports(
      targetFile,
      nextActiveFiles,
    );
    targetExports.forEach((exportName) => {
      if (exportName !== "default") exportNames.add(exportName);
    });
  }

  exportCache.set(entrypointFile, exportNames);
  return new Set(exportNames);
}

async function collectReachableFiles(entrypointFile) {
  const visited = new Set();
  const queue = [entrypointFile];

  while (queue.length > 0) {
    const currentFile = queue.shift();
    if (!currentFile || visited.has(currentFile)) continue;
    visited.add(currentFile);

    const source = await readFile(currentFile, "utf8");
    for (const specifier of extractImportSpecifiers(source)) {
      const targetFile = await resolveSourceFile(currentFile, specifier);
      if (targetFile && isInside(sourceDirectory, targetFile)) {
        queue.push(targetFile);
      }
    }
  }

  return visited;
}

async function createExportSnapshot() {
  const modules = {};

  for (const moduleName of Object.keys(MODULE_CATALOG).sort()) {
    const definition = MODULE_CATALOG[moduleName];
    const entrypoints = {};
    for (const entrypointName of Object.keys(definition.entrypoints).sort()) {
      const entrypoint = definition.entrypoints[entrypointName];
      const entrypointFile = path.join(
        modulesDirectory,
        moduleName,
        entrypoint.file,
      );
      const exports = await collectPublicExports(entrypointFile);
      entrypoints[entrypointName] = {
        exports: [...exports].sort(),
        runtime: entrypoint.runtime,
        stability: entrypoint.stability,
      };
    }
    modules[moduleName] = entrypoints;
  }

  return { schemaVersion: 1, modules };
}

function describeSnapshotChanges(previous, current) {
  const changes = [];
  const moduleNames = new Set([
    ...Object.keys(previous?.modules || {}),
    ...Object.keys(current.modules),
  ]);

  for (const moduleName of [...moduleNames].sort()) {
    const previousEntrypoints = previous?.modules?.[moduleName] || {};
    const currentEntrypoints = current.modules[moduleName] || {};
    const entrypointNames = new Set([
      ...Object.keys(previousEntrypoints),
      ...Object.keys(currentEntrypoints),
    ]);

    for (const entrypointName of [...entrypointNames].sort()) {
      const before = previousEntrypoints[entrypointName];
      const after = currentEntrypoints[entrypointName];
      const label = `${moduleName}${entrypointName === "." ? "" : entrypointName.slice(1)}`;
      if (!before) {
        changes.push(`${label}: entrypoint added`);
        continue;
      }
      if (!after) {
        changes.push(`${label}: entrypoint removed`);
        continue;
      }
      if (before.runtime !== after.runtime) {
        changes.push(`${label}: runtime ${before.runtime} -> ${after.runtime}`);
      }
      if (before.stability !== after.stability) {
        changes.push(
          `${label}: stability ${before.stability} -> ${after.stability}`,
        );
      }
      const beforeExports = new Set(before.exports || []);
      const afterExports = new Set(after.exports || []);
      for (const exportName of afterExports) {
        if (!beforeExports.has(exportName))
          changes.push(`${label}: +${exportName}`);
      }
      for (const exportName of beforeExports) {
        if (!afterExports.has(exportName))
          changes.push(`${label}: -${exportName}`);
      }
    }
  }

  return changes;
}

const violations = [];
const moduleEntries = await readdir(modulesDirectory, { withFileTypes: true });
const moduleNames = moduleEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const catalogNames = Object.keys(MODULE_CATALOG).sort();
const moduleGraph = new Map(moduleNames.map((name) => [name, new Set()]));

for (const moduleName of moduleNames) {
  if (!MODULE_CATALOG[moduleName]) {
    violations.push(`${moduleName}: missing from src/modules/catalog.js`);
  }
}
for (const moduleName of catalogNames) {
  if (!moduleNames.includes(moduleName)) {
    violations.push(`${moduleName}: catalog entry has no module directory`);
  }
}

for (const moduleName of catalogNames) {
  const definition = MODULE_CATALOG[moduleName];
  const moduleDirectory = path.join(modulesDirectory, moduleName);

  if (!publicInterfaceLevels.has(definition.stability)) {
    violations.push(
      `${moduleName}: invalid module stability ${definition.stability}`,
    );
  }
  if (!definition.entrypoints?.["."]) {
    violations.push(`${moduleName}: missing stable root entrypoint`);
  }
  if (!(await pathExists(path.join(projectRoot, definition.docs)))) {
    violations.push(`${moduleName}: missing documentation ${definition.docs}`);
  }

  for (const [entrypointName, entrypoint] of Object.entries(
    definition.entrypoints || {},
  )) {
    const entrypointFile = path.join(moduleDirectory, entrypoint.file);
    if (
      entrypointName !== "." &&
      !/^\.\/[a-z0-9][a-z0-9-]*$/u.test(entrypointName)
    ) {
      violations.push(`${moduleName}: invalid entrypoint ${entrypointName}`);
    }
    if (!publicInterfaceLevels.has(entrypoint.stability)) {
      violations.push(
        `${moduleName}${entrypointName}: internal files cannot be public entrypoints`,
      );
    }
    if (!supportedRuntimes.has(entrypoint.runtime)) {
      violations.push(
        `${moduleName}${entrypointName}: unsupported runtime ${entrypoint.runtime}`,
      );
    }
    if (!(await pathExists(entrypointFile))) {
      violations.push(
        `${moduleName}${entrypointName}: missing entrypoint file ${entrypoint.file}`,
      );
      continue;
    }

    const entrypointSource = await readFile(entrypointFile, "utf8");
    if (
      entrypoint.runtime === MODULE_RUNTIMES.CLIENT &&
      !isClientSource(entrypointSource)
    ) {
      violations.push(
        `${moduleName}${entrypointName}: client entrypoint needs a use client directive`,
      );
    }
    if (
      entrypoint.runtime === MODULE_RUNTIMES.SERVER &&
      !isServerOnlySource(entrypointSource)
    ) {
      violations.push(
        `${moduleName}${entrypointName}: server entrypoint needs import "server-only"`,
      );
    }

    const reachableFiles = await collectReachableFiles(entrypointFile);
    for (const reachableFile of reachableFiles) {
      const reachableSource = await readFile(reachableFile, "utf8");
      const relativeReachableFile = path.relative(projectRoot, reachableFile);
      if (
        entrypoint.runtime === MODULE_RUNTIMES.UNIVERSAL &&
        isClientSource(reachableSource)
      ) {
        violations.push(
          `${moduleName}${entrypointName}: universal interface reaches client file ${relativeReachableFile}`,
        );
      }
      if (
        entrypoint.runtime !== MODULE_RUNTIMES.SERVER &&
        isServerOnlySource(reachableSource)
      ) {
        violations.push(
          `${moduleName}${entrypointName}: ${entrypoint.runtime} interface reaches server-only file ${relativeReachableFile}`,
        );
      }
    }
  }
}

const moduleSourceFiles = (await collectSourceFiles(modulesDirectory)).sort();

for (const sourceFile of moduleSourceFiles) {
  const source = await readFile(sourceFile, "utf8");
  const sourceModule = getModuleName(sourceFile);
  const relativeSource = path.relative(projectRoot, sourceFile);

  for (const specifier of extractImportSpecifiers(source)) {
    if (isClientSource(source) && specifier === "server-only") {
      violations.push(
        `${relativeSource}: client file cannot import server-only code (${specifier})`,
      );
      continue;
    }

    const resolvedImport = resolveProjectImport(sourceFile, specifier);
    if (!resolvedImport) continue;
    const targetArea = getArea(resolvedImport);
    const targetModule = getModuleName(resolvedImport);

    if (targetArea === "app" || targetArea === "domains") {
      violations.push(
        `${relativeSource}: modules cannot import ${targetArea} code (${specifier})`,
      );
    }
    if (
      targetModule &&
      targetModule !== sourceModule &&
      moduleGraph.has(sourceModule) &&
      moduleGraph.has(targetModule)
    ) {
      moduleGraph.get(sourceModule).add(targetModule);
    }
    if (
      (sourceModule === "auth" && targetModule === "account") ||
      (sourceModule === "account" && targetModule === "auth")
    ) {
      violations.push(
        `${relativeSource}: auth and account must remain independent (${specifier})`,
      );
    }
    if (
      platformModules.has(sourceModule) &&
      (targetModule === "auth" || targetModule === "account")
    ) {
      violations.push(
        `${relativeSource}: platform modules cannot depend on ${targetModule} (${specifier})`,
      );
    }
  }
}

for (const cycle of findCycles(moduleGraph)) {
  violations.push(`module dependency cycle: ${cycle.join(" -> ")}`);
}

for (const moduleName of catalogNames) {
  const actualDependencies = [...(moduleGraph.get(moduleName) || [])].sort();
  const declaredDependencies = [
    ...(MODULE_CATALOG[moduleName].dependencies || []),
  ].sort();
  const missingFromCatalog = actualDependencies.filter(
    (dependency) => !declaredDependencies.includes(dependency),
  );
  const missingFromCode = declaredDependencies.filter(
    (dependency) => !actualDependencies.includes(dependency),
  );
  if (missingFromCatalog.length > 0) {
    violations.push(
      `${moduleName}: undeclared dependencies ${missingFromCatalog.join(", ")}`,
    );
  }
  if (missingFromCode.length > 0) {
    violations.push(
      `${moduleName}: stale catalog dependencies ${missingFromCode.join(", ")}`,
    );
  }
}

const consumerFiles = [
  ...(await collectSourceFiles(sourceDirectory)),
  ...(await collectSourceFiles(testsDirectory)),
];

for (const sourceFile of consumerFiles) {
  const source = await readFile(sourceFile, "utf8");
  const sourceModule = getModuleName(sourceFile);
  const relativeSource = path.relative(projectRoot, sourceFile);

  for (const specifier of extractImportSpecifiers(source)) {
    const resolvedImport = resolveProjectImport(sourceFile, specifier);
    if (!resolvedImport) continue;
    const targetModule = getModuleName(resolvedImport);
    if (!targetModule || targetModule === sourceModule) continue;

    const publicEntrypoint = getEntrypointForTarget(
      targetModule,
      resolvedImport,
    );
    if (!publicEntrypoint) {
      violations.push(
        `${relativeSource}: deep import bypasses ${targetModule}'s public interface (${specifier})`,
      );
      continue;
    }
    if (
      isClientSource(source) &&
      publicEntrypoint.entrypoint.runtime === MODULE_RUNTIMES.SERVER
    ) {
      violations.push(
        `${relativeSource}: client file imports server entrypoint ${specifier}`,
      );
    }
  }
}

const currentSnapshot = await createExportSnapshot();
if (!shouldWriteSnapshot) {
  let previousSnapshot = null;
  try {
    previousSnapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      violations.push(`public export snapshot is unreadable: ${error.message}`);
    }
  }

  if (!previousSnapshot) {
    violations.push(
      "public export snapshot is missing; run npm run modules:snapshot",
    );
  } else {
    const snapshotChanges = describeSnapshotChanges(
      previousSnapshot,
      currentSnapshot,
    );
    if (snapshotChanges.length > 0) {
      violations.push(
        `public interface changed; review and run npm run modules:snapshot:\n  ${snapshotChanges.join("\n  ")}`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(`[modules:check] ${violations.length} violation(s) found:`);
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

if (shouldWriteSnapshot) {
  await writeFile(
    snapshotPath,
    `${JSON.stringify(currentSnapshot, null, 2)}\n`,
  );
  console.log(
    `[modules:snapshot] Updated ${path.relative(projectRoot, snapshotPath)}.`,
  );
}

const dependencyCount = [...moduleGraph.values()].reduce(
  (count, dependencies) => count + dependencies.size,
  0,
);
const entrypointCount = catalogNames.reduce(
  (count, moduleName) =>
    count + Object.keys(MODULE_CATALOG[moduleName].entrypoints).length,
  0,
);
console.log(
  `[modules:check] ${moduleNames.length} modules, ${entrypointCount} public entrypoints and ${moduleSourceFiles.length} source files passed (${dependencyCount} cross-module dependencies).`,
);
