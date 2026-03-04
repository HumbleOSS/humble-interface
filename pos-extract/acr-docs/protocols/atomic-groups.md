# ACR: Atomic groups (protocol)

## Boundary

- **All multi-txn flows MUST be built and submitted as a single atomic group.** No ad-hoc “send first txn then second” from UI; use a single build → sign → send flow.
- **Group ordering and composition** are defined by the contract/AMM layer (ulujs swap, CONTRACT, arc200); UI only supplies parameters (amounts, slippage, account).

## Allowed

- Building one atomic group per user action (e.g. one swap, one deposit, one withdraw) via the appropriate module.
- Signing the entire group in one `signTransactions` call and sending the full signed group with `sendRawTransaction`.

## Forbidden

- Sending transactions one-by-one for a single logical action (e.g. approve then swap as two separate sends).
- Reordering or dropping txns from the group returned by the contract/AMM builder.

## Reference (source app)

- Swap: `ci.swap(...)` returns `swapR.txns` (base64); entire array signed then sent.
- Pool add/remove: ulujs deposit/withdraw return txn arrays; conditional opt-ins merged into same group (condOptin).
- Farm: stake/unstake/harvest built as atomic groups in FarmCard/FarmCreate.
