---
name: agent-pay-cli
description: Manages auth credentials and payment intent operations via agent-pay CLI. Use when: (1) Setting up or managing auth for Agent Tech Pay, (2) Creating/executing payment intents (server-side Flow A), (3) Submitting settle proofs (payer-side Flow B), (4) Reading balance, sessions, or intent status. Keywords: agent-pay, payment intents, auth set, intent create, intent execute, submit-proof, balance read.
---

# agent-pay CLI

CLI for Agent Tech Pay — auth management and payment intent operations.

## How to run

```bash
npx @agenttech/pay <command>
# or, if installed globally:
agent-pay <command>
```

## Auth commands

Config is stored at `~/.agent-tech-pay/config.json` (sessions in `~/.agent-tech-pay/sessions/`).

| Command | Description |
|---------|-------------|
| `auth set --api-key <key> --secret-key <key> --base-url <url>` | Save credentials |
| `auth show` | Show current config (secret masked) |
| `auth clear` | Remove stored config |
| `balance read --address <addr> [--rpc-url <url>]` | Read agent USDC balance from Base chain (default RPC: https://mainnet.base.org) |
| `reset [--yes]` | Remove all stored config + sessions |

**Env vars** for `auth set`: `PAY_API_KEY`, `PAY_SECRET_KEY`, `PAY_BASE_URL` can replace flags.

**Example:**

```bash
agent-pay auth set --api-key my-key --secret-key my-secret --base-url https://api-pay.agent.tech
```

## Two separate payment flows

There are two independent flows. Do not mix them.

**Before intent operations, ask:**
- **Flow**: Server-side (Agent wallet signs) or payer-side (payer signs X402)?
- **Auth**: For Flow A, do I have `agent-pay auth set` configured?
- **Chain**: Which `--payer-chain`? (`solana` or `base` — source only; all settle on Base)

| Scenario | Flow | Primary command |
|----------|------|-----------------|
| Backend creates intent, Agent wallet executes | A | `intent create` → `intent execute` |
| Payer signs off-chain, submits proof | B | `intent submit-proof` |

### Flow A: Server-side (requires auth)

The backend Agent wallet signs and executes the transfer. The caller never handles proofs or wallet signing.

**MANDATORY**: Before Flow A commands, read [reference.md](reference.md) sections: "Flow A: Server-side commands", "intent create", "intent execute", "intent get", "intent sessions".

| Command | Description |
|---------|-------------|
| `intent create --amount <val> --payer-chain <chain> [--email <e> \| --recipient <r>]` | Create payment intent |
| `intent execute [intent-id]` | Execute transfer on Base (Agent wallet signs); defaults to latest active session |
| `intent get [intent-id]` | Query intent status; defaults to latest active session |
| `intent sessions [--expired]` | List stored sessions |

**Rules for `intent create`:**
- Required: `--amount`, `--payer-chain` (e.g. `solana`, `base`)
- Exactly one of: `--email` OR `--recipient` (wallet address)

**Env vars** for `intent create`: `PAY_AMOUNT`, `PAY_PAYER_CHAIN`, `PAY_EMAIL`, `PAY_RECIPIENT`.

`intent create` stores the intent as a local session. If you omit `intent-id` in `execute` / `get`, the CLI uses the latest active session (or `PAY_INTENT_ID` env var).

### Flow B: Client-side / payer-side (no auth)

The payer holds their own wallet and signs an X402 payment off-chain. Only `submit-proof` is needed. Requires `baseUrl` (from `--base-url` or stored config), no secret key.

**MANDATORY**: Before `submit-proof`, read [reference.md](reference.md) section "intent submit-proof".

| Command | Description |
|---------|-------------|
| `intent submit-proof <intent-id> --proof <settle-proof> [--base-url <url>]` | Submit settle proof after payer signs X402 payment |

**Env var** for proof: `PAY_SETTLE_PROOF`.

**Do NOT load** reference.md for simple auth commands (`auth set`, `auth show`, `auth clear`) or `balance read` — SKILL.md is sufficient.

## NEVER

- **NEVER** call `submit-proof` after `execute` — they are different flows; mixing causes confusion and incorrect state.
- **NEVER** pass both `--email` and `--recipient` to `intent create` — exactly one is required; both causes validation error.
- **NEVER** assume `execute`/`get` without `intent-id` uses a specific session — it uses the latest active session or `PAY_INTENT_ID`; if none exists, CLI exits with error.
- **NEVER** run Flow A commands without auth — run `agent-pay auth set` first; missing config exits with code 1.
- **NEVER** use `auth set` secret key for Flow B — payer signs off-chain; only `baseUrl` is needed; exposing secret is a security risk.
- **NEVER** assume `intent create` alone completes payment — you must call `intent execute` afterward; create only reserves the intent.

## Common workflows

**Setup (do once)**

```bash
agent-pay auth set --api-key <key> --secret-key <key> --base-url https://api-pay.agent.tech
```

**Flow A: Create and execute intent**

```bash
# 1. Create — captures intentId from JSON output
agent-pay intent create --amount 10.00 --payer-chain solana --email merchant@example.com

# 2. Execute using intentId from step 1
agent-pay intent execute <intent-id>

# 3. Query status
agent-pay intent get <intent-id>
```

**List sessions**

```bash
agent-pay intent sessions
agent-pay intent sessions --expired
```

**Reset all stored data**

```bash
agent-pay reset
agent-pay reset --yes
```

**Flow B: Submit settle proof**

```bash
# Payer has already signed X402 payment off-chain and obtained settle proof
agent-pay intent submit-proof <intent-id> --proof <settle-proof>
```

## Common issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "No auth config" / exit 1 | Missing credentials | Run `agent-pay auth set` first |
| "intent-id is required (no active session)" | No session, no `PAY_INTENT_ID` | Provide `[intent-id]` or run `intent create` first |
| Backend error (stderr, exit 1) | Invalid base-url, expired key, or server issue | Check `--base-url`, re-run `auth set`, verify credentials |
| Validation error on `intent create` | Both `--email` and `--recipient`, or missing required | Use exactly one of `--email` OR `--recipient`; ensure `--amount` and `--payer-chain` |

## Notes

- All payments settle on Base; `--payer-chain` is the source chain only.
