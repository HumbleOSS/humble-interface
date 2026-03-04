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

### 1.4 How to select tokens (from and to)

Token selection ensures **from** and **to** always have at least one common pool so a swap is possible. Options are derived from the pool list and the current selection; VOI is normalized (tokenId 0, contractId TOKEN_WVOI1, display "VOI"; wVOI symbol is filtered out from dropdowns).

#### From-token options (`tokenOptions`)

- **Source:** All tokens that appear in **any** pool as `tokA` or `tokB` (from the pools list returned by `getPools()`).
- **Build steps:**
  1. Collect every `pool.tokA` and `pool.tokB` into a set of token IDs.
  2. Start the list with **VOI**: `{ tokenId: 0, contractId: TOKEN_WVOI1, name: "Voi", symbol: "VOI", decimals: 6, totalSupply }`.
  3. Add every token from the app token list (Redux `tokens`) whose `tokenId` or `contractId` is in that set.
  4. **Exclude from the list:**  
     - The current **to-token** (`token2`): from and to must differ (by `tokenId` and `contractId`).  
     - If `token2` is VOI (tokenId 0 or contractId TOKEN_WVOI1), also exclude VOI from from-options so the pair is not VOI/VOI.  
     - Any token with `symbol === "wVOI"` (show only "VOI" as above).
  5. Sort by `tokenId` (ascending).
- **Used by:** The "Swap from" input; `TokenInput` receives `options={tokenOptions}` and `setToken={setToken}`. When user picks a token, `token` updates and **to-token options** are recomputed (see below).

#### To-token options (`tokenOptions2`)

- **Source:** Depends on the **selected from-token** (`token`). Only tokens that share at least one pool with `token` are valid "to" choices.
- **Build steps:**
  1. For each pool in `pools`, check if the pool contains `token`: `pool.tokA === tokenId(token)` or `pool.tokB === tokenId(token)` (using `tokenId(token)` helper; for VOI this maps to the pool’s representation 0 or TOKEN_WVOI1).
  2. If the pool contains `token`, add the **other** side to a set: if `token` is tokA, add the token matching `pool.tokB`; if `token` is tokB, add the token matching `pool.tokA`. Resolve from the app token list by `tokenId`.
  3. If the set contains wVOI (tokenId TOKEN_WVOI1), add the canonical VOI entry (tokenId 0, symbol "VOI") and remove any entry with `symbol === "wVOI"`.
  4. Sort by `tokenId`.
- **Used by:** The "Swap to" input; `TokenInput` receives `options={tokenOptions2}` and `setToken={setToken2}`. When user picks a token, `token2` updates; **eligible pools** (and then simulation) run for the pair `(token, token2)`.

#### Initial selection from URL

- **Query param:** `poolId` from search params (e.g. `?poolId=395553`); if missing, default to `CTCINFO_DEFAULT_LP` (e.g. WVOI/AUSD pool).
- **Logic:** Find the pool in `pools` where `pool.poolId === paramPoolId`. If found:
  - **From-token:** If `pool.tokA` is 0 or TOKEN_WVOI1, set `token = { ...NETWORK_TOKEN.VOI, contractId: TOKEN_WVOI1 }`; else set `token` to the token in `tokens` with `tokenId` or `contractId` equal to `pool.tokA`.
  - **To-token:** Same for `pool.tokB` → `token2`.
- This runs only when `token` and `token2` are not already set (so URL applies on first load or when coming from a pool link).

#### Reset when no eligible pool

- After **eligible pools** are computed (pools that contain both `token` and `token2`, then pick one with max `lpMinted`), if the result is **empty** and there is no `paramPoolId` in the URL:
  - Set `token2` to `undefined` and clear `balance2`.
- So if the user selects a from-token that has no pool with any other token, the to-field is cleared (no invalid pair).

#### Swap-direction button

- A control (e.g. swap icon) between the two inputs does:  
  `token ↔ token2` and `fromAmount ↔ toAmount`.  
  So the user can flip the pair without re-selecting tokens; amounts swap as well.

#### Token identity (VOI / wVOI)

- **Display:** VOI and wVOI both show as "VOI"; use `tokenId` 0 and `contractId` TOKEN_WVOI1 (390001) consistently. `getIconId()` maps 390001 → 0 for icon URLs.
- **Matching:** When comparing with `pool.tokA` / `pool.tokB`, treat both 0 and TOKEN_WVOI1 as the same asset (VOI). The pool may store either; the app normalizes to one representation in the UI.

### 1.5 Token select UI component

