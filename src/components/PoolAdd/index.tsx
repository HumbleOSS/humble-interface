import styled from "@emotion/styled";
import React, { FC, useEffect, useMemo, useState } from "react";
import SwapIcon from "static/icon/icon-swap-stable-light.svg";
import ActiveSwapIcon from "static/icon/icon-swap-active-light.svg";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import { CircularProgress, Stack } from "@mui/material";
import { CONTRACT, abi, arc200, swap } from "ulujs";
import { NETWORK_TOKEN, TOKEN_VIA, TOKEN_WVOI1 } from "../../constants/tokens";
import { getAlgorandClients } from "../../wallets";
import TokenInput from "../TokenInput";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ARC200TokenI, PoolI } from "../../types";
import { getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getPools } from "../../store/poolSlice";
import algosdk, { decodeAddress } from "algosdk";
import { toast } from "react-toastify";
import axios from "axios";
import { hasAllowance } from "ulujs/types/arc200";
import { tokenId, tokenSymbol } from "../../utils/dex";
import BigNumber from "bignumber.js";
import { Asset } from "ulujs/types/swap";
import { QUEST_ACTION, getActions, submitAction } from "../../config/quest";
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
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24.5342 51V19"
        stroke="white"
        stroke-width="3"
        strokeLinecap="round"
        strokeLinejoin="round"
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
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24.5342 51V19"
        stroke="#141010"
        stroke-width="3"
        strokeLinecap="round"
        strokeLinejoin="round"
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
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.2104 13.3828L23.1078 15.2801L25.0051 13.3828"
        stroke="white"
        stroke-width="1.63562"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.0966 14.5293V11.9996C23.0966 6.41666 18.5714 1.90234 12.9994 1.90234C9.81541 1.90234 6.96943 3.38534 5.11572 5.68611"
        stroke="white"
        stroke-width="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.90234 9.4707V12.0005C2.90234 17.5834 7.42756 22.0977 12.9996 22.0977C16.1836 22.0977 19.0296 20.6147 20.8833 18.3139"
        stroke="white"
        stroke-width="3"
        strokeLinecap="round"
        strokeLinejoin="round"
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
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8V11.3333"
        stroke="white"
        stroke-width="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.99634 5.33301H8.00233"
        stroke="white"
        stroke-width="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Swap = () => {
  const navigate = useNavigate();
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
  const paramNewPool = sp.get("newPool");
  //const paramTokenId = sp.get("tokenId");

  /* Wallet */
  const {
    //providers,
    activeAccount,
    signTransactions,
    //sendTransactions,
    //getAccountInfo,
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

  // EFFECT: set tokens from param pool id
  useEffect(() => {
    if (!pools || !tokens || pool) return;
    if (paramPoolId) {
      const pool = pools.find((p: PoolI) => `${p.poolId}` === `${paramPoolId}`);
      if (pool) {
        const token = [TOKEN_WVOI1].includes(pool.tokA)
          ? NETWORK_TOKEN.VOI
          : tokens.find((t: ARC200TokenI) => `${t.tokenId}` === `${pool.tokA}`);
        const token2 = [TOKEN_WVOI1].includes(pool.tokB)
          ? NETWORK_TOKEN.VOI
          : tokens.find((t: ARC200TokenI) => `${t.tokenId}` === `${pool.tokB}`);
        setToken(token);
        setToken2(token2);
      } else {
        const { algodClient, indexerClient } = getAlgorandClients();
        new swap(Number(paramPoolId), algodClient, indexerClient)
          .Info()
          .then((infoR) => {
            if (infoR.success) {
              const pool = infoR.returnValue;
              const token = [TOKEN_WVOI1].includes(pool.tokA)
                ? NETWORK_TOKEN.VOI
                : tokens.find(
                    (t: ARC200TokenI) => `${t.tokenId}` === `${pool.tokA}`
                  );
              const token2 = [TOKEN_WVOI1].includes(pool.tokB)
                ? NETWORK_TOKEN.VOI
                : tokens.find(
                    (t: ARC200TokenI) => `${t.tokenId}` === `${pool.tokB}`
                  );
              setToken(token);
              setToken2(token2);
            }
          });
      }
    }
  }, [pools, tokens, pools, paramPoolId, paramNewPool]);

  // EFFECT
  useEffect(() => {
    if (
      !tokens ||
      !pools
      //|| pools.length === 0
    )
      return;
    const newTokens = new Set<number>();
    for (const pool of pools) {
      newTokens.add(pool.tokA);
      newTokens.add(pool.tokB);
    }
    const poolTokens = Array.from(newTokens);
    setTokenOptions([
      NETWORK_TOKEN.VOI,
      ...tokens.filter((t: ARC200TokenI) => poolTokens.includes(t.tokenId)),
    ]);
  }, [tokens, pools]);

  // EFFECT: get eligible pools
  const eligiblePools = useMemo(() => {
    if (!pool || !token || !token2) return [];
    if (paramNewPool === "true") {
    } else {
      return pools.filter((p: PoolI) => {
        return (
          [p.tokA, p.tokB].includes(tokenId(token)) &&
          [p.tokA, p.tokB].includes(tokenId(token2)) &&
          p.tokA !== p.tokB
        );
      });
    }
  }, [pools, token, token2, paramNewPool, paramPoolId]);

  console.log("eligiblePools", eligiblePools);

  // EFFECT
  useEffect(() => {
    if (!paramPoolId || !pools || !eligiblePools) return;
    if (paramPoolId) {
      const pool = pools.find((p: PoolI) => `${p.poolId}` === `${paramPoolId}`);
      if (pool) {
        setPool({ ...pool, poolId: Number(paramPoolId) });
        setReady(true);
        if (eligiblePools.length > 0) {
          const { algodClient, indexerClient } = getAlgorandClients();
          new swap(0, algodClient, indexerClient)
            .selectPool(eligiblePools, null, null, "poolId")
            .then((pool: any) => {
              if (!pool || `${pool.poolId}` === `${paramPoolId}`) return;
              navigate(`/pool/add?poolId=${pool.poolId}`);
            });
        }
      } else {
        const { algodClient, indexerClient } = getAlgorandClients();
        new swap(Number(paramPoolId), algodClient, indexerClient)
          .Info()
          .then((infoR) => {
            if (infoR.success) {
              const info = infoR.returnValue;
              const pool = {
                ...infoR.returnValue,
                poolId: Number(paramPoolId),
              };
              setPool(pool);
              //setInfo(infoR.returnValue);
              setReady(true);
            }
          });
      }
    }
  }, [pools, paramPoolId, eligiblePools]);

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
    if (!info || !token || !token2 || paramNewPool === "true") return;
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
      !info ||
      paramNewPool === "true"
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
  }, [rate, fromAmount, toAmount, focus, token, token2, info, paramNewPool]);

  // EFFECT
  useEffect(() => {
    if (
      !pool ||
      !token ||
      !token2 ||
      !toAmount ||
      focus !== "to" ||
      !info ||
      paramNewPool === "true"
    )
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
        if (r.success) {
          const fromAmount = (
            Number(r.returnValue[0]) /
            10 ** token2.decimals
          ).toLocaleString();
          setFromAmount(fromAmount);
        }
      });
    } else if (token.tokenId === pool?.tokB) {
      ci.Trader_swapAForB(
        1,
        Number(fromAmount.replace(",", "")) * 10 ** token.decimals,
        0
      ).then((r: any) => {
        if (r.success) {
          const fromAmount = (
            Number(r.returnValue[1]) /
            10 ** token.decimals
          ).toLocaleString();
          setFromAmount(fromAmount);
        }
      });
    }
  }, [pool, token, token2, toAmount, focus, paramNewPool]);

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
    if (!token || paramNewPool === "true") return;
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

  // EFFECT: resets to amount
  useEffect(() => {
    if (!token2) return;
    setToAmount("");
  }, [token2]);

  const [tokens2, setTokens] = React.useState<any[]>();
  useEffect(() => {
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?includes=all`
      )
      .then((res) => {
        setTokens(res.data.tokens);
      });
  }, []);

  // EFFECT: set balance
  useEffect(() => {
    if (!token || !activeAccount || !tokens2) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const wrappedTokenId = Number(
      tokens2.find((t) => t.contractId === token.tokenId)?.tokenId
    );
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
  }, [token, activeAccount, tokens2]);

  // EFFECT: set balance ii
  useEffect(() => {
    if (!token2 || !activeAccount || !tokens2) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new arc200(token2.tokenId, algodClient, indexerClient);
    const wrappedTokenId = Number(
      tokens2.find((t) => t.contractId === token2.tokenId)?.tokenId
    );
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
  }, [token2, activeAccount, tokens2]);

  // EFFECT: get voi balance
  useEffect(() => {
    if (activeAccount) {
      // && providers && providers.length >= 3) {
      const { algodClient } = getAlgorandClients();
      algodClient
        .accountInformation(activeAccount.address)
        .do()
        .then(setAccInfo);
    }
  }, [activeAccount]);

  const isValid = useMemo(() => {
    return true;
    /*
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
    */
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
    if (!isValid || !token || !token2 || !pool || !tokens2 || !tokens) return;
    if (!activeAccount) {
      toast.info("Please connect your wallet first");
      return;
    }
    try {
      setOn(true);

      setProgress(25);
      setmessage("Building transactions");

      const { algodClient, indexerClient } = getAlgorandClients();
      await new Promise((res) => setTimeout(res, 1000));

      const acc = {
        addr: activeAccount?.address || "",
        sk: new Uint8Array(0),
      };
      const ci = new swap(pool.poolId, algodClient, indexerClient, { acc });

      const networkToken = {
        contractId: TOKEN_WVOI1,
        tokenId: "0",
        decimals: "6",
        symbol: "VOI",
      };

      const mA =
        token.tokenId === 0
          ? networkToken
          : tokens2.find((t) => t.contractId === tokenId(token));

      const mB =
        token2.tokenId === 0
          ? networkToken
          : tokens2.find((t) => t.contractId === tokenId(token2));

      const A = {
        ...mA,
        amount: fromAmount.replace(/,/g, ""),
      };
      const B = {
        ...mB,
        amount: toAmount.replace(/,/g, ""),
      };

      console.log({ A, B, acc, pool });

      const swapR = await ci.deposit(acc.addr, pool.poolId, A, B, [], {
        debug: true
      });

      if (!swapR.success) {
        return new Error("Add liquidity group simulation failed");
      }

      setProgress(50);
      setmessage("Signing transaction");

      // await toast.promise(
      //   signTransactions(
      //     swapR.txns.map(
      //       (t: string) => new Uint8Array(Buffer.from(t, "base64"))
      //     )
      //   ).then(sendTransactions),
      //   {
      //     pending: `Add liquidity ${fromAmount} ${tokenSymbol(
      //       token
      //     )} -> ${toAmount} ${tokenSymbol(token2)}`,
      //     success: `Add liquidity successful!`,
      //   },
      //   {
      //     type: "default",
      //     position: "top-center",
      //     theme: "dark",
      //   }
      // );
      const stxns = await //await toast.promise(
      signTransactions(
        swapR.txns.map((t: string) => new Uint8Array(Buffer.from(t, "base64")))
      );
      //);
      //   .then((sxns) => {
      //     const { algodClient } = getAlgorandClients();
      //     return Promise.all(
      //       sxns.map((txn) =>
      //         algodClient.sendRawTransaction(txn as Uint8Array).do(0)
      //       )
      //     );
      //   }),
      //   {
      //     pending: `Add liquidity ${fromAmount} ${tokenSymbol(
      //       token
      //     )} -> ${toAmount} ${tokenSymbol(token2)}`,
      //     success:
      //       paramNewPool !== "true" ? `Add liquidity successful!` : undefined,
      //   },
      //   {
      //     type: "default",
      //     position: "top-right",
      //     theme: "dark",
      //   }
      // );

      console.log({ stxns });

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      setProgress(75);
      setmessage("Confirming transactions");

      // const res = await sendTransactions(stxns);

      // -----------------------------------------
      // QUEST HERE hmbl_pool_add
      // -----------------------------------------
      do {
        const address = activeAccount.address;
        const actions: string[] = [QUEST_ACTION.ADD_LIQUIDITY];
        (async () => {
          const {
            data: { results },
          } = await getActions(address);
          for (const action of actions) {
            const address = activeAccount.address;
            const key = `${action}:${address}`;
            const completedAction = results.find((el: any) => el.key === key);
            if (!completedAction) {
              await submitAction(action, address, {
                poolId: pool.poolId,
              });
            }
            // TODO notify quest completion here
          }
        })();
      } while (0);
      if (paramNewPool === "true") {
        do {
          const { data } = await axios.get(
            `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools?contractId=${pool.poolId}`
          );
          if (data.pools.length > 0) break;
          await new Promise((res) => setTimeout(res, 4000));
        } while (1);
      }
      if (paramNewPool === "true") {
        navigate(`/pool?filter=${token.symbol}`);
      } else {
        setFromAmount("0");
      }
      // -----------------------------------------
    } catch (e: any) {
      toast.error(e.message);
      console.error(e);
    } finally {
      setOn(false);
      setProgress(0);
      setmessage("");
    }
  };

  const isLoading = !pools || !tokens;

  const [message, setmessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (progress === 0 || progress >= 100) return;
    const timeout = setTimeout(() => {
      setProgress(progress + 1);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [progress]);

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
        {
          /*!on ? (*/
          buttonLabel
          /*) : (
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
          )*/
        }
      </Button>
      <ProgressBar
        message={message}
        isActive={![0, 100].includes(progress)}
        currentStep={progress}
        totalSteps={100}
      />
    </SwapRoot>
  ) : null;
};

export default Swap;
