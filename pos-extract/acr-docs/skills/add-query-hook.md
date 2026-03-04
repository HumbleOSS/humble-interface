# Skill: Add query hook

## Purpose

Expose a POS query (e.g. pool Info, token balance, farm list) as a React hook that components can use without touching indexer/algod or API URLs.

## Steps

1. **Define query:** Identify inputs (poolId, address, contractId, etc.) and return shape (pool info, balance, list).
2. **Implement in data layer:** Query runs in a slice or service that uses the indexing/token service (which in turn uses algod/indexer/API). Cache in Redux or React Query if appropriate.
3. **Expose hook:** Hook (e.g. `usePoolInfo(poolId)`, `useTokenBalance(contractId, address)`) returns `{ data, status, error, refetch }` and triggers the query when inputs change.
4. **Use in UI:** Components use the hook only; they do not call getAlgorandClients() or fetch() to indexer/API.

## Boundaries

- Hook MUST NOT call getAlgorandClients() or indexer/API directly; it calls the POS query service or thunk that encapsulates those.
- Refresh behavior (on mount, on interval, on account change) is defined in the data layer or hook options.

## Reference (source app)

- Pool info: poolSlice fetchPool/getPool (swap.Info + Dexie); used by PoolAdd, PoolRemove, usePoolRemove.
- Token balance: arc200_balanceOf in usePoolRemove, PoolRemove, EmbeddedSwapWidget—should become useTokenBalance(poolId, address) or similar.
- Farms/stake: farmSlice getFarms (CONTRACT.Pool), stakeSlice getStake (CONTRACT.Stake); consumed by FarmList, FarmCard.
