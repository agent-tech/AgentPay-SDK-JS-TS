---
name: agent-pay-cli
description: Manages auth credentials and payment intent operations via the agent-pay CLI. Use when the user mentions agent-pay, payment intents, auth setup, creating intents, executing transfers, or querying intent status.
---

# agent-pay CLI

CLI for Agent Tech Pay API — auth management and payment intent operations.

## How to run

```bash
npx @agent-tech/pay <command>
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
| `reset [--yes]` | Remove all stored config + sessions |

**Env vars** for `auth set`: `PAY_API_KEY`, `PAY_SECRET_KEY`, `PAY_BASE_URL` can replace flags.

**Example:**

```bash
agent-pay auth set --api-key my-key --secret-key my-secret --base-url https://api-pay.agent.tech
```

## Two separate payment flows

There are two independent flows. Do not mix them.

### Flow A: Server-side (requires auth)

The backend Agent wallet signs and executes the transfer. The caller never handles proofs or wallet signing.

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

`intent create` stores the intent as a local session. If you omit `intent-id` in `execute` / `get`, the CLI will use the latest active session.

### Flow B: Client-side / payer-side (no auth)

The payer holds their own wallet and signs an X402 payment off-chain. Only `submit-proof` is needed. Requires `baseUrl` (from `--base-url` or stored config), no secret key.

| Command | Description |
|---------|-------------|
| `intent submit-proof <intent-id> --proof <settle-proof> [--base-url <url>]` | Submit settle proof after payer signs X402 payment |

**Env var** for proof: `PAY_SETTLE_PROOF`.

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

## Notes

- Flow A and Flow B are independent. Do not call `submit-proof` after `execute`.
- `intent create` requires exactly one of `--email` or `--recipient`, not both.
- All payments settle on Base; `--payer-chain` is the source chain only.

## Additional reference

For full API details, see [reference.md](reference.md).
