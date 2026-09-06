import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const testsDirectory = path.join(projectRoot, "tests");

async function collectTests(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const tests = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectTests(entryPath);
      return entry.isFile() && entry.name.endsWith(".test.js")
        ? [entryPath]
        : [];
    }),
  );

  return tests.flat();
}

const testFiles = (await collectTests(testsDirectory)).sort();

if (testFiles.length === 0) {
  console.error(
    "[test] No test files found. Add at least one tests/**/*.test.js file.",
  );
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    "--import",
    "./scripts/register-alias.mjs",
    "--test",
    ...testFiles.map((file) => path.relative(projectRoot, file)),
  ],
  {
    cwd: projectRoot,
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(
    "[test] Unable to start the Node.js test runner.",
    result.error,
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
