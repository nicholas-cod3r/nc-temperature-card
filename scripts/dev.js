import { mkdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build as buildBundle, context } from "esbuild";

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

const haWwwDirectory = process.env.HA_WWW_DIR?.trim();
if (!haWwwDirectory) {
  throw new Error("HA_WWW_DIR must be set to the host directory mounted as /config/www");
}

const host = process.env.ESBUILD_HOST?.trim() || "127.0.0.1";
const port = Number(process.env.ESBUILD_PORT || 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("ESBUILD_PORT must be an integer from 1 to 65535");
}
const publicUrl = (process.env.ESBUILD_PUBLIC_URL?.trim() || `http://localhost:${port}`).replace(/\/$/, "");
const outputDirectory = resolve(haWwwDirectory, cardName);
const outputFile = resolve(outputDirectory, `${cardName}.bundle.js`);
const preloadFile = resolve(outputDirectory, `${cardName}.js`);

await mkdir(outputDirectory, { recursive: true });

const liveReloadClient = `(() => {
  const source = new EventSource(${JSON.stringify(`${publicUrl}/esbuild`)});
  source.addEventListener("change", () => location.reload());
  source.onerror = () => source.close();
})();`;

const typecheckPlugin = {
  name: "typecheck",
  setup(build) {
    build.onStart(() => {
      const typecheck = spawnSync(
        process.execPath,
        [resolve(root, "node_modules", "typescript", "bin", "tsc"), "--noEmit"],
        { cwd: root, stdio: "inherit" },
      );
      if (typecheck.error) {
        return { errors: [{ text: typecheck.error.message }] };
      }
      if (typecheck.status !== 0) {
        return { errors: [{ text: `TypeScript check failed with exit code ${typecheck.status ?? "unknown"}` }] };
      }
      return {};
    });
    build.onEnd((result) => {
      if (result.errors.length === 0) {
        console.log(`[${new Date().toLocaleTimeString()}] updated ${outputFile}`);
      }
    });
  },
};

const ctx = await context({
  entryPoints: [resolve(root, "src", "index.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  define: { __CARD_VERSION__: JSON.stringify(cardVersion) },
  outfile: outputFile,
  plugins: [typecheckPlugin],
});

await ctx.watch();
console.log(`watching ${resolve(root, "src")} for changes`);
console.log(`writing development bundle to ${outputFile}`);
console.log();
await buildBundle({
  entryPoints: [resolve(root, "src", "preload.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: preloadFile,
  banner: { js: liveReloadClient },
});
await ctx.serve({
  host,
  port,
  cors: { origin: "*" },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await ctx.dispose();
    process.exit(0);
  });
}
