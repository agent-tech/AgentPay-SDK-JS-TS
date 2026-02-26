# Pay SDK (JS & TS)

[![npm version](https://img.shields.io/npm/v/@agent-tech/pay.svg)](https://www.npmjs.com/package/@agent-tech/pay)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org)

Javascript & TypeScript client for the Agent Tech payment API — create intents, execute USDC transfers on Base, and query status.

- **Zero runtime dependencies** — uses the built-in `fetch` API (Node 18+)
- **Dual ESM + CommonJS** — works in TypeScript and JavaScript projects
- **Two clients** — `PayClient` (authenticated, server-side) and `PublicPayClient` (unauthenticated, payer-side)
- **Two auth modes** for PayClient — Bearer token or header-based API key
- **All payments settle on Base** chain

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Clients](#clients)
  - [PayClient (Authenticated)](#payclient-authenticated)
  - [PublicPayClient (Unauthenticated)](#publicpayclient-unauthenticated)
- [Authentication](#authentication)
- [API Methods](#api-methods)
- [Intent Lifecycle](#intent-lifecycle)
- [Supported Chains](#supported-chains)
- [Fee Breakdown](#fee-breakdown)
- [Error Handling](#error-handling)
- [Advanced](#advanced)

## Install

```bash
npm install @agent-tech/pay
```

## Quick Start

### TypeScript (ESM)

```ts
import { PayClient, IntentStatus } from "@agent-tech/pay";

const client = new PayClient({
  baseUrl: "https://api-pay.agent.tech/api",
  auth: { type: "bearer", clientId: "your-client-id", clientSecret: "your-client-secret" },
});

// 1. Create intent
const resp = await client.createIntent({
  email: "merchant@example.com",
  amount: "100.50",
  payerChain: "solana",
});
console.log("Intent ID:", resp.intentId);

// 2. Execute transfer (backend signs with Agent wallet)
const exec = await client.executeIntent(resp.intentId);
console.log("Status:", exec.status);

// 3. Query full receipt
const intent = await client.getIntent(resp.intentId);
console.log("Final status:", intent.status);
```

### JavaScript (CommonJS)

```js
const { PayClient } = require("@agent-tech/pay");

const client = new PayClient({
  baseUrl: "https://api-pay.agent.tech/api",
  auth: { type: "bearer", clientId: "your-client-id", clientSecret: "your-client-secret" },
});

async function main() {
  const resp = await client.createIntent({
    email: "merchant@example.com",
    amount: "100.50",
    payerChain: "solana",
  });
  console.log("Intent ID:", resp.intentId);
}
main();
```

### Run the bundled example

```bash
git clone https://github.com/agent-tech/agent-sdk-js
cd agent-sdk-js
npm install

PAY_BASE_URL=https://api-pay.agent.tech/api \
PAY_CLIENT_ID=your-client-id \
PAY_CLIENT_SECRET=your-client-secret \
npx tsx examples/basic.ts
```

Set `PAY_INTENT_ID` to skip creation and query an existing intent instead.

## Clients

The SDK provides two client classes for different use cases.

### PayClient (Authenticated)

Server-side client that uses `/v2` endpoints with authentication. The backend Agent wallet signs and executes transfers — no wallet or signing required on your side.

```ts
import { PayClient } from "@agent-tech/pay";

const client = new PayClient({
  baseUrl: "https://api-pay.agent.tech/api",
  auth: { type: "bearer", clientId: "id", clientSecret: "secret" },
});

const intent = await client.createIntent({ email: "merchant@example.com", amount: "10.00", payerChain: "solana" });
const exec   = await client.executeIntent(intent.intentId);
const status = await client.getIntent(intent.intentId);
```

| Method | Endpoint | Description |
|---|---|---|
| `createIntent(req)` | `POST /v2/intents` | Create a payment intent |
| `executeIntent(id)` | `POST /v2/intents/{id}/execute` | Execute transfer on Base with Agent wallet |
| `getIntent(id)` | `GET /v2/intents?intent_id=...` | Get intent status and receipt |

### PublicPayClient (Unauthenticated)

Client-side / payer-side client that uses `/api` endpoints without authentication. Use this when the integrator holds the payer's wallet and can sign X402 payments and submit settle proofs directly.

```ts
import { PublicPayClient } from "@agent-tech/pay";

const client = new PublicPayClient({
  baseUrl: "https://api-pay.agent.tech/api",
});

const intent = await client.createIntent({ recipient: "0x...", amount: "10.00", payerChain: "base" });
// ... payer signs X402 payment off-chain ...
const result = await client.submitProof(intent.intentId, "settle_proof_string");
const status = await client.getIntent(intent.intentId);
```

| Method | Endpoint | Description |
|---|---|---|
| `createIntent(req)` | `POST /api/intents` | Create a payment intent |
| `submitProof(id, proof)` | `POST /api/intents/{id}` | Submit settle proof after X402 payment |
| `getIntent(id)` | `GET /api/intents?intent_id=...` | Get intent status and receipt |

## Authentication

Authentication applies to `PayClient` only. `PublicPayClient` requires no credentials.

### Bearer token (recommended)

Base64-encodes `clientId:clientSecret` and sends it as `Authorization: Bearer <token>`.

```ts
const client = new PayClient({
  baseUrl,
  auth: { type: "bearer", clientId: "client-id", clientSecret: "client-secret" },
});
```

### Header-based API key

Sends `X-Client-ID` and `X-API-Key` headers.

```ts
const client = new PayClient({
  baseUrl,
  auth: { type: "apiKey", clientId: "client-id", apiKey: "api-key" },
});
```

### Custom fetch / timeout

The default timeout is **30 seconds** for both clients. Override with options:

```ts
const client = new PayClient({
  baseUrl,
  auth: { type: "bearer", clientId: "id", clientSecret: "secret" },
  timeoutMs: 60_000,
});

// PublicPayClient supports the same options (minus auth)
const publicClient = new PublicPayClient({ baseUrl, timeoutMs: 60_000 });
```

Or provide a custom `fetch` implementation (timeout is ignored when custom fetch is provided):

```ts
const client = new PayClient({
  baseUrl,
  auth: { type: "bearer", clientId: "id", clientSecret: "secret" },
  fetch: myCustomFetch,
});
```

## API Methods

### PayClient

| Method | Endpoint | Description |
|---|---|---|
| `createIntent` | `POST /v2/intents` | Create a payment intent |
| `executeIntent` | `POST /v2/intents/{id}/execute` | Execute transfer on Base with Agent wallet |
| `getIntent` | `GET /v2/intents?intent_id=...` | Get intent status and receipt |

### PublicPayClient

| Method | Endpoint | Description |
|---|---|---|
| `createIntent` | `POST /api/intents` | Create a payment intent |
| `submitProof` | `POST /api/intents/{id}` | Submit settle proof after X402 payment |
| `getIntent` | `GET /api/intents?intent_id=...` | Get intent status and receipt |

### createIntent

Available on both clients. Exactly one of `email` or `recipient` must be provided.

```ts
const resp = await client.createIntent({
  email: "merchant@example.com", // or recipient (exactly one required)
  amount: "100.50",              // 0.01–1,000,000 USDC, max 6 decimals
  payerChain: "solana",          // "solana", "base", or "bsc"
});
```

**`CreateIntentRequest` fields:**

| Field | JSON | Required | Description |
|---|---|---|---|
| `email` | `email` | One of email/recipient | Recipient email address |
| `recipient` | `recipient` | One of email/recipient | Recipient wallet address |
| `amount` | `amount` | Yes | USDC amount as string (e.g. `"100.50"`) |
| `payerChain` | `payer_chain` | Yes | Source chain: `solana`, `base`, or `bsc` |

### executeIntent (PayClient only)

No request body — the backend uses the Agent wallet to sign and transfer USDC on Base.

```ts
const exec = await client.executeIntent(resp.intentId);
// exec.status is typically "BASE_SETTLED"
```

### submitProof (PublicPayClient only)

Submit a settle proof after the payer has completed an X402 payment off-chain.

```ts
const result = await publicClient.submitProof(intentId, "settle_proof_string");
console.log(result.status);
```

### getIntent (query status)

Available on both clients.

```ts
const intent = await client.getIntent(intentId);
switch (intent.status) {
  case IntentStatus.BaseSettled:
    // use intent.basePayment for receipt
    break;
  case IntentStatus.Expired:
  case IntentStatus.VerificationFailed:
    // terminal failure
    break;
  default:
    // still processing — poll again
}
```

## Intent Lifecycle

Intents expire **10 minutes** after creation.

```
                          ┌──────────────────┐
                          │ AWAITING_PAYMENT  │
                          └────────┬─────────┘
                                   │
                      ┌────────────┼────────────┐
                      │            │             │
                      ▼            ▼             ▼
               ┌──────────┐ ┌──────────┐ ┌─────────────────────┐
               │ EXPIRED  │ │ PENDING  │ │ VERIFICATION_FAILED │
               └──────────┘ └────┬─────┘ └─────────────────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │ SOURCE_SETTLED │
                        └───────┬────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │ BASE_SETTLING │
                        └───────┬───────┘
                                │
                                ▼
                        ┌──────────────┐
                        │ BASE_SETTLED │
                        └──────────────┘
```

Use the status constants instead of bare strings:

| Constant | Value | Description |
|---|---|---|
| `IntentStatus.AwaitingPayment` | `AWAITING_PAYMENT` | Intent created, waiting for execution |
| `IntentStatus.Pending` | `PENDING` | Execution initiated, processing |
| `IntentStatus.VerificationFailed` | `VERIFICATION_FAILED` | Source payment verification failed (terminal) |
| `IntentStatus.SourceSettled` | `SOURCE_SETTLED` | Source chain payment confirmed |
| `IntentStatus.BaseSettling` | `BASE_SETTLING` | USDC transfer on Base in progress |
| `IntentStatus.BaseSettled` | `BASE_SETTLED` | Transfer complete — check `basePayment` for receipt (terminal) |
| `IntentStatus.Expired` | `EXPIRED` | Intent was not executed within 10 minutes (terminal) |

## Supported Chains

| Chain | Identifier | Role |
|---|---|---|
| Solana | `solana` | Payer chain (source) |
| Base | `base` | Payer chain (source) **and** settlement chain (target) |
| BNB Smart Chain | `bsc` | Payer chain (source) |

All payments settle on **Base** regardless of the source chain. The `payerChain` field in `CreateIntentRequest` specifies the source chain only.

## Fee Breakdown

The `FeeBreakdown` interface is included in all intent response types (via `IntentBase`):

| Field | JSON | Description |
|---|---|---|
| `sourceChain` | `source_chain` | Source chain identifier |
| `sourceChainFee` | `source_chain_fee` | Gas/network fee on the source chain |
| `targetChain` | `target_chain` | Target chain (always `"base"`) |
| `targetChainFee` | `target_chain_fee` | Gas/network fee on Base |
| `platformFee` | `platform_fee` | Platform service fee |
| `platformFeePercentage` | `platform_fee_percentage` | Platform fee as a percentage |
| `totalFee` | `total_fee` | Sum of all fees |

**Amount rules:**
- Minimum: **0.01 USDC**
- Maximum: **1,000,000 USDC**
- Up to **6 decimal places** (e.g. `"0.000001"`, `"123.45"`)

## Error Handling

The SDK uses two error classes:

**`PayApiError`** — thrown for non-2xx HTTP responses from the API:

```ts
import { PayApiError } from "@agent-tech/pay";

try {
  await client.createIntent(req);
} catch (err) {
  if (err instanceof PayApiError) {
    console.log(`HTTP ${err.statusCode}: ${err.message}`);
  }
}
```

**`PayValidationError`** — thrown when the SDK rejects a request before it reaches the API (e.g. missing request, empty intent ID):

```ts
import { PayValidationError } from "@agent-tech/pay";

try {
  await client.executeIntent("");
} catch (err) {
  if (err instanceof PayValidationError) {
    console.log(`Invalid input: ${err.message}`);
  }
}
```

| Status Code | Meaning |
|---|---|
| 400 | Bad request — invalid parameters, amount out of range, or malformed input |
| 401 | Unauthorized — missing or invalid credentials |
| 403 | Forbidden — insufficient permissions for this operation |
| 404 | Not found — intent does not exist |
| 429 | Rate limited — too many requests (60 req/min/IP typical) |
| 503 | Service unavailable — temporary backend issue |

## Advanced

### AbortSignal for cancellation

All API methods accept an optional `AbortSignal` for cancellation:

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

const resp = await client.createIntent(req, controller.signal);
```

### Rate limiting

The API allows approximately **60 requests per IP per minute**. On HTTP 429, implement exponential backoff:

```ts
try {
  await client.getIntent(id);
} catch (err) {
  if (err instanceof PayApiError && err.statusCode === 429) {
    await sleep(backoff);
    // retry
  }
}
```
