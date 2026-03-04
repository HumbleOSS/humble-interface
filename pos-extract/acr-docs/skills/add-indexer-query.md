# Skill: Add indexer query

## Purpose

Add a new indexer or API-backed query to the POS indexing layer so that no component needs to hit the indexer or external API directly.

## Steps

1. **Define query:** Name, inputs (e.g. address, round range, contractId), and output type (e.g. list of events, balances).
2. **Choose source:** Algorand Indexer (lookupAccountAssets, searchForTransactions, etc.) or a specific API (Humble, Nautilus, voirewards, mimirapi). Document the endpoint and any auth.
3. **Implement in indexing service:** Single module or API that accepts (queryName, params) and returns normalized data. Map external shapes to POS types (e.g. IndexerPoolI, RewardTransfer).
4. **Expose via hook or thunk:** e.g. `useRewards(address)`, `getPools()`, so UI only calls the hook/thunk.
5. **Config:** Add endpoint/network to central config; do not hardcode URLs in the new query.

## Boundaries

- No component or feature module may add a new fetch(url) or indexerClient.* call in isolation; all new indexer/API access goes through the indexing service and config.
- Cache (Dexie, Redux, React Query) is managed by the indexing/data layer, not by random components.

## Reference (source app)

- Indexer: getAlgorandClients().indexerClient used in PoolStats, usePoolRemove (lookupAccountAssets), EmbeddedSwapWidget (accountInfo), PoolCreate (asset lookup).
- APIs: Humble /pools, /tokens; Nautilus dex/prices, dex/stubs/pool; voirewards sales, collections, tokens; nftnavigator mp/listings; mimirapi arc200/approvals. Each used in slices or components—to be centralized in POS.
