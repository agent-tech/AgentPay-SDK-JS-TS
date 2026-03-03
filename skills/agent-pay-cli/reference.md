# agent-pay CLI Reference

## Installation

```bash
npm install -g @agent-tech/pay
# or use via npx without installing
```

## Config file

- **Path**: `~/.agent-tech-pay/config.json`
- **Fields**: `apiKey`, `secretKey`, `baseUrl`
- **Sessions**: stored under `~/.agent-tech-pay/sessions/<intentId>.json`

## Auth commands

### auth set

```bash
agent-pay auth set --api-key <key> --secret-key <key> --base-url <url>
```

All three required. Use flags or env vars: `PAY_API_KEY`, `PAY_SECRET_KEY`, `PAY_BASE_URL`.

### auth show

Shows current config. Secret key is masked (first 4 + last 4 chars visible).

### auth clear

Removes `~/.agent-tech-pay/config.json` (sessions preserved).

### reset

```bash
agent-pay reset [--yes]
```

Removes **all** stored config and sessions.

## Flow A: Server-side commands (require auth)

### intent create

```bash
agent-pay intent create --amount <val> --payer-chain <chain> [--email <e> | --recipient <r>]
```

- `--amount` — e.g. `10.00`
- `--payer-chain` — `solana` or `base`
- Exactly one of `--email` or `--recipient`

Output: JSON. Extract `intentId` and pass as positional argument to `execute` and `get`.
The CLI also stores the created intent as a local session.

### intent execute

```bash
agent-pay intent execute [intent-id]
```

Executes transfer on Base via the Agent backend wallet. No signing required from the caller.
If `intent-id` is omitted, uses the latest active session.

### intent get

```bash
agent-pay intent get [intent-id]
```

Returns intent status and receipt.
If `intent-id` is omitted, uses the latest active session.

### intent sessions

```bash
agent-pay intent sessions [--expired]
```

Lists stored sessions. Use `--expired` to show only expired intents.

## Flow B: Client-side / payer-side (no auth required)

### intent submit-proof

```bash
agent-pay intent submit-proof <intent-id> --proof <settle-proof> [--base-url <url>]
```

Used when the **payer holds their own wallet** and has already signed an X402 payment off-chain.
No `apiKey` or `secretKey` required. `baseUrl` from `--base-url` or stored config.

Env var for proof: `PAY_SETTLE_PROOF`.

## Supported chains

| Chain | `--payer-chain` value |
|-------|-----------------------|
| Solana | `solana` |
| Base | `base` |

All payments settle on Base. `--payer-chain` is the source chain only.

## Error handling

- Missing config: Run `agent-pay auth set` first.
- Missing required params: CLI exits with descriptive error message.
- API errors: Message printed to stderr, exits with code 1.
