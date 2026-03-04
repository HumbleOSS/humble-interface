# Swap UI and how to simulate swap

Extracted from `src/components/Swap/index.tsx` and related components. Use this to replicate swap UX and quote/simulation in POS.

---

## 1. Swap UI overview

### 1.1 State (Swap/index.tsx)

| State | Purpose |
|-------|--------|
| `fromAmount`, `toAmount` | User-visible amounts (string); one is driver, the other derived by simulation |
| `focus` | `"from"` \| `"to"` \| `undefined` — which field user is editing; the other is updated by simulate |
| `token`, `token2` | From-token and to-token (ARC200TokenI); can be set from URL `poolId` or user selection |
| `tokenOptions`, `tokenOptions2` | Filtered list of tokens that appear in at least one pool (so swap is possible) |
| `balance`, `balance2` | User’s balance for token / token2 (from indexer or arc200_balanceOf) |
| `eligiblePools` | Pools that contain both token and token2; app uses **one** pool: highest `lpMinted` from `swap(poolId).Info()` |
| `info` | Pool `Info()` return value (poolBals.A/B, lptBals.lpMinted, protoInfo.totFee, etc.) |
| `rate`, `invRate` | Spot rate (1 from = rate to, 1 to = invRate from); from pool balances + decimals |
| `expectedOutcome` | Simple quote: `fromAmount * rate` (no contract call) |
| `actualOutcome` | **Simulated** output from contract (Trader_swapAForB / Trader_swapBForA); drives `toAmount` when focus is "from" |
| `fee` | LP fee: `fromAmount * info.protoInfo.totFee / 10000` |
| `slippage` (display) | Price impact % (from pool reserves and amount) |
| `currentSlippage` | User’s allowed slippage % (localStorage `currentSlippage`; default 5.0) |
| `minRecieved` | `actualOutcome * (1 - currentSlippage/100)` |
| `showConfirmation` | Confirmation modal open before signing |
| `swapModalOpen`, `swapIn`, `swapOut`, `tokIn`, `tokOut`, `txId`, `poolId` | Success modal and tx details |

### 1.2 Data flow

1. **Pools & tokens:** Redux `getPools()`, `getTokensWithTickers()`; URL `poolId` can preselect pool and thus token/token2.
2. **Token options:** Tokens that appear in any pool as tokA or tokB (plus VOI); token2 is excluded from token options and vice versa.
3. **Eligible pool:** Among pools that contain both token and token2, pick the pool with largest `lpMinted` (single pool used for quote and execution).
4. **Pool info:** `new swap(eligiblePools[0].poolId, algodClient, indexerClient).Info()` → `info`.
5. **Rate:** From `info.poolBals.A/B` and decimals; fallback `swap.rate(info, A, B)` if needed.
6. **Simulation (see below):** On `fromAmount` or `toAmount` change (depending on `focus`), call read-only CONTRACT methods to set the other amount and `actualOutcome`.
7. **Submit:** User clicks Swap → `setShowConfirmation(true)` → in confirmation, `handleConfirmedSwap` builds `ci.swap(...)`, signs, sends, waits for confirmation and SwapEvents, then opens success modal.

### 1.3 UI blocks (order)

- Token selectors (from / to) with balance.
- From-amount and to-amount inputs (one drives the other via simulation).
- Swap direction button (flip token/token2).
- Summary: Rate (1 A = X B, 1 B = Y A), pool balance, LP fee, price impact %, allowed slippage %, minimum received.
- Settings (gear) → SwapOptionsModal: max slippage presets + custom.
- Primary button: "Swap" (or "Insufficient liquidity" / "Select token" / "Enter amount" when invalid).
- Confirmation modal: same summary + "Confirm" / "Cancel".
- Success modal: amounts, tokens, tx link.

---

## 2. How to simulate swap (no transaction sent)

Simulation uses the **same pool contract** via ulujs `CONTRACT` with a **read-only** call: no transaction is built or signed. The contract’s ABI exposes `Trader_swapAForB`, `Trader_swapBForA`, `Trader_exactSwapAForB`, `Trader_exactSwapBForA`; when called with `simulate: true` (or equivalent in ulujs), they return the output amounts without creating txns.

### 2.1 Setup for simulation

- **Clients:** `getAlgorandClients()` → `algodClient`, `indexerClient`.
- **Pool:** `eligiblePools[0]` (or the pool you use for the pair).
- **Contract instance:**  
  `CONTRACT(poolId, algodClient, indexerClient, spec, acc)`  
  Use any `acc` (e.g. `{ addr: "G3MSA75...", sk: new Uint8Array(0) }`); simulation does not sign.
- **Fee:** `ci.setFee(4000)` so simulated fee matches real tx (optional but consistent).

Pool `spec` in the app is the pool ABI (Info, Provider_*, Trader_swap*, Trader_exactSwap*, arc200_*, createBalanceBox, etc.) — see `Swap/index.tsx` or `constants/poolSpec.ts`.

