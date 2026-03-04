# ACR: Wallet capability

## Boundary

- **UI must not call wallet SDK directly; use wallet service.**
- All connection, account, and signing access MUST go through a single wallet abstraction (e.g. POS wallet service) that wraps `@txnlab/use-wallet-react` or equivalent.
- Network/algod/indexer configuration MUST be centralized (e.g. from a single node/env module).

## Allowed

- Obtaining `activeAccount` (address) and `signTransactions(unsignedTxns)` from the wallet service/hook.
- Listing supported wallets and active accounts for UI (connect modal, account switcher).
- Passing user-selected network to the wallet/manager (e.g. NetworkId.VOIMAIN).

## Forbidden

- Importing and calling Pera/Defly/Lute/Kibisis (or any provider) directly from UI or feature code.
- Sending transactions from the UI layer; broadcast MUST be done by a transaction service after signing.

## Reference (source app)

- **Library:** `@txnlab/use-wallet-react`
- **Setup:** `App.tsx` — `WalletManager({ wallets: [Kibisis, Lute, Biatec, WalletConnect], network: NetworkId.VOIMAIN })`, `WalletProvider(manager)`.
- **Usage:** `useWallet()` → `activeAccount`, `activeWallet`, `wallets`, `activeWalletAccounts`, `signTransactions`.
- **Connection UI:** `ConnectWallet/index.tsx`, `modals/WalletModal/index.tsx`.
