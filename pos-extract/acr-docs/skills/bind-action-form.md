# Skill: Bind action form

## Purpose

Wire a POS action (e.g. swap, deposit, withdraw) to a form in the UI without the form calling wallet or contract code directly.

## Steps

1. **Form state:** Form holds only user inputs (amounts, token selection, slippage, etc.) and validation state.
2. **Action binding:** On submit, call the POS action service with form values (e.g. `actions.swap({ fromToken, toToken, amount, slippage, sender })`). The action service returns unsigned txn group (or error).
3. **Sign and send:** Pass the returned group to the wallet service for signing, then to the transaction service for send + confirmation. Do not call `signTransactions` or `sendRawTransaction` from the form component.
4. **Feedback:** Use success/error from the transaction service to update UI (toast, modal, reset form).

## Boundaries

- Form MUST NOT import algod/indexer or ulujs/arc200.
- Form MUST NOT build transactions; it only collects inputs and calls the action API.

## Reference (source app)

- Swap: `Swap/index.tsx` — form state (fromAmount, toAmount, token, token2, currentSlippage); on confirm → build with `ci.swap(acc.addr, pool2.poolId, A, B, [], { slippage })` → `signTransactions(swapR.txns.map(...))` → `algodClient.sendRawTransaction(stxns).do()` → waitForConfirmation + SwapEvents. In POS, the “build” and “sign/send” parts should be behind services.
