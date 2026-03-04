# POS import plan

Step-by-step plan for implementing POS modules and runtime behaviors from the voi-humble-pact extraction, with minimal validation checklist.

---

## 1. Foundation (runtime)

- [ ] **Wallet service:** Implement a single wallet service that wraps `@txnlab/use-wallet-react` (or POS equivalent). Expose only: connect/disconnect, activeAccount, list accounts/wallets, signTransactions(unsignedTxns). No send in wallet layer.
- [ ] **Node/config service:** Centralize network and endpoints (algod, indexer) from config or env; expose getAlgorandClients() or equivalent only to services, not to UI.
- [ ] **Transaction service:** Implement send flow: accept signed Uint8Array[], call algodClient.sendRawTransaction().do(), then waitForConfirmation. Expose success/txId/error to callers. Optional: retry with TXN_CONFIG (MAX_RETRIES, RETRY_DELAY).

---

## 2. Indexing / data layer

- [ ] **Indexing service:** Single entry point for (1) Algorand Indexer (lookupAccountAssets, search*, etc.), (2) Humble API (pools, tokens), (3) Nautilus dex (prices, stubs), (4) voirewards/nftnavigator/mimirapi as needed. No raw indexer/API calls from UI or feature code.
- [ ] **Token service:** Token list (from API + cache), tickers, single-token metadata (arc200 name/symbol/decimals/totalSupply), balance (arc200_balanceOf). Use ARC200↔ASA mapping from one config (arc200AsaMapping).
- [ ] **Cache (optional):** If using Dexie or similar, restrict to indexing/token layer for pools, tokens, farms, stake, volumes.

---

## 3. Modules to create in POS

Create and wire modules so that **actions** return unsigned atomic groups and **queries** return data from the indexing/token service. UI uses only actions/queries, not algod/indexer/ulujs directly.

| Module        | Priority | Actions to implement                         | Queries to implement                          | Events (if any)     |
|---------------|----------|----------------------------------------------|-----------------------------------------------|---------------------|
| **amm**       | P0       | swap (with slippage), exactSwap              | pool Info, SwapEvents, selectPool             | SwapEvents          |
| **pool**      | P0       | Provider_deposit, Provider_withdraw          | Info, LP balance (via token service)           | —                   |
| **arc200-token** | P0    | approve, createBalanceBox, createAllowanceBox | balanceOf, allowance, metadata (name/symbol/decimals/totalSupply) | — |
| **tokens**    | P0       | —                                           | getTokens, getTickers, fetchToken            | —                   |
| **router**    | P1       | Multi-hop swap                              | Route/pool selection                          | —                   |
| **farm**      | P1       | stake, unstake, harvest (STAKR_200)         | Farm list (Pool), stake list (Stake)          | Pool, Stake          |
| **rewards**   | P1       | (claim TBD)                                 | fetchRewards (approvals API)                  | —                   |
| **zap**       | P1       | Zap in/out                                  | Pool info, DEX prices                          | —                   |
| **indexing**  | P0       | —                                           | Pools list, account assets, DEX prices, NFT/MP/rewards APIs as needed | — |

---

## 4. Actions / queries / events (implementation)

- **Actions:** Each action (swap, deposit, withdraw, stake, etc.) must:
  - Take typed inputs (account address, amounts, token ids, slippage, etc.).
  - Use ulujs (or POS equivalent) with algod + indexer + acc to build the atomic group.
  - Return unsigned txn bytes (Uint8Array[]) or a structure that the transaction service can sign and send.
  - Never call sign or send internally.
- **Queries:** Each query must call the indexing or token service only; no direct algod/indexer in the query implementation.
- **Events:** Where the app uses SwapEvents, Pool, Stake, implement event readers in the module or indexing layer and expose via hooks (e.g. useSwapEvents(poolId, sender, minRound)).

---

## 5. ACR docs to include

- **Capabilities:** wallet.md, transactions.md, indexing.md, tokens.md (from acr-docs/capabilities/).
- **Protocols:** atomic-groups.md, arc200.md (from acr-docs/protocols/).
- **Skills:** bind-action-form.md, add-query-hook.md, add-indexer-query.md (from acr-docs/skills/).

Use these as mandatory boundaries in code review and lint rules (e.g. “UI must not call wallet SDK directly; use wallet service”).

---

## 6. Minimal validation checklist

- [ ] **Wallet:** Connect with at least one provider (e.g. Kibisis/Lute); get activeAccount; sign one txn group; do not send from wallet module.
- [ ] **Send flow:** Transaction service receives signed group; sends via algod; waits for confirmation; returns txId or error.
- [ ] **Swap:** Build swap with poolId, A/B amounts, slippage; sign via wallet service; send via transaction service; confirm via SwapEvents or waitForConfirmation.
- [ ] **Swap UI and simulate:** Swap form has from/to amounts and focus; eligible pool = single pool (max lpMinted); simulate via CONTRACT Trader_swapAForB/BForA (exact-in) or Trader_exactSwap* (exact-out) read-only; min received = actualOutcome * (1 - slippage/100). See SWAP_UI_AND_SIMULATION.md §1–2.
- [ ] **Swap build (ulujs):** Use ulujs `swap` for Info/selectPool/swap; CONTRACT+spec for simulate. Build A/B with amount (string), decimals, tokenId (omit for arc200); getAsaIdFromArc200Contract for ASA; ci.swap(addr, poolId, A, B, [], { slippage, degenMode, skipWithdraw }); decode base64 txns → sign → send → waitForConfirmation; optional SwapEvents. See SWAP_UI_AND_SIMULATION.md §3.
- [ ] **Pool add:** Build deposit; sign and send; no direct indexer/algod in the component.
- [ ] **Pool remove:** Build withdraw with optional condOptin; sign and send.
- [ ] **Token list and balance:** Token service returns list and balance for a given (contractId, address); UI uses only the service/hook.
- [ ] **Indexing:** Pool list and token list come from indexing service (Humble API + cache or indexer); no raw fetch to indexer/API from a component.
- [ ] **ACR:** Grep or lint confirms no UI file imports getAlgorandClients, indexerClient, or wallet SDK; no UI file calls signTransactions or sendRawTransaction directly (only through services).

---

## 7. Order of work (suggested)

1. Wallet service + node config + transaction service.  
2. Indexing service + token service + ARC200 mapping.  
3. amm module (swap action + Info/SwapEvents queries).  
4. pool module (deposit/withdraw + Info/LP balance).  
5. arc200-token and tokens modules (queries + approve/box actions used by amm/pool).  
6. Router, farm, rewards, zap as needed.  
7. ACR docs in repo and enforce boundaries.  
8. Run validation checklist and fix regressions.
