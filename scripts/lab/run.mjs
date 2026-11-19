// npm run lab — start both instances and leave them running, to act out
// PROTOCOL.md §8 by hand in two browser windows. Ctrl-C stops both.
//
// Magic links print in this terminal (no Resend in the lab).

import { INSTANCES, startInstance, stopAll, waitReady } from "./instances.mjs";

const children = Object.values(INSTANCES).map((i) => startInstance(i, { echo: true }));
process.on("SIGINT", () => {
  stopAll(children);
  process.exit(0);
});

await Promise.all(Object.values(INSTANCES).map(waitReady));
console.log(`
Protocol lab is up.

  Instance A  ${INSTANCES.a.url}/login   alice@lab.test · carol@lab.test
  Instance B  ${INSTANCES.b.url}/login   bob@lab.test

Sign in with one of those emails; the magic link prints above.
Pick the matching handle (alice / carol / bob) during onboarding.
Addresses:  localhost:3001/alice · localhost:3001/carol · 127.0.0.1:3002/bob
`);
