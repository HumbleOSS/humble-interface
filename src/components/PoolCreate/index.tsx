import styled from "@emotion/styled";
import React, { FC, useEffect, useMemo, useState } from "react";
import SwapIcon from "static/icon/icon-swap-stable-light.svg";
import ActiveSwapIcon from "static/icon/icon-swap-active-light.svg";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import { CircularProgress, Stack, Button as MButton } from "@mui/material";
import { CONTRACT, abi, arc200, swap, swap200 } from "ulujs";
import {
  CONNECTOR_ALGO_SWAP200,
  TOKEN_VIA,
  TOKEN_WVOI1,
} from "../../constants/tokens";
import { getAlgorandClients } from "../../wallets";
import TokenInput from "../TokenInput";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ARC200TokenI, PoolI } from "../../types";
import { fetchToken, getToken, getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getPools } from "../../store/poolSlice";
import algosdk, { decodeAddress } from "algosdk";
import { toast } from "react-toastify";
import { Toast } from "react-toastify/dist/components";
import axios from "axios";
import { hasAllowance } from "ulujs/types/arc200";
import { tokenId, tokenSymbol } from "../../utils/dex";
import BigNumber from "bignumber.js";
import { CTCINFO_TRI } from "../../constants/dex";
import { ZERO_ADDRESS } from "../../constants/avm";
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

