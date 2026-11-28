// Protocol lab — two Nearstream instances on one laptop (PROTOCOL.md §8).
//
//   Instance A  http://localhost:3001   Alice, Carol
//   Instance B  http://127.0.0.1:3002   Bob
//
// Two different hostnames, not just two ports: browsers share cookies
// across ports, so signing in as Bob on localhost:3002 would log Alice out
// of localhost:3001. `localhost` and `127.0.0.1` are separate cookie jars,
// and both resolve everywhere with no /etc/hosts edits.
//
// Everything is in memory. The secrets below are lab-only and protect
// nothing — a restart wipes both instances.

// Ports can be moved (LAB_PORT_A / LAB_PORT_B) when a lab is already
// running on the defaults and you want a second one — e.g. a test run
// alongside a hand-driven `npm run lab`.
const PORT_A = Number(process.env.LAB_PORT_A || 3001);
const PORT_B = Number(process.env.LAB_PORT_B || 3002);

export const INSTANCES = {
  a: {
    name: "A",
    port: PORT_A,
    url: `http://localhost:${PORT_A}`,
    distDir: ".next-lab-a",
    authSecret: "lab-instance-a-secret-not-for-production-use",
    people: [
      { email: "alice@lab.test", handle: "alice", name: "Alice", mark: 2 },
      { email: "carol@lab.test", handle: "carol", name: "Carol", mark: 4 },
    ],
  },
  b: {
    name: "B",
    port: PORT_B,
    url: `http://127.0.0.1:${PORT_B}`,
    distDir: ".next-lab-b",
    authSecret: "lab-instance-b-secret-not-for-production-use",
    people: [{ email: "bob@lab.test", handle: "bob", name: "Bob", mark: 7 }],
  },
};

// Every variable `.env.local` might set that must NOT reach a lab
// instance. Next never overrides a variable that's already in the
// environment — even an empty one — so blanking these keeps the real R2
// bucket, Resend and the host config out of the lab entirely.
const BLANKED = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "TENANT_DOMAINS",
  "HOST_USER_EMAIL",
  "HOST_USER_HANDLE",
  "HOST_USER_NAME",
  "NEARSTREAM_INTERNAL_SECRET",
  "CRON_SECRET",
];

export function envFor(instance) {
  const env = { ...process.env };
  for (const key of BLANKED) env[key] = "";
  return {
    ...env,
    PORT: String(instance.port),
    NEARSTREAM_DIST_DIR: instance.distDir,
    NEARSTREAM_SITE_URL: instance.url,
    AUTH_SECRET: instance.authSecret,
    ALLOWED_EMAILS: instance.people.map((p) => p.email).join(","),
    NEARSTREAM_PROTOCOL_ALLOW_HTTP: "1",
    NEARSTREAM_DOORBELL_MIN_INTERVAL_MS: "0",
    // Own cookie per instance, so nothing else on localhost (the other lab
    // instance, a normal `npm run dev` on :3000) can replace this session.
    NEARSTREAM_SESSION_COOKIE: sessionCookieFor(instance),
    // Print whole email bodies to the instance log (lib/email.ts, only when
    // Resend is unset — which BLANKED guarantees here), so lab:test can
    // read an app sign-in code the way a person reads the email.
    NEARSTREAM_LAB_EMAIL_LOG: "1",
  };
}

export function sessionCookieFor(instance) {
  return `nearstream_lab_${instance.name.toLowerCase()}_session`;
}