How the token selector is wired in the source app (Swap uses **TokenInput**, which embeds **TokenSelect**). POS can replicate this with any equivalent combo (dropdown, modal, or inline list).

#### TokenInput (combined row)

- **Role:** One row for “Swap from” or “Swap to”: label + token selector + optional balance (“Max”) + amount input.
- **Props (representative):** `label`, `amount`, `setAmount`, `token` (selected), `token2` (other side, for exclusion in options), `setToken`, `options` (ARC200TokenI[]), `balance`, `onFocus`, `displayId` (for icon), `tokInfo` (symbol/name/verified), `compact`.
- **Behavior:** Renders the selected token (icon + symbol) and the amount input; clicking the token opens TokenSelect. “Max” sets amount to balance. `onFocus("from" | "to")` tells the swap form which field is driving simulation.

#### TokenSelect (picker)

- **Props:** `token` (currently selected), `options` (list to show), `onSelect: (token: ARC200TokenI) => void`, `compact?: boolean`.
- **Open/close:** Click on the token button (or selector area) sets anchor; menu/modal opens. On pick: `onSelect(selected)` then close. No selection → just close.
- **Content:** List of tokens from `options`. Each row: **icon** (e.g. `getIconId(contractId|tokenId)` → asset-verification URL), **symbol** (e.g. `tokenSymbol(token)`), **name**, optional **balance** and **balance value (USD)** when wallet is connected.
- **Search:** Optional text field; filter options by symbol/name (e.g. debounced 200 ms). Source app uses `searchTerm` / `debouncedSearchTerm`.
- **Sort (optional):** Source app supports sort by name, marketCap, volume, price, balance, balanceValue, liquidity; asc/desc. Default sort “balanceValue” desc. Not required for minimal POS; a simple sorted-by-tokenId list is enough.
- **Display categories (optional):** e.g. “Your tokens” vs “By volume”. For swap, passing a pre-filtered `options` list (from- or to-options) is enough; no need for tabs inside the picker.
- **Icon URL:** e.g. `https://asset-verification.nautilus.sh/icons/${getIconId(tokenId|contractId)}.png`; fallback to `0.png` for VOI.

#### Minimal POS token select

- **Inputs:** `options: ARC200TokenI[]`, `selected: ARC200TokenI | undefined`, `onSelect: (t: ARC200TokenI) => void`.
- **UI:** Button or row showing selected token (icon + symbol) or “Select token”; on click open a modal or dropdown listing `options`. Each item: icon + symbol (and optionally name). On item click: `onSelect(item)`, close.
- **No direct algod/indexer:** Options and balance come from parent (token service / hooks). TokenSelect in the app does fetch balances and DEX prices for display; in POS those should be provided by the data layer so the component stays a pure UI.

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

- [ ] **From-token options:** All tokens that appear as tokA/tokB in any pool; include VOI (tokenId 0, contractId TOKEN_WVOI1); exclude current to-token and wVOI symbol.
- [ ] **To-token options:** For selected from-token, all tokens that share at least one pool (other side of each pool containing from-token); normalize VOI/wVOI; exclude wVOI symbol.
- [ ] **Initial selection:** Optional URL `poolId` → set token from pool.tokA, token2 from pool.tokB (VOI normalized).
- [ ] **Reset:** If eligible pools for (token, token2) is empty and no URL poolId, clear token2.
- [ ] **Swap-direction button:** Swap token ↔ token2 and fromAmount ↔ toAmount.
- [ ] **Token select UI:** TokenInput row (label + selector + balance + amount); TokenSelect receives options, selected, onSelect; opens on click; list shows icon + symbol (and optionally name, balance); on pick call onSelect and close. See §1.5.
- [ ] Eligible pool for (token, token2) = single pool with max lpMinted.
- [ ] Pool Info() and rate (spot) from pool balances.
- [ ] **Simulate exact input:** Trader_swapAForB or Trader_swapBForA(1, amountIn, 0) → set toAmount/actualOutcome.
- [ ] **Simulate exact output:** Trader_exactSwapAForB or Trader_exactSwapBForA(1, MAX_SAFE_INTEGER, amountOut) → set fromAmount.
- [ ] Fee = fromAmount * totFee/10000; min received = actualOutcome * (1 - slippage/100).
- [ ] Confirmation modal then build ci.swap(), sign, send, waitForConfirmation, SwapEvents, success modal.
- [ ] Slippage from settings (e.g. localStorage or POS settings) and passed to ci.swap(..., { slippage }).