const Note = styled.div`
  align-self: stretch;
  color: var(--Color-Neutral-Element-Primary, #fff);
  font-feature-settings: "clig" off, "liga" off;
  /* Body/P */
  font-family: "IBM Plex Sans Condensed";
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 14.4px */
`;

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

  const [tokens2, setTokens] = React.useState<any[]>();
  useEffect(() => {
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?includes=tokens`
      )
      .then((res) => {
        setTokens(res.data.tokens);
      });
  }, []);

  console.log({ tokens2 });

  /* Stubs */

  const [stubs, setStubs] = React.useState<any[]>();
  useEffect(() => {
    const exchangeHash = // TODO export to constants
      "1365fd96882cef38c711ca95a04f8b933ca151ad6a2470dae62c3036bfdd8147";
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/stubs/pool?active=0&hash=${exchangeHash}`
      )
      .then((res) => {
        setStubs(res.data.stubs);
      });
  }, []);

  console.log({ stubs });

  /* Pools */
  const pools: PoolI[] = useSelector((state: RootState) => state.pools.pools);
  const poolsStatus = useSelector((state: RootState) => state.pools.status);
  useEffect(() => {
    dispatch(getPools() as unknown as UnknownAction);
  }, [dispatch]);

  /* Params */
  const [sp] = useSearchParams();
  const paramPoolId = sp.get("poolId");
  const paramTokAId = sp.get("tokAId");
  const paramTokBId = sp.get("tokBId");

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

  const [token, setToken] = useState<any>();
  const [token2, setToken2] = useState<any>();

  const [tokenOptions, setTokenOptions] = useState<ARC200TokenI[]>();
  const [tokenOptions2, setTokenOptions2] = useState<ARC200TokenI[]>();
  const [balance, setBalance] = React.useState<string>();
  const [balance2, setBalance2] = React.useState<string>();

  const [poolExists, setPoolExists] = useState<boolean>(false);

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

  useEffect(() => {
    if (paramTokAId && !isNaN(Number(paramTokAId))) {
      if (paramTokAId === "0") {
        setToken({
          tokenId: "0",
          name: "Voi",
          symbol: "VOI",
          decimals: 6,
          totalSupply: BigInt(10_000_000_000 * 1e6),
        });
      } else {
        const tokenId = Number(paramTokAId);
        getToken(tokenId).then(setToken);
      }
    }
  }, []);
  useEffect(() => {
    if (paramTokBId && !isNaN(Number(paramTokBId))) {
      if (paramTokBId === "0") {
        setToken2({
          tokenId: "0",
          name: "Voi",
          symbol: "VOI",
          decimals: 6,
          totalSupply: BigInt(10_000_000_000 * 1e6),
        });
      } else {
        const tokenId = Number(paramTokBId);
        getToken(tokenId).then(setToken2);
      }
    }
  }, []);

  // EFFECT
  useEffect(() => {
    if (!tokens) return;
    setTokenOptions([
      {
        tokenId: 0,
        name: "Voi",
        symbol: "VOI",
        decimals: 6,
        totalSupply: BigInt(10_000_000_000 * 1e6),
      },
      ...tokens,
    ]);
  }, [tokens, pools]);

  // EFFECT: update tokenOptions2 on token change
  useEffect(() => {
    if (!token || !tokenOptions) return;
    const exclude = [0, TOKEN_WVOI1].includes(token.tokenId)
      ? [0, TOKEN_WVOI1]
      : [token.tokenId];
    const tokenOptions2 = tokenOptions.filter(
      (t) => !exclude.includes(t.tokenId)
    );
    // check if token options includes wVOI
    setTokenOptions2(tokenOptions2);
    setToAmount("0");
    setFromAmount("0");
  }, [token, tokenOptions]);

  console.log({ tokenOptions2 });

  useEffect(() => {
    if (!token2) return;
    setToAmount("");
  }, [token2]);

  // EFFECT
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
  }, [tokens2, token, activeAccount]);

  // EFFECT
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
  }, [tokens2, token2, activeAccount]);

  // EFFECT: get voi balance
  // useEffect(() => {
  //   if (activeAccount && providers && providers.length >= 3) {
  //     getAccountInfo().then(setAccInfo);
  //   }
  // }, [activeAccount, providers]);

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

  useEffect(() => {
    if (!token || !token2 || !eligiblePools) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const A = { ...token, tokenId: tokenId(token) };
    const B = { ...token2, tokenId: tokenId(token2) };
    new swap(0, algodClient, indexerClient)
      .selectPool(eligiblePools, A, B, "round")
      .then((pool: any) => {
        if (!!pool) {
          toast.info(
            <div>
              Existing {token.symbol}/{token2.symbol} pool found!
              <br />
              <MButton
                onClick={() => {
                  navigate(`/pool/add?poolId=${pool.poolId}`);
                }}
              >
                Go to pool
              </MButton>
            </div>
          );
          setPoolExists(true);
          setPool(pool);
        } else {
          setPoolExists(false);
          setPool(undefined);
        }
      });
  }, [eligiblePools, token, token2]);

  console.log({ poolExists });

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
    if (poolExists) {
      return "Go to pool";
    } else if (isValid) {
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
  }, [
    isValid,
    fromAmount,
    toAmount,
    balance,
    balance2,
    token,
    token2,
    poolExists,
  ]);

  const handlePoolCreate = async () => {
    if (!activeAccount || !token || !token2 || !pools || !stubs) return;
    try {
      const { algodClient, indexerClient } = getAlgorandClients();

      setProgress(10);
      setMessage("Building transaction");

      // select stub
      let stub = stubs.find((s) => s.creator === activeAccount.address);
      if (!stub) {
        stub = stubs.find((s) => s.active === 0);
      }
      console.log({ stub });

      let ctcInfo: number;
      const {
        appApproval,
        appClear,
        extraPages,
        LocalNumUint,
        LocalNumByteSlice,
        GlobalNumUint,
        GlobalNumByteSlice,
      } = CONNECTOR_ALGO_SWAP200;
      const makeApplicationCreateTxnFromObjectObj = {
        from: activeAccount.address,
        suggestedParams: await algodClient.getTransactionParams().do(),
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        approvalProgram: new Uint8Array(Buffer.from(appApproval, "base64")),
        clearProgram: new Uint8Array(Buffer.from(appClear, "base64")),
        numLocalInts: LocalNumUint,
        numLocalByteSlices: LocalNumByteSlice,
        numGlobalByteSlices: GlobalNumByteSlice,
        numGlobalInts: GlobalNumUint,
        extraPages,
        note: new Uint8Array(Buffer.from("ARC200 LP", "utf-8")),
      };
      const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject(
        makeApplicationCreateTxnFromObjectObj
      );
      if (!stub) {
        const stxns = await signTransactions([appCreateTxn.toByte()]);
        /*
        const res: any = await toast.promise(
          //.then(sendTransactions),
          {
            pending: "Pending transaction to deploy pool",
            success: "Pool deployed",
          }
        );
        */
        const res = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();
        console.log({ res, stxns });
        // TODO fix broken

        ctcInfo = res["application-index"];
      } else {
        ctcInfo = stub.contractId;
      }

      do {
        const acc = {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        };
        const ci = new swap(ctcInfo, algodClient, indexerClient, { acc });

        const networkToken = {
          contractId: TOKEN_WVOI1,
          tokenId: "0",
          decimals: "6",
          symbol: "VOI",
        };

        console.log({ token, token2 });

        const mA =
          token.tokenId === 0
            ? networkToken
            : tokens2?.find((t) => t.contractId === tokenId(token));

        const mB =
          token2.tokenId === 0
            ? networkToken
            : tokens2?.find((t) => t.contractId === tokenId(token2));

        const A = {
          ...mA,
          amount: fromAmount.replace(/,/g, ""),
        };
        const B = {
          ...mB,
          amount: toAmount.replace(/,/g, ""),
        };

        const extraTxns = [];
        //if (![token.tokenId, token2.tokenId].includes(0)) {
        extraTxns.push(makeApplicationCreateTxnFromObjectObj);
        //}

        //const swapR: any = await ci.deposit(acc.addr, ctcInfo, A, B, extraTxns);
        const swapR: any = await ci.deposit(acc.addr, ctcInfo, A, B, []);

        const unsignedTxns = [
          ...swapR.txns.map(
            (t: string) => new Uint8Array(Buffer.from(t, "base64"))
          ),
        ];

        setProgress(50);
        setMessage("Signing transaction");

        const stxns = await signTransactions(unsignedTxns);
        /*
        await toast.promise(
          //.then(sendTransactions),
          {
            pending: `Creating new pool with liquidity ${fromAmount} ${tokenSymbol(
              token
            )} + ${toAmount} ${tokenSymbol(token2)}`,
          },
          {
            type: "default",
            position: "top-right",
            theme: "dark",
          }
        );
        */

        await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      } while (0);

      setProgress(70);

      // -----------------------------------------
      // QUEST HERE hmbl_pool_creation
      // -----------------------------------------
      // setMessage("Updating quest");
      // do {
      //   const address = activeAccount.address;
      //   const actions: string[] = [QUEST_ACTION.CREATE_LIQUIDITY_POOL];
      //   const {
      //     data: { results },
      //   } = await getActions(address);
      //   for (const action of actions) {
      //     const address = activeAccount.address;
      //     const key = `${action}:${address}`;
      //     const completedAction = results.find((el: any) => el.key === key);
      //     if (!completedAction) {
      //       await submitAction(action, address, {
      //         poolId: ctcInfo,
      //       });
      //     }
      //     // TODO notify quest completion here
      //   }
      // } while (0);
      // -----------------------------------------
      // confirm pool
      // -----------------------------------------
      await new Promise((res) => setTimeout(res, 8000));
      // -----------------------------------------
      setProgress(100);
      // navigate
      // -----------------------------------------
      navigate(`/pool?filter=${token.symbol.toUpperCase()}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProgress(0);
      setMessage("");
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

  return !isLoading ? (
    <SwapRoot className={isDarkTheme ? "dark" : "light"}>
      <SwapHeadingContainer>
        <SwapHeading className={isDarkTheme ? "dark" : "light"}>
          Create Pool
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
          showInput={!poolExists}
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
          showInput={!poolExists}
        />
      </SwapContainer>
      <Button
        className={isValid || poolExists ? "active" : undefined}
        onClick={() => {
          if (!on) {
            if (!poolExists) {
              handlePoolCreate();
            } else {
              if (!pool) return;
              navigate(`/pool/add?poolId=${pool.poolId}`);
            }
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
      <Note>
        By adding liquidity you'll earn 0.25% of trades on this pair
        proportional to your share of the pool Fees are added to the pool,
        accumulate in real time and can be claimed by removing your liquidity.
      </Note>
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
