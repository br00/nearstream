import { INSTANCES } from "./config.mjs";
import { eventually, requestAppToken, signIn, webApi, webPost } from "./people.mjs";
import { ALICE, BOB } from "./seed-data.mjs";

const A = INSTANCES.a;
const B = INSTANCES.b;

async function expectOk(response, what) {
  if (response.ok) return response;
  throw new Error(`seed: ${what} failed with ${response.status}: ${await response.text()}`);
}

async function shareBetween(from, to) {
  await expectOk(await webPost(from, "/api/shares", { address: to.address }), `${from.name} shares with ${to.name}`);
  let pendingId;
  const arrived = await eventually(async () => {
    const { pending } = await (await webApi(to, "/api/shares")).json();
    pendingId = pending.find((p) => p.fromAddress === from.address)?.id;
    return !!pendingId;
  });
  if (!arrived) throw new Error(`seed: ${from.name}'s share never reached ${to.name}`);
  await expectOk(await webPost(to, `/api/pending-shares/${pendingId}/accept`), `${to.name} accepts ${from.name}`);
}

async function publish(person, content) {
  await expectOk(await webPost(person, "/api/letter", { body: content.now }), `${person.name}'s Now`);
  for (const line of content.lines) {
    await expectOk(await webPost(person, "/api/stream", line), `${person.name}'s Line "${line.text}"`);
  }
}

export async function seed([childA, childB]) {
  const alice = await signIn(A, A.people[0]);
  const carol = await signIn(A, A.people[1]);
  const bob = await signIn(B, B.people[0]);

  await shareBetween(alice, bob);
  await shareBetween(bob, alice);

  await publish(alice, ALICE);
  await publish(bob, BOB);

  return {
    alice: { address: alice.address, token: await requestAppToken(alice, childA, { device: "Lab app" }) },
    bob: { address: bob.address, token: await requestAppToken(bob, childB, { device: "Lab app" }) },
    carol: { address: carol.address, token: await requestAppToken(carol, childA, { device: "Lab app" }) },
  };
}
