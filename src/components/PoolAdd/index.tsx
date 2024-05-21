import styled from "@emotion/styled";
import React, { FC, useEffect, useMemo, useState } from "react";
import SwapIcon from "static/icon/icon-swap-stable-light.svg";
import ActiveSwapIcon from "static/icon/icon-swap-active-light.svg";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet";
import { CircularProgress, Stack } from "@mui/material";
import { CONTRACT, abi, arc200, swap } from "ulujs";
import { TOKEN_VIA, TOKEN_WVOI1 } from "../../constants/tokens";
import { getAlgorandClients } from "../../wallets";
import TokenInput from "../TokenInput";
import { useSearchParams } from "react-router-dom";
import { ARC200TokenI, PoolI } from "../../types";
import { getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getPools } from "../../store/poolSlice";
import algosdk, { decodeAddress } from "algosdk";
import { toast } from "react-toastify";
import { Toast } from "react-toastify/dist/components";
import axios from "axios";
import { hasAllowance } from "ulujs/types/arc200";
import { tokenId, tokenSymbol } from "../../utils/dex";
import BigNumber from "bignumber.js";

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
      args: [{ type: "uint256" }, { type: "(uint256,uint256)" }],
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
        type: "byte",
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
        type: "byte",
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
    // wnt
    {
      name: "deposit",
      args: [
        {
          name: "amount",
          type: "uint64",
          desc: "Amount to deposit",
        },
      ],
      returns: {
        type: "uint256",
        desc: "Amount deposited",
      },
    },
  ],
  events: [],
};

