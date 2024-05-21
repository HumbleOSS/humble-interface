import styled from "@emotion/styled";
import React, { useEffect, useMemo, useState } from "react";
import SwapIcon from "static/icon/icon-swap-stable-light.svg";
import ActiveSwapIcon from "static/icon/icon-swap-active-light.svg";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet";
import { CircularProgress, Stack } from "@mui/material";
import { CONTRACT, arc200, swap } from "ulujs";
import { TOKEN_VIA, TOKEN_VOI, TOKEN_WVOI1 } from "../../constants/tokens";
import { getAlgorandClients } from "../../wallets";
import TokenInput from "../TokenInput";
import { useSearchParams } from "react-router-dom";
import { ARC200TokenI, PoolI } from "../../types";
import { getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getPools } from "../../store/poolSlice";
import algosdk from "algosdk";
import { toast } from "react-toastify";
import { Toast } from "react-toastify/dist/components";
import { tokenId, tokenSymbol } from "../../utils/dex";
import BigNumber from "bignumber.js";
import { CTCINFO_DEFAULT_LP } from "../../constants/dex";
import SwapSuccessfulModal from "../modals/SwapSuccessfulModal";
import { hasBalance } from "ulujs/types/arc200";
import { max } from "moment";

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
  const pools: PoolI[] = useSelector((state: RootState) => state.pools.pools);
  const tokens = useSelector((state: RootState) => state.tokens.tokens);

  const [sp] = useSearchParams();
  const paramPoolId = sp.get("poolId") || CTCINFO_DEFAULT_LP;

  const {
    providers,
    activeAccount,
    signTransactions,
    sendTransactions,
    getAccountInfo,
  } = useWallet();

  const [pool, setPool] = useState<PoolI>();
  const [txId, setTxId] = useState<string>(
    "YE6LE6TJY3IKZILM7YEOO3BWXU6CY7MD7HZV3N6YRQKZVAN5ABVQ"
  );
  const [swapIn, setSwapIn] = useState("1");
  const [swapOut, setSwapOut] = useState("2");
  const [tokIn, setTokIn] = useState("TOKA");
  const [tokOut, setTokOut] = useState("TOKB");
  const [swapModalOpen, setSwapModalOpen] = useState<boolean>(false);

  // EFFECT: set pool to match paramPoolId
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
  }, [pool, pools, tokens]);

  const [accInfo, setAccInfo] = React.useState<any>(null);
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
    ].filter((t: ARC200TokenI) => t.tokenId !== token2?.tokenId);
    tokenOptions.sort((a, b) => a.tokenId - b.tokenId);
    setTokenOptions(tokenOptions);
  }, [token2, tokens, pools]);

  const eligiblePools = useMemo(() => {
    return pools.filter((p: PoolI) => {
      return (
        [p.tokA, p.tokB].includes(tokenId(token)) &&
        [p.tokA, p.tokB].includes(tokenId(token2)) &&
        p.tokA !== p.tokB
      );
    });
  }, [pools, token, token2]);

  const [info, setInfo] = useState<any>();
  // EFFECT: set pool info
  useEffect(() => {
    if (!token || !token2) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const A = { ...token, tokenId: tokenId(token) };
    const B = { ...token2, tokenId: tokenId(token2) };
    new swap(0, algodClient, indexerClient)
      .selectPool(eligiblePools, A, B)
      .then((pool: any) => {
        if (!pool) return;
        const ci = new swap(pool.poolId, algodClient, indexerClient);
        ci.Info().then((info: any) => {
          setInfo(info.returnValue);
        });
      });
  }, [eligiblePools, token, token2]);

  const rate = useMemo(() => {
    if (!info || !token || !token2) return;
    const A = { ...token, tokenId: tokenId(token) };
    const B = { ...token2, tokenId: tokenId(token2) };
    const res = swap.rate(info, A, B);
    return res;
  }, [info, token, token2]);

  console.log("rate", rate);

  const invRate = useMemo(() => {
    if (!rate) return;
    return 1 / rate;
  }, [rate, token2]);

  console.log("invRate", invRate);

  const fee = useMemo(() => {
    return ((fromAmount * info?.protoInfo.totFee) / 10000).toFixed(6);
  }, [info, fromAmount]);

  console.log("fee", fee);

  const expectedOutcome = useMemo(() => {
    if (!rate || !fromAmount) return;
    return Number(rate) * Number(fromAmount);
  }, [rate, fromAmount]);

  console.log("expectedOutcome", expectedOutcome);

  const [actualOutcome, setActualOutcome] = useState<string>();

  // EFFECT: update toAmount and actual outcome on fromAmount change
  useEffect(() => {
    if (!token || !token2 || !fromAmount || focus !== "from") return;
    if (focus === undefined || fromAmount === "") {
      setToAmount("");
      return;
    }
    const { algodClient, indexerClient } = getAlgorandClients();
    const A = { ...token, tokenId: tokenId(token) };
    const B = { ...token2, tokenId: tokenId(token2) };
    new swap(0, algodClient, indexerClient)
      .selectPool(eligiblePools, A, B)
      .then((pool: any) => {
        const acc = {
          addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
          sk: new Uint8Array(0),
        };
        const ci = new CONTRACT(
          pool.poolId,
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
      });
  }, [pool, token, token2, fromAmount, focus]);

  // EFFECT: update fromAmount and actual outcome on toAmount change
  useEffect(() => {
    if (!token || !token2 || !toAmount || focus !== "to") return;
    if (focus === undefined || toAmount === "") {
      setFromAmount("");
      return;
    }
    // TODO use selectPool
    const pool = pools.find(
      (p: PoolI) =>
        [p.tokA, p.tokB].includes(tokenId(token)) &&
        [p.tokA, p.tokB].includes(tokenId(token2))
    );
    if (!pool) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const acc = {
      addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
      sk: new Uint8Array(0),
    };
    const ci = new CONTRACT(pool.poolId, algodClient, indexerClient, spec, acc);
    ci.setFee(4000);
    if (tokenId(token2) === pool?.tokB) {
      const toAmountBN = new BigNumber(toAmount);
      if (toAmountBN.isNaN()) return;
      const toAmountBI = BigInt(
        toAmountBN.multipliedBy(10 ** token2.decimals).toFixed()
      );
      ci.Trader_swapBForA(1, toAmountBI, 0).then((r: any) => {
        if (r.success) {
          const fromAmountBN = new BigNumber(r.returnValue[0]);
          if (fromAmountBN.isNaN()) return;
          const fromAmount = fromAmountBN
            .div(10 ** token.decimals)
            .toFixed(token.decimals);
          setFromAmount(fromAmount);
        }
      });
    } else if (tokenId(token2) === pool?.tokA) {
      const toAmountBN = new BigNumber(toAmount);
      if (toAmountBN.isNaN()) return;
      const toAmountBI = BigInt(
        toAmountBN.multipliedBy(10 ** token2.decimals).toFixed()
      );
      ci.Trader_swapAForB(1, toAmountBI, 0).then((r: any) => {
        if (r.success) {
          const fromAmountBN = new BigNumber(r.returnValue[1]);
          if (fromAmountBN.isNaN()) return;
          const fromAmount = fromAmountBN
            .div(10 ** token.decimals)
            .toFixed(token.decimals);
          setFromAmount(fromAmount);
        }
      });
    }
  }, [pool, token, token2, toAmount, focus]);

  const slippage = useMemo(() => {
    if (!actualOutcome || !expectedOutcome) return;
    return (
      (Math.abs(Number(expectedOutcome) - Number(actualOutcome)) /
        Number(expectedOutcome)) *
      100
    ).toFixed(2);
  }, [actualOutcome, expectedOutcome]);

  const isValid = !!token && !!token2 && !!fromAmount && !!toAmount;

  // EFFECT: reset amounts on token change
  useEffect(() => {
    setFocus(undefined);
  }, [token, token2]);

  // EFFECT: update token options on token change
  useEffect(() => {
    if (!token || !pools) return;
    const options = new Set<ARC200TokenI>();
    for (const p of pools) {
      if ([p.tokA, p.tokB].includes(tokenId(token))) {
        if (tokenId(token) === p.tokA) {
          options.add(
            tokens.find(
              (t: ARC200TokenI) => `${tokenId(t)}` === `${p.tokB}`
            ) as ARC200TokenI
          );
        } else if (tokenId(token) === p.tokB) {
          options.add(
            tokens.find(
              (t: ARC200TokenI) => `${tokenId(t)}` === `${p.tokA}`
            ) as ARC200TokenI
          );
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
      ];
      newTokenOptions2.sort((a, b) => a.tokenId - b.tokenId);
      setTokenOptions2(newTokenOptions2);
    } else {
      const newTokenOptions2 = [...tokenOptions2];
      newTokenOptions2.sort((a, b) => a.tokenId - b.tokenId);
      setTokenOptions2(newTokenOptions2);
    }
  }, [pool, token, pools]);

  // EFFECT: get token balance
  useEffect(() => {
    if (!token || !activeAccount) return;
    const { algodClient, indexerClient } = getAlgorandClients();
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

  // EFFECT: get token2 balance
  useEffect(() => {
    if (!token2 || !activeAccount) return;
    const { algodClient, indexerClient } = getAlgorandClients();
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
  }, [token2, activeAccount]);

  // EFFECT: get voi balance
  useEffect(() => {
    if (activeAccount && providers && providers.length >= 3) {
      getAccountInfo().then(setAccInfo);
    }
  }, [activeAccount, providers]);

  const buttonLabel = useMemo(() => {
    if (isValid) {
      return "Swap";
    } else {
      return "Select token above";
    }
  }, [isValid]);

  const minRecieved = useMemo(() => {
    if (!actualOutcome) return "-";
    return (Number(actualOutcome) * 0.995).toLocaleString();
  }, [actualOutcome]);

  const poolBalance = useMemo(() => {
    if (!info || !token || !token2) return "-";
    const swapAForB =
      info.tokA === tokenId(token) && info.tokB === tokenId(token2);
    const balA = swapAForB ? info.poolBals.A : info.poolBals.B;
    const balB = swapAForB ? info.poolBals.B : info.poolBals.A;

    const formatter = new Intl.NumberFormat("en", { notation: "compact" });
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
    if (!isValid) return;
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
      const { algodClient, indexerClient } = getAlgorandClients();
      await new Promise((res) => setTimeout(res, 1000));

      // pick a pool with best rate

      const pool = eligiblePools.slice(-1)[0]; // last pools
      const { poolId } = pool;
      const ci = new swap(poolId, algodClient, indexerClient, { acc });
      const pool2 = await ci.selectPool(
        eligiblePools,
        { ...token, tokenId: tokenId(token) },
        { ...token2, tokenId: tokenId(token2) }
      );

      if (!pool || !pool2) throw new Error("No pool found");

      const swapR = await ci.swap(
        acc.addr,
        pool2.poolId,
        {
          contractId: tokenId(token),
          tokenId: token.tokenId === 0 ? "0" : undefined,
          symbol: token.symbol,
          amount: fromAmount,
        },
        {
          contractId: tokenId(token2),
          tokenId: token2.tokenId === 0 ? "0" : undefined,
          symbol: token2.symbol,
          decimals: token2.decimals,
        }
      );
      console.log(swapR);
      if (!swapR.success) throw new Error("Swap simulation failed");
      await toast.promise(
        signTransactions(
          swapR.txns.map(
            (t: string) => new Uint8Array(Buffer.from(t, "base64"))
          )
        ).then(sendTransactions),
        {
          pending: `Swap ${fromAmount} ${tokenSymbol(
            token
          )} -> ${toAmount} ${tokenSymbol(token2)}`,
          success: `Swap successful`,
        },
        {
          type: "default",
          position: "top-center",
          theme: "dark",
        }
      );
      // TODO add confirmation modal
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setOn(false);
    }
  };

  // const handleSwap = async () => {
  //   if (!isValid) return;
  //   if (!activeAccount) {
  //     toast.info("Please connect your wallet first");
  //     return;
  //   }
  //   try {
  //     setOn(true);
  //     const { algodClient, indexerClient } = getAlgorandClients();
  //     const makeCi = (ctcInfo: number) => {
  //       const acc = {
  //         addr: activeAccount?.address || "",
  //         sk: new Uint8Array(0),
  //       };
  //       return new CONTRACT(ctcInfo, algodClient, indexerClient, spec, acc);
  //     };
  //     const makeBuilder = (
  //       ctcInfoPool: number,
  //       ctcInfoTokA: number,
  //       ctcInfoTokB: number
  //     ) => {
  //       const acc = {
  //         addr: activeAccount?.address || "",
  //         sk: new Uint8Array(0),
  //       };
  //       return {
  //         pool: new CONTRACT(
  //           ctcInfoPool,
  //           algodClient,
  //           indexerClient,
  //           spec,
  //           acc,
  //           true,
  //           false,
  //           true
  //         ),
  //         arc200: {
  //           tokA: new CONTRACT(
  //             ctcInfoTokA,
  //             algodClient,
  //             indexerClient,
  //             {
  //               ...abi.arc200,
  //               methods: [...abi.nt200.methods],
  //             },
  //             acc,
  //             true,
  //             false,
  //             true
  //           ),
  //           tokB: new CONTRACT(
  //             ctcInfoTokB,
  //             algodClient,
  //             indexerClient,
  //             abi.arc200,
  //             acc,
  //             true,
  //             false,
  //             true
  //           ),
  //         },
  //       };
  //     };
  //     const makeArc200 = (ctcInfo: number) => {
  //       const acc = {
  //         addr: activeAccount?.address || "",
  //         sk: new Uint8Array(0),
  //       };
  //       return new CONTRACT(
  //         ctcInfo,
  //         algodClient,
  //         indexerClient,
  //         abi.arc200,
  //         acc
  //       );
  //     };

  //     // pick a pool
  //     const pool = eligiblePools.slice(-1)[0];
  //     const { poolId, tokA, tokB } = pool;

  //     // handle special cases
  //     for (const tok of [tokA, tokB]) {
  //       switch (tok) {
  //         case TOKEN_WVOI1: {
  //           const ci = makeCi(tok);
  //           const hasBoxR = await ci.hasBox([
  //             1,
  //             [
  //               ...algosdk.decodeAddress(activeAccount.address).publicKey,
  //               ...new Uint8Array(32),
  //             ],
  //           ]);
  //           if (!hasBoxR.success) throw new Error("Failed to check balance");
  //           const hasBox = hasBoxR.returnValue;
  //           if (hasBox === 0) {
  //             ci.setPaymentAmount(28500);
  //             const createBalanceBoxR = await ci.createBalanceBox(
  //               activeAccount.address
  //             );
  //             if (!createBalanceBoxR.success)
  //               throw new Error("Transfer failed");
  //             await signTransactions(
  //               createBalanceBoxR.txns.map(
  //                 (t: string) => new Uint8Array(Buffer.from(t, "base64"))
  //               )
  //             ).then(sendTransactions);
  //           }
  //           break;
  //         }
  //         case TOKEN_VIA: {
  //           const ci = makeArc200(tok);
  //           // ensure pool balance box
  //           const hasBalanceR = await ci.hasBalance(
  //             algosdk.getApplicationAddress(poolId)
  //           );
  //           const hasBalanceR2 = await ci.hasBalance(activeAccount.address);
  //           const hasAllowanceR = await ci.hasAllowance(
  //             activeAccount.address,
  //             algosdk.getApplicationAddress(poolId)
  //           );
  //           if (
  //             !hasBalanceR2.success ||
  //             !hasBalanceR.success ||
  //             !hasAllowanceR.success
  //           )
  //             throw new Error("Failed to check balance or allowance");
  //           const hasBalance = hasBalanceR.returnValue;
  //           const hasBalance2 = hasBalanceR2.returnValue;
  //           const hasAllowance = hasAllowanceR.returnValue;
  //           // TODO use builder to combine into single txngroup
  //           if (hasBalance === 0) {
  //             ci.setPaymentAmount(28500);
  //             const arc200_transferR = await ci.arc200_transfer(
  //               algosdk.getApplicationAddress(poolId),
  //               0
  //             );
  //             if (!arc200_transferR.success) throw new Error("Transfer failed");
  //             await signTransactions(
  //               arc200_transferR.txns.map(
  //                 (t: string) => new Uint8Array(Buffer.from(t, "base64"))
  //               )
  //             ).then(sendTransactions);
  //           }
  //           if (hasBalance2 === 0) {
  //             ci.setPaymentAmount(28500);
  //             const arc200_transferR = await ci.arc200_transfer(
  //               activeAccount.address,
  //               0
  //             );
  //             if (!arc200_transferR.success) throw new Error("Transfer failed");
  //             await signTransactions(
  //               arc200_transferR.txns.map(
  //                 (t: string) => new Uint8Array(Buffer.from(t, "base64"))
  //               )
  //             ).then(sendTransactions);
  //           }
  //           if (tok === tokB && hasAllowance === 0) {
  //             ci.setPaymentAmount(28100);
  //             const arc200_approveR = await ci.arc200_approve(
  //               algosdk.getApplicationAddress(poolId),
  //               0
  //             );
  //             if (!arc200_approveR.success) throw new Error("Approve failed");
  //             await signTransactions(
  //               arc200_approveR.txns.map(
  //                 (t: string) => new Uint8Array(Buffer.from(t, "base64"))
  //               )
  //             ).then(sendTransactions);
  //           }
  //           break;
  //         }
  //         default: {
  //           break;
  //         }
  //       }
  //     }
  //     const ci = makeCi(poolId);
  //     ci.setFee(4000);
  //     // determine the direction
  //     if (pool.tokA === tokenId(token)) {
  //       console.log("swapAForB");
  //       // ---------------------------------------
  //       // begin ensure
  //       // ensure approval for tokA
  //       // ensure tokB balance
  //       // if tokA wVOI ensure tokA balance
  //       // end ensure
  //       // ---------------------------------------
  //       // begin ensure
  //       // ---------------------------------------
  //       console.log("begin ensure");
  //       // ---------------------------------------
  //       // ensure approval for tokA
  //       // ---------------------------------------
  //       let ensureTokAApproval = false;
  //       do {
  //         const ci = new CONTRACT(
  //           tokA,
  //           algodClient,
  //           indexerClient,
  //           abi.arc200,
  //           {
  //             addr: activeAccount?.address || "",
  //             sk: new Uint8Array(0),
  //           }
  //         );
  //         const arc200_approveR = await ci.arc200_approve(
  //           algosdk.getApplicationAddress(poolId),
  //           BigInt(0)
  //         );
  //         if (!arc200_approveR.success) {
  //           ci.setPaymentAmount(28100);
  //           const arc200_approveR = await ci.arc200_approve(
  //             algosdk.getApplicationAddress(poolId),
  //             BigInt(0)
  //           );
  //           if (arc200_approveR.success) {
  //             console.log("ensure approval for tokA");
  //             ensureTokAApproval = true;
  //             if ([0, TOKEN_WVOI1, TOKEN_VIA].includes(tokA)) {
  //               await toast.promise(
  //                 signTransactions(
  //                   arc200_approveR.txns.map(
  //                     (t: string) => new Uint8Array(Buffer.from(t, "base64"))
  //                   )
  //                 ).then(sendTransactions),
  //                 {
  //                   pending: `Approve ${tokenSymbol(token)} for swap`,
  //                   success: `Approval successful!`,
  //                   //error: "Approval failed",
  //                 }
  //               );
  //             }
  //           }
  //         }
  //       } while (0);
  //       //console.log({ ensureTokAApproval });
  //       // ---------------------------------------
  //       // ensure tokB balance
  //       // ---------------------------------------
  //       let ensureTokBBalance = false;
  //       do {
  //         // TODO use supportsInterface to detect new token
  //         const ci = new CONTRACT(tokB, algodClient, indexerClient, spec, {
  //           addr: activeAccount?.address || "",
  //           sk: new Uint8Array(0),
  //         });
  //         const arc200_transferR = await ci.arc200_transfer(
  //           activeAccount?.address || "",
  //           0
  //         );
  //         if (!arc200_transferR.success) {
  //           ci.setPaymentAmount(28500);
  //           const arc200_transferR = await ci.arc200_transfer(
  //             activeAccount?.address || "",
  //             0
  //           );
  //           if (arc200_transferR.success) {
  //             console.log("ensure balance for tokB");
  //             ensureTokBBalance = true;
  //             if ([0, TOKEN_WVOI1, TOKEN_VIA].includes(tokB)) {
  //               await toast.promise(
  //                 signTransactions(
  //                   arc200_transferR.txns.map(
  //                     (t: string) => new Uint8Array(Buffer.from(t, "base64"))
  //                   )
  //                 ).then(sendTransactions),
  //                 {
  //                   pending: `Transfer ${tokenSymbol(token2)} for swap`,
  //                   success: `Transfer successful!`,
  //                   //error: "Transfer failed",
  //                 }
  //               );
  //             }
  //           }
  //         }
  //       } while (0);
  //       // ---------------------------------------
  //       // if tokA wVOI ensure tokA balance
  //       // ---------------------------------------
  //       // do {
  //       //   const ci = new CONTRACT(tokA, algodClient, indexerClient, abi.nt200, {
  //       //     addr: activeAccount?.address || "",
  //       //     sk: new Uint8Array(0),
  //       //   });
  //       //   ci.setPaymentAmount(28500);
  //       //   const createBalanceBoxR = await ci.createBalanceBox(
  //       //     activeAccount.address
  //       //   );
  //       //   if (createBalanceBoxR.success) {
  //       //     await toast.promise(
  //       //       signTransactions(
  //       //         createBalanceBoxR.txns.map(
  //       //           (t: string) => new Uint8Array(Buffer.from(t, "base64"))
  //       //         )
  //       //       ).then(sendTransactions),
  //       //       {
  //       //         pending: `Pending transaction to setup wallet for ${tokenSymbol(
  //       //           token
  //       //         )}/ARC200 swaps`,
  //       //         success: `Wallet setup complete!`,
  //       //         //error: "Wallet setup failed",
  //       //       }
  //       //     );
  //       //   }
  //       // } while (0);
  //       // ---------------------------------------
  //       // end ensure
  //       // ---------------------------------------
  //       console.log("end ensure");
  //       const inABN = new BigNumber(fromAmount);
  //       if (inABN.isNaN()) return new Error("Invalid amount");
  //       const inABI = BigInt(
  //         inABN.multipliedBy(10 ** token.decimals).toFixed()
  //       );
  //       const Trader_swapAForBR = await ci.Trader_swapAForB(1, inABI, 0);
  //       if (!Trader_swapAForBR.success)
  //         return new Error("Swap simulation failed");
  //       const [, outB] = Trader_swapAForBR.returnValue;
  //       const outBSl = BigInt(
  //         new BigNumber(outB).multipliedBy(0.995).toFixed(0)
  //       ); // 0.5% slippage
  //       const builder = makeBuilder(poolId, tokA, tokB);
  //       const poolAddr = algosdk.getApplicationAddress(poolId);

  //       const buildN = [];
  //       let extraPaymentAmount = 1;
  //       if (token.tokenId === 0) {
  //         extraPaymentAmount += 28500;
  //         buildN.push(builder.arc200.tokA.deposit(inABI));
  //       }
  //       // conditionally add ensure txn for tokB balance
  //       if (ensureTokAApproval) {
  //         extraPaymentAmount += 28100; // may not actually go to tokA but is accounted for
  //         buildN.push(builder.arc200.tokA.arc200_approve(poolAddr, 0));
  //       }
  //       // conditionally add ensure txn for tokB balance
  //       if (ensureTokBBalance) {
  //         extraPaymentAmount += 28500; // does not actually go to tokB but is account for
  //         buildN.push(
  //           builder.arc200.tokB.arc200_transfer(activeAccount.address, 0)
  //         );
  //       }
  //       buildN.push(builder.arc200.tokA.arc200_approve(poolAddr, inABI));
  //       buildN.push(builder.pool.Trader_swapAForB(0, inABI, outBSl));
  //       const buildP = (await Promise.all(buildN)).map((res: any) => res.obj);
  //       console.log({ buildP });
  //       let customR;
  //       if (token.tokenId === 0) {
  //         console.log(token, tokA);
  //         const ci = makeCi(tokA);
  //         ci.setFee(4000);
  //         ci.setPaymentAmount(Number(inABI) + extraPaymentAmount);
  //         ci.setAccounts([algosdk.getApplicationAddress(tokA)]);
  //         ci.setEnableGroupResourceSharing(true);
  //         ci.setExtraTxns(buildP);
  //         customR = await ci.custom();
  //       } else {
  //         ci.setFee(4000);
  //         ci.setPaymentAmount(extraPaymentAmount);
  //         ci.setAccounts([poolAddr]);
  //         ci.setEnableGroupResourceSharing(true);
  //         ci.setExtraTxns(buildP);
  //         customR = await ci.custom();
  //       }
  //       console.log({ customR });
  //       if (!customR.success) return new Error("Swap group simulation failed");
  //       const custom = await toast.promise(
  //         signTransactions(
  //           customR.txns.map(
  //             (t: string) => new Uint8Array(Buffer.from(t, "base64"))
  //           )
  //         ).then(sendTransactions),
  //         {
  //           pending: `Swap ${fromAmount} ${tokenSymbol(
  //             token
  //           )} -> ${toAmount} ${tokenSymbol(token2)}`,
  //           //success: `Swap successful!`,
  //           //error: "Swap failed",
  //         },
  //         {
  //           type: "default",
  //           position: "top-center",
  //           theme: "dark",
  //         }
  //       );
  //       const statusR = await algodClient.status().do();
  //       const lastRound = statusR["last-round"];
  //       const ciArc200 = new arc200(tokB, algodClient, indexerClient);
  //       const arc200_TransferR = await ciArc200.arc200_Transfer({
  //         minRound: lastRound - 10,
  //       });
  //       const lastTransfer = arc200_TransferR.filter(
  //         (evt: any) =>
  //           evt[3] === algosdk.getApplicationAddress(poolId) &&
  //           evt[4] === activeAccount.address
  //       );
  //       if (!lastTransfer) return;
  //       const inAmtBi: any = inABI;
  //       const inAmtBn = new BigNumber(inAmtBi).div(
  //         new BigNumber(10).pow(token.decimals)
  //       );
  //       const swapIn = inAmtBn.toFixed(token.decimals);
  //       const outAmtBi: any = lastTransfer[0][5];
  //       const outAmtBn = new BigNumber(outAmtBi).div(
  //         new BigNumber(10).pow(token2.decimals)
  //       );
  //       const swapOut = outAmtBn.toFixed(token2.decimals);
  //       setPool(pool);
  //       setSwapIn(swapIn);
  //       setSwapOut(swapOut);
  //       setTokIn(tokenSymbol(token));
  //       setTokOut(tokenSymbol(token2));
  //       setTxId(custom.txId);
  //       setSwapModalOpen(true);
  //     } else if (pool.tokB === tokenId(token)) {
  //       console.log("swapBForA");
  //       // ---------------------------------------
  //       // ensure approval
  //       // ---------------------------------------
  //       let ensureTokBApproval = false;
  //       do {
  //         const ci = new CONTRACT(tokA, algodClient, indexerClient, spec, {
  //           addr: activeAccount?.address || "",
  //           sk: new Uint8Array(0),
  //         });
  //         const arc200_approveR = await ci.arc200_approve(
  //           algosdk.getApplicationAddress(poolId),
  //           BigInt(0)
  //         );
  //         if (!arc200_approveR.success) {
  //           ci.setPaymentAmount(28100);
  //           const arc200_approveR = await ci.arc200_approve(
  //             algosdk.getApplicationAddress(poolId),
  //             BigInt(0)
  //           );
  //           if (arc200_approveR.success) {
  //             console.log("ensure approval for tokB");
  //             ensureTokBApproval = true;
  //           }
  //         }
  //         // ---
  //         // const ci = new CONTRACT(tokA, algodClient, indexerClient, spec, {
  //         //   addr: activeAccount?.address || "",
  //         //   sk: new Uint8Array(0),
  //         // });
  //         // const arc200_approveR = await ci.arc200_approve(
  //         //   algosdk.getApplicationAddress(poolId),
  //         //   BigInt(0)
  //         // );
  //         // console.log({ arc200_approveR });
  //         // if (!arc200_approveR.success) {
  //         //   ci.setPaymentAmount(28100);
  //         //   const arc200_approveR = await ci.arc200_approve(
  //         //     algosdk.getApplicationAddress(poolId),
  //         //     BigInt(0)
  //         //   );
  //         //   await toast.promise(
  //         //     signTransactions(
  //         //       arc200_approveR.txns.map(
  //         //         (t: string) => new Uint8Array(Buffer.from(t, "base64"))
  //         //       )
  //         //     ).then(sendTransactions),
  //         //     {
  //         //       pending: `Approve ${tokenSymbol(token)} spend for pool`,
  //         //       success: `Approve successful!`,
  //         //       //error: "Approve failed",
  //         //     },
  //         //     {
  //         //       type: "default",
  //         //       position: "top-center",
  //         //       theme: isDarkTheme ? "dark" : "light",
  //         //     }
  //         //   );
  //         // }
  //       } while (0);
  //       // ---------------------------------------
  //       // ensure tokA balance
  //       // ---------------------------------------
  //       let ensureTokABalance = false;
  //       do {
  //         const ci = new CONTRACT(tokA, algodClient, indexerClient, spec, {
  //           addr: activeAccount?.address || "",
  //           sk: new Uint8Array(0),
  //         });
  //         const arc200_transferR = await ci.arc200_transfer(
  //           activeAccount.address,
  //           BigInt(0)
  //         );
  //         if (!arc200_transferR.success) {
  //           ci.setPaymentAmount(28500);
  //           const arc200_transferR = await ci.arc200_transfer(
  //             activeAccount.address,
  //             BigInt(0)
  //           );
  //           if (arc200_transferR.success) {
  //             console.log("ensure balance for tokA");
  //             ensureTokABalance = true;
  //           }
  //         }
  //       } while (0);
  //       // ---------------------------------------
  //       const inBBN = new BigNumber(fromAmount);
  //       if (inBBN.isNaN()) return new Error("Invalid amount");
  //       const inBBI = BigInt(
  //         inBBN.multipliedBy(10 ** token.decimals).toFixed()
  //       );
  //       const Trader_swapBForAR = await ci.Trader_swapBForA(1, inBBI, 0);
  //       console.log({ Trader_swapBForAR });
  //       if (!Trader_swapBForAR.success)
  //         return new Error("Swap simulation failed");
  //       const [outA] = Trader_swapBForAR.returnValue;
  //       //const outASl = Math.round(Number(outA) * 0.995);
  //       const outASl = outA;
  //       const builder = makeBuilder(poolId, tokA, tokB);
  //       const poolAddr = algosdk.getApplicationAddress(poolId);
  //       const buildN = [];
  //       let extraPaymentAmount = 28500;
  //       if (ensureTokABalance) {
  //         extraPaymentAmount += 28500;
  //         buildN.push(
  //           builder.arc200.tokA.arc200_transfer(activeAccount.address, 0)
  //         );
  //       }
  //       if (ensureTokBApproval) {
  //         extraPaymentAmount += 28100; // 0.0281 NT to approve tokB spend in pool
  //         buildN.push(builder.arc200.tokB.arc200_approve(poolAddr, 0));
  //       }
  //       buildN.push(builder.arc200.tokB.arc200_approve(poolAddr, inBBI));
  //       buildN.push(builder.pool.Trader_swapBForA(0, inBBI, outASl));
  //       if (token2.tokenId === 0) {
  //         extraPaymentAmount += 28500; // 0.0285 NT to burn wNT
  //         buildN.push(builder.arc200.tokA.withdraw(outA));
  //       }
  //       const buildP = (await Promise.all(buildN)).map((res: any) => res.obj);
  //       console.log("extraPaymentAmount", extraPaymentAmount);
  //       let customR;
  //       if (token2.tokenId === 0) {
  //         const ci = makeCi(tokB);
  //         ci.setPaymentAmount(extraPaymentAmount);
  //         ci.setFee(4000);
  //         ci.setAccounts([poolAddr]);
  //         ci.setEnableGroupResourceSharing(true);
  //         ci.setExtraTxns(buildP);
  //         customR = await ci.custom();
  //       } else {
  //         ci.setFee(4000);
  //         ci.setPaymentAmount(extraPaymentAmount);
  //         ci.setAccounts([poolAddr]);
  //         ci.setEnableGroupResourceSharing(true);
  //         ci.setExtraTxns(buildP);
  //         customR = await ci.custom();
  //       }
  //       console.log({ customR });
  //       if (!customR.success) return new Error("Swap group simulation failed");
  //       const custom = await toast.promise(
  //         signTransactions(
  //           customR.txns.map(
  //             (t: string) => new Uint8Array(Buffer.from(t, "base64"))
  //           )
  //         ).then(sendTransactions),
  //         {
  //           pending: `Swap ${fromAmount} ${tokenSymbol(
  //             token
  //           )} -> ${toAmount} ${tokenSymbol(token2)}`,
  //           //success: `Swap successful!`,
  //         },
  //         {
  //           type: "default",
  //           position: "top-center",
  //           theme: isDarkTheme ? "dark" : "light",
  //           autoClose: 3000,
  //           hideProgressBar: true,
  //         }
  //       );
  //       const statusR = await algodClient.status().do();
  //       const lastRound = statusR["last-round"];
  //       const ciArc200 = new arc200(tokA, algodClient, indexerClient);
  //       const arc200_TransferR = await ciArc200.arc200_Transfer({
  //         minRound: lastRound - 10,
  //       });
  //       const lastTransfer = arc200_TransferR.filter(
  //         (evt: any) =>
  //           evt[3] === algosdk.getApplicationAddress(poolId) &&
  //           evt[4] === activeAccount.address
  //       );
  //       if (!lastTransfer) return;
  //       const inAmtBi: any = inBBI;
  //       const inAmtBn = new BigNumber(inAmtBi).div(
  //         new BigNumber(10).pow(token.decimals)
  //       );
  //       const swapIn = inAmtBn.toFixed(token.decimals);
  //       const outAmtBi: any = lastTransfer[0][5];
  //       const outAmtBn = new BigNumber(outAmtBi).div(
  //         new BigNumber(10).pow(token2.decimals)
  //       );
  //       const swapOut = outAmtBn.toFixed(token2.decimals);
  //       setPool(pool);
  //       setSwapIn(swapIn);
  //       setSwapOut(swapOut);
  //       setTokIn(tokenSymbol(token));
  //       setTokOut(tokenSymbol(token2));
  //       setSwapModalOpen(true);
  //       setTxId(custom.id);
  //     }
  //   } catch (e: any) {
  //     toast.error(e.message);
  //     console.log(e.message);
  //   } finally {
  //     setOn(false);
  //   }
  // };

  const isLoading = !pools || !tokens;

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
          />
        </SwapContainer>
        <SummaryContainer>
          <RateContainer>
            <RateLabel className={isDarkTheme ? "dark" : "light"}>
              Rate
            </RateLabel>
            <RateValue>
              <RateMain className={isDarkTheme ? "dark" : "light"}>
                1 {tokenSymbol(token)} = {rate?.toFixed(token2?.decimals)}{" "}
                {tokenSymbol(token2)}
              </RateMain>
              <RateSub>
                {tokenSymbol(token2)} = {invRate?.toFixed(token?.decimals)}{" "}
                {tokenSymbol(token)}
              </RateSub>
            </RateValue>
          </RateContainer>
          <BreakdownContainer>
            <BreakdownStack>
              <BreakdownRow>
                <BreakdownLabel className={isDarkTheme ? "dark" : "light"}>
                  <span>Pool balance</span>
                  <InfoCircleIcon />
                </BreakdownLabel>
                <BreakdownValueContiner>
                  <BreakdownValue className={isDarkTheme ? "dark" : "light"}>
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
                  <BreakdownValue className={isDarkTheme ? "dark" : "light"}>
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
                  <BreakdownValue className={isDarkTheme ? "dark" : "light"}>
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
                  <BreakdownValue className={isDarkTheme ? "dark" : "light"}>
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
                  <BreakdownValue className={isDarkTheme ? "dark" : "light"}>
                    {minRecieved} {token2?.symbol}
                  </BreakdownValue>
                </BreakdownValueContiner>
              </BreakdownRow>
            </BreakdownStack>
          </BreakdownContainer>
        </SummaryContainer>
        <Button
          className={isValid ? "active" : undefined}
          onClick={() => {
            if (!on) {
              handleSwap();
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
              Swap in progress
            </div>
          )}
        </Button>
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
    </>
  ) : null;
};

export default Swap;
