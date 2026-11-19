// Start / stop the two lab instances. Used by `npm run lab` (start and
// leave running) and `npm run lab:test` (start, test, stop).

import { spawn } from "node:child_process";
import { INSTANCES, envFor } from "./config.mjs";

const READY_TIMEOUT_MS = 120_000;

export function startInstance(instance, { echo = false } = {}) {
  const child = spawn(
    "npx",
    ["next", "dev", "--port", String(instance.port)],
    { env: envFor(instance), stdio: ["ignore", "pipe", "pipe"] },
  );
  const tag = `[${instance.name}]`;
  let log = "";
  const onData = (chunk) => {
    const text = chunk.toString();
    log += text;
    // Safety net: a lab instance must never talk to real storage.
    if (/store: R2|-store: R2|: R2\b/.test(text)) {
      console.error(`${tag} reported R2 storage — aborting so the real bucket is never touched.`);
      stopAll([child]);
      process.exit(2);
    }
    if (echo) {
      for (const line of text.split("\n")) if (line.trim()) console.log(`${tag} ${line}`);
    }
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  child.logText = () => log;
  return child;
}

/** Wait until the instance answers. The first request compiles routes, so
 *  it can take a while. */
export async function waitReady(instance) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${instance.url}/login`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`instance ${instance.name} not ready after ${READY_TIMEOUT_MS / 1000}s`);
}

export function stopAll(children) {
  for (const c of children) {
    if (c && c.exitCode === null) c.kill("SIGTERM");
  }
}

export { INSTANCES };
