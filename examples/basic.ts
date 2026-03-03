/**
 * Example: create a client, create an intent, execute transfer, then query.
 *
 * Run from repo root:
 *
 *   PAY_BASE_URL=https://api-pay.agent.tech \
 *   PAY_API_KEY=your-api-key \
 *   PAY_SECRET_KEY=your-secret-key \
 *   npx tsx examples/basic.ts
 *
 * Set PAY_EMAIL to override the default merchant email (merchant@example.com).
 *
 * To only query an existing intent:
 *
 *   PAY_BASE_URL=... PAY_API_KEY=... PAY_SECRET_KEY=... PAY_INTENT_ID=uuid npx tsx examples/basic.ts
 */

import { PayClient } from "../src/index.js";
import type { Auth } from "../src/index.js";

const baseUrl = process.env.PAY_BASE_URL ?? "";
const apiKey = process.env.PAY_API_KEY ?? "";
const secretKey = process.env.PAY_SECRET_KEY ?? "";
const intentId = process.env.PAY_INTENT_ID ?? "";

if (!baseUrl || !apiKey || !secretKey) {
  console.error(
    "Set PAY_BASE_URL, PAY_API_KEY, and PAY_SECRET_KEY.",
  );
  process.exit(1);
}

const auth: Auth = { apiKey, secretKey };
const client = new PayClient({ baseUrl, auth });

if (intentId) {
  const intent = await client.getIntent(intentId);
  console.log(JSON.stringify(intent, null, 2));
  process.exit(0);
}

const email = process.env.PAY_EMAIL || "merchant@example.com";

const resp = await client.createIntent({
  email,
  amount: "10.00",
  payerChain: "solana",
});

console.log(`Intent created: ${resp.intentId}`);
console.log(`Status: ${resp.status}`);

const exec = await client.executeIntent(resp.intentId);

console.log(`Execute result status: ${exec.status}`);
console.log(JSON.stringify(exec, null, 2));
