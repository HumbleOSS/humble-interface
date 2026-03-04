# POS Integration Summary — Humble/voi-humble-pact

**Source app:** voi-humble-pact (HumbleSwap-style Algorand DEX frontend)  
**Target:** Algorand POS v0  
**Extraction type:** Read + extract + document (no refactor)

---

## Overview

The codebase is an Algorand DEX frontend (Voi/Humble) built with React, Redux, Vite, and **ulujs** for contract interaction. It uses **@txnlab/use-wallet-react** for wallet connectivity and **algosdk** for algod/indexer clients. All state-changing flows build transaction bytes via ulujs (swap, arc200, CONTRACT) and hand them to `signTransactions` from the wallet hook; **sendTransactions** is commented out—broadcast is done via **algodClient.sendRawTransaction** after signing.

---

## Module Candidates (summary)

| Module       | Actions (representative)                    | Queries (representative)     | Key config / deps      |
|-------------|---------------------------------------------|-----------------------------|------------------------|
| **amm / swap** | swap (A↔B), exactSwap                      | pool Info, SwapEvents, **simulate (Trader_swap* read-only)** | pool app ids, ulujs swap; see SWAP_UI_AND_SIMULATION.md |
| **pool**    | Provider_deposit, Provider_withdraw         | Info, LP balance            | pool spec, arc200 LP   |
| **router**  | Multi-hop swap                              | Route selection, pool list  | swap, arc200            |
| **arc200-token** | approve, transfer, createBalanceBox(es)  | balanceOf, allowance, name/symbol/decimals/totalSupply | token ids, arc200AsaMapping |
| **farm**    | stake, unstake, harvest                     | Farm list, stake positions  | STAKR_200 ctc, ulujs CONTRACT |
| **rewards** | (claim TBD – UI shows allowances)          | fetchRewards (approvals API)| WAD contract, reward owner addrs |
| **zap**     | Zap in/out (single-asset add/remove)        | Pool info, prices           | Nautilus dex prices API |
| **tokens** | (metadata/listing only; no on-chain mint in core) | getTokens, getTickers   | Humble API, tickers API |
| **indexing** | —                                         | Pools, farms, stake, sales, collections, NFT listings | Indexer + Nautilus/voirewards/nftnavigator APIs |

---

## Runtime Behaviors (summary)

- **Wallet:** Kibisis, Lute, Biatec, WalletConnect; WalletManager + WalletProvider in App; connection via ConnectWallet/WalletModal; `useWallet()` → `activeAccount`, `signTransactions`; no direct wallet SDK in UI—only this hook and `getAlgorandClients()` from `wallets.ts`.
- **Transactions:** Built by ulujs (swap, arc200, CONTRACT) in components/hooks; atomic groups returned as base64; decoded to `Uint8Array[]` and passed to `signTransactions`; broadcast via `algodClient.sendRawTransaction().do()`; confirmation via `algosdk.waitForConfirmation`. Slippage in swap (e.g. SwapOptionsModal, localStorage `currentSlippage`); MBR/opt-in via `createBalanceBox`/`createAllowanceBox` and conditional opt-ins (e.g. setOptins).
- **Indexing:** Algod + Indexer from `getAlgorandClients()` (network from localStorage `node`); Humble API for pools/tokens; Nautilus dex prices; voirewards/nftnavigator for NFT/rewards/collections/sales; Dexie for local cache (pools, tokens, stake, farms, volumes).

---

## Artifacts in this pack

- `module-extract.json` — Module candidates with actions, queries, events, uiBlocks, dependencies, config; amm includes swap_ui and simulate_swap.
- `runtime-extract.json` — Wallet, transactions, indexing.
- `SWAP_UI_AND_SIMULATION.md` — Swap UI state, data flow, token selection (§1.4–1.5), **simulate** (read-only CONTRACT Trader_swap* / Trader_exactSwap*), and **ulujs swap implementation** (§3: dependency, pool spec, simulate, build A/B, ci.swap, sign/send/confirm).
- `acr-docs/` — Capabilities (wallet, transactions, indexing, tokens), protocols (atomic-groups, arc200), skills (bind-action-form, add-query-hook, add-indexer-query).
- `OPEN_QUESTIONS.md` — TBDs and unknowns.
- `POS_IMPORT_PLAN.md` — Step-by-step POS import and validation plan.

---

## Success criteria (for consuming agent)

1. Implement POS modules that match the original app’s swap, pool, router, token, farm, rewards, and zap behavior.
2. Preserve wallet flow (no direct SDK in UI), transaction build → sign → send → confirm, and indexing/API usage.
3. Use ACR docs as boundaries to prevent regressions (e.g. “UI must not call wallet SDK directly; use wallet service”).
