# ACR: Indexing capability

## Boundary

- **Indexer and third-party API access MUST be centralized.** UI and feature modules MUST NOT instantiate their own Indexer or fetch from indexer/API URLs directly; use an indexing service or dedicated hooks that encapsulate endpoints and caching.
- **Algod:** Use only for submission and status (e.g. suggested params, sendRawTransaction, status). Historical and search data MUST come from the indexing service (indexer + defined APIs).

## Allowed

- Querying pools, tokens, farms, stake, rewards, and analytics through the indexing service (or its hooks).
- Using local cache (e.g. Dexie) only when managed by the indexing/data layer, not by random components.

## Forbidden

- Components importing `getAlgorandClients()` and calling `indexerClient.lookup*` or `search*` directly.
- Hardcoding indexer or API base URLs in components (e.g. mainnet-idx.nautilus.sh, voirewards.com) outside a single config/service.

## Reference (source app)

- **Clients:** `wallets.ts` `getAlgorandClients()` → algodClient, indexerClient; network from `getCurrentNodeEnv()` (localStorage `node`).
- **APIs:** Humble API (pools, tokens), Nautilus dex prices, voirewards/nftnavigator NFT/sales/collections, mimirapi arc200/approvals.
- **Cache:** Dexie tables pools, tokens, farms, stake, volumes in store slices.
