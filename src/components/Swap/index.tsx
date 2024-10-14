import styled from "@emotion/styled";
import React, { useEffect, useMemo, useState } from "react";
import SwapIcon from "static/icon/icon-swap-stable-light.svg";
import ActiveSwapIcon from "static/icon/icon-swap-active-light.svg";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import {
  CircularProgress,
  Collapse,
  Fade,
  Skeleton,
  Stack,
} from "@mui/material";
import { CONTRACT, arc200, swap, abi } from "ulujs";
import {
  NETWORK_TOKEN,
  TOKEN_VIA,
  TOKEN_VOI,
  TOKEN_WVOI1,
} from "../../constants/tokens";
import { getAlgorandClients } from "../../wallets";
import TokenInput from "../TokenInput";
import { useSearchParams } from "react-router-dom";
import { ARC200TokenI, PoolI } from "../../types";
import { getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getPools } from "../../store/poolSlice";
import { toast } from "react-toastify";
import { Toast } from "react-toastify/dist/components";
import { tokenId, tokenSymbol } from "../../utils/dex";
import BigNumber from "bignumber.js";
import { CTCINFO_DEFAULT_LP } from "../../constants/dex";
import SwapSuccessfulModal from "../modals/SwapSuccessfulModal";
import { QUEST_ACTION, getActions, submitAction } from "../../config/quest";
import axios from "axios";
import ProgressBar from "../ProgressBar";

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
      name: "Provider_depositA",
      args: [{ type: "uint256" }],
      returns: { type: "uint256" },
    },
    {
      name: "Provider_depositB",
      args: [{ type: "uint256" }],
      returns: { type: "uint256" },
    },
    {
      name: "Provider_deposit",
      args: [{ type: "(uint256,uint256)" }, { type: "uint256" }],
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
    // Trader_exactSwapAForB(byte,uint256,uint256)(uint256,uint256)
    {
      name: "Trader_exactSwapAForB",
      args: [
        {
          type: "byte",
        },
        {
          type: "uint256",
        },
        {
          type: "uint256",
        },
      ],
      returns: {
        type: "(uint256,uint256)",
      },
    },
    // Trader_exactSwapBForA(byte,uint256,uint256)(uint256,uint256)
    {
      name: "Trader_exactSwapBForA",
      args: [
        {
          type: "byte",
        },
        {
          type: "uint256",
        },
        {
          type: "uint256",
        },
      ],
      returns: {
        type: "(uint256,uint256)",
      },
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
    // hasBalance(address)byte
    {
      name: "hasBalance",
      desc: "Checks if the account has a balance",
      args: [
        {
          type: "address",
        },
      ],
      returns: {
        type: "byte",
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

const SwapRoot = styled.div`
  transition: all 0.5s;
  display: flex;
  padding: 0px;
  flex-direction: column;
  align-items: center;
  gap: var(--Spacing-800, 24px);
  border-radius: var(--Radius-800, 24px);
  @media screen and (min-width: 600px) {
    transition: all 1s;
    width: 630px;
    padding: 40px;

    &.light {
      border: 1px solid
        var(--Color-Neutral-Stroke-Primary-Static-Contrast, #7e7e9a);
      background: var(
        --Color-Canvas-Transparent-white-950,
        rgba(255, 255, 255, 0.95)
      );
    }
    &.dark {
      @media screen and (min-width: 640px) {
        border: 1px solid var(--Color-Brand-Primary, #41137e);
        background: var(--Color-Canvas-Transparent-white-950, #070709);
        box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
      }
    }
    @media screen and (min-width: 600px) {
      width: 630px;
      padding: var(--Spacing-1000, 40px);
    }
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
  padding: 40px;
  border-radius: 24px;
  border: #41137e;
  background: #070709;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);

  display: flex;
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
  font-weight: 600;
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

  const [pools2, setPools] = useState<PoolI[]>([]);
  useEffect(() => {
    axios
      .get("https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools")
      .then(({ data }) => {
        setPools(data.pools);
      });
  }, []);

  const [sp] = useSearchParams();
  const paramPoolId = sp.get("poolId") || CTCINFO_DEFAULT_LP;

  console.log({ paramPoolId });

  const { activeAccount, signTransactions } = useWallet();

  // confirmation modal

  const [txId, setTxId] = useState<string>(
    "YE6LE6TJY3IKZILM7YEOO3BWXU6CY7MD7HZV3N6YRQKZVAN5ABVQ"
  );
  const [swapIn, setSwapIn] = useState("1");
  const [swapOut, setSwapOut] = useState("2");
  const [tokIn, setTokIn] = useState("TOKA");
  const [tokOut, setTokOut] = useState("TOKB");
  const [swapModalOpen, setSwapModalOpen] = useState<boolean>(false);

  const [tokens2, setTokens] = React.useState<any[]>();
  useEffect(() => {
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?includes=all`
      )
      .then(({ data }) => {
        setTokens(data.tokens);
      });
  }, []);

  console.log({ tokens2 });

  // don't remember what this is used for

  const [pool, setPool] = useState<PoolI>();

  // EFFECT: set pool to match paramPoolId
  useEffect(() => {
    if (!pools || !tokens || pool) return;
    if (paramPoolId) {
      const pool = pools.find((p: PoolI) => `${p.poolId}` === `${paramPoolId}`);
      if (pool) {
        const token = [TOKEN_WVOI1].includes(pool.tokA)
          ? NETWORK_TOKEN.VOI
          : tokens.find((t: ARC200TokenI) => `${t.tokenId}` === `${pool.tokA}`);
        setToken(token);
        const token2 = [TOKEN_WVOI1].includes(pool.tokB)
          ? NETWORK_TOKEN.VOI
          : tokens.find((t: ARC200TokenI) => `${t.tokenId}` === `${pool.tokB}`);
        setToken2(token2);
      }
    }
  }, [pool, pools, tokens, tokens2]);

  //const [accInfo, setAccInfo] = React.useState<any>(null);

  const [focus, setFocus] = useState<"from" | "to" | undefined>();
  const [fromAmount, setFromAmount] = React.useState<any>("");
  const [toAmount, setToAmount] = React.useState<any>("");

  const [on, setOn] = useState(false);

  const [token, setToken] = useState<ARC200TokenI>();
  const [token2, setToken2] = useState<ARC200TokenI>();
  const [tokenOptions, setTokenOptions] = useState<ARC200TokenI[]>();
  const [tokenOptions2, setTokenOptions2] = useState<ARC200TokenI[]>();

  const [balance, setBalance] = React.useState<string>();
  const [balance2, setBalance2] = React.useState<string>();

  // EFFECT: set token options
  useEffect(() => {
    if (!tokens || !pools || pools.length === 0) return;
    const newTokens = new Set<number>();
    for (const pool of pools) {
      newTokens.add(pool.tokA);
      newTokens.add(pool.tokB);
    }
    const poolTokens = Array.from(newTokens);
    const tokenOptions = [
      {
        tokenId: 0,
        name: "Voi",
        symbol: "VOI",
        decimals: 6,
        totalSupply: BigInt(10_000_000_000 * 1e6),
      },
      ...tokens.filter((t: ARC200TokenI) => poolTokens.includes(t.tokenId)),
    ].filter(
      (t: ARC200TokenI) => t.tokenId !== token2?.tokenId && t.symbol !== "wVOI"
    );
    tokenOptions.sort((a, b) => a.tokenId - b.tokenId);
    setTokenOptions(tokenOptions);
  }, [token2, tokens, pools]);

  const eligiblePools = useMemo(() => {
    const filteredPools = pools.filter((p: PoolI) => {
      return (
        [p.tokA, p.tokB].includes(tokenId(token)) &&
        [p.tokA, p.tokB].includes(tokenId(token2)) &&
        p.tokA !== p.tokB
      );
    });
    filteredPools.sort((a, b) => b.poolId - a.poolId);
    return filteredPools.slice(-1);
  }, [pools, token, token2]);

  console.log("eligiblePools", eligiblePools);

  // EFFECT: reset token2 if not in eligible pools
  useEffect(() => {
    if (eligiblePools.length === 0) {
      setToken2(undefined);
      setBalance2("");
    }
  }, [token, token2, eligiblePools]);

  const [info, setInfo] = useState<any>();
  // EFFECT: set pool info
  useEffect(() => {
    if (!token || !token2 || !eligiblePools) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    new swap(eligiblePools[0]?.poolId || 0, algodClient, indexerClient)
      .Info()
      .then((info: any) => {
        setInfo(info.returnValue);
      });
  }, [eligiblePools, token, token2]);

  const [lhs, rhs, rate, rateReady] = useMemo(() => {
    if (!info || !token || !token2) return [1, 1, 1, false];
    const A = { ...token, tokenId: tokenId(token) };
    const B = {
      ...token2,
      tokenId: tokenId(token2),
    };
    const res = swap.rate(info, A, B);
    const res2 = swap.rate(info, B, A);
    return [1, 1 / res, res, true];
    //res < 0.000001 ? [res2, 1, 1 / res2, true] : [1, 1 / res, res, true];
  }, [info, token, token2]);

  console.log("rate", rate);

  const invRate = useMemo(() => {
    if (!rate || !rateReady) return;
    return 1 / rate;
  }, [rate, rateReady, token2]);

  console.log("invRate", invRate);

  const fee = useMemo(() => {
    if (!info) return "0";
    return ((fromAmount * info?.protoInfo.totFee) / 10000).toFixed(6);
  }, [info, fromAmount]);

  console.log("fee", fee);

  const expectedOutcome = useMemo(() => {
    if (!rate || !fromAmount) return;
    return Number(rate) * Number(fromAmount);
  }, [rate, fromAmount]);

  console.log("expectedOutcome", expectedOutcome);

  const [actualOutcome, setActualOutcome] = useState<string>();

  // EFFECT: on fromAmount change update toAmount and actual outcome
  useEffect(() => {
    if (!token || !token2 || !fromAmount || focus !== "from") {
      return;
    }
    if (focus === undefined || fromAmount === "") {
      setToAmount("");
      return;
    }
    const { algodClient, indexerClient } = getAlgorandClients();
    const pool: any = eligiblePools[0];
    if (!pool) return;
    const acc = {
      addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
      sk: new Uint8Array(0),
    };
    const ci = new CONTRACT(
      eligiblePools[0].poolId,
      algodClient,
      indexerClient,
      spec,
      acc
    );
    ci.setFee(4000);
    if (pool.tokA === tokenId(token)) {
      const fromAmountBN = new BigNumber(fromAmount);
      if (fromAmountBN.isNaN()) return;
      const fromAmountBI = BigInt(
        fromAmountBN.multipliedBy(10 ** token.decimals).toFixed()
      );
      ci.Trader_swapAForB(1, fromAmountBI, 0).then((r: any) => {
        if (r.success) {
          const toAmountBN = new BigNumber(r.returnValue[1]);
          if (toAmountBN.isNaN()) return;
          const toAmount = toAmountBN
            .div(10 ** token2.decimals)
            .toFixed(token2.decimals);
          setActualOutcome(toAmount);
          setToAmount(toAmount);
        }
      });
    } else if (pool.tokB === tokenId(token)) {
      const fromAmountBN = new BigNumber(fromAmount);
      if (fromAmountBN.isNaN()) return;
      const fromAmountBI = BigInt(
        fromAmountBN.multipliedBy(10 ** token.decimals).toFixed()
      );
      ci.Trader_swapBForA(1, fromAmountBI, 0).then((r: any) => {
        if (r.success) {
          const toAmountBN = new BigNumber(r.returnValue[0]);
          if (toAmountBN.isNaN()) return;
          const toAmount = toAmountBN
            .div(10 ** token2.decimals)
            .toFixed(token2.decimals);
          setActualOutcome(toAmount);
          setToAmount(toAmount);
        }
      });
    }
  }, [pool, token, token2, fromAmount, focus, eligiblePools]);

  console.log("actualOutcome", actualOutcome);
  console.log("toAmount", toAmount);

  // EFFECT: on toAmount change update fromAmount and actual outcome
  useEffect(() => {
    if (!token || !token2 || !toAmount || focus !== "to") {
      return;
    }
    if (focus === undefined || toAmount === "") {
      setFromAmount("");
      return;
    }
    const pool: any = eligiblePools[0];
    if (!pool) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const acc = {
      addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
      sk: new Uint8Array(0),
    };
    const ci = new CONTRACT(
      pool?.poolId,
      algodClient,
      indexerClient,
      spec,
      acc
    );
    ci.setFee(4000);
    if (pool.tokA === tokenId(token2)) {
      const toAmountBN = new BigNumber(toAmount);
      if (toAmountBN.isNaN()) return;
      const toAmountBI = BigInt(
        toAmountBN
          .multipliedBy(new BigNumber(10).pow(token2.decimals))
          .toFixed(0)
      );
      // TODO consider using larger number
      ci.Trader_exactSwapBForA(1, Number.MAX_SAFE_INTEGER, toAmountBI).then(
        (r: any) => {
          console.log({ r });
          if (r.success) {
            console.log(
              "r",
              r,
              BigInt(Number.MAX_SAFE_INTEGER) - r.returnValue[1]
            );
            const diff = BigInt(Number.MAX_SAFE_INTEGER) - r.returnValue[1];
            const fromAmountBN = new BigNumber(diff.toString()).dividedBy(
              new BigNumber(10).pow(token.decimals)
            );
            console.log("fromAmountBN", fromAmountBN.toString());
            setFromAmount(fromAmountBN.toFixed(token.decimals));
          }
        }
      );
    } else if (pool.tokA === tokenId(token)) {
      const toAmountBN = new BigNumber(toAmount);
      if (toAmountBN.isNaN()) return;
      // convert to atomic unit
      const toAmountBI = BigInt(
        toAmountBN
          .multipliedBy(new BigNumber(10).pow(token2.decimals))
          .toFixed(0)
      );
      // TODO consider using larger number
      ci.Trader_exactSwapAForB(1, Number.MAX_SAFE_INTEGER, toAmountBI).then(
        (r: any) => {
          console.log({ r });
          if (r.success) {
            console.log(
              "r",
              r,
              BigInt(Number.MAX_SAFE_INTEGER) - r.returnValue[0]
            );
            const diff = BigInt(Number.MAX_SAFE_INTEGER) - r.returnValue[0];
            const fromAmountBN = new BigNumber(diff.toString()).dividedBy(
              new BigNumber(10).pow(token.decimals)
            );
            console.log("fromAmountBN", fromAmountBN.toString());
            setFromAmount(fromAmountBN.toFixed(token.decimals));
          }
        }
      );
    }
  }, [pool, token, token2, toAmount, focus, eligiblePools]);

  console.log("fromAmount", fromAmount);
  console.log("actualOutcome", actualOutcome);

  const slippage = useMemo(() => {
    if (!actualOutcome || !expectedOutcome) return;
    return (
      (Math.abs(Number(expectedOutcome) - Number(actualOutcome)) /
        Number(expectedOutcome)) *
      100
    ).toFixed(2);
  }, [actualOutcome, expectedOutcome]);

  console.log("slippage", slippage);

  const isValid = !!token && !!token2 && !!fromAmount && !!toAmount;

  // EFFECT: reset amounts on token change
  useEffect(() => {
    setFocus(undefined);
  }, [token, token2]);

  // EFFECT: set token options ii
  useEffect(() => {
    if (!token || !pools) return;
    const options = new Set<ARC200TokenI>();
    for (const p of pools) {
      if ([p.tokA, p.tokB].includes(tokenId(token))) {
        if (tokenId(token) === p.tokA) {
          const option = tokens.find(
            (t: ARC200TokenI) => `${tokenId(t)}` === `${p.tokB}`
          ) as ARC200TokenI;
          if (!option) continue;
          options.add(option);
        } else if (tokenId(token) === p.tokB) {
          const option = tokens.find(
            (t: ARC200TokenI) => `${tokenId(t)}` === `${p.tokA}`
          ) as ARC200TokenI;
          if (!option) continue;
          options.add(option);
        }
      }
    }
    const tokenOptions2 = Array.from(options);
    // check if token options includes wVOI
    if (tokenOptions2.find((t: ARC200TokenI) => t?.tokenId === TOKEN_WVOI1)) {
      const newTokenOptions2 = [
        {
          tokenId: 0,
          name: "Voi",
          symbol: "VOI",
          decimals: 6,
          totalSupply: BigInt(10_000_000_000 * 1e6),
        },
        ...tokenOptions2,
      ].filter((t: ARC200TokenI) => t.symbol !== "wVOI");
      newTokenOptions2.sort((a, b) => a.tokenId - b.tokenId);
      setTokenOptions2(newTokenOptions2);
    } else {
      const newTokenOptions2 = [...tokenOptions2].filter(
        (t: ARC200TokenI) => t.symbol !== "wVOI"
      );
      newTokenOptions2.sort((a, b) => a.tokenId - b.tokenId);
      setTokenOptions2(newTokenOptions2);
    }
  }, [pool, token, pools]);

  // EFFECT: get token balance
  useEffect(() => {
    if (!token || !activeAccount || !tokens || !tokens2) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const wrappedTokenId = Number(
      tokens2.find((t) => t.contractId === token.tokenId)?.tokenId
    );
    if (token.tokenId === 0) {
      algodClient
        .accountInformation(activeAccount.address)
        .do()
        .then((r: any) => {
          const amount = r.amount;
          const minBalance = r["min-balance"];
          const available = amount - minBalance;
          setBalance((available / 10 ** token.decimals).toLocaleString());
        });
    } else if (wrappedTokenId !== 0 && !isNaN(wrappedTokenId)) {
      algodClient
        .accountAssetInformation(activeAccount.address, wrappedTokenId)
        .do()
        .then((accAssetInfo: any) => {
          indexerClient
            .lookupAssetByID(wrappedTokenId)
            .do()
            .then((assetInfo: any) => {
              const decimals = assetInfo.asset.params.decimals;
              const balance = new BigNumber(
                accAssetInfo["asset-holding"].amount
              ).dividedBy(new BigNumber(10).pow(decimals));
              setBalance(balance.toFixed(Math.min(6, decimals)));
            });
        });
    } else {
      const ci = new arc200(Number(token.tokenId), algodClient, indexerClient);
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
  }, [token, activeAccount, tokens, tokens2]);

  // EFFECT: get token2 balance
  useEffect(() => {
    if (!token2 || !activeAccount || !tokens2) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const wrappedTokenId = Number(
      tokens2.find((t) => t.contractId === token2.tokenId)?.tokenId
    );
    if (token2.tokenId === 0) {
      algodClient
        .accountInformation(activeAccount.address)
        .do()
        .then((r: any) => {
          const amount = r.amount;
          const minBalance = r["min-balance"];
          const available = amount - minBalance;
          setBalance2((available / 10 ** token2.decimals).toLocaleString());
        });
    } else if (wrappedTokenId !== 0 && !isNaN(wrappedTokenId)) {
      algodClient
        .accountAssetInformation(activeAccount.address, wrappedTokenId)
        .do()
        .then((accAssetInfo: any) => {
          indexerClient
            .lookupAssetByID(wrappedTokenId)
            .do()
            .then((assetInfo: any) => {
              const decimals = assetInfo.asset.params.decimals;
              const balance = new BigNumber(
                accAssetInfo["asset-holding"].amount
              ).dividedBy(new BigNumber(10).pow(decimals));
              setBalance2(balance.toFixed(Math.min(6, decimals)));
            });
        });
    } else {
      const ci = new arc200(token2.tokenId, algodClient, indexerClient);
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
  }, [balance, token, token2, activeAccount]);

  // EFFECT: get voi balance
  /*
  useEffect(() => {
    if (activeAccount && providers && providers.length >= 3) {
      getAccountInfo().then(setAccInfo);
    }
  }, [activeAccount, providers]);
  */

  const buttonLabel = useMemo(() => {
    if (isValid) return "Swap";
    if (info?.poolBals?.A === "0" || info?.poolBals?.B === "0")
      return "Insufficient liquidity";
    if (!token || !token2) return "Select token above";
    if ([fromAmount, toAmount].includes("")) return "Enter token amount";
    return "";
  }, [info, token, token2, isValid]);

  const minRecieved = useMemo(() => {
    if (!actualOutcome) return "-";
    return (Number(actualOutcome) * 0.995).toLocaleString();
  }, [actualOutcome]);

  const formatter = new Intl.NumberFormat("en", { notation: "compact" });

  const poolBalance = useMemo(() => {
    if (!info || !token || !token2) return "-";
    const swapAForB =
      info.tokA === tokenId(token) && info.tokB === tokenId(token2);
    const balA = swapAForB ? info.poolBals.A : info.poolBals.B;
    const balB = swapAForB ? info.poolBals.B : info.poolBals.A;

    const balAF = formatter.format(
      new BigNumber(balA)
        .dividedBy(new BigNumber(10).pow(token.decimals))
        .toNumber()
    );
    const balBF = formatter.format(
      new BigNumber(balB)
        .dividedBy(new BigNumber(10).pow(token2.decimals))
        .toNumber()
    );
    return `${balBF} ${token2.symbol} / ${balAF} ${token.symbol}`;
  }, [pool, info, token, token2]);

  const handleSwap = async () => {
    if (!isValid || !tokens2) return;
    if (!activeAccount) {
      toast.info("Please connect your wallet first");
      return;
    }
    const acc = {
      addr: activeAccount.address,
      sk: new Uint8Array(0),
    };
    try {
      setOn(true);
      setProgress(0);
      setMessage("Building transaction...");
      setProgress(25);

      const { algodClient, indexerClient } = getAlgorandClients();
      // pick a pool with best rate

      const pool = eligiblePools.slice(-1)[0]; // last pools
      const { poolId } = pool;
      const ci = new swap(poolId, algodClient, indexerClient, { acc });

      const pool2 = await ci.selectPool(
        eligiblePools,
        { ...token, tokenId: tokenId(token) },
        { ...token2, tokenId: tokenId(token2) },
        "poolId"
      );

      if (!pool || !pool2) throw new Error("No pool found");

      const networkToken = {
        contractId: TOKEN_WVOI1,
        tokenId: "0",
        decimals: 6,
        symbol: "VOI",
      };

      const mA =
        token.tokenId === 0
          ? networkToken
          : tokens2.find((t) => t.contractId === token.tokenId);

      const mB =
        token2.tokenId === 0
          ? networkToken
          : tokens2.find((t) => t.contractId === token2.tokenId);

      const A = {
        ...mA,
        amount: fromAmount.replace(/,/g, ""),
        decimals: `${mA.decimals}`,
        tokenId: mA.tokenId ?? undefined,
      };
      const B = {
        ...mB,
        amount: toAmount.replace(/,/g, ""),
        decimals: `${mB.decimals}`,
        tokenId: mB.tokenId ?? undefined,
      };

      console.log({ A, B, acc, pool2 });

      const swapR = await ci.swap(acc.addr, pool2.poolId, A, B);

      if (!swapR.success) throw new Error("Swap simulation failed");

      setMessage("Signing transaction...");
      setProgress(50);

      const stxns = await signTransactions(
        swapR.txns.map((t: string) => new Uint8Array(Buffer.from(t, "base64")))
      );

      // TODO show toast
      // const stxns = await toast.promise(
      //   signTransactions(
      //     swapR.txns.map(
      //       (t: string) => new Uint8Array(Buffer.from(t, "base64"))
      //     )
      //   ),
      //   {
      //     pending: `Swap ${fromAmount} ${tokenSymbol(
      //       token
      //     )} -> ${toAmount} ${tokenSymbol(token2)}`,
      //   },
      //   {
      //     type: "default",
      //     position: "top-right",
      //     theme: "dark",
      //   }
      // );
      //const res = await sendTransactions(stxns);
      //console.log({ res });

      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      console.log({ res });

      setProgress(75);
      setMessage("Confirming transaction...");
      //await algosdk.waitForConfirmation(algodClient, res.txId, 1000);
      setProgress(85);

      // -----------------------------------------
      // QUEST HERE hmbl_pool_swap
      // -----------------------------------------
      // setMessage("Updating quests...");
      // do {
      //   const address = activeAccount.address;
      //   const actions: string[] = [
      //     QUEST_ACTION.SWAP_TOKEN,
      //     QUEST_ACTION.SWAP_TOKEN_DAILY,
      //   ];
      //   const {
      //     data: { results },
      //   } = await getActions(address);
      //   for (const action of actions) {
      //     const address = activeAccount.address;
      //     const key = `${action}:${address}`;
      //     const completedAction = results.find(
      //       (el: any) => el.key === key && !el.key.match(/daily/)
      //     );
      //     if (!completedAction) {
      //       await submitAction(action, address, {
      //         poolId,
      //       });
      //     }
      //     // TODO notify quest completion here
      //   }
      // } while (0);
      // -----------------------------------------
      setProgress(95);
      await new Promise((res) => setTimeout(res, 1000));

      //const swapEvents = await ci.SwapEvents({ txid: res.txId });
      //console.log(swapEvents);

      // TODO add confirmation modal
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setOn(false);
      setMessage("");
      setProgress(0);
    }
  };

  const isLoading = !pools || !tokens;

  const [message, setMessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (progress === 0 || progress >= 100) return;
    const timeout = setTimeout(() => {
      setProgress(progress + 1);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [progress]);

  console.log({ token, token2 });

  const [tokAInfo, setTokAInfo] = useState<any>();
  useEffect(() => {
    if (!token || !tokens2) return;
    const tokA = tokens2.find(
      (t) =>
        t.contractId === token.tokenId || `${t.tokenId}` === `${token.tokenId}`
    );
    if (!tokA) return;
    setTokAInfo(tokA);
  }, [token, tokens2]);

  const [tokBInfo, setTokBInfo] = useState<any>();
  useEffect(() => {
    if (!token2 || !tokens2) return;
    const tokB = tokens2.find(
      (t) =>
        t.contractId === token2.tokenId ||
        `${t.tokenId}` === `${token2.tokenId}`
    );
    if (!tokB) return;
    setTokBInfo(tokB);
  }, [token2, tokens2]);

  return !isLoading ? (
    <>
      <SwapRoot className={isDarkTheme ? "dark" : "light"}>
        <SwapContainer gap={on ? 1.43 : 0}>
          <TokenInput
            label="Swap from"
            amount={fromAmount}
            setAmount={setFromAmount}
            token={token}
            token2={token2}
            setToken={setToken}
            balance={balance}
            onFocus={() => setFocus("from")}
            options={tokenOptions}
            displayId={
              tokens2?.find((t) => t.contractId === token?.tokenId)?.tokenId ||
              token?.tokenId ||
              0
            }
            tokInfo={tokAInfo}
          />
          <img
            onClick={() => {
              const newToken = token;
              const newAmount = fromAmount;
              setToken(token2);
              setToken2(newToken);
              setToAmount(newAmount);
              setFromAmount(toAmount);
            }}
            style={{ cursor: "pointer" }}
            src={on ? ActiveSwapIcon : SwapIcon}
            alt="swap"
            className={on ? "rotate" : undefined}
          />
          <TokenInput
            label="Swap to"
            amount={toAmount}
            setAmount={setToAmount}
            token={token2}
            setToken={setToken2}
            options={tokenOptions2}
            balance={balance2}
            onFocus={() => setFocus("to")}
            displayId={
              tokens2?.find((t) => t.contractId === token2?.tokenId)?.tokenId ||
              token2?.tokenId ||
              0
            }
            tokInfo={tokBInfo}
          />
        </SwapContainer>
        {!!token2 ? (
          <>
            <SummaryContainer>
              {!!token2 &&
              (info?.poolBals?.A !== "0" || info?.poolBals?.B !== "0") ? (
                <RateContainer>
                  <RateLabel className={isDarkTheme ? "dark" : "light"}>
                    Rate
                  </RateLabel>
                  <RateValue>
                    <RateMain className={isDarkTheme ? "dark" : "light"}>
                      {lhs === 1 ? 1 : lhs?.toFixed(6)} {tokenSymbol(token)} ={" "}
                      {lhs > 1 ? 1 : rate?.toFixed(6)} {tokenSymbol(token2)}
                    </RateMain>
                    <RateSub>
                      {lhs === 1 ? 1 : rhs} {tokenSymbol(token2)} ={" "}
                      {invRate?.toFixed(6)} {tokenSymbol(token)}
                    </RateSub>
                  </RateValue>
                </RateContainer>
              ) : null}
              <BreakdownContainer>
                <BreakdownStack>
                  <BreakdownRow>
                    <BreakdownLabel className={isDarkTheme ? "dark" : "light"}>
                      <span>Pool balance</span>
                      <InfoCircleIcon />
                    </BreakdownLabel>
                    <BreakdownValueContiner>
                      <BreakdownValue
                        className={isDarkTheme ? "dark" : "light"}
                      >
                        {poolBalance}
                      </BreakdownValue>
                    </BreakdownValueContiner>
                  </BreakdownRow>
                  <BreakdownRow>
                    <BreakdownLabel className={isDarkTheme ? "dark" : "light"}>
                      <span>Liquidity provider fee</span>
                      <InfoCircleIcon />
                    </BreakdownLabel>
                    <BreakdownValueContiner>
                      <BreakdownValue
                        className={isDarkTheme ? "dark" : "light"}
                      >
                        {fee} {token?.symbol}
                      </BreakdownValue>
                    </BreakdownValueContiner>
                  </BreakdownRow>
                  <BreakdownRow>
                    <BreakdownLabel className={isDarkTheme ? "dark" : "light"}>
                      <span>Price impact</span>
                      <InfoCircleIcon />
                    </BreakdownLabel>
                    <BreakdownValueContiner>
                      <BreakdownValue
                        className={isDarkTheme ? "dark" : "light"}
                      >
                        {slippage}%
                      </BreakdownValue>
                    </BreakdownValueContiner>
                  </BreakdownRow>
                  <BreakdownRow>
                    <BreakdownLabel className={isDarkTheme ? "dark" : "light"}>
                      <span>Allowed slippage</span>
                      <InfoCircleIcon />
                    </BreakdownLabel>
                    <BreakdownValueContiner>
                      <BreakdownValue
                        className={isDarkTheme ? "dark" : "light"}
                      >
                        0.50%
                      </BreakdownValue>
                    </BreakdownValueContiner>
                  </BreakdownRow>
                  <BreakdownRow>
                    <BreakdownLabel className={isDarkTheme ? "dark" : "light"}>
                      <span>Minimum received</span>
                      <InfoCircleIcon />
                    </BreakdownLabel>
                    <BreakdownValueContiner>
                      <BreakdownValue
                        className={isDarkTheme ? "dark" : "light"}
                      >
                        {minRecieved} {token2?.symbol}
                      </BreakdownValue>
                    </BreakdownValueContiner>
                  </BreakdownRow>
                </BreakdownStack>
              </BreakdownContainer>
            </SummaryContainer>
          </>
        ) : null}
        {buttonLabel !== "" ? (
          <Button
            className={isValid ? "active" : undefined}
            onClick={() => {
              if (!on) {
                handleSwap();
              }
            }}
          >
            {buttonLabel}
          </Button>
        ) : null}
      </SwapRoot>
      <SwapSuccessfulModal
        open={swapModalOpen}
        handleClose={() => setSwapModalOpen(false)}
        poolId={pool?.poolId}
        tokIn={tokIn}
        tokOut={tokOut}
        swapIn={swapIn}
        swapOut={swapOut}
        txId={txId}
      />
      <ProgressBar
        message={message}
        isActive={![0, 100].includes(progress)}
        currentStep={progress}
        totalSteps={100}
      />
    </>
  ) : null;
};

export default Swap;