interface AddIconProps {
  theme: "light" | "dark";
}
const AddIcon: FC<AddIconProps> = ({ theme }) => {
  return theme === "dark" ? (
    <svg
      width="49"
      height="71"
      viewBox="0 0 49 71"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        x1="22.0342"
        y1="-2.18557e-08"
        x2="22.0342"
        y2="71"
        stroke="white"
        stroke-opacity="0.2"
      />
      <rect x="0.53418" y="11" width="48" height="48" rx="24" fill="black" />
      <rect
        x="1.03418"
        y="11.5"
        width="47"
        height="47"
        rx="23.5"
        stroke="white"
        stroke-opacity="0.2"
      />
      <path
        d="M8.53418 35H40.5342"
        stroke="white"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M24.5342 51V19"
        stroke="white"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  ) : (
    <svg
      width="49"
      height="71"
      viewBox="0 0 49 71"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        x1="22.0342"
        y1="-2.18557e-08"
        x2="22.0342"
        y2="71"
        stroke="#D8D8E1"
      />
      <rect
        x="1.03418"
        y="11.5"
        width="47"
        height="47"
        rx="23.5"
        fill="white"
      />
      <rect
        x="1.03418"
        y="11.5"
        width="47"
        height="47"
        rx="23.5"
        stroke="#D8D8E1"
      />
      <path
        d="M8.53418 35H40.5342"
        stroke="#141010"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M24.5342 51V19"
        stroke="#141010"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

const SpinnerIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="26"
      height="24"
      viewBox="0 0 26 24"
      fill="none"
    >
      <path
        d="M4.78886 10.618L2.89155 8.7207L1.00513 10.618"
        stroke="white"
        stroke-width="1.63562"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M21.2104 13.3828L23.1078 15.2801L25.0051 13.3828"
        stroke="white"
        stroke-width="1.63562"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M23.0966 14.5293V11.9996C23.0966 6.41666 18.5714 1.90234 12.9994 1.90234C9.81541 1.90234 6.96943 3.38534 5.11572 5.68611"
        stroke="white"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M2.90234 9.4707V12.0005C2.90234 17.5834 7.42756 22.0977 12.9996 22.0977C16.1836 22.0977 19.0296 20.6147 20.8833 18.3139"
        stroke="white"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

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

const SwapContainer = styled(Stack)`
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: stretch;
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

const SummaryContainer = styled.div`
  display: flex;
  padding: 0px var(--Spacing-900, 32px);
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  align-self: stretch;
`;

const RateContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  align-self: stretch;
  &.has-divider {
    padding-bottom: 12px;
    border-bottom: 1px solid
      var(--Color-Neutral-Stroke-Primary, rgba(255, 255, 255, 0.2));
  }
`;

const RateLabel = styled.div`
  width: 200px;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 16px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 19.2px */
  &.dark {
    color: var(--Color-Neutral-Stroke-Black, #fff);
  }
  &.light {
    color: var(--Color-Neutral-Stroke-Black, #141010);
  }
`;

const RateValue = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
`;

const RateMain = styled.div`
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 16px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 19.2px */
  &.dark {
    color: var(--Color-Neutral-Stroke-Black, #fff);
  }
  &.light {
    color: var(--Color-Neutral-Stroke-Black, #141010);
  }
`;

const RateSub = styled.div`
  color: #009c5a;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 15.6px */
`;

const BreakdownContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  align-self: stretch;
`;

const BreakdownStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: -4px;
  align-self: stretch;
`;

const BreakdownRow = styled.div`
  display: flex;
  padding: 4px 0px;
  justify-content: space-between;
  align-items: flex-start;
  align-self: stretch;
`;

const BreakdownLabel = styled.div`
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 180%; /* 28.8px */
  gap: 4px;
  display: flex;
  flex-direction: row;
  align-items: center;
  &.dark {
    color: var(--Color-Neutral-Element-Primary, #fff);
  }
  &.light {
    color: var(--Color-Neutral-Element-Primary, #0c0c10);
  }
`;

const BreakdownValueContiner = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
`;

const BreakdownValue = styled.div`
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 15px;
  font-style: normal;
  font-weight: 600;:sp
  line-height: 120%; /* 18px */
  &.dark {
    color: var(--Color-Neutral-Element-Primary, #fff);
  }
  &.light {
    color: var(--Color-Neutral-Element-Primary, #0c0c10);
  }
`;

const InfoCircleIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M7.99992 14.6663C11.6666 14.6663 14.6666 11.6663 14.6666 7.99967C14.6666 4.33301 11.6666 1.33301 7.99992 1.33301C4.33325 1.33301 1.33325 4.33301 1.33325 7.99967C1.33325 11.6663 4.33325 14.6663 7.99992 14.6663Z"
        stroke="white"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M8 8V11.3333"
        stroke="white"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M7.99634 5.33301H8.00233"
        stroke="white"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

const Swap = () => {
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const dispatch = useDispatch();
  /* Tokens */
  const tokens = useSelector((state: RootState) => state.tokens.tokens);
  const tokenStatus = useSelector((state: RootState) => state.tokens.status);
  useEffect(() => {
    dispatch(getTokens() as unknown as UnknownAction);
  }, [dispatch]);

  /* Pools */
  const pools: PoolI[] = useSelector((state: RootState) => state.pools.pools);
  const poolsStatus = useSelector((state: RootState) => state.pools.status);
  useEffect(() => {
    dispatch(getPools() as unknown as UnknownAction);
  }, [dispatch]);

  /* Params */
  const [sp] = useSearchParams();
  const paramPoolId = sp.get("poolId");
  //const paramTokenId = sp.get("tokenId");

  /* Wallet */
  const {
    providers,
    activeAccount,
    signTransactions,
    sendTransactions,
    getAccountInfo,
  } = useWallet();

  const [pool, setPool] = useState<PoolI>();
  const [ready, setReady] = useState<boolean>(false);

  const [accInfo, setAccInfo] = React.useState<any>(null);
  const [focus, setFocus] = useState<"from" | "to">("from");
  const [fromAmount, setFromAmount] = React.useState<any>("");
  const [toAmount, setToAmount] = React.useState<any>("");
  const [on, setOn] = useState(false);

  const [token, setToken] = useState<ARC200TokenI>();
  const [token2, setToken2] = useState<ARC200TokenI>();

  const [tokenOptions, setTokenOptions] = useState<ARC200TokenI[]>();
  const [tokenOptions2, setTokenOptions2] = useState<ARC200TokenI[]>();
  const [balance, setBalance] = React.useState<string>();
  const [balance2, setBalance2] = React.useState<string>();

  // EFFECT
  useEffect(() => {
    if (!pools || !tokens || pool) return;
    if (paramPoolId) {
      const pool = pools.find((p: PoolI) => `${p.poolId}` === `${paramPoolId}`);
      if (pool) {
        const token = [TOKEN_WVOI1].includes(pool.tokA)
          ? {
              tokenId: 0,
              name: "Voi",
              symbol: "VOI",
              decimals: 6,
              totalSupply: BigInt(10_000_000_000 * 1e6),
            }
          : tokens.find((t: ARC200TokenI) => `${t.tokenId}` === `${pool.tokA}`);
        setToken(token);
        const token2 = [TOKEN_WVOI1].includes(pool.tokB)
          ? {
              tokenId: 0,
              name: "Voi",
              symbol: "VOI",
              decimals: 6,
              totalSupply: BigInt(10_000_000_000 * 1e6),
            }
          : tokens.find((t: ARC200TokenI) => `${t.tokenId}` === `${pool.tokB}`);
        setToken2(token2);
      }
    }
  }, [pools, tokens]);

  // EFFECT
  useEffect(() => {
    if (!tokens || !pools || pools.length === 0) return;
    const newTokens = new Set<number>();
    for (const pool of pools) {
      newTokens.add(pool.tokA);
      newTokens.add(pool.tokB);
    }
    const poolTokens = Array.from(newTokens);
    setTokenOptions([
      {
        tokenId: 0,
        name: "Voi",
        symbol: "VOI",
        decimals: 6,
        totalSupply: BigInt(10_000_000_000 * 1e6),
      },
      ...tokens.filter((t: ARC200TokenI) => poolTokens.includes(t.tokenId)),
    ]);
  }, [tokens, pools]);

  // EFFECT
  // useEffect(() => {
  //   if (token || !tokenOptions) return;
  //   setToken(tokenOptions[0]);
  // }, [token, tokenOptions]);

  // EFFECT: get eligible pools
  const eligiblePools = useMemo(() => {
    return pools.filter((p: PoolI) => {
      return (
        [p.tokA, p.tokB].includes(tokenId(token)) &&
        [p.tokA, p.tokB].includes(tokenId(token2)) &&
        p.tokA !== p.tokB
      );
    });
  }, [pools, token, token2]);

  console.log("eligiblePools", eligiblePools);

  // EFFECT
  useEffect(() => {
    if (paramPoolId) {
      const pool = pools.find((p: PoolI) => `${p.poolId}` === `${paramPoolId}`);
      if (pool) {
        setPool(pool);
        setReady(true);
      }
    } else if (eligiblePools.length > 0) {
      // pick a pool (highest tvl)
      const { algodClient, indexerClient } = getAlgorandClients();
      new swap(0, algodClient, indexerClient)
        .selectPool(eligiblePools, null, null, "round")
        .then((pool: any) => {
          if (!pool) return;
          setPool(pool);
          setReady(true);
        });
    }
  }, [eligiblePools]);

  console.log({ pool, eligiblePools });

  const [info, setInfo] = useState<any>();
  // EFFECT: set pool info
  useEffect(() => {
    if (!pool) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const { tokA, tokB } = pool;
    const token = tokens.find((t: ARC200TokenI) => t.tokenId === tokA);
    const token2 = tokens.find((t: ARC200TokenI) => t.tokenId === tokB);
    if (!token || !token2) return;
    const A = { ...token, tokenId: tokenId(token) };
    const B = { ...token2, tokenId: tokenId(token2) };
    //new swap(0, algodClient, indexerClient)
    //  .selectPool(eligiblePools, A, B)
    //  .then((pool: any) => {
    //    if (!pool) return;
    const ci = new swap(pool.poolId, algodClient, indexerClient);
    ci.Info().then((info: any) => {
      setInfo(info.returnValue);
    });
  }, [pool, on]);

  console.log("info", info);

  const [poolBalance, setPoolBalance] = useState<BigInt>();
  // EFFECT
  useEffect(() => {
    if (!activeAccount || !pool) return;
    console.log({ activeAccount, pool });
    const { algodClient, indexerClient } = getAlgorandClients();
    new arc200(pool.poolId, algodClient, indexerClient)
      .arc200_balanceOf(activeAccount.address)
      .then((arc200_balanceOfR: any) => {
        if (arc200_balanceOfR.success) {
          setPoolBalance(arc200_balanceOfR.returnValue);
        }
      });
  }, [activeAccount, pool, on]);

  console.log("poolBalance", poolBalance);

  const [poolShare, setPoolShare] = useState<string>("0");

  // EFFECT
  useEffect(() => {
    if (!activeAccount || !pool || !info || !poolBalance) return;
    const newShare =
      (100 * Number(poolBalance)) / Number(info.lptBals.lpMinted);
    setPoolShare(newShare.toFixed(2));
  }, [activeAccount, pool, info, poolBalance]);

  console.log("poolShare", poolShare);

  const [expectedOutcome, setExpectedOutcome] = useState<string>();

  // EFFECT
  useEffect(() => {
    if (
      !activeAccount ||
      !pool ||
      !info ||
      !fromAmount ||
      !toAmount ||
      !token ||
      !token2
    ) {
      setExpectedOutcome(undefined);
      return;
    }
    const swapAForB = token.tokenId === pool.tokA;
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new CONTRACT(pool.poolId, algodClient, indexerClient, spec, {
      addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
      sk: new Uint8Array(0),
    });
    const fromAmountBN = new BigNumber(fromAmount.replace(/,/g, ""));
    const toAmountBN = new BigNumber(toAmount.replace(/,/g, ""));
    if (fromAmountBN.isNaN() || toAmountBN.isNaN()) return;
    const fromAmountBI = BigInt(
      fromAmountBN
        .multipliedBy(new BigNumber(10).pow(token.decimals))
        .toFixed(0)
    );
    const toAmountBI = BigInt(
      toAmountBN.multipliedBy(new BigNumber(10).pow(token2.decimals)).toFixed(0)
    );
    ci.setFee(4000);
    ci.Provider_deposit(
      1,
      swapAForB
        ? [
            fromAmountBI,
            toAmountBI,
            // Math.round(
            //   Number(fromAmount.replace(/,/g, "")) * 10 ** token.decimals
            // ),
            // Math.round(
            //   Number(toAmount.replace(/,/g, "")) * 10 ** token2.decimals
            // ),
          ]
        : [
            toAmountBI,
            fromAmountBI,
            Math.round(
              Number(toAmount.replace(/,/g, "")) * 10 ** token.decimals
            ),
            Math.round(
              Number(fromAmount.replace(/,/g, "")) * 10 ** token2.decimals
            ),
          ],
      0
    ).then((Provider_depositR: any) => {
      if (Provider_depositR.success) {
        setExpectedOutcome(Provider_depositR.returnValue);
      }
    });
  }, [activeAccount, pool, info, fromAmount, toAmount, token, token2]);

  console.log("expectedOutcome", expectedOutcome);

  const [newShare, setNewShare] = useState<string>();

  // EFFECT
  useEffect(() => {
    if (!expectedOutcome || !info) {
      setNewShare(undefined);
      return;
    }
    const newShare = (
      (100 * (Number(poolBalance || 0) + Number(expectedOutcome))) /
      (Number(info.lptBals.lpMinted) + Number(expectedOutcome))
    ).toFixed(2);
    setNewShare(newShare);
  }, [expectedOutcome, poolBalance, info]);

  console.log("newShare", newShare);

  const [newPoolShare, setNewPoolShare] = useState<string>();

  const rate = useMemo(() => {
    if (!info || !token || !token2) return;
    if (info.tokA === tokenId(token)) {
      return (
        (Number(info.poolBals.B) / Number(info.poolBals.A)) *
        10 ** (token.decimals - token2.decimals)
      );
    } else if (info.tokB === tokenId(token)) {
      return (
        (Number(info.poolBals.A) / Number(info.poolBals.B)) *
        10 ** (token.decimals - token2.decimals)
      );
    }
  }, [info, token, token2]);

  console.log("rate", rate);

  const invRate = useMemo(() => {
    if (!rate) return;
    return 1 / rate;
  }, [rate, token2]);

  console.log("invRate", invRate);

  // EFFECT
  useEffect(() => {
    if (
      !rate ||
      !invRate ||
      !fromAmount ||
      !toAmount ||
      !focus ||
      !token ||
      !token2 ||
      !info
    )
      return;
    if (info.poolBals.A === BigInt(0) || info.poolBals.B === BigInt(0)) return;
    if (focus === "from") {
      const toAmountBN = new BigNumber(fromAmount.replace(/,/g, ""));
      if (toAmountBN.isNaN()) return;
      setToAmount(
        toAmountBN.multipliedBy(rate).decimalPlaces(token2.decimals).toFormat()
      );
    } else if (focus === "to") {
      const fromAmountBN = new BigNumber(toAmount.replace(/,/g, ""));
      if (fromAmountBN.isNaN()) return;
      setFromAmount(
        fromAmountBN
          .multipliedBy(invRate)
          .decimalPlaces(token.decimals)
          .toFormat()
      );
    }
  }, [rate, fromAmount, toAmount, focus, token, token2, info]);

  // EFFECT
  useEffect(() => {
    if (!pool || !token || !token2 || !toAmount || focus !== "to" || !!info)
      return;
    if (info.poolBals.A === BigInt(0) || info.poolBals.B === BigInt(0)) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const acc = {
      addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
      sk: new Uint8Array(0),
    };
    const ci = new CONTRACT(pool.poolId, algodClient, indexerClient, spec, acc);
    ci.setFee(4000);
    if (token.tokenId === pool?.tokA) {
      ci.Trader_swapBForA(
        1,
        Number(toAmount.replace(",", "")) * 10 ** token2.decimals,
        0
      ).then((r: any) => {
        console.log({ r });
        if (r.success) {
          const fromAmount = (
            Number(r.returnValue[0]) /
            10 ** token2.decimals
          ).toLocaleString();
          console.log({ fromAmount });
          setFromAmount(fromAmount);
        }
      });
    } else if (token.tokenId === pool?.tokB) {
      ci.Trader_swapAForB(
        1,
        Number(fromAmount.replace(",", "")) * 10 ** token.decimals,
        0
      ).then((r: any) => {
        console.log({ r });
        if (r.success) {
          const fromAmount = (
            Number(r.returnValue[1]) /
            10 ** token.decimals
          ).toLocaleString();
          console.log({ fromAmount });
          setFromAmount(fromAmount);
        }
      });
    }
  }, [pool, token, token2, toAmount, focus]);

  // // EFFECT
  // useEffect(() => {
  //   if (
  //     tokenStatus !== "succeeded" ||
  //     !tokens ||
  //     token ||
  //     token2 ||
  //     tokens.length === 0
  //   )
  //     return;
  //   //setToken(tokens[0]);
  //   const options = new Set<ARC200TokenI>();
  //   for (const p of pools) {
  //     if ([p.tokA, p.tokB].includes(tokens[0].tokenId)) {
  //       if (tokens[0].tokenId === p.tokA) {
  //         options.add(
  //           tokens.find(
  //             (t: ARC200TokenI) => `${t.tokenId}` === `${p.tokB}`
  //           ) as ARC200TokenI
  //         );
  //       } else {
  //         options.add(
  //           tokens.find(
  //             (t: ARC200TokenI) => `${t.tokenId}` === `${p.tokA}`
  //           ) as ARC200TokenI
  //         );
  //       }
  //     }
  //   }
  //   //setToken2(Array.from(options)[0]);
  // }, [tokens, tokenStatus, pools, token, token2]);

  // EFFECT
  // useEffect(() => {
  //   if (!tokens || !pool) return;
  //   const tokenA = tokens.find(
  //     (t: ARC200TokenI) => `${t.tokenId}` === `${pool.tokA}`
  //   );
  //   const tokenB = tokens.find(
  //     (t: ARC200TokenI) => `${t.tokenId}` === `${pool.tokB}`
  //   );
  //   if (paramTokenId) {
  //     if (`${paramTokenId}` === `${tokenA?.tokenId}`) {
  //       setToken(tokenA);
  //       setToken2(tokenB);
  //     } else {
  //       setToken(tokenB);
  //       setToken2(tokenA);
  //     }
  //   } else {
  //     setToken(tokenA);
  //     setToken2(tokenB);
  //   }
  // }, [tokens, pool, paramTokenId]);

  // EFFECT: update tokenOptions2 on token change
  useEffect(() => {
    if (!token) return;
    const options = new Set<ARC200TokenI>();
    for (const p of pools) {
      if ([p.tokA, p.tokB].includes(tokenId(token))) {
        if (tokenId(token) === p.tokA) {
          options.add(
            tokens.find(
              (t: ARC200TokenI) => `${t.tokenId}` === `${p.tokB}`
            ) as ARC200TokenI
          );
        } else if (tokenId(token) === p.tokB) {
          options.add(
            tokens.find(
              (t: ARC200TokenI) => `${t.tokenId}` === `${p.tokA}`
            ) as ARC200TokenI
          );
        }
      }
    }
    const netToken = {
      tokenId: 0,
      name: "Voi",
      symbol: "VOI",
      decimals: 6,
      totalSupply: BigInt(10_000_000_000 * 1e6),
    };
    const tokenOptions2 = Array.from(options);
    // check if token options includes wVOI
    if (tokenOptions2.find((t: ARC200TokenI) => t?.tokenId === TOKEN_WVOI1)) {
      setTokenOptions2([netToken, ...tokenOptions2]);
    } else {
      setTokenOptions2(tokenOptions2);
    }
    if (
      !tokenOptions2
        .map((t: ARC200TokenI) => t?.tokenId)
        .includes(tokenId(token2))
    ) {
      if (tokenOptions2.map((t: ARC200TokenI) => t?.tokenId).includes(0)) {
        setToken2(netToken);
      } else {
        setToken2(Array.from(options)[0]);
      }
    }
    setToAmount("0");
    setFromAmount("0");
  }, [token, pools]);

  console.log({ tokenOptions2 });

  useEffect(() => {
    if (!token2) return;
    setToAmount("");
  }, [token2]);

  // EFFECT
  useEffect(() => {
    if (!token || !activeAccount) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    if (token.tokenId === 0) {
      algodClient
        .accountInformation(activeAccount.address)
        .do()
        .then((accInfo: any) => {
          const balance = accInfo.amount;
          const minBalance = accInfo["min-balance"];
          const availableBalance = balance - minBalance;
          setBalance((availableBalance / 1e6).toLocaleString());
        });
    } else {
      const ci = new arc200(token.tokenId, algodClient, indexerClient);
      ci.arc200_balanceOf(activeAccount.address).then(
        (arc200_balanceOfR: any) => {
          if (arc200_balanceOfR.success) {
            setBalance(
              (
                Number(arc200_balanceOfR.returnValue) /
                10 ** token.decimals
              ).toLocaleString()
            );
          }
        }
      );
    }
  }, [token, activeAccount]);

  // EFFECT
  useEffect(() => {
    if (!token2 || !activeAccount) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new arc200(token2.tokenId, algodClient, indexerClient);
    if (token2.tokenId === 0) {
      algodClient
        .accountInformation(activeAccount.address)
        .do()
        .then((accInfo: any) => {
          const balance = accInfo.amount;
          const minBalance = accInfo["min-balance"];
          const availableBalance = balance - minBalance;
          setBalance2((availableBalance / 1e6).toLocaleString());
        });
    } else {
      ci.arc200_balanceOf(activeAccount.address).then(
        (arc200_balanceOfR: any) => {
          if (arc200_balanceOfR.success) {
            setBalance2(
              (
                Number(arc200_balanceOfR.returnValue) /
                10 ** token2.decimals
              ).toLocaleString()
            );
          }
        }
      );
    }
  }, [token2, activeAccount]);

  // EFFECT: get voi balance
  useEffect(() => {
    if (activeAccount && providers && providers.length >= 3) {
      getAccountInfo().then(setAccInfo);
    }
  }, [activeAccount, providers]);

  const isValid = useMemo(() => {
    return (
      !!token &&
      !!token2 &&
      !!fromAmount &&
      !!toAmount &&
      !!balance &&
      !!balance2 &&
      Number(fromAmount.replace(/,/g, "")) <=
        Number(balance.replace(/,/g, "")) &&
      Number(toAmount.replace(/,/g, "")) <= Number(balance2.replace(/,/g, ""))
    );
  }, [balance, balance2, fromAmount, toAmount, token, token2]);

  console.log("isValid", isValid);

  const buttonLabel = useMemo(() => {
    if (isValid) {
      return "Add liquidity";
    } else {
      if (
        Number(fromAmount.replace(/,/g, "")) >
        Number(balance?.replace(/,/g, ""))
      ) {
        return `Insufficient ${tokenSymbol(token)} balance`;
      } else if (
        Number(toAmount.replace(/,/g, "")) > Number(balance2?.replace(/,/g, ""))
      ) {
        return `Insufficient ${tokenSymbol(token2)} balance`;
      } else if (!token || !token2) {
        return "Select token above";
      } else if (!fromAmount || !toAmount) {
        return "Enter amount above";
      } else {
        return "Invalid input";
      }
    }
  }, [isValid, fromAmount, toAmount, balance, balance2, token, token2]);

  const handleProviderDeposit = async () => {
    if (!isValid || !token || !token2) return;
    if (!activeAccount) {
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
                    name: "deposit",
                    args: [
                      {
                        name: "amount",
                        type: "uint64",
                        desc: "Amount to deposit",
                      },
                    ],
                    returns: {
                      type: "uint256",
                      desc: "Amount deposited",
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
                    name: "deposit",
                    args: [
                      {
                        name: "amount",
                        type: "uint64",
                        desc: "Amount to deposit",
                      },
                    ],
                    returns: {
                      type: "uint256",
                      desc: "Amount deposited",
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
      const makeArc200 = (ctcInfo: number) => {
        const acc = {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        };
        return new CONTRACT(
          ctcInfo,
          algodClient,
          indexerClient,
          abi.arc200,
          acc
        );
      };

      // pick a pool
      const pool = eligiblePools.slice(-1)[0];
      const { poolId, tokA, tokB } = pool;

      // handle special cases
      for (const tok of [tokA, tokB]) {
        switch (tok) {
          case TOKEN_VIA:
            const ci = makeArc200(tok);
            // ensure pool balance box
            const hasBalanceR = await ci.hasBalance(
              algosdk.getApplicationAddress(poolId)
            );
            const hasAllowanceR = await ci.hasAllowance(
              activeAccount.address,
              algosdk.getApplicationAddress(poolId)
            );
            if (!hasBalanceR.success || !hasAllowanceR.success)
              throw new Error("Failed to check balance or allowance");
            const hasBalance = hasBalanceR.returnValue;
            const hasAllowance = hasAllowanceR.returnValue;
            // TODO use builder to combine into single txngroup
            if (hasBalance === 0) {
              ci.setPaymentAmount(28500);
              const arc200_transferR = await ci.arc200_transfer(
                algosdk.getApplicationAddress(poolId),
                0
              );
              if (!arc200_transferR.success) throw new Error("Transfer failed");
              await signTransactions(
                arc200_transferR.txns.map(
                  (t: string) => new Uint8Array(Buffer.from(t, "base64"))
                )
              ).then(sendTransactions);
            }
            if (hasAllowance === 0) {
              ci.setPaymentAmount(28100);
              const arc200_approveR = await ci.arc200_approve(
                algosdk.getApplicationAddress(poolId),
                0
              );
              if (!arc200_approveR.success) throw new Error("Approve failed");
              await signTransactions(
                arc200_approveR.txns.map(
                  (t: string) => new Uint8Array(Buffer.from(t, "base64"))
                )
              ).then(sendTransactions);
            }
            break;
          case TOKEN_WVOI1: {
            // ensure wvoi balance
            const ci = makeCi(tok);
            const hasBoxR = await ci.hasBox([
              1,
              [
                ...decodeAddress(activeAccount.address).publicKey,
                ...new Uint8Array(Buffer.from("0".repeat(64), "hex")),
              ],
            ]);
            console.log({ hasBoxR });
            if (!hasBoxR.success)
              throw new Error("Failed to check balance box");
            if (hasBoxR.success && hasBoxR.returnValue === 0) {
              ci.setPaymentAmount(28500);
              const createBalanceBoxR = await ci.createBalanceBox(
                algosdk.getApplicationAddress(poolId)
              );
              if (!createBalanceBoxR.success)
                throw new Error("Transfer failed");
              await toast.promise(
                signTransactions(
                  createBalanceBoxR.txns.map(
                    (t: string) => new Uint8Array(Buffer.from(t, "base64"))
                  )
                ).then(sendTransactions),
                {
                  pending: "Pending transaction setting up pool balance box",
                }
              );
            }
            // if return value is 0 then create balance box
            const hasBoxR2 = await ci.hasBox([
              1,
              [
                ...decodeAddress(algosdk.getApplicationAddress(poolId))
                  .publicKey,
                ...new Uint8Array(Buffer.from("0".repeat(64), "hex")),
              ],
            ]);
            console.log({ hasBoxR2 });
            if (!hasBoxR2.success)
              throw new Error("Failed to check balance box");
            if (hasBoxR2.success && hasBoxR2.returnValue === 0) {
              ci.setPaymentAmount(28500);
              const arc200_transferR = await ci.arc200_transfer(
                algosdk.getApplicationAddress(poolId),
                0
              );
              if (!arc200_transferR.success) throw new Error("Transfer failed");
              await signTransactions(
                arc200_transferR.txns.map(
                  (t: string) => new Uint8Array(Buffer.from(t, "base64"))
                )
              ).then(sendTransactions);
            }
            // arc200 approve addr pool
            const hasBoxR3 = await ci.hasBox([
              0,
              [
                ...decodeAddress(activeAccount.address).publicKey,
                ...decodeAddress(algosdk.getApplicationAddress(poolId))
                  .publicKey,
              ],
            ]);
            console.log({ hasBoxR3 });
            if (!hasBoxR3.success)
              throw new Error("Failed to check balance box");
            if (hasBoxR3.success && hasBoxR3.returnValue === 0) {
              ci.setPaymentAmount(28100);
              const createBalanceBoxR = await ci.arc200_approve(
                algosdk.getApplicationAddress(poolId),
                0
              );
              if (!createBalanceBoxR.success)
                throw new Error("Failed to create balance box");
              await toast.promise(
                signTransactions(
                  createBalanceBoxR.txns.map(
                    (t: string) => new Uint8Array(Buffer.from(t, "base64"))
                  )
                ).then(sendTransactions),
                {
                  pending: `Pending transaction to approve wVOI spend`,
                  success: `Pool setup for ${tokenSymbol(token2)} complete!`,
                }
              );
            }
          }
          default:
            break;
        }
      }

      // ----------------------------------------
      // ensure pool has tokens to create future boxes
      // ensure pool tokA balance box
      // ensure pool tokB balance box
      // ensure user balance box for pool
      // ensure user tokA allowance for pool
      // ensure user tokB allowance for pool
      // ----------------------------------------
      // ensure pool has tokens to create future boxes
      // ----------------------------------------
      do {
        const accInfo = await algodClient
          .accountInformation(algosdk.getApplicationAddress(poolId))
          .do();
        console.log({ accInfo });
        const balance = accInfo.amount;
        const minBalance = accInfo["min-balance"];
        const availableBalance = balance - minBalance;
        if (availableBalance < 28500) {
          const suggestedParams = await algodClient.getTransactionParams().do();
          const txn = algosdk.makePaymentTxnWithSuggestedParams(
            activeAccount?.address || "",
            algosdk.getApplicationAddress(poolId),
            1e6,
            undefined,
            undefined,
            suggestedParams
          );
          await toast.promise(
            signTransactions([txn.toByte()]).then(sendTransactions),
            {
              pending: "Pending transaction to fund future pool fees",
              success: "Future pool fees funded!",
            }
          );
        }
      } while (0);
      // ----------------------------------------
      // ensure pool tokA balance box
      // ----------------------------------------
      do {
        const ciTokA = makeCi(tokA);
        // unsure if pool tokA balance box exists
        const arc200_transferR = await ciTokA.arc200_transfer(
          algosdk.getApplicationAddress(poolId),
          0
        );
        console.log({ arc200_transferR });
        if (!arc200_transferR.success) {
          // know it does not exist
          ciTokA.setPaymentAmount(28500);
          const arc200_transferR2 = await ciTokA.arc200_transfer(
            algosdk.getApplicationAddress(poolId),
            0
          );
          if (!arc200_transferR2.success) {
            return new Error("Transfer failed");
          }
          // creating balance box
          // TODO use toast promise here
          await toast.promise(
            signTransactions(
              arc200_transferR2.txns.map(
                (t: string) => new Uint8Array(Buffer.from(t, "base64"))
              )
            ).then(sendTransactions),
            {
              pending: `Pending transaction to setup pool for ${tokenSymbol(
                token2
              )}`,
              success: `Pool setup for ${tokenSymbol(token2)} complete!`,
            }
          );
          break;
        }
        // pool tokA balance box exists
        break;
      } while (0);
      // ----------------------------------------
      // ensure pool tokB balance box
      // ----------------------------------------
      // ensure user balance box for pool
      // ----------------------------------------
      // ensure user tokA allowance for pool
      // ----------------------------------------
      // ensure user tokB allowance for pool
      // ----------------------------------------

      const ciTokA = makeCi(tokA);

      console.log("Ensuring balance box for tokA");
      do {
        const arc200_balanceOfR = await ciTokA.arc200_balanceOf(
          activeAccount.address
        );
        console.log({ arc200_balanceOfR });
        if (!arc200_balanceOfR.success) {
          throw new Error("Balance of failed");
        }
        const arc200_balanceOf = arc200_balanceOfR.returnValue;
        if (arc200_balanceOf < BigInt(0)) {
          break;
        }
        // balance is zero need to figure out if it has a box
        const ci = new CONTRACT(tokA, algodClient, indexerClient, spec, {
          addr: activeAccount.address,
          sk: new Uint8Array(0),
        });
        const hasBoxR = await ci.hasBox([
          1,
          [
            ...decodeAddress(activeAccount.address).publicKey,
            ...new Uint8Array(Buffer.from("0".repeat(64), "hex")),
          ],
        ]);
        console.log({ hasBoxR });
        if (hasBoxR.success && hasBoxR.returnValue === BigInt(0)) {
          // has balance box use createBalanceBox in this case
          ci.setPaymentAmount(28500);
          const createBalanceBoxR = await ci.createBalanceBox(
            activeAccount.address
          );
          console.log({ createBalanceBoxR });
          if (
            createBalanceBoxR.success &&
            createBalanceBoxR.returnValue > BigInt(0)
          ) {
            await signTransactions(
              createBalanceBoxR.txns.map(
                (t: string) => new Uint8Array(Buffer.from(t, "base64"))
              )
            ).then(sendTransactions);
          }
        }
        // hasBalance
      } while (0);
      // ----------------------------------------

      console.log("Ensuring allowance box for tokA");

      do {
        const arc200_approveR = await ciTokA.arc200_approve(
          algosdk.getApplicationAddress(poolId),
          0
        );
        console.log({ arc200_approveR });
        if (!arc200_approveR.success) {
          ciTokA.setPaymentAmount(28100);
          const arc200_approveR = await ciTokA.arc200_approve(
            algosdk.getApplicationAddress(poolId),
            0
          );
          console.log({ arc200_approveR });
          if (!arc200_approveR.success) {
            throw new Error("Approve failed");
          }
          await toast.promise(
            signTransactions(
              arc200_approveR.txns.map(
                (t: string) => new Uint8Array(Buffer.from(t, "base64"))
              )
            ).then(sendTransactions),
            {
              pending: `Pending transaction to spend ${tokenSymbol(
                token2
              )} in pool`,
              success: `${tokenSymbol(token2)} pool spending setup complete!`,
            }
          );
        }
      } while (0);
      console.log("tokA allowance box ok");

      // ----------------------------------------

      const ciTokB = makeCi(tokB);

      console.log("Ensuring boxes for tokB");

      let ensureTokBApproval = false;
      do {
        const arc200_approveR = await ciTokB.arc200_approve(
          algosdk.getApplicationAddress(poolId),
          0
        );
        if (!arc200_approveR.success) {
          ciTokB.setPaymentAmount(28100);
          const arc200_approveR = await ciTokB.arc200_approve(
            algosdk.getApplicationAddress(poolId),
            0
          );
          if (!arc200_approveR.success) throw new Error("ApproveB failed");
          ensureTokBApproval = true;
          await toast.promise(
            signTransactions(
              arc200_approveR.txns.map(
                (t: string) => new Uint8Array(Buffer.from(t, "base64"))
              )
            ).then(sendTransactions),
            {
              pending: `Pending transaction to spend ${tokenSymbol(
                token2
              )} in pool`,
              success: `${tokenSymbol(token2)} pool spending setup complete!`,
            }
          );
        }
        // ---

        // add for old arc200 tokens

        const arc200_approveR2 = await ciTokB.arc200_approve(
          algosdk.getApplicationAddress(poolId),
          0
        );
        console.log({ arc200_approveR2 });
        if (!arc200_approveR2.success) {
          ciTokB.setPaymentAmount(28100);
          const arc200_approveR = await ciTokB.arc200_approve(
            algosdk.getApplicationAddress(poolId),
            0
          );
          console.log({ arc200_approveR });
          if (!arc200_approveR.success) {
            return new Error("Approve failed");
          }
          await toast.promise(
            signTransactions(
              arc200_approveR.txns.map(
                (t: string) => new Uint8Array(Buffer.from(t, "base64"))
              )
            ).then(sendTransactions),
            {
              pending: `Pending transaction to spend ${tokenSymbol(
                token2
              )} in pool`,
              success: `${tokenSymbol(token2)} pool spending setup complete!`,
            }
          );
        }
      } while (0);

      // ----------------------------------------
      do {
        const arc200_transferR = await ciTokB.arc200_transfer(
          algosdk.getApplicationAddress(poolId),
          0
        );
        console.log({ arc200_transferR });
        if (!arc200_transferR.success) {
          // transfer failed without box payment
          ciTokB.setPaymentAmount(28500);
          const arc200_transferR = await ciTokB.arc200_transfer(
            algosdk.getApplicationAddress(poolId),
            0
          );
          console.log({ arc200_transferR });
          if (!arc200_transferR.success) {
            // transfer failed with box payment
            // something went wrong
            return new Error("Transfer failed");
          }
          await toast.promise(
            signTransactions(
              arc200_transferR.txns.map(
                (t: string) => new Uint8Array(Buffer.from(t, "base64"))
              )
            ).then(sendTransactions),
            {
              pending: `Pending transaction to setup pool for ${tokenSymbol(
                token2
              )}`,
              success: `Pool setup for ${tokenSymbol(token2)} complete!`,
            }
          );
          break;
        }
        // transfer successful without box payment
      } while (0);

      // ----------------------------------------

      console.log("Building extra txns");

      const ci = makeCi(poolId);

      console.log({ token });

      // determine the direction
      if (pool.tokA === tokenId(token)) {
        console.log("depositAForB");

        const inA = BigInt(
          new BigNumber(fromAmount.replace(/,/g, ""))
            .times(new BigNumber(10).pow(token.decimals))
            .toFixed()
        );
        const inB = BigInt(
          new BigNumber(toAmount.replace(/,/g, ""))
            .times(new BigNumber(10).pow(token2.decimals))
            .toFixed()
        );

        console.log({ inA, inB });

        ci.setFee(5000);
        const Provider_depositR = await ci.Provider_deposit(1, [inA, inB], 0);
        console.log({ Provider_depositR });

        if (!Provider_depositR.success)
          return new Error("Add liquidity simulation failed");

        const Provider_deposit = Provider_depositR.returnValue;

        const builder = makeBuilder(poolId, tokA, tokB);
        const poolAddr = algosdk.getApplicationAddress(poolId);

        const buildN = [];
        let extraPaymentAmount = 28500;

        // include wnt deposit if network token (MUST BE FIRST)
        if ([0].includes(token.tokenId)) {
          extraPaymentAmount += 28500 + Number(inA);
          buildN.push(builder.arc200.tokA.deposit(inA));
        }

        buildN.push(builder.arc200.tokA.arc200_transfer(poolAddr, 0));
        buildN.push(builder.arc200.tokB.arc200_transfer(poolAddr, 0));

        if (ensureTokBApproval) {
          extraPaymentAmount += 28100;
          buildN.push(builder.arc200.tokB.arc200_approve(poolAddr, 0));
        }

        buildN.push(
          ...[
            builder.arc200.tokA.arc200_approve(poolAddr, inA),
            builder.arc200.tokB.arc200_approve(poolAddr, inB),
            builder.pool.Provider_deposit(0, [inA, inB], Provider_deposit),
          ]
        );
        const buildP = (await Promise.all(buildN)).map((res: any) => res.obj);

        console.log({ buildP });

        // use ciTokA

        let customR;
        if ([0, TOKEN_VIA].includes(token.tokenId)) {
          const ci = makeCi(tokA);
          ci.setFee(4000);
          ci.setPaymentAmount(extraPaymentAmount);
          ci.setAccounts([poolAddr]);
          ci.setEnableGroupResourceSharing(true);
          ci.setExtraTxns(buildP);
          customR = await ci.custom();
        } else {
          ci.setFee(4000);
          ci.setPaymentAmount(extraPaymentAmount);
          ci.setAccounts([poolAddr]);
          ci.setEnableGroupResourceSharing(true);
          ci.setExtraTxns(buildP);
          customR = await ci.custom();
        }

        console.log({ customR });

        if (!customR.success)
          return new Error("Add liquidity group simulation failed");
        await toast.promise(
          signTransactions(
            customR.txns.map(
              (t: string) => new Uint8Array(Buffer.from(t, "base64"))
            )
          ).then(sendTransactions),
          {
            pending: `Add liquidity to pool ${fromAmount} ${tokenSymbol(
              token
            )} + ${toAmount} ${tokenSymbol(token2)}`,
            success: `Add liquidity successful!`,
          },
          {
            type: "default",
            position: "top-center",
            theme: "dark",
          }
        );
      } else if (tokenId(token) === pool.tokB) {
        console.log("depositBForA");
        const inA = Math.floor(
          Number(toAmount.replace(",", "")) * 10 ** token.decimals
        );
        const inB = Math.floor(
          Number(fromAmount.replace(",", "")) * 10 ** token2.decimals
        );

        const Provider_depositR = await ci.Provider_deposit(1, [inB, inA], 0);
        if (!Provider_depositR.success)
          return new Error("Add liquidity simulation failed");
        const Provider_deposit = Provider_depositR.returnValue;

        const builder = makeBuilder(poolId, tokA, tokB);
        const poolAddr = algosdk.getApplicationAddress(poolId);

        const buildN = [
          builder.arc200.tokB.arc200_approve(poolAddr, inA), // !!
          builder.arc200.tokA.arc200_approve(poolAddr, inB), // !!
          builder.pool.Provider_deposit(0, [inB, inA], Provider_deposit), // !!
        ];
        const buildP = (await Promise.all(buildN)).map((res: any) => res.obj);
        ci.setAccounts([poolAddr]);
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildP);
        const customR = await ci.custom();
        if (!customR.success)
          return new Error("Add liquidity group simulation failed");
        await toast.promise(
          signTransactions(
            customR.txns.map(
              (t: string) => new Uint8Array(Buffer.from(t, "base64"))
            )
          ).then(sendTransactions),
          {
            pending: `Add liquidity ${fromAmount} ${tokenSymbol(
              token
            )} -> ${toAmount} ${tokenSymbol(token2)}`,
            success: `Add liquidity successful!`,
          },
          {
            type: "default",
            position: "top-center",
            theme: "dark",
          }
        );
      }
      setFromAmount("0");
    } catch (e: any) {
      toast.error(e.message);
      console.error(e);
    } finally {
      setOn(false);
    }
  };

  const isLoading = !pools || !tokens;

  return !isLoading ? (
    <SwapRoot className={isDarkTheme ? "dark" : "light"}>
      <SwapHeadingContainer>
        <SwapHeading className={isDarkTheme ? "dark" : "light"}>
          Add Liquidity
        </SwapHeading>
      </SwapHeadingContainer>
      <SwapContainer gap={on ? 1.43 : 0}>
        <TokenInput
          label="First token"
          amount={fromAmount}
          setAmount={setFromAmount}
          token={token}
          setToken={setToken}
          balance={balance}
          onFocus={() => setFocus("from")}
          options={tokenOptions}
        />
        <AddIcon theme={isDarkTheme ? "dark" : "light"} />
        <TokenInput
          label="Second token"
          amount={toAmount}
          setAmount={setToAmount}
          token={token2}
          setToken={setToken2}
          options={tokenOptions2}
          balance={balance2}
          onFocus={() => setFocus("to")}
        />
      </SwapContainer>
      <SummaryContainer>
        <BreakdownContainer>
          <BreakdownStack>
            <BreakdownRow>
              <BreakdownLabel className={isDarkTheme ? "dark" : "light"}>
                <span>Share of the pool you already have</span>
              </BreakdownLabel>
              <BreakdownValueContiner>
                <BreakdownValue className={isDarkTheme ? "dark" : "light"}>
                  {poolShare ? `${poolShare}%` : "-"}
                </BreakdownValue>
              </BreakdownValueContiner>
            </BreakdownRow>
          </BreakdownStack>
        </BreakdownContainer>
        <RateContainer className="has-divider">
          <RateLabel className={isDarkTheme ? "dark" : "light"}>
            Total share of pool after transaction{" "}
          </RateLabel>
          <RateValue>
            <RateMain className={isDarkTheme ? "dark" : "light"}>
              {newShare ? `${newShare}%` : "-"}
            </RateMain>
            <RateSub>&nbsp;</RateSub>
          </RateValue>
        </RateContainer>
        <RateContainer>
          <RateLabel className={isDarkTheme ? "dark" : "light"}>Rate</RateLabel>
          <RateValue>
            <RateMain className={isDarkTheme ? "dark" : "light"}>
              1 {tokenSymbol(token)} = {rate?.toFixed(token2?.decimals)}{" "}
              {tokenSymbol(token2)}
            </RateMain>
            <RateSub>
              1 {tokenSymbol(token2)} = {invRate?.toFixed(token?.decimals)}{" "}
              {tokenSymbol(token)}
            </RateSub>
          </RateValue>
        </RateContainer>
      </SummaryContainer>
      <Button
        className={isValid ? "active" : undefined}
        onClick={() => {
          if (!on) {
            handleProviderDeposit();
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
            Add liquidity in progress
          </div>
        )}
      </Button>
    </SwapRoot>
  ) : null;
};

export default Swap;
