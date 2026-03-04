# ACR: Transactions capability

## Boundary

- **Transaction building:** Use protocol/contract modules (e.g. amm, pool, arc200) to produce unsigned atomic group bytes. Do not construct raw algosdk transactions in UI.
- **Signing:** Only the wallet service (or hook) may call `signTransactions`. UI requests “sign this group” via the service.
- **Broadcast:** A single transaction service (or equivalent) must send signed bytes via `algodClient.sendRawTransaction().do()` and track confirmation.

## Allowed

- Calling module builders (e.g. swap, deposit, withdraw) with user inputs and slippage/MBR options.
- Passing built txn bytes (Uint8Array[]) to the wallet service for signing.
- Passing signed bytes to the transaction service for send + waitForConfirmation.
- Reading slippage/default fee from settings or constants.

## Forbidden

- UI or arbitrary code calling `algodClient.sendRawTransaction` or `signTransactions` without going through the designated services.
- Building raw Payment or AppCall transactions in UI; use contract/AMM abstractions.

## Reference (source app)

- **Build:** ulujs `swap`, `arc200`, `CONTRACT` in components/hooks; `.txns` as base64 → decode to Uint8Array for signing.
- **Sign:** `signTransactions(txns)` from `useWallet()`.
- **Send:** `algodClient.sendRawTransaction(stxns).do()` then `algosdk.waitForConfirmation(algodClient, txId, 1000)`.
- **Slippage:** localStorage `currentSlippage`, SwapOptionsModal; passed to `ci.swap(..., { slippage })`.
- **MBR:** createBalanceBox/createAllowanceBox and conditional setOptins in pool/farm flows.
