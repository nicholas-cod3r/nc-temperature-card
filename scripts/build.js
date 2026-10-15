import { mkdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build as buildBundle } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { name: cardName, version: cardVersion } = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
if (typeof cardName !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(cardName)) {
  throw new Error("package.json must contain a lowercase, URL-safe package name");
}
if (typeof cardVersion !== "string" || cardVersion.length === 0) {
  throw new Error("package.json must contain a version");
}

const source = resolve(root, "src", "index.ts");
const target = resolve(root, "dist", `${cardName}.js`);

async function build() {
  const typecheck = spawnSync(
    process.execPath,
    [resolve(root, "node_modules", "typescript", "bin", "tsc"), "--noEmit"],
    { cwd: root, stdio: "inherit" },
  );
  if (typecheck.error) {
    throw typecheck.error;
  }
  if (typecheck.status !== 0) {
    throw new Error(`TypeScript check failed with exit code ${typecheck.status ?? "unknown"}`);
  }

  await mkdir(dirname(target), { recursive: true });
  await buildBundle({
    entryPoints: [source],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    define: { __CARD_VERSION__: JSON.stringify(cardVersion) },
    outfile: target,
  });
  console.log(`built ${target}`);
}

await build();
