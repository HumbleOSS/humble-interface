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
  Modal,
  Typography,
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
import { fetchPool, getPool, getPools } from "../../store/poolSlice";
import { toast } from "react-toastify";
import { tokenId, tokenSymbol } from "../../utils/dex";
import BigNumber from "bignumber.js";
import { CTCINFO_DEFAULT_LP } from "../../constants/dex";
import SwapSuccessfulModal from "../modals/SwapSuccessfulModal";
import { QUEST_ACTION, getActions, submitAction } from "../../config/quest";
import axios from "axios";
import ProgressBar from "../ProgressBar";
import algosdk from "algosdk";
import SettingsIcon from "@mui/icons-material/Settings";
import { SwapOptionsModal } from "../modals/SwapOptionsModal";

const SwapDisplay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-self: stretch;
`;

const SwapDisplayTop = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  align-self: stretch;
`;

const SwapDisplayBottom = styled.div`
  display: flex;
  width: 420px;
  justify-content: center;
  align-items: center;
  border-radius: 0px 0px 26px 26px;
  border-right: 1px solid #b8b8cc;
  border-bottom: 1px solid #b8b8cc;
  border-left: 1px solid #b8b8cc;
`;

const SwapDisplayMiddle = styled.div`
  display: flex;
  padding: 8px 12px;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  position: absolute;
  right: 167px;
  top: 66.252px;
  border-radius: 9.6px;
  border: 0.6px solid var(--Color-Brand-Element-Primary, #fff);
  background: #fff;
`;

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
        strokeWidth="1.63562"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.2104 13.3828L23.1078 15.2801L25.0051 13.3828"
        stroke="white"
        strokeWidth="1.63562"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.0966 14.5293V11.9996C23.0966 6.41666 18.5714 1.90234 12.9994 1.90234C9.81541 1.90234 6.96943 3.38534 5.11572 5.68611"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.90234 9.4707V12.0005C2.90234 17.5834 7.42756 22.0977 12.9996 22.0977C16.1836 22.0977 19.0296 20.6147 20.8833 18.3139"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
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
  position: relative;
  @media screen and (min-width: 600px) {
    transition: all 1s;
    width: 630px;
    padding: 40px 40px 0 40px;

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
  padding: 16px;
  border-radius: 24px;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  align-self: stretch;

  @media screen and (min-width: 600px) {
    padding: 40px;
    gap: 12px;
  }

  &.dark {
    background: #070709;
  }
  &.light {
    background: #f1eafc;
  }
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
  padding: 2px 0px;
  justify-content: space-between;
  align-items: flex-start;
  align-self: stretch;

  @media screen and (min-width: 600px) {
    padding: 4px 0px;
  }
`;

const BreakdownLabel = styled.div`
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 160%;
  gap: 4px;
  display: flex;
  flex-direction: row;
  align-items: center;

  @media screen and (min-width: 600px) {
    font-size: 16px;
    line-height: 180%;
  }

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
  font-size: 13px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%;

  @media screen and (min-width: 600px) {
    font-size: 15px;
  }

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
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8V11.3333"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.99634 5.33301H8.00233"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const SwapAmountContainer = styled.div`
  padding: 12px;
  border-radius: 24px;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 4px;
  align-self: stretch;
  @media screen and (min-width: 600px) {
    padding: 24px;
    gap: 8px;
  }
  &.dark {
    background: #070709;
  }
  &.light {
    background: #f1eafc;
  }
`;

// Add new styled component for token icon container
const TokenIconContainer = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

// Update SwapAmountRow to include icon
const SwapAmountRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Plus Jakarta Sans";
  font-size: 18px;
  font-weight: 700;
  line-height: 120%;
  padding: 8px;
  width: 100%;

  &.dark {
    color: #fff;
  }
  &.light {
    color: #141010;
  }
`;

const SwapDirectionLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  font-family: "IBM Plex Sans Condensed";
  font-size: 12px;
  font-weight: 500;
  width: 100%;
  position: relative;
  margin: 4px 0;

  &.dark {
    color: #7e7e9a;
  }
  &.light {
    color: #41137e;
  }

  &::before,
  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;

    &.dark {
      background: #1f1f2c;
    }
    &.light {
      background: #b8b8cc;
    }
  }

  &::before {
    top: -4px;
  }

  &::after {
    bottom: -4px;
  }
`;

// Add new styled component for modal content
const ConfirmationModalContent = styled.div`
  max-width: 630px;
  width: 90%;
  border-radius: 24px;
  padding: 16px;
  outline: none;
  margin: 16px;
  max-height: 90vh;
  overflow-y: auto;
  gap: 16px;
  &.dark {
    background: #070709;
    border: 1px solid #41137e;
    box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  }
  &.light {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #7e7e9a;
  }

  @media screen and (min-width: 600px) {
    padding: 32px;
  }
`;

const ArrowDownIcon = () => {
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
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8V11.3333"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.99634 5.33301H8.00233"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Add new styled component for modal overlay
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(41, 88, 255, 0.15);
  backdrop-filter: blur(4px);
  z-index: 1300;
`;

// Add new styled component for refresh button
const RefreshButton = styled(BaseButton)<{ isDark: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: ${(props) =>
      props.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"};
  }
`;

// Add RefreshIcon component
const RefreshIcon = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.6667 2.66667V6.66667H10.6667"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.33325 13.3333V9.33333H5.33325"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.34658 6.00001C2.73324 4.90001 3.41324 3.92668 4.31991 3.19334C5.22658 2.46001 6.31991 2.00001 7.46658 1.86668C8.61324 1.73334 9.77324 1.93334 10.8199 2.44668C11.8666 2.96001 12.7666 3.76668 13.4133 4.78668L14.6666 6.66668M1.33325 9.33334L2.58658 11.2133C3.23325 12.2333 4.13325 13.04 5.17991 13.5533C6.22658 14.0667 7.38658 14.2667 8.53325 14.1333C9.67991 14 10.7733 13.54 11.6799 12.8067C12.5866 12.0733 13.2666 11.1 13.6533 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Add new styled component for settings button
const SettingsButton = styled(BaseButton)<{ isDarkTheme: boolean }>`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#41137E")};
  z-index: 1;

  &:hover {
    background: ${(props) =>
      props.isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"};
  }
`;

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

  const { activeAccount, signTransactions } = useWallet();

  // confirmation modal

  const [txId, setTxId] = useState("");
  const [poolId, setPoolId] = useState<number>();
  const [swapIn, setSwapIn] = useState("");
  const [swapOut, setSwapOut] = useState("");
  const [tokIn, setTokIn] = useState("");
  const [tokOut, setTokOut] = useState("");
  const [swapModalOpen, setSwapModalOpen] = useState(false);

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

  // EFFECT: get pool for paramPoolId
  useEffect(() => {
    getPool(Number(paramPoolId));
  }, [paramPoolId]);

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
    if (!info || !token) return "0";
    const amount = new BigNumber(fromAmount.replace(/,/g, ""));
    if (amount.isNaN()) return "0";
    return amount
      .multipliedBy(info?.protoInfo.totFee)
      .dividedBy(10000)
      .decimalPlaces(token.decimals, BigNumber.ROUND_DOWN)
      .toFixed(token.decimals);
  }, [info, fromAmount, token]);

  console.log("fee", fee);

  const expectedOutcome = useMemo(() => {
    if (!rate || !fromAmount) return;
    const amount = new BigNumber(fromAmount.replace(/,/g, ""));
    if (amount.isNaN()) return;
    return amount
      .multipliedBy(rate)
      .decimalPlaces(token2?.decimals || 6, BigNumber.ROUND_DOWN)
      .toNumber();
  }, [rate, fromAmount, token2?.decimals]);

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
      const fromAmountBN = new BigNumber(fromAmount.replace(/,/g, ""));
      if (fromAmountBN.isNaN()) return;
      const fromAmountBI = BigInt(
        fromAmountBN
          .multipliedBy(10 ** token.decimals)
          .decimalPlaces(0, BigNumber.ROUND_DOWN)
          .toFixed(0)
      );
      ci.Trader_swapAForB(1, fromAmountBI, 0).then((r: any) => {
        if (r.success) {
          const toAmountBN = new BigNumber(r.returnValue[1]);
          if (toAmountBN.isNaN()) return;
          const toAmount = toAmountBN
            .div(10 ** token2.decimals)
            .decimalPlaces(token2.decimals, BigNumber.ROUND_DOWN)
            .toFixed(token2.decimals);
          setActualOutcome(toAmount);
          setToAmount(toAmount);
        }
      });
    } else if (pool.tokB === tokenId(token)) {
      const fromAmountBN = new BigNumber(fromAmount.replace(/,/g, ""));
      if (fromAmountBN.isNaN()) return;
      const fromAmountBI = BigInt(
        fromAmountBN
          .multipliedBy(10 ** token.decimals)
          .decimalPlaces(0, BigNumber.ROUND_DOWN)
          .toFixed(0)
      );
      ci.Trader_swapBForA(1, fromAmountBI, 0).then((r: any) => {
        if (r.success) {
          const toAmountBN = new BigNumber(r.returnValue[0]);
          if (toAmountBN.isNaN()) return;
          const toAmount = toAmountBN
            .div(10 ** token2.decimals)
            .decimalPlaces(token2.decimals, BigNumber.ROUND_DOWN)
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
      const toAmountBN = new BigNumber(toAmount.replace(/,/g, ""));
      if (toAmountBN.isNaN()) return;
      const toAmountBI = BigInt(
        toAmountBN
          .multipliedBy(new BigNumber(10).pow(token2.decimals))
          .decimalPlaces(0, BigNumber.ROUND_DOWN)
          .toFixed(0)
      );
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
      const toAmountBN = new BigNumber(toAmount.replace(/,/g, ""));
      if (toAmountBN.isNaN()) return;
      const toAmountBI = BigInt(
        toAmountBN
          .multipliedBy(new BigNumber(10).pow(token2.decimals))
          .decimalPlaces(0, BigNumber.ROUND_DOWN)
          .toFixed(0)
      );
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
            const balanceBn = new BigNumber(arc200_balanceOfR.returnValue);
            const balanceStr = balanceBn
              .dividedBy(new BigNumber(10).pow(token2.decimals))
              .toFixed(token2.decimals);
            setBalance2(balanceStr);
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

  const [currentSlippage] = useState(() => {
    const saved = localStorage.getItem("currentSlippage");
    if (saved && !isNaN(Number(saved)) && Number(saved) >= 0) {
      return saved;
    }
    return "0.5"; // Default to 0.5%
  });

  const minRecieved = useMemo(() => {
    if (!actualOutcome) return "-";
    return (
      Number(actualOutcome) *
      (1 - Number(currentSlippage) / 100)
    ).toLocaleString();
  }, [actualOutcome, currentSlippage]);

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

  // Add new state for confirmation modal
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Modify handleSwap to show confirmation first
  const handleSwap = async () => {
    if (!isValid || !tokens2) return;
    if (!activeAccount) {
      toast.info("Please connect your wallet first");
      return;
    }

    // Show confirmation modal first
    setShowConfirmation(true);
  };

  // Add new function to handle actual swap after confirmation
  const handleConfirmedSwap = async () => {
    if (!activeAccount) return;
    setOn(true);
    setProgress(0);
    try {
      setMessage("Building transaction...");
      const acc = {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      };
      const { algodClient, indexerClient } = getAlgorandClients();

      const status = await algodClient.status().do();
      const { ["last-round"]: lastRound } = status;

      const pool = eligiblePools.slice(-1)[0];
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
        token?.tokenId === 0
          ? networkToken
          : tokens2?.find((t) => t.contractId === token?.tokenId);

      const mB =
        token2?.tokenId === 0
          ? networkToken
          : tokens2?.find((t) => t.contractId === token2?.tokenId);

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

      const swapR = await ci.swap(acc.addr, pool2.poolId, A, B, [], {
        debug: true,
        slippage: Number(currentSlippage) / 100,
        degenMode: degenMode,
        skipWithdraw: false
      });

      if (!swapR?.success) {
        // Retrigger the amount calculations
        if (focus === "from") {
          const currentAmount = fromAmount;
          setFromAmount("");
          setTimeout(() => setFromAmount(currentAmount), 100);
        } else {
          const currentAmount = toAmount;
          setToAmount("");
          setTimeout(() => setToAmount(currentAmount), 100);
        }
        toast.info(
          "Swap cancelled due to high slippage. Please try again, adjust slippage tolerance, or specify a smaller amount."
        );
        return;
      }

      setMessage("Signing transaction...");
      setProgress(50);

      let stxns;
      try {
        stxns = await signTransactions(
          swapR.txns.map(
            (t: string) => new Uint8Array(Buffer.from(t, "base64"))
          )
        );
      } catch (e: any) {
        // Handle user rejection or cancellation
        setOn(false);
        setMessage("");
        setProgress(0);
        setShowConfirmation(false);
        return;
      }

      if (!stxns) {
        // Handle case where stxns is undefined (user cancelled)
        setOn(false);
        setMessage("");
        setProgress(0);
        setShowConfirmation(false);
        return;
      }

      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      setProgress(75);
      setMessage("Confirming transaction...");
      await algosdk.waitForConfirmation(algodClient, res.txId, 1000);
      setProgress(85);

      let swapEvents: any;
      do {
        swapEvents = await ci.SwapEvents({
          minRound: lastRound,
          sender: activeAccount?.address,
        });
      } while (!swapEvents.length);

      console.log({ swapEvents });

      const [confirmedTxId] = swapEvents[0];

      setTxId(confirmedTxId);
      setPoolId(pool2.poolId);
      setSwapIn(fromAmount);
      setSwapOut(toAmount);
      setTokIn(token?.symbol || "");
      setTokOut(token2?.symbol || "");
      setShowConfirmation(false);
      setSwapModalOpen(true);
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

  const [showSettings, setShowSettings] = useState(false);

  // Add this near the top of the component with other state declarations
  const [degenMode] = useState(() => {
    const saved = localStorage.getItem("degenMode");
    return saved === "true";
  });

  return !isLoading ? (
    <>
      <SwapRoot className={isDarkTheme ? "dark" : "light"}>
        {/*<SettingsButton
          onClick={() => setShowSettings(true)}
          isDarkTheme={isDarkTheme}
        >
          <SettingsIcon />
        </SettingsButton>*/}
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

          {/* Add swap button */}
          <Button
            className={isValid ? "active" : ""}
            onClick={handleSwap}
            style={{ marginTop: "24px" }}
          >
            {on ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} sx={{ color: "#fff" }} />
                <Typography variant="body2" sx={{ color: "#fff" }}>
                  {message || "Transaction in progress..."}
                </Typography>
              </Stack>
            ) : (
              buttonLabel
            )}
          </Button>
        </SwapContainer>

        {/* Add confirmation modal */}
        {showConfirmation && <ModalOverlay />}
        <Modal
          open={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: 0,
            padding: 0,
            backgroundColor: "transparent", // Make modal background transparent
          }}
        >
          <ConfirmationModalContent className={isDarkTheme ? "dark" : "light"}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2
                style={{
                  color: isDarkTheme ? "#fff" : "#141010",
                  fontSize: "20px",
                  fontFamily: "Plus Jakarta Sans",
                  fontWeight: "700",
                  margin: 0,
                }}
              >
                Confirm Swap
              </h2>
              <RefreshButton
                isDark={isDarkTheme}
                onClick={() => {
                  // Retrigger the amount calculations
                  if (focus === "from") {
                    const currentAmount = fromAmount;
                    setFromAmount("");
                    setTimeout(() => setFromAmount(currentAmount), 100);
                  } else {
                    const currentAmount = toAmount;
                    setToAmount("");
                    setTimeout(() => setToAmount(currentAmount), 100);
                  }
                }}
                style={{
                  color: isDarkTheme ? "#fff" : "#141010",
                }}
              >
                <RefreshIcon />
              </RefreshButton>
            </div>
            {/* Add swap amount display */}1
            <SwapAmountContainer
              className={isDarkTheme ? "dark" : "light"}
              style={{
                flexDirection: window.innerWidth < 600 ? "row" : "column",
                gap: window.innerWidth < 600 ? "8px" : "0",
              }}
            >
              <SwapAmountRow className={isDarkTheme ? "dark" : "light"}>
                <TokenIconContainer>
                  <img
                    src={`https://asset-verification.nautilus.sh/icons/${
                      token?.tokenId === 0
                        ? 0
                        : tokens2?.find((t) => t.tokenId === token?.tokenId)
                            ?.contractId ||
                          token?.tokenId ||
                          0
                    }.png`}
                    alt={token?.symbol}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://asset-verification.nautilus.sh/icons/0.png";
                    }}
                  />
                </TokenIconContainer>
                {Number(fromAmount).toLocaleString(undefined, {
                  maximumFractionDigits: token?.decimals || 6,
                })}{" "}
                {token?.symbol || "---"}
              </SwapAmountRow>
              <SwapDirectionLabel
                style={{
                  display: window.innerWidth < 600 ? "none" : undefined,
                }}
                className={isDarkTheme ? "dark" : "light"}
              >
                TO
              </SwapDirectionLabel>
              <SwapAmountRow className={isDarkTheme ? "dark" : "light"}>
                <TokenIconContainer>
                  <img
                    src={`https://asset-verification.nautilus.sh/icons/${
                      token2?.tokenId === 0
                        ? 0
                        : tokens2?.find((t) => t.tokenId === token2?.tokenId)
                            ?.contractId ||
                          token2?.tokenId ||
                          0
                    }.png`}
                    alt={token2?.symbol}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://asset-verification.nautilus.sh/icons/0.png";
                    }}
                  />
                </TokenIconContainer>
                {Number(toAmount).toLocaleString(undefined, {
                  maximumFractionDigits: token2?.decimals || 6,
                })}{" "}
                {token2?.symbol || "---"}
              </SwapAmountRow>
            </SwapAmountContainer>
            <div style={{ height: "16px" }} />
            <SummaryContainer className={isDarkTheme ? "dark" : "light"}>
              {!!token2 &&
              (info?.poolBals?.A !== "0" || info?.poolBals?.B !== "0") ? (
                <RateContainer>
                  <RateLabel className={isDarkTheme ? "dark" : "light"}>
                    Rate
                  </RateLabel>
                  <RateValue>
                    {window.innerWidth > 600 && (
                      <RateMain className={isDarkTheme ? "dark" : "light"}>
                        {lhs === 1 ? 1 : lhs?.toFixed(6)} {tokenSymbol(token)} ={" "}
                        {lhs > 1 ? 1 : rate?.toFixed(6)} {tokenSymbol(token2)}
                      </RateMain>
                    )}
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
                  {window.innerWidth > 600 && (
                    <BreakdownRow>
                      <BreakdownLabel
                        className={isDarkTheme ? "dark" : "light"}
                      >
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
                  )}
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
                        {Number(currentSlippage)}%
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
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "24px",
                flexDirection: window.innerWidth < 600 ? "column" : "row",
              }}
            >
              <Button
                style={{ flex: 1 }}
                onClick={() => {
                  setOn(false);
                  setShowConfirmation(false);
                  setProgress(0);
                }}
              >
                Cancel
              </Button>
              {on ? (
                <Button className="active" style={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} sx={{ color: "#fff" }} />
                    <Typography variant="body2" sx={{ color: "#fff" }}>
                      Transaction in progress...
                    </Typography>
                  </Stack>
                </Button>
              ) : (
                <Button
                  style={{ flex: 1 }}
                  className="active"
                  onClick={handleConfirmedSwap}
                >
                  Confirm Swap
                </Button>
              )}
            </div>
          </ConfirmationModalContent>
        </Modal>

        <SwapSuccessfulModal
          open={swapModalOpen}
          handleClose={() => setSwapModalOpen(false)}
          poolId={poolId}
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
      </SwapRoot>
    </>
  ) : null;
};

export default Swap;
