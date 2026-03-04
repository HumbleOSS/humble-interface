# ACR: Tokens capability

## Boundary

- **Token metadata and balances MUST be obtained via a token service or token module.** UI must not call arc200 contract methods (arc200_name, arc200_balanceOf, etc.) directly; use token service or query hooks.
- **ARC200 ↔ ASA mapping:** Use a single source of truth (e.g. arc200AsaMapping) for contractId ↔ assetId; do not duplicate mapping logic in components.

## Allowed

- Reading token list, tickers, and balances from the token service or Redux/hooks that are fed by the token service.
- Passing token identifiers (contractId, tokenId) and amounts to action builders (swap, pool, farm).

## Forbidden

- Instantiating `arc200(contractId, algodClient, indexerClient)` in UI or random feature code for balance/metadata.
- Duplicating ARC200↔ASA mapping; all such lookups must go through the configured mapping module.

## Reference (source app)

- **Metadata/supply:** `tokenSlice` fetchToken (arc200_name, arc200_symbol, arc200_decimals, arc200_totalSupply); getTokens from Humble API; getTickers from tickers API.
- **Balance:** arc200_balanceOf used in PoolRemove, usePoolRemove, EmbeddedSwapWidget, etc.—to be replaced by token service in POS.
- **Mapping:** `config/arc200AsaMapping.ts` (getAsaIdFromArc200Contract, hasAsaMapping, getAssetType); used in tokenSlice and swap/pool flows.
