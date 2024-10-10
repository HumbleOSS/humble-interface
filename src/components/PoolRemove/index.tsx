import styled from "@emotion/styled";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import { CircularProgress } from "@mui/material";
import { CONTRACT, abi, arc200, swap } from "ulujs";
import { getAlgorandClients } from "../../wallets";
import { useSearchParams } from "react-router-dom";
import { ARC200TokenI, PoolI } from "../../types";
import algosdk from "algosdk";
import { toast } from "react-toastify";
import { tokenSymbol } from "../../utils/dex";
import DiscreteSlider from "../DiscreteSlider";
import { getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import BigNumber from "bignumber.js";
import debounce from "lodash/debounce";

const SwapHeadingContainer = styled.div`
  width: 100%;
`;

const SwapHeading = styled.div`
  color: var(--Color-Neutral-Element-Primary, #0c0c10);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  /* Heading/Display 2 */
  font-family: "Plus Jakarta Sans";
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 21.6px */
  &.dark {
    color: var(--Color-Neutral-Element-Primary, #fff);
  }
`;

const SwapRoot = styled.div`
  display: flex;
  padding: var(--Spacing-1000, 40px);
  flex-direction: column;
  align-items: center;
  gap: var(--Spacing-800, 24px);
  border-radius: var(--Radius-800, 24px);
  &.light {
    border: 1px solid
      var(--Color-Neutral-Stroke-Primary-Static-Contrast, #7e7e9a);
    background: var(
      --Color-Canvas-Transparent-white-950,
      rgba(255, 255, 255, 0.95)
    );
  }
  &.dark {
    border: 1px solid var(--Color-Brand-Primary, #41137e);
    background: var(--Color-Canvas-Transparent-white-950, #070709);
    box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  }
  @media screen and (min-width: 600px) {
    width: 630px;
  }
`;

const BaseButton = styled.div`
  cursor: pointer;
`;

const Button = styled(BaseButton)`
  display: flex;
  padding: var(--Spacing-700, 16px) var(--Spacing-800, 24px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: var(--Radius-750, 20px);
  background: var(--Color-Accent-Disabled-Soft, #d8d8e1);
  &.active {
    border-radius: var(--Radius-700, 16px);
    background: var(--Color-Accent-CTA-Background-Default, #2958ff);
  }
`;

const useDebouncedCallback = (
  callback: (value: string) => void,
  delay: number
) => {
  const debouncedFn = useCallback(debounce(callback, delay), []);
  return debouncedFn;
};

const spec = {
  name: "pool",
  desc: "pool",
  methods: [
    {
      name: "custom",
      args: [],
      returns: {
        type: "void",
      },
    },
    {
      name: "Info",
      args: [],
      returns: {
        type: "((uint256,uint256),(uint256,uint256),(uint256,uint256,uint256,address,byte),(uint256,uint256),uint64,uint64)",
      },
      readonly: true,
    },
    {
      name: "Provider_deposit",
      args: [
        { type: "byte" },
        { type: "(uint256,uint256)" },
        { type: "uint256" },
      ],
      returns: { type: "uint256" },
    },
    {
      name: "Provider_withdraw",
      args: [
        { type: "byte" },
        { type: "uint256" },
        { type: "(uint256,uint256)" },
      ],
      returns: { type: "(uint256,uint256)" },
    },
    {
      name: "Provider_withdrawA",
      args: [{ type: "uint256" }],
      returns: { type: "uint256" },
    },
    {
      name: "Provider_withdrawB",
      args: [{ type: "uint256" }],
      returns: { type: "uint256" },
    },
    {
      name: "Trader_swapAForB",
      args: [{ type: "byte" }, { type: "uint256" }, { type: "uint256" }],
      returns: { type: "(uint256,uint256)" },
    },
    {
      name: "Trader_swapBForA",
      args: [{ type: "byte" }, { type: "uint256" }, { type: "uint256" }],
      returns: { type: "(uint256,uint256)" },
    },
    {
      name: "arc200_approve",
      desc: "Approve spender for a token",
      args: [
        {
          type: "address",
          name: "spender",
          desc: "The address of the spender",
        },
        {
          type: "uint256",
          name: "value",
          desc: "The amount of tokens to approve",
        },
      ],
      returns: {
        type: "bool",
        desc: "Success",
      },
    },
    {
      name: "arc200_balanceOf",
      desc: "Returns the current balance of the owner of the token",
      readonly: true,
      args: [
        {
          type: "address",
          name: "owner",
          desc: "The address of the owner of the token",
        },
      ],
      returns: {
        type: "uint256",
        desc: "The current balance of the holder of the token",
      },
    },
    {
      name: "arc200_transfer",
      desc: "Transfers tokens",
      readonly: false,
      args: [
        {
          type: "address",
          name: "to",
          desc: "The destination of the transfer",
        },
        {
          type: "uint256",
          name: "value",
          desc: "Amount of tokens to transfer",
        },
      ],
      returns: {
        type: "bool",
        desc: "Success",
      },
    },
    {
      name: "createBalanceBox",
      desc: "Creates a balance box",
      args: [
        {
          type: "address",
        },
      ],
      returns: {
        type: "void",
      },
    },
    //createAllowanceBox(address,address)void
    {
      name: "createAllowanceBox",
      desc: "Creates an allowance box",
      args: [
        {
          type: "address",
        },
        {
          type: "address",
        },
      ],
      returns: {
        type: "void",
      },
    },
    //createBalanceBoxes(address)void
    {
      name: "createBalanceBoxes",
      desc: "Creates a balance box",
      args: [
        {
          type: "address",
        },
      ],
      returns: {
        type: "void",
      },
    },
    // hasBox((byte,byte[64]))byte
    {
      name: "hasBox",
      desc: "Checks if the account has a box",
      args: [
        {
          type: "(byte,byte[64])",
        },
      ],
      returns: {
        type: "byte",
      },
    },
    {
      name: "reserve",
      args: [
        {
          type: "address",
        },
      ],
      returns: {
        type: "(uint256,uint256)",
      },
      readonly: true,
    },
  ],
  events: [],
};

const PoolRemove = () => {
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const dispatch = useDispatch();
  /* Tokens */
  const tokens = useSelector((state: RootState) => state.tokens.tokens);
  useEffect(() => {
    dispatch(getTokens() as unknown as UnknownAction);
  }, [dispatch]);

  /* Pools */
  const pools: PoolI[] = useSelector((state: RootState) => state.pools.pools);

  console.log({ pools, tokens });
  /* Params */
  const [sp] = useSearchParams();
  const paramPoolId = sp.get("poolId");

  /* Wallet */
  const { activeAccount, signTransactions } = useWallet();

  const [pool, setPool] = useState<PoolI>({
    poolId: Number(paramPoolId),
  } as PoolI);

  const [token, setToken] = useState<ARC200TokenI>();
  const [token2, setToken2] = useState<ARC200TokenI>();
  useEffect(() => {
    if (pool || !pools || pools.length === 0 || !tokens || tokens.length === 0)
      return;
    if (paramPoolId) {
      const pool = pools.find((p: PoolI) => `${p.poolId}` === `${paramPoolId}`);
      if (pool) {
        setPool(pool);
        const token = tokens.find(
          (t: ARC200TokenI) => `${t.tokenId}` === `${pool?.tokA}`
        );
        const token2 = tokens.find(
          (t: ARC200TokenI) => `${t.tokenId}` === `${pool?.tokB}`
        );

        setToken(token);
        setToken2(token2);
      } else {
        const pool = pools[0];
        setPool(pool);
        const token = tokens.find(
          (t: ARC200TokenI) => `${t.tokenId}` === `${pool?.tokA}`
        );
        const token2 = tokens.find(
          (t: ARC200TokenI) => `${t.tokenId}` === `${pool?.tokB}`
        );
        setToken(token);
        setToken2(token2);
      }
    } else {
      const pool = pools[0];
      setPool(pool);
      const token = tokens.find(
        (t: ARC200TokenI) => `${t.tokenId}` === `${pool?.tokA}`
      );
      const token2 = tokens.find(
        (t: ARC200TokenI) => `${t.tokenId}` === `${pool?.tokB}`
      );
      setToken(token);
      setToken2(token2);
    }
  }, [pools, tokens, paramPoolId]);

  const [fromAmount, setFromAmount] = React.useState<any>("0");
  const [on, setOn] = useState(false);

  const [info, setInfo] = useState<any>();
  useEffect(() => {
    if (!pool) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new swap(pool.poolId, algodClient, indexerClient);
    ci.Info().then((info: any) => {
      setInfo(info.returnValue);
    });
  }, [pool]);

  const [poolBalance, setPoolBalance] = useState<BigInt>();
  useEffect(() => {
    if (!activeAccount || !pool) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new arc200(pool?.poolId, algodClient, indexerClient);
    console.log({ activeAccount });
    ci.arc200_balanceOf(activeAccount.address).then(
      (arc200_balanceOfR: any) => {
        if (arc200_balanceOfR.success) {
          setPoolBalance(arc200_balanceOfR.returnValue);
        }
      }
    );
  }, [activeAccount, pool]);

  const [poolShare, setPoolShare] = useState<string>("0");
  useEffect(() => {
    if (!activeAccount || !pool || !info || !poolBalance) return;
    const newShare =
      (100 * Number(poolBalance)) / Number(info.lptBals.lpMinted);
    setPoolShare(newShare.toFixed(2));
  }, [activeAccount, pool, info, poolBalance]);

  console.log("poolShare", poolShare);

  const [expectedOutcome, setExpectedOutcome] = useState<string>();
  useEffect(() => {
    if (!pool || !info) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new CONTRACT(pool.poolId, algodClient, indexerClient, spec, {
      addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
      sk: new Uint8Array(0),
    });
    const share = (Number(poolShare) * Number(fromAmount)) / 100;
    const withdrawAmount = Math.round(
      (Number(info.lptBals.lpMinted) * share) / 100
    );
    ci.setFee(4000);
    ci.Provider_withdraw(1, withdrawAmount, [0, 0]).then(
      (Provider_withdrawR: any) => {
        if (Provider_withdrawR.success) {
          setExpectedOutcome(Provider_withdrawR.returnValue);
        }
      }
    );
  }, [activeAccount, pool, info, fromAmount]);

  console.log("expectedOutcome", expectedOutcome);

  const [newShare, setNewShare] = useState<string>();
  useEffect(() => {
    if (poolShare === "100.00") {
      if (fromAmount === "100") {
        setNewShare("0.00");
      } else {
        setNewShare("100.00");
      }
      return;
    }
    const newShare = (Number(poolShare) * (100 - Number(fromAmount))) / 100;
    setNewShare(newShare.toFixed(2));
  }, [poolShare, fromAmount]);

  console.log("newShare", newShare);

  console.log("fromAmount", fromAmount);

  const isValid = !!token && !!token2 && !!fromAmount;

  // EFFECT
  useEffect(() => {
    if (!tokens || token || token2 || tokens.length === 0) return;
    //setToken(tokens[0]);
    const options = new Set<ARC200TokenI>();
    for (const p of pools) {
      if ([p.tokA, p.tokB].includes(tokens[0].tokenId)) {
        if (tokens[0].tokenId === p.tokA) {
          options.add(
            tokens.find(
              (t: ARC200TokenI) => `${t.tokenId}` === `${p.tokB}`
            ) as ARC200TokenI
          );
        } else {
          options.add(
            tokens.find(
              (t: ARC200TokenI) => `${t.tokenId}` === `${p.tokA}`
            ) as ARC200TokenI
          );
        }
      }
    }
    //setToken2(Array.from(options)[0]);
  }, [tokens, pools, token, token2]);

  const buttonLabel = useMemo(() => {
    if (isValid) {
      return "Remove liquidity";
    } else {
      return "Remove liquidity";
    }
  }, [isValid]);

  const handleRemoveLiquidity = async () => {
    //if (!isValid || !token || !token2 || !pool) return;
    if (!activeAccount || !info) {
      toast.info("Please connect your wallet first");
      return;
    }
    try {
      setOn(true);
      const { algodClient, indexerClient } = getAlgorandClients();
      const makeCi = (ctcInfo: number) => {
        const acc = {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        };
        return new CONTRACT(ctcInfo, algodClient, indexerClient, spec, acc);
      };
      const makeBuilder = (
        ctcInfoPool: number,
        ctcInfoTokA: number,
        ctcInfoTokB: number
      ) => {
        const acc = {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        };
        return {
          pool: new CONTRACT(
            ctcInfoPool,
            algodClient,
            indexerClient,
            spec,
            acc,
            true,
            false,
            true
          ),
          arc200: {
            tokA: new CONTRACT(
              ctcInfoTokA,
              algodClient,
              indexerClient,
              {
                ...abi.arc200,
                methods: [
                  ...abi.arc200.methods,
                  {
                    name: "withdraw",
                    args: [
                      {
                        name: "amount",
                        type: "uint64",
                        desc: "Amount to withdraw",
                      },
                    ],
                    returns: {
                      type: "uint256",
                      desc: "Amount withdrawn",
                    },
                  },
                ],
              },
              acc,
              true,
              false,
              true
            ),
            tokB: new CONTRACT(
              ctcInfoTokB,
              algodClient,
              indexerClient,
              {
                ...abi.arc200,
                methods: [
                  ...abi.arc200.methods,
                  {
                    name: "withdraw",
                    args: [
                      {
                        name: "amount",
                        type: "uint64",
                        desc: "Amount to withdraw",
                      },
                    ],
                    returns: {
                      type: "uint256",
                      desc: "Amount withdrawn",
                    },
                  },
                ],
              },
              acc,
              true,
              false,
              true
            ),
          },
        };
      };

      console.log({ info });

      const { poolId } = pool;
      const tokA = info.tokA;
      const tokB = info.tokB;
      const ci = makeCi(poolId);
      const ciA = makeCi(tokA);
      const ciB = makeCi(tokB);

      ci.setFee(4000);

      const arc200_balanceOfR = await ci.arc200_balanceOf(
        activeAccount.address
      );
      if (!arc200_balanceOfR.success) return new Error("Balance failed");
      const poolShare = arc200_balanceOfR.returnValue;

      const withdrawAmount = BigInt(
        new BigNumber(poolShare.toString())
          .dividedBy(100)
          .multipliedBy(fromAmount)
          .toFixed(0)
      );

      const Provider_withdrawR = await ci.Provider_withdraw(
        1,
        withdrawAmount,
        [0, 0]
      );
      if (!Provider_withdrawR.success)
        return new Error("Add liquidity simulation failed");
      const Provider_withdraw = Provider_withdrawR.returnValue;

      const builder = makeBuilder(poolId, tokA, tokB);
      const poolAddr = algosdk.getApplicationAddress(poolId);

      const buildN = [];

      //
      // TODO use api
      //
      const tokens = [
        {
          contractId: 390001,
          name: "Wrapped Voi",
          symbol: "wVOI",
          decimals: 6,
          totalSupply:
            "115792089237316195423570985008687907853269984665640564039457584007913129639935",
          creator: "RTKWX3FTDNNIHMAWHK5SDPKH3VRPPW7OS5ZLWN6RFZODF7E22YOBK2OGPE",
          deleted: 0,
          price: "1.000000",
          tokenId: "0",
          verified: null,
          mintRound: 0,
          globalState: {},
        },
        {
          contractId: 413153,
          name: "Aramid ALGO",
          symbol: "aAlgo",
          decimals: 6,
          totalSupply:
            "115792089237316195423570985008687907853269984665640564039457584007913129639935",
          creator: "RTKWX3FTDNNIHMAWHK5SDPKH3VRPPW7OS5ZLWN6RFZODF7E22YOBK2OGPE",
          deleted: 0,
          price: "1.00100099766100213213",
          tokenId: "302189",
          verified: null,
          mintRound: 894792,
          globalState: {},
        },
        {
          contractId: 395614,
          name: "aUSDC",
          symbol: "aUSDC",
          decimals: 6,
          totalSupply:
            "115792089237316195423570985008687907853269984665640564039457584007913129639935",
          creator: "RTKWX3FTDNNIHMAWHK5SDPKH3VRPPW7OS5ZLWN6RFZODF7E22YOBK2OGPE",
          deleted: 0,
          price: "75.15856933383736351197",
          tokenId: "302190",
          verified: 1,
          mintRound: 0,
          globalState: {},
        },
      ];

      //
      // experimental withdraw extra wrapped tokens
      //
      do {
        for (const tok of [tokA, tokB]) {
          const token = tokens?.find((t) => t.contractId === tok);
          if (!token) continue;
          const tokBuilder =
            tok === tokA ? builder.arc200.tokA : builder.arc200.tokB;
          const tokCi = tok === tokA ? ciA : ciB;
          const arc200_balanceOf = (
            await tokCi.arc200_balanceOf(activeAccount.address)
          ).returnValue;
          if (arc200_balanceOf === BigInt(0)) continue;
          const msg = `Withdraw ${new BigNumber(arc200_balanceOf.toString())
            .dividedBy(new BigNumber(10).pow(6))
            .toFixed(6)} ${token.symbol}`;
          const note = new TextEncoder().encode(msg);
          const txnO = (await tokBuilder.withdraw(arc200_balanceOf)).obj;
          buildN.push({
            ...txnO,
            note,
          });
        }
      } while (0);

      //
      // remove liquidity
      //

      do {
        const txnO = (
          await builder.pool.Provider_withdraw(
            0,
            withdrawAmount,
            Provider_withdraw
          )
        ).obj;
        const msg = `Remove liquidity ${withdrawAmount} LP`;
        const note = new TextEncoder().encode(msg);
        buildN.push({
          ...txnO,
          note,
        });
      } while (0);

      //
      // If Provider_withdraw includes wrapped token withdraw
      //

      do {
        for (const tok of [tokA, tokB]) {
          const token = tokens?.find((t) => t.contractId === tok);
          if (!token) continue;
          const symbol = token.symbol;
          const decimals = token.decimals;
          const constructor =
            tok === tokA ? builder.arc200.tokA : builder.arc200.tokB;
          const withdrawAmount = Provider_withdraw[tok === tokA ? 0 : 1];

          const msg = `Withdraw ${new BigNumber(withdrawAmount.toString())
            .dividedBy(new BigNumber(10).pow(6))
            .toFixed(decimals)} ${symbol}`;
          const note = new TextEncoder().encode(msg);
          const txnO = (await constructor.withdraw(withdrawAmount)).obj;

          console.log({ token, symbol, decimals, withdrawAmount, txnO });

          buildN.push({
            ...txnO,
            note,
          });
        }
      } while (0);

      ci.setAccounts([poolAddr]);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      const customR = await ci.custom();
      console.log({ customR });
      if (!customR.success)
        return new Error("Remove liquidity group simulation failed");

      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      // TODO toast here

      // await toast.promise(
      //   signTransactions(
      //     customR.txns.map(
      //       (t: string) => new Uint8Array(Buffer.from(t, "base64"))
      //     )
      //   ),
      //   // TODO send transactions
      //   //.then(sendTransactions),
      //   {
      //     pending: `Remove liquidity ${Number(
      //       Provider_withdraw[0]
      //     )} ${tokenSymbol(token, true)} + ${Number(
      //       Provider_withdraw[1]
      //     )} ${tokenSymbol(token2, true)}`,
      //     success: `Add liquidity successful!`,
      //   },
      //   {
      //     type: "default",
      //     position: "top-center",
      //     theme: "dark",
      //   }
      // );

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
    } catch (e: any) {
      toast.error(e.message);
      console.error(e);
    } finally {
      setOn(false);
    }
  };

  const debouncedSetFromAmount = useDebouncedCallback((value: string) => {
    setFromAmount(value);
  }, 300);

  const isLoading = !pools || !tokens;

  return !isLoading ? (
    <SwapRoot className={isDarkTheme ? "dark" : "light"}>
      <SwapHeadingContainer>
        <SwapHeading className={isDarkTheme ? "dark" : "light"}>
          Remove Liquidity
        </SwapHeading>
      </SwapHeadingContainer>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <label htmlFor="from">Remove amount</label>
        {/*<input
          name="from"
          style={{
            border: "1px solid #D8D8E1",
            borderRadius: "8px",
            color: "white",
            textAlign: "right",
            marginRight: "10px",
            padding: "10px",
            flexGrow: 1,
          }}
          type="number"
          min={0}
          max={100}
          value={fromAmount}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!isNaN(n) && n >= 0 && n <= 100) {
              setFromAmount(e.target.value);
            }
          }}
        />*/}
      </div>
      <DiscreteSlider
        onChange={(v) => {
          debouncedSetFromAmount(v.toString());
        }}
      />
      <div
        style={{
          width: "100%",
        }}
      >
        Current share: {poolShare}%
      </div>
      <div
        style={{
          width: "100%",
        }}
      >
        New share: {newShare}%
      </div>
      <div
        style={{
          width: "100%",
        }}
      >
        You will receive: <br />
        <br />
        {tokenSymbol(
          tokens.find((t: ARC200TokenI) => t.tokenId === info?.tokA),
          true
        )}
        :{" "}
        {expectedOutcome
          ? Number(expectedOutcome?.[0]) /
            10 **
              (tokens.find((t: ARC200TokenI) => t.tokenId === info?.tokA)
                ?.decimals || 0)
          : "-"}
        <br />
        <br />
        {tokenSymbol(
          tokens.find((t: ARC200TokenI) => t.tokenId === info?.tokB),
          true
        )}
        :{" "}
        {expectedOutcome
          ? Number(expectedOutcome?.[1]) /
            10 **
              (tokens.find((t: ARC200TokenI) => t.tokenId === info?.tokB)
                ?.decimals || 0)
          : "-"}
      </div>
      <Button
        className="active"
        onClick={() => {
          if (fromAmount === "0") {
            toast.info("Please enter a valid amount");
            return;
          }
          if (!on) {
            handleRemoveLiquidity();
          }
        }}
      >
        {!on ? (
          buttonLabel
        ) : (
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <CircularProgress color="inherit" size={20} />
            Remove liquidity in progress
          </div>
        )}
      </Button>
    </SwapRoot>
  ) : null;
};

export default PoolRemove;