### 2.2 Simulate: “From amount” → “To amount” (exact input)

**Goal:** User types “from” amount; get expected “to” amount (before slippage).

1. Resolve which side of the pool is “from”:  
   - If `token` is pool’s tokA → use **Trader_swapAForB**.  
   - If `token` is pool’s tokB → use **Trader_swapBForA**.
2. Convert from-amount to smallest units:  
   `fromAmountBI = BigInt(fromAmount * 10^token.decimals)` (use BigNumber and round down).
3. Call (read-only / simulate):
   - **Trader_swapAForB(1, fromAmountBI, 0)**  
     - Arg 1: pool selector byte (1).  
     - Arg 2: amount of tokA in smallest units.  
     - Arg 3: min amount of tokB out (0 for simulation).  
     - Returns e.g. `[amountA, amountB]`; **output is amountB**.
   - **Trader_swapBForA(1, fromAmountBI, 0)**  
     - Same idea; **output is amountA** (returnValue[0]).
4. Convert output to human units:  
   `toAmount = returnValue[outIndex] / 10^token2.decimals`, round down.  
   Set `actualOutcome = toAmount` and `toAmount` in UI.

**Code reference:** `Swap/index.tsx` ~1197–1292 (useEffect on `fromAmount` when `focus === "from"`).

### 2.3 Simulate: “To amount” → “From amount” (exact output)

**Goal:** User types “to” amount; get required “from” amount.

1. Resolve direction:
   - If `token2` is pool’s tokA → need **Trader_exactSwapBForA** (we want exact tokA out, so we pay tokB in).  
   - If `token2` is pool’s tokB → need **Trader_exactSwapAForB** (exact tokB out, pay tokA in).
2. Convert to-amount to smallest units:  
   `toAmountBI = BigInt(toAmount * 10^token2.decimals)`.
3. Call (read-only / simulate):
   - **Trader_exactSwapBForA(1, Number.MAX_SAFE_INTEGER, toAmountBI)**  
     - Third arg: exact amount of tokA we want out.  
     - Returns; app uses `diff = MAX_SAFE_INTEGER - returnValue[1]` then `fromAmount = diff / 10^token.decimals`.
   - **Trader_exactSwapAForB(1, Number.MAX_SAFE_INTEGER, toAmountBI)**  
     - Exact amount of tokB out; `diff = MAX_SAFE_INTEGER - returnValue[0]`, then `fromAmount = diff / 10^token.decimals`.
4. Set `fromAmount` in UI.

**Code reference:** `Swap/index.tsx` ~1331–1325 (useEffect on `toAmount` when `focus === "to"`).

### 2.4 Token ↔ pool side (tokA / tokB)

- Compare `pool.tokA` / `pool.tokB` with `tokenId(token)` and `token.contractId` (and VOI as 0 or TOKEN_WVOI1).
- If `token` matches `info.tokA` → token is tokA, token2 is tokB.  
- If `token` matches `info.tokB` → token is tokB, token2 is tokA.  
- Same for `token2` when doing exact-output simulation.

### 2.5 Minimum received (for display only)

- **Min received** = `actualOutcome * (1 - currentSlippage / 100)`.  
- Shown in confirmation; the real swap uses the same `currentSlippage` in `ci.swap(..., { slippage: currentSlippage/100 })` so the contract enforces min out.

---

## 3. Router / multi-hop simulation (reference)

- **Router** (`Router/index.tsx`): `simulateSwapPath` builds a chain of CONTRACTs per pool and calls `Trader_swapAForB` / `Trader_swapBForA` with `amountIn` at each step; output of step N is input of step N+1. Returns final `expectedOutput` and per-step amounts.
- **ArbitrageTriangular** (`ArbitrageTriangular/index.tsx`): Same idea: `simulateArbitrageForAmount` runs multiple CONTRACT simulate calls along the triangle and computes expected output and slippage.

Same pattern: CONTRACT(poolId, algod, indexer, spec, dummyAcc), setFee, then call Trader_swap* with amount and 0 for minOut (simulate). No transactions are built or sent.

---

## 4. POS checklist for swap UI + simulation

- [ ] Token options filtered by “appears in at least one pool”.
- [ ] Eligible pool for (token, token2) = single pool with max lpMinted.
- [ ] Pool Info() and rate (spot) from pool balances.
- [ ] **Simulate exact input:** Trader_swapAForB or Trader_swapBForA(1, amountIn, 0) → set toAmount/actualOutcome.
- [ ] **Simulate exact output:** Trader_exactSwapAForB or Trader_exactSwapBForA(1, MAX_SAFE_INTEGER, amountOut) → set fromAmount.
- [ ] Fee = fromAmount * totFee/10000; min received = actualOutcome * (1 - slippage/100).
- [ ] Confirmation modal then build ci.swap(), sign, send, waitForConfirmation, SwapEvents, success modal.
- [ ] Slippage from settings (e.g. localStorage or POS settings) and passed to ci.swap(..., { slippage }).
