# Open questions (TBD)

Items that could not be fully determined from the codebase or that require product/backend decisions for POS.

---

## Wallet

- **Pera / Defly / Daffi:** Commented out in `wallets.ts` (getProviderInit). Are they intended for Algorand mainnet only and disabled for Voi? TBD for POS: which providers to support per network.
- **sendTransactions:** Everywhere the app uses `signTransactions` and then `algodClient.sendRawTransaction(stxns).do()` manually. Was `sendTransactions` from the hook ever used, and should POS use hook send vs. custom send? TBD.

---

## Transactions

- **Fee payer / rekey:** No explicit fee payer or rekey logic found. TBD if POS must support sponsored fees or rekeyed accounts.
- **Deadline:** No explicit deadline (firstValid/lastValid) in swap/pool UI. ulujs may set it internally. TBD whether POS should expose deadline for users.
- **Retry policy:** TXN_CONFIG has MAX_RETRIES and RETRY_DELAY; no clear retry loop in the traced flows. TBD: full retry/backoff strategy for send and confirmation.

---

## Contracts / config

- **Pool creation:** PoolCreate uses Nautilus stub API and exchange hash; exact flow for “create pool” and which app IDs are created on which network: TBD for POS (likely protocol-specific).
- **STAKR_200 (36898212):** Farm/stake use this contract and abi.stakr200 from ulujs. TBD: versioning of ulujs ABI and contract IDs when network or contract upgrades.
- **Rewards claim:** Rewards slice only fetches allowances (approvals API); no “claim” transaction found. TBD: is claim implemented elsewhere or planned?

---

## Indexing / APIs

- **Volume:** volumeSlice uses `/api/volumes.json` (relative URL). Is this a local static file or a backend? TBD for POS analytics.
- **Tickers API:** VITE_HUMBLE_TICKERS_API (e.g. api.humble.sh/integrations/coingecko/tickers). **Decision:** Call directly for now (no proxy). Rate limits and fallbacks remain TBD.
- **NFT/MP endpoints:** Multiple hosts (voirewards, nftnavigator). TBD: canonical list and which are required for core DEX vs. optional NFT features.

---

## Token / ARC200

- **arc200AsaMapping:** Partially populated; some tokens map to 0 (native?). TBD: full list and who maintains it in POS.
- **Verified / trusted:** tokenSlice sets verified (1/2) for non-VOI and VOI; source of “trusted” (gold badge) not fully traced. TBD for POS token list policy.

---

## Product

- **Router / Arbitrage:** Router and ArbitrageTriangular are full flows; TBD whether they are first-class POS modules or composed from amm + pool.
- **Zap:** Single-asset add/remove; TBD if POS treats zap as its own module or a composition of pool + swap.
