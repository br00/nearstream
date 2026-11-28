import { INSTANCES, startInstance, stopAll, waitReady } from "./instances.mjs";
import { seed } from "./seed.mjs";

const children = Object.values(INSTANCES).map((i) => startInstance(i, { echo: true }));
process.on("SIGINT", () => {
  stopAll(children);
  process.exit(0);
});

await Promise.all(Object.values(INSTANCES).map(waitReady));
const people = await seed(children);

console.log(`
Lab is up and seeded.

  Instance A  ${INSTANCES.a.url}/login   alice@lab.test · carol@lab.test
  Instance B  ${INSTANCES.b.url}/login   bob@lab.test

  Alice  ${people.alice.address}  12 Lines, a Now, shares with Bob
  Bob    ${people.bob.address}  8 Lines, a Now, shares with Alice
  Carol  ${people.carol.address}  nothing yet

App tokens (Authorization: Bearer …):
  Alice  ${people.alice.token}
  Bob    ${people.bob.token}
  Carol  ${people.carol.token}
`);
