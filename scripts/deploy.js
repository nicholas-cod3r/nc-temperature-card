import { copyFile, mkdir, readFile, watch } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const haWwwDirectory = process.env.HA_WWW_DIR?.trim();

if (!haWwwDirectory) {
  const message =
    "HA_WWW_DIR must be set to the host directory mounted as /config/www.";
  const useColor = process.stderr.isTTY && process.env.NO_COLOR === undefined;
  console.error(useColor ? `\u001B[31m${message}\u001B[0m` : message);
  process.exit(1);
}

async function deploy() {
  const buildResult = spawnSync(
    process.execPath,
    [resolve(root, "scripts", "build.js")],
    { stdio: "inherit" },
  );
  if (buildResult.error) {
    throw buildResult.error;
  }
  if (buildResult.status !== 0) {
    throw new Error(`Build failed with exit code ${buildResult.status ?? "unknown"}`);
  }

  const { name: cardName } = JSON.parse(
    await readFile(resolve(root, "package.json"), "utf8"),
  );
  const source = resolve(root, "dist", `${cardName}.js`);
  const preloadSource = resolve(root, "src", "preload.js");
  const targetDirectory = resolve(haWwwDirectory, cardName);
  const target = resolve(targetDirectory, `${cardName}.bundle.js`);
  const preloadTarget = resolve(targetDirectory, `${cardName}.js`);

  await mkdir(targetDirectory, { recursive: true });
  await copyFile(source, target);
  console.log(`copied ${target}`);
  await copyFile(preloadSource, preloadTarget);
  console.log(`copied ${preloadTarget}`);
}

await deploy();

if (process.argv.includes("--watch")) {
  console.log("watching src; changes will be deployed");
  let deployTimer;
  let deployment = Promise.resolve();

  for await (const event of watch(resolve(root, "src"))) {
    if (event.eventType !== "change" && event.eventType !== "rename") {
      continue;
    }

    clearTimeout(deployTimer);
    deployTimer = setTimeout(() => {
      deployment = deployment
        .then(deploy)
        .catch((error) => console.error(error));
    }, 200);
  }
}
