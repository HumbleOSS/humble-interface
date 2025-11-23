import styled from "@emotion/styled";
import React, { FC, useEffect, useMemo, useState } from "react";
import SwapIcon from "static/icon/icon-swap-stable-light.svg";
import ActiveSwapIcon from "static/icon/icon-swap-active-light.svg";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import { CircularProgress, Stack, Dialog, Skeleton } from "@mui/material";
import { CONTRACT, abi, arc200, swap } from "ulujs";
import { NETWORK_TOKEN, TOKEN_VIA, TOKEN_WVOI1 } from "../../constants/tokens";
import { getAlgorandClients } from "../../wallets";
import TokenInput from "../TokenInput";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ARC200TokenI, PoolI } from "../../types";
import { getTokens, getTokensWithTickers } from "../../store/tokenSlice";
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
import { getAsaIdFromArc200Contract } from "@/config/arc200AsaMapping";

/**
 * Formats a number or string number into a human-readable format with commas and appropriate decimal places
 * @param value - The number or string number to format
 * @param maxDecimals - Maximum number of decimal places to show (default: 6)
 * @returns Formatted string number
 */
export const formatNumber = (
  value: string | number,
  maxDecimals: number = 6
): string => {
  // Handle empty/invalid input
  if (!value && value !== 0) return "-";

  // Convert to string and remove existing commas
  const stringValue = value.toString().replace(/,/g, "");

  // Parse number
  const number = parseFloat(stringValue);

  // Handle invalid numbers
  if (isNaN(number)) return "-";

  // Split into integer and decimal parts
  const [integerPart, decimalPart] = stringValue.split(".");

  // Format integer part with commas
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Handle decimal part if it exists
  if (decimalPart) {
    const trimmedDecimal = decimalPart.slice(0, maxDecimals);
    return `${formattedInteger}.${trimmedDecimal}`;
  }

  return formattedInteger;
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

const SwapRoot = styled.div<{ isLoading?: boolean }>`
  display: flex;
  padding: var(--Spacing-1000, 40px);
  flex-direction: column;
  align-items: center;
  gap: var(--Spacing-800, 24px);
  border-radius: var(--Radius-800, 24px);
  opacity: ${(props) => (props.isLoading ? 0.5 : 1)};
  pointer-events: ${(props) => (props.isLoading ? "none" : "auto")};
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

const Button = styled(BaseButton)<{ isDark?: boolean }>`
  display: flex;
  padding: var(--Spacing-700, 16px) var(--Spacing-800, 24px);
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: var(--Radius-750, 20px);
  background: var(--Color-Accent-Disabled-Soft, #d8d8e1);
  color: ${(props) => (props.isDark ? "#fff" : "#141010")};
  &.active {
    border-radius: var(--Radius-700, 16px);
    background: var(--Color-Accent-CTA-Background-Default, #2958ff);
  }
  &.loading {
    opacity: 0.8;
    cursor: not-allowed;
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

const ConfirmationModal = styled.div<{ isDark: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  border-radius: 24px;
  background: ${(props) => (props.isDark ? "#070709" : "#fff")};
  color: ${(props) => (props.isDark ? "#fff" : "#0c0c10")};

  @media screen and (max-width: 600px) {
    padding: 16px;
    max-width: 90%;
    gap: 16px;
  }
`;

const ModalTitle = styled.div<{ isDark: boolean }>`
  font-family: "Plus Jakarta Sans";
  font-size: 24px;
  font-weight: 700;
  color: ${(props) => (props.isDark ? "#fff" : "#0c0c10")};
  margin-bottom: 8px;

  @media screen and (max-width: 600px) {
    font-size: 20px;
    margin-bottom: 4px;
  }
`;

const ModalContent = styled.div<{ isDark: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
  border-top: 1px solid
    ${(props) => (props.isDark ? "rgba(255, 255, 255, 0.1)" : "#D8D8E1")};
  border-bottom: 1px solid
    ${(props) => (props.isDark ? "rgba(255, 255, 255, 0.1)" : "#D8D8E1")};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 8px;
`;

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
    // Use getTokensWithTickers to ensure tokens are loaded with all data
    dispatch(getTokensWithTickers() as unknown as UnknownAction);
  }, [dispatch]);

  console.log("tokens", tokens, tokenStatus);

  /* Pools */
  const pools: PoolI[] = useSelector((state: RootState) => state.pools.pools);
  const poolsStatus = useSelector((state: RootState) => state.pools.status);
  useEffect(() => {
    dispatch(getPools() as unknown as UnknownAction);
  }, [dispatch]);

  console.log("pools", pools, poolsStatus);

  const [tokens2, setTokens] = React.useState<any[]>();
  // EFFECT: set tokens2
  useEffect(() => {
    axios.get(`https://humble-api.voi.nautilus.sh/tokens`).then((res) => {
      // Map the new API structure to the expected format
      const mappedTokens = res.data.tokens.map((t: any) => {
        const assetId = Number(t.assetId);
        const isVOI = assetId === 0 || assetId === 390001;
        return {
          ...t,
          contractId: assetId,
          tokenId: assetId,
          symbol: t.unitName || t.symbol,
          decimals: Number(t.decimals),
          verified: isVOI ? 2 : 1, // 2 = trusted (gold badge), 1 = verified
        };
      });
      setTokens(mappedTokens);
    });
  }, []);

  console.log("tokens2", tokens2);

  /* Params */
  const [sp] = useSearchParams();
  const paramPoolId = sp.get("poolId");
  const paramNewPool = sp.get("newPool");
  //const paramTokenId = sp.get("tokenId");

  /* Wallet */
  const { activeAccount, signTransactions } = useWallet();

  const [pool, setPool] = useState<PoolI>();
  const [ready, setReady] = useState<boolean>(false);

  const [accInfo, setAccInfo] = React.useState<any>(null);
  const [focus, setFocus] = useState<"from" | "to">("from");
  const [fromAmount, setFromAmount] = React.useState<any>("");
  const [toAmount, setToAmount] = React.useState<any>("");
  const [on, setOn] = useState(false);

  const [token, setToken] = useState<ARC200TokenI>();
  const [token2, setToken2] = useState<ARC200TokenI>();

  console.log({
    token,
    token2,
  });

  const [tokenOptions, setTokenOptions] = useState<ARC200TokenI[]>();
  const [tokenOptions2, setTokenOptions2] = useState<ARC200TokenI[]>();
  const [balance, setBalance] = React.useState<string>();
  const [balance2, setBalance2] = React.useState<string>();

  // EFFECT: set tokens from param pool id
  useEffect(() => {
    // Only set tokens from pool if we have pools, tokens, and paramPoolId, but tokens aren't set yet
    if (!pools || !tokens || pools.length === 0 || tokens.length === 0) return;
    if (!paramPoolId) return;
    // Don't override if tokens are already set (unless they're undefined)
    if (token && token2) return;

    const foundPool = pools.find(
      (p: PoolI) => `${p.poolId}` === `${paramPoolId}`
    );
    if (foundPool) {
      const newToken = [TOKEN_WVOI1, 0].includes(foundPool.tokA)
        ? { ...NETWORK_TOKEN.VOI, contractId: TOKEN_WVOI1 }
        : tokens.find(
            (t: ARC200TokenI) =>
              `${t.tokenId}` === `${foundPool.tokA}` ||
              `${t.contractId}` === `${foundPool.tokA}`
          );
      if (newToken && !token) {
        setToken(newToken);
      }

      const newToken2 = [TOKEN_WVOI1, 0].includes(foundPool.tokB)
        ? { ...NETWORK_TOKEN.VOI, contractId: TOKEN_WVOI1 }
        : tokens.find(
            (t: ARC200TokenI) =>
              `${t.tokenId}` === `${foundPool.tokB}` ||
              `${t.contractId}` === `${foundPool.tokB}`
          );
      if (newToken2 && !token2) {
        setToken2(newToken2);
      }
    } else {
      const { algodClient, indexerClient } = getAlgorandClients();
      new swap(Number(paramPoolId), algodClient, indexerClient)
        .Info()
        .then((infoR) => {
          if (infoR.success) {
            const pool = infoR.returnValue;
            const newToken = [TOKEN_WVOI1, 0].includes(pool.tokA)
              ? { ...NETWORK_TOKEN.VOI, contractId: TOKEN_WVOI1 }
              : tokens.find(
                  (t: ARC200TokenI) =>
                    `${t.tokenId}` === `${pool.tokA}` ||
                    `${t.contractId}` === `${pool.tokA}`
                );
            const newToken2 = [TOKEN_WVOI1, 0].includes(pool.tokB)
              ? { ...NETWORK_TOKEN.VOI, contractId: TOKEN_WVOI1 }
              : tokens.find(
                  (t: ARC200TokenI) =>
                    `${t.tokenId}` === `${pool.tokB}` ||
                    `${t.contractId}` === `${pool.tokB}`
                );
            if (newToken && !token) {
              setToken(newToken);
            }
            if (newToken2 && !token2) {
              setToken2(newToken2);
            }
          }
        });
    }
  }, [pools, tokens, paramPoolId, paramNewPool, token, token2]);

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
        contractId: TOKEN_WVOI1, // Use 390001 internally for contractId
        name: "Voi",
        symbol: "VOI",
        decimals: 6,
        totalSupply: BigInt(10_000_000_000 * 1e6),
      },
      ...tokens.filter(
        (t: ARC200TokenI) =>
          t.tokenId !== undefined &&
          (poolTokens.includes(t.tokenId) ||
            (t.contractId !== undefined &&
              poolTokens.includes(t.contractId))) &&
          !["VOI", "wVOI"].includes(t.symbol)
      ),
    ].filter((t: ARC200TokenI) => {
      // Always include VOI unless token2 is actually VOI
      if (t.tokenId === 0 && t.symbol === "VOI") {
        // Only filter out VOI if token2 is also VOI (check both tokenId and contractId)
        if (token2?.tokenId === 0 || token2?.contractId === TOKEN_WVOI1) {
          return false;
        }
        return true;
      }
      // Filter out wVOI and tokens that match token2
      return (
        t.symbol !== "wVOI" &&
        t.tokenId !== token2?.tokenId &&
        t.contractId !== token2?.contractId
      );
    });
    tokenOptions.sort((a, b) => (a.tokenId ?? 0) - (b.tokenId ?? 0));
    setTokenOptions(tokenOptions);
  }, [token2, tokens, pools]);

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

  // EFFECT: set pool
  useEffect(() => {
    if (!paramPoolId || !pools || !eligiblePools) return;
    if (paramPoolId) {
      const pool = pools.find((p: PoolI) => `${p.poolId}` === `${paramPoolId}`);
      if (pool) {
        setPool({ ...pool, poolId: Number(paramPoolId) });
        setReady(true);
        if (eligiblePools.length > 1) {
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
              setInfo(infoR.returnValue);
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
    const ci = new swap(pool.poolId, algodClient, indexerClient);
    ci.Info()
      .then((infoR: any) => {
        if (infoR.success) {
          setInfo(infoR.returnValue);
        } else {
          console.error("Failed to fetch pool info:", infoR);
          setInfo(undefined);
        }
      })
      .catch((error: any) => {
        console.error("Error fetching pool info:", error);
        setInfo(undefined);
      });
  }, [pool, on]);

  console.log("info", info);

  const [poolBalance, setPoolBalance] = useState<BigInt>();

  // EFFECT: set pool balance
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

  // EFFECT: set pool share
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
  const [newPoolShare, setNewPoolShare] = useState<string>();

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

  const rate = useMemo(() => {
    if (!info || !token || !token2 || paramNewPool === "true") {
      console.log("Rate calculation skipped:", {
        info: !!info,
        token: !!token,
        token2: !!token2,
        paramNewPool,
      });
      return;
    }
    if (!info.poolBals || !info.poolBals.A || !info.poolBals.B) {
      console.log("Rate calculation skipped: missing poolBals", {
        poolBals: info.poolBals,
      });
      return;
    }

    // Get ratio directly from poolBals A and B, normalized using decimals
    // poolBals are in smallest units, so normalize by dividing by 10^decimals
    const poolBalsA = info.poolBals.A;
    const poolBalsB = info.poolBals.B;

    // Helper function to compare token IDs (handles VOI/wVOI mapping)
    const tokenIdsMatch = (id1: number | string, id2: number | string) => {
      const num1 = Number(id1);
      const num2 = Number(id2);
      // Handle VOI/wVOI: 0 and 390001 are considered the same
      if (
        (num1 === 0 || num1 === TOKEN_WVOI1) &&
        (num2 === 0 || num2 === TOKEN_WVOI1)
      ) {
        return true;
      }
      return num1 === num2;
    };

    // Determine which token corresponds to which pool balance
    const tokenIdValue = tokenId(token);
    const isTokenA = tokenIdsMatch(info.tokA, tokenIdValue);
    const isTokenB = tokenIdsMatch(info.tokB, tokenIdValue);

    // if (!isTokenA && !isTokenB) {
    //   console.warn("Rate calculation: token doesn't match pool tokens", {
    //     tokenId: tokenIdValue,
    //     infoTokA: info.tokA,
    //     infoTokB: info.tokB,
    //     token: token,
    //   });
    //   return;
    // }

    // Normalize pool balances using decimals
    // If token matches tokA: poolBals.A uses token.decimals, poolBals.B uses token2.decimals
    // If token matches tokB: poolBals.B uses token.decimals, poolBals.A uses token2.decimals
    let normalizedTokenBalance: number;
    let normalizedToken2Balance: number;

    // if (isTokenA) {
      // token is tokA, so poolBals.A is for token, poolBals.B is for token2
      normalizedTokenBalance = new BigNumber(poolBalsA)
        .div(new BigNumber(10).pow(token.decimals))
        .toNumber();
      normalizedToken2Balance = new BigNumber(poolBalsB)
        .div(new BigNumber(10).pow(token2.decimals))
        .toNumber();
    // } else {
    //   // token is tokB, so poolBals.B is for token, poolBals.A is for token2
    //   normalizedTokenBalance = new BigNumber(poolBalsB)
    //     .div(new BigNumber(10).pow(token.decimals))
    //     .toNumber();
    //   normalizedToken2Balance = new BigNumber(poolBalsA)
    //     .div(new BigNumber(10).pow(token2.decimals))
    //     .toNumber();
    // }

    // Calculate ratio: how much token2 per 1 token (using normalized pool balances)
    if (
      normalizedTokenBalance === 0 ||
      !isFinite(normalizedTokenBalance) ||
      !isFinite(normalizedToken2Balance)
    ) {
      console.warn("Rate calculation: invalid normalized balances", {
        normalizedTokenBalance,
        normalizedToken2Balance,
      });
      return;
    }

    const calculatedRate = normalizedToken2Balance / normalizedTokenBalance;
    if (!isFinite(calculatedRate)) {
      console.warn("Rate calculation: invalid rate result", { calculatedRate });
      return;
    }

    return calculatedRate;
  }, [info, token, token2, paramNewPool]);

  console.log("rate", rate);

  const invRate = useMemo(() => {
    if (!rate) return;
    return 1 / rate;
  }, [rate, token2]);

  console.log("invRate", invRate);

  // EFFECT: Auto-adjust inputs based on pool balance ratio
  useEffect(() => {
    if (
      !rate ||
      !invRate ||
      !focus ||
      !token ||
      !token2 ||
      !info ||
      paramNewPool === "true"
    )
      return;
    if (info.poolBals.A === BigInt(0) || info.poolBals.B === BigInt(0)) return;

    // Only adjust when user is typing in one field
    if (focus === "from" && fromAmount) {
      const fromAmountBN = new BigNumber(fromAmount.replace(/,/g, ""));
      if (fromAmountBN.isNaN() || fromAmountBN.isZero()) {
        setToAmount("");
        return;
      }
      const calculatedToAmount = fromAmountBN
        .multipliedBy(rate)
        .decimalPlaces(token2.decimals);
      setToAmount(calculatedToAmount.toFormat());
    } else if (focus === "to" && toAmount) {
      const toAmountBN = new BigNumber(toAmount.replace(/,/g, ""));
      if (toAmountBN.isNaN() || toAmountBN.isZero()) {
        setFromAmount("");
        return;
      }
      const calculatedFromAmount = toAmountBN
        .multipliedBy(invRate)
        .decimalPlaces(token.decimals);
      setFromAmount(calculatedFromAmount.toFormat());
    }
  }, [
    rate,
    invRate,
    fromAmount,
    toAmount,
    focus,
    token,
    token2,
    info,
    paramNewPool,
  ]);

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

  // EFFECT: update tokenOptions2 on token change
  useEffect(() => {
    if (!token || !token || paramNewPool === "true") return;
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
    console.log("tokenOptions2", tokenOptions2);
    // check if token options includes wVOI
    if (tokenOptions2.find((t: ARC200TokenI) => t?.tokenId === TOKEN_WVOI1)) {
      setTokenOptions2(
        [netToken, ...tokenOptions2].filter(
          (t: ARC200TokenI) => t?.tokenId !== TOKEN_WVOI1
        )
      );
    } else {
      setTokenOptions2(
        tokenOptions2.filter((t: ARC200TokenI) => t?.tokenId !== TOKEN_WVOI1)
      );
    }

    const tokenOption2Includes = tokenOptions2
      .map((t: ARC200TokenI) => t?.tokenId)
      .includes(tokenId(token2));

    if (!tokenOption2Includes) {
      if (tokenOptions2.map((t: ARC200TokenI) => t?.tokenId).includes(0)) {
        setToken2(netToken);
      } else {
        setToken2(Array.from(options)[0]);
      }
    }
    setToAmount("0");
    setFromAmount("0");
  }, [tokens, token, pools]);

  // EFFECT: resets to amount
  useEffect(() => {
    if (!token2) return;
    setToAmount("");
  }, [token2]);

  // EFFECT: set balance
  useEffect(() => {
    if (!token || !activeAccount || !tokens2) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    // Use contractId if available, otherwise use tokenId for ARC200 calls
    const tokenIdToUse = token.contractId ?? token.tokenId;
    // For ASAs, use tokenId directly as it's the ASA asset ID
    // For other types, try to find it from tokens2, but fall back to tokenId
    const wrappedTokenId =
      token.assetType === "asa"
        ? Number(token.tokenId)
        : Number(
            tokens2.find((t) => t.contractId === tokenIdToUse)?.tokenId ||
              token.tokenId
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
              // set balance in case of arc200 tokens that manage standard assets like new unit
              const decimals = assetInfo.asset.params.decimals;
              const balance1Bi = BigInt(accAssetInfo["asset-holding"].amount);
              const ci = new arc200(tokenIdToUse, algodClient, indexerClient);
              ci.arc200_balanceOf(activeAccount.address).then((r: any) => {
                if (r.success) {
                  const balance2Bi = BigInt(r.returnValue);
                  const balance = new BigNumber(
                    (balance1Bi + balance2Bi).toString()
                  ).dividedBy(new BigNumber(10).pow(decimals));
                  setBalance(balance.toFixed(decimals));
                }
              });
            });
        })
        .catch((e: any) => {
          const ci = new arc200(tokenIdToUse, algodClient, indexerClient);
          ci.arc200_decimals().then((r: any) => {
            if (r.success) {
              const decimals = Number(r.returnValue);
              ci.arc200_balanceOf(activeAccount.address).then((r: any) => {
                if (r.success) {
                  const balance2Bi = BigInt(r.returnValue);
                  const balance = new BigNumber(
                    balance2Bi.toString()
                  ).dividedBy(new BigNumber(10).pow(decimals));
                  setBalance(balance.toFixed(decimals));
                }
              });
            }
          });
        });
    } else {
      const ci = new arc200(Number(tokenIdToUse), algodClient, indexerClient);
      ci.arc200_balanceOf(activeAccount.address).then(
        (arc200_balanceOfR: any) => {
          if (arc200_balanceOfR.success) {
            const arc200_balanceOf = arc200_balanceOfR.returnValue;
            const balanceBn = new BigNumber(arc200_balanceOf);
            const balanceStr = balanceBn
              .dividedBy(new BigNumber(10).pow(token.decimals))
              .toFixed(token.decimals);
            setBalance(balanceStr);
          }
        }
      );
    }
  }, [token, activeAccount, tokens2]);

  // EFFECT: set balance ii
  useEffect(() => {
    if (!token2 || !activeAccount || !tokens2) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    // Use contractId if available, otherwise use tokenId for ARC200 calls
    const tokenIdToUse = token2.contractId ?? token2.tokenId;
    // For ASAs, use tokenId directly as it's the ASA asset ID
    // For other types, try to find it from tokens2, but fall back to tokenId
    const wrappedTokenId =
      token2.assetType === "asa"
        ? Number(token2.tokenId)
        : Number(
            tokens2.find((t) => t.contractId === tokenIdToUse)?.tokenId ||
              token2.tokenId
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
              const balance1Bi = BigInt(
                new BigNumber(accAssetInfo["asset-holding"].amount)
                  .dividedBy(new BigNumber(10).pow(decimals))
                  .toFixed(0)
              );
              const ci = new arc200(tokenIdToUse, algodClient, indexerClient);
              ci.arc200_decimals().then((r: any) => {
                if (r.success) {
                  const decimals = Number(r.returnValue);
                  ci.arc200_balanceOf(activeAccount.address).then((r: any) => {
                    if (r.success) {
                      const balance2Bi = BigInt(r.returnValue);
                      const balance = new BigNumber(
                        (balance1Bi + balance2Bi).toString()
                      ).dividedBy(new BigNumber(10).pow(decimals));
                      setBalance2(balance.toFixed(decimals));
                    }
                  });
                }
              });
            });
        })
        .catch((e: any) => {
          const ci = new arc200(tokenIdToUse, algodClient, indexerClient);
          ci.arc200_decimals().then((r: any) => {
            if (r.success) {
              const decimals = Number(r.returnValue);
              ci.arc200_balanceOf(activeAccount.address).then((r: any) => {
                if (r.success) {
                  const balance2Bi = BigInt(r.returnValue);
                  const balance = new BigNumber(
                    balance2Bi.toString()
                  ).dividedBy(new BigNumber(10).pow(decimals));
                  setBalance2(balance.toFixed(decimals));
                }
              });
            }
          });
        });
    } else {
      const ci = new arc200(Number(tokenIdToUse), algodClient, indexerClient);
      ci.arc200_balanceOf(activeAccount.address).then(
        (arc200_balanceOfR: any) => {
          if (arc200_balanceOfR.success) {
            const balanceBn = new BigNumber(arc200_balanceOfR.returnValue);
            const balanceStr = balanceBn
              .dividedBy(new BigNumber(10).pow(token2.decimals))
              .toFixed(token2.decimals);
            setBalance2(balanceStr);
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

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [depositedAmounts, setDepositedAmounts] = useState<{
    from: string;
    to: string;
  }>({ from: "", to: "" });

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

      // Helper function to get token metadata with fallback
      const getTokenMetadata = (
        token: ARC200TokenI,
        isNetworkToken: boolean
      ) => {
        if (isNetworkToken) {
          return networkToken;
        }

        // Use contractId if available (for VOI it will be 390001), otherwise map tokenId
        const internalId = token.contractId || tokenId(token);
        const foundToken = tokens2.find(
          (t) => t.contractId === internalId || t.tokenId === internalId
        );

        // Get the contract ID for this token
        const contractId = token.contractId || tokenId(token);

        // Check if this contract ID has a corresponding ASA asset ID from config
        const asaAssetId = getAsaIdFromArc200Contract(contractId);

        // Determine the correct tokenId for the transaction
        // Priority: 1) ASA mapping from config, 2) tokenId from tokens2, 3) contract ID
        let tokenIdForTransaction: string;
        if (asaAssetId) {
          // Use ASA asset ID from config mapping
          tokenIdForTransaction = asaAssetId.toString();
        } else if (foundToken?.tokenId) {
          // Use tokenId from tokens2 (should be ASA asset ID)
          tokenIdForTransaction = foundToken.tokenId.toString();
        } else {
          // Fallback to contract ID (for pure ARC200 tokens without ASA)
          tokenIdForTransaction = contractId.toString();
        }

        if (foundToken) {
          // Return foundToken but ensure tokenId is correct (use ASA mapping if available)
          return {
            ...foundToken,
            contractId: contractId, // Ensure contractId is correct
            tokenId: tokenIdForTransaction, // Use the correct ASA asset ID
            decimals:
              foundToken.decimals?.toString() ?? token.decimals.toString(),
            symbol: foundToken.symbol ?? token.symbol,
          };
        }

        // Fallback: construct from state token
        return {
          contractId: contractId, // ARC200 contract ID
          tokenId: tokenIdForTransaction, // ASA asset ID if exists, otherwise contract ID
          decimals: token.decimals.toString(),
          symbol: token.symbol,
        };
      };

      const mA = getTokenMetadata(token, token.tokenId === 0);
      const mB = getTokenMetadata(token2, token2.tokenId === 0);

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
        debug: true,
      });

      console.log("swapR", swapR);

      if (!swapR.success) {
        return new Error("Add liquidity group simulation failed");
      }

      setProgress(50);
      setmessage("Signing transaction");

      const stxns = await signTransactions(
        swapR.txns.map((t: string) => new Uint8Array(Buffer.from(t, "base64")))
      );

      const dstxns = stxns.map((t: any) => algosdk.decodeSignedTransaction(t));

      console.log({ stxns, dstxns });

      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      console.log({ res });

      setProgress(75);
      setmessage("Confirming transactions");

      // const res = await sendTransactions(stxns);

      if (paramNewPool === "true") {
        do {
          const { data } = await axios.get(
            `https://humble-api.voi.nautilus.sh/pools?contractId=${pool.poolId}`
          );
          if (data.pools.length > 0) break;
          await new Promise((res) => setTimeout(res, 5000));
        } while (1);
      }
      if (paramNewPool === "true") {
        navigate(`/pool?filter=${token.symbol}`);
      } else {
        setDepositedAmounts({
          from: fromAmount,
          to: toAmount,
        });
        setShowConfirmation(true);
      }
      toast.success("Add liquidity successful!");
    } catch (e: any) {
      toast.error(e.message);
      console.error(e);
    } finally {
      setOn(false);
      setProgress(0);
      setmessage("");
    }
  };

  const [message, setmessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (progress === 0 || progress >= 100) return;
    const timeout = setTimeout(() => {
      setProgress(progress + 1);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [progress]);

  const findTokenInfo = (token: ARC200TokenI, tokens2: any[]) => {
    if (!token || !tokens2) return undefined;
    // Handle VOI token (tokenId 0 or contractId 390001)
    if (token.tokenId === 0 || token.contractId === TOKEN_WVOI1) {
      return tokens2.find(
        (t) =>
          t.contractId === 0 ||
          t.contractId === TOKEN_WVOI1 ||
          t.tokenId === 0 ||
          t.tokenId === TOKEN_WVOI1 ||
          t.assetId === 0 ||
          t.assetId === TOKEN_WVOI1
      );
    }
    // Try multiple matching strategies
    return tokens2.find(
      (t) =>
        t.contractId === token.tokenId ||
        t.contractId === token.contractId ||
        t.tokenId === token.tokenId ||
        t.tokenId === String(token.tokenId) ||
        Number(t.tokenId) === token.tokenId ||
        Number(t.contractId) === token.tokenId ||
        (token.contractId && t.assetId === token.contractId)
    );
  };

  const [tokAInfo, setTokAInfo] = useState<any>();
  useEffect(() => {
    if (!token) return;
    if (tokens2) {
      const tokA = findTokenInfo(token, tokens2);
      if (tokA) {
        setTokAInfo(tokA);
        return;
      }
    }
    // Fallback: create tokInfo from token if not found in tokens2
    setTokAInfo({
      contractId: token.contractId || token.tokenId,
      tokenId: token.tokenId,
      symbol: token.symbol,
      name: token.name,
      verified: token.tokenId === 0 ? 2 : 1,
    });
  }, [token, tokens2]);

  const [tokBInfo, setTokBInfo] = useState<any>();
  useEffect(() => {
    if (!token2) return;
    if (tokens2) {
      const tokB = findTokenInfo(token2, tokens2);
      if (tokB) {
        setTokBInfo(tokB);
        return;
      }
    }
    // Fallback: create tokInfo from token2 if not found in tokens2
    setTokBInfo({
      contractId: token2.contractId || token2.tokenId,
      tokenId: token2.tokenId,
      symbol: token2.symbol,
      name: token2.name,
      verified: token2.tokenId === 0 ? 2 : 1,
    });
  }, [token2, tokens2]);

  // Modify loading check to be more specific
  const isLoading = false;
  // useMemo(() => {
  //   return (
  //     !pools ||
  //     !tokens ||
  //     (!paramNewPool && (!token || !token2)) || // Only check tokens if not new pool
  //     !tokenOptions // Only check first token options
  //   );
  // }, [pools, tokens, token, token2, tokenOptions, paramNewPool]);

  return isLoading ? (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "60vh",
      }}
    >
      <CircularProgress
        size={100}
        sx={{
          color: isDarkTheme ? "#fff" : "#2958ff",
        }}
      />
    </div>
  ) : (
    <>
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
            tokInfo={tokAInfo}
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
            tokInfo={tokBInfo}
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
            <RateLabel className={isDarkTheme ? "dark" : "light"}>
              Rate
            </RateLabel>
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
          className={`${isValid ? "active" : ""} ${on ? "loading" : ""}`}
          onClick={() => {
            if (!on) {
              handleProviderDeposit();
            }
          }}
          //isDark={isDarkTheme}
        >
          {on ? (
            <>
              <CircularProgress color="inherit" size={100} />
              <span>Add liquidity in progress</span>
            </>
          ) : (
            buttonLabel
          )}
        </Button>
        <ProgressBar
          message={message}
          isActive={![0, 100].includes(progress)}
          currentStep={progress}
          totalSteps={100}
        />
      </SwapRoot>

      <Dialog
        open={showConfirmation}
        onClose={() => {
          setShowConfirmation(false);
          setFromAmount("0");
          setToAmount("0");
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: "transparent",
            boxShadow: "none",
            margin: "16px",
          },
        }}
        BackdropProps={{
          style: {
            backgroundColor: "rgba(41, 88, 255, 0.2)",
          },
        }}
      >
        <ConfirmationModal isDark={isDarkTheme}>
          <ModalTitle isDark={isDarkTheme}>
            Liquidity Added Successfully
          </ModalTitle>
          <ModalContent isDark={isDarkTheme}>
            <BreakdownRow>
              <BreakdownLabel className={isDarkTheme ? "dark" : "light"}>
                Added {tokenSymbol(token)}
              </BreakdownLabel>
              <BreakdownValue className={isDarkTheme ? "dark" : "light"}>
                {formatNumber(depositedAmounts.from)}
              </BreakdownValue>
            </BreakdownRow>
            <BreakdownRow>
              <BreakdownLabel className={isDarkTheme ? "dark" : "light"}>
                Added {tokenSymbol(token2)}
              </BreakdownLabel>
              <BreakdownValue className={isDarkTheme ? "dark" : "light"}>
                {formatNumber(depositedAmounts.to)}
              </BreakdownValue>
            </BreakdownRow>
            <BreakdownRow>
              <BreakdownLabel className={isDarkTheme ? "dark" : "light"}>
                Pool Share
              </BreakdownLabel>
              <BreakdownValue className={isDarkTheme ? "dark" : "light"}>
                {newShare}%
              </BreakdownValue>
            </BreakdownRow>
          </ModalContent>
          <ModalActions>
            <Button
              className="active"
              onClick={() => setShowConfirmation(false)}
            >
              Close
            </Button>
          </ModalActions>
        </ConfirmationModal>
      </Dialog>
    </>
  );
};

export default Swap;
