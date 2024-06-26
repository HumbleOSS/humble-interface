import styled from "@emotion/styled";
import React, { FC, useEffect, useMemo, useState } from "react";
import SwapIcon from "static/icon/icon-swap-stable-light.svg";
import ActiveSwapIcon from "static/icon/icon-swap-active-light.svg";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { custom, useWallet } from "@txnlab/use-wallet";
import { CircularProgress, Stack } from "@mui/material";
import { CONTRACT, abi, arc200, swap200 } from "ulujs";
import {
  CONNECTOR_ALGO_SWAP200,
  TOKEN_VIA,
  TOKEN_WVOI1,
} from "../../constants/tokens";
import { getAlgorandClients } from "../../wallets";
import TokenInput from "../TokenInput";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { CTCINFO_TRI } from "../../constants/dex";
import { ZERO_ADDRESS } from "../../constants/avm";

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

  const handlePoolCreate = async () => {
    if (!activeAccount || !token || !token2) return;
    try {
      // create app -> app id
      // approve spend tok A to app id
      // approve spend tok B to app id
      // call provider deposit
      // -------------------------------------------
      // create app -> app id
      // -------------------------------------------
      const { algodClient, indexerClient } = getAlgorandClients();

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
      };
      const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject(
        makeApplicationCreateTxnFromObjectObj
      );

      const res: any = await toast.promise(
        signTransactions([appCreateTxn.toByte()]).then(sendTransactions),
        {
          pending: "Pending transaction to deploy pool",
          success: "Pool deployed",
        }
      );

      const ctcInfo: number = res["application-index"];

      // -------------------------------------------
      // reach_p0
      // -------------------------------------------
      do {
        const ci = new CONTRACT(
          ctcInfo,
          algodClient,
          indexerClient,
          {
            name: "",
            desc: "",
            methods: [
              // _reachp_0((uint64,((byte[32],byte[8]),(uint64,uint64,uint64),address)))void
              {
                name: "_reachp_0",
                args: [
                  {
                    type: "(uint64,((byte[32],byte[8]),(uint64,uint64,uint64),address))",
                  },
                ],
                returns: {
                  type: "void",
                },
              },
            ],
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          }
        );
        const name = `ARC200 LP - ${token.symbol}/${token2.symbol}`;
        const symbol = "ARC200LT";
        const _reachp_0_params = [
          0,
          [
            [
              [
                ...new Uint8Array(Buffer.from(name)),
                ...new Uint8Array(32 - name.length),
              ],
              [
                ...new Uint8Array(Buffer.from(symbol)),
                ...new Uint8Array(8 - symbol.length),
              ],
            ],
            [
              CTCINFO_TRI,
              ((tok) => (tok === 0 ? TOKEN_WVOI1 : tok))(token.tokenId),
              ((tok) => (tok === 0 ? TOKEN_WVOI1 : tok))(token2.tokenId),
            ],
            ZERO_ADDRESS,
          ],
        ];
        ci.setPaymentAmount(1e6);
        ci.setFee(3000);
        const _reachp_0R = await ci._reachp_0(_reachp_0_params);
        await toast.promise(
          signTransactions(
            _reachp_0R.txns.map(
              (t: string) => new Uint8Array(Buffer.from(t, "base64"))
            )
          ).then(sendTransactions),
          {
            pending: "Pending transaction to initialize pool",
            success:
              "Pool initialization complete. Page will reload momentarily",
          }
        );
      } while (0);
      // -------------------------------------------

      navigate(`/pool/add?poolId=${ctcInfo}&newPool=true`);

      // -------------------------------------------
      // ensure
      // -------------------------------------------
      // - ensure lp tok balance
      // -------------------------------------------
      // do {
      //   const ciTokA = new arc200(
      //     ((tok) => (tok === 0 ? TOKEN_WVOI1 : tok))(token.tokenId),
      //     algodClient,
      //     indexerClient,
      //     {
      //       acc: { addr: activeAccount.address, sk: new Uint8Array(0) },
      //     }
      //   );
      //   const arc200_transferR = await ciTokA.arc200_transfer(
      //     algosdk.getApplicationAddress(ctcInfo),
      //     BigInt(0),
      //     true,
      //     false
      //   );
      //   console.log({ arc200_transferR });
      //   if (!arc200_transferR.success) throw new Error(arc200_transferR.error);
      //   await toast.promise(
      //     signTransactions(
      //       arc200_transferR.txns.map(
      //         (t: string) => new Uint8Array(Buffer.from(t, "base64"))
      //       )
      //     ).then(sendTransactions),
      //     {
      //       pending: "Pending transaction to ensure lp tokA balance",
      //       success: "Lp tokA balance setup complete",
      //     }
      //   );
      // } while (0);
      // -------------------------------------------
      // - ensure lp tok balance
      // -------------------------------------------
      // do {
      //   const ciTokB = new arc200(
      //     ((tok) => (tok === 0 ? TOKEN_WVOI1 : tok))(token2.tokenId),
      //     algodClient,
      //     indexerClient,
      //     {
      //       acc: { addr: activeAccount.address, sk: new Uint8Array(0) },
      //     }
      //   );
      //   const arc200_transferR = await ciTokB.arc200_transfer(
      //     algosdk.getApplicationAddress(ctcInfo),
      //     BigInt(0),
      //     true,
      //     false
      //   );
      //   console.log({ arc200_transferR });
      //   if (!arc200_transferR.success) throw new Error(arc200_transferR.error);
      //   await toast.promise(
      //     signTransactions(
      //       arc200_transferR.txns.map(
      //         (t: string) => new Uint8Array(Buffer.from(t, "base64"))
      //       )
      //     ).then(sendTransactions),
      //     {
      //       pending: "Pending transaction to ensure lp tokB balance",
      //       success: "Lp tokB balance setup complete",
      //     }
      //   );
      // } while (0);
      // -------------------------------------------
      // - ensure provider tokA spend approval
      // -------------------------------------------
      // do {
      //   const ciTokA = new arc200(
      //     ((tok) => (tok === 0 ? TOKEN_WVOI1 : tok))(token.tokenId),
      //     algodClient,
      //     indexerClient,
      //     {
      //       acc: { addr: activeAccount.address, sk: new Uint8Array(0) },
      //     }
      //   );
      //   const arc200_approveR = await ciTokA.arc200_approve(
      //     algosdk.getApplicationAddress(ctcInfo),
      //     BigInt(0),
      //     true,
      //     false
      //   );
      //   if (!arc200_approveR.success) throw new Error(arc200_approveR.error);
      //   await toast.promise(
      //     signTransactions(
      //       arc200_approveR.txns.map(
      //         (t: string) => new Uint8Array(Buffer.from(t, "base64"))
      //       )
      //     ).then(sendTransactions),
      //     {
      //       pending: "Pending transaction approve tokA spend",
      //       success: "tokA spend approval complete",
      //     }
      //   );
      // } while (0);
      // -------------------------------------------
      // - ensure provider tokB spend approval
      // -------------------------------------------
      // do {
      //   const ci = new arc200(
      //     ((tok) => (tok === 0 ? TOKEN_WVOI1 : tok))(token2.tokenId),
      //     algodClient,
      //     indexerClient,
      //     {
      //       acc: { addr: activeAccount.address, sk: new Uint8Array(0) },
      //     }
      //   );
      //   const arc200_approveR = await ci.arc200_approve(
      //     algosdk.getApplicationAddress(ctcInfo),
      //     BigInt(0),
      //     true,
      //     false
      //   );
      //   if (!arc200_approveR.success) throw new Error(arc200_approveR.error);
      //   await toast.promise(
      //     signTransactions(
      //       arc200_approveR.txns.map(
      //         (t: string) => new Uint8Array(Buffer.from(t, "base64"))
      //       )
      //     ).then(sendTransactions),
      //     {
      //       pending: "Pending transaction approve tokB spend",
      //       success: "tokB spend approval complete",
      //     }
      //   );
      // } while (0);
      // -------------------------------------------

      // const spec = {
      //   name: "",
      //   desc: "",
      //   methods: [
      //     {
      //       name: "custom",
      //       args: [],
      //       returns: {
      //         type: "void",
      //       },
      //     },
      //     {
      //       name: "Provider_deposit",
      //       args: [
      //         { type: "byte" },
      //         { type: "(uint256,uint256)" },
      //         { type: "uint256" },
      //       ],
      //       returns: { type: "uint256" },
      //     },
      //   ],
      //   events: [],
      // };
      // const builder = {
      //   swap200: new CONTRACT(
      //     ctcInfo,
      //     algodClient,
      //     indexerClient,
      //     spec,
      //     {
      //       addr: activeAccount.address,
      //       sk: new Uint8Array(0),
      //     },
      //     true,
      //     false,
      //     true
      //   ),
      //   arc200: {
      //     tokA: new CONTRACT(
      //       ((tok) => (tok === 0 ? TOKEN_WVOI1 : tok))(token.tokenId),
      //       algodClient,
      //       indexerClient,
      //       abi.arc200,
      //       {
      //         addr: activeAccount.address,
      //         sk: new Uint8Array(0),
      //       },
      //       true,
      //       false,
      //       true
      //     ),
      //     tokB: new CONTRACT(
      //       ((tok) => (tok === 0 ? TOKEN_WVOI1 : tok))(token2.tokenId),
      //       algodClient,
      //       indexerClient,
      //       abi.arc200,
      //       {
      //         addr: activeAccount.address,
      //         sk: new Uint8Array(0),
      //       },
      //       true,
      //       false,
      //       true
      //     ),
      //   },
      // };

      // const fromAmountBI = BigInt(
      //   new BigNumber(Number(fromAmount))
      //     .multipliedBy(new BigNumber(10).pow(token.decimals))
      //     .toFixed(0)
      // );
      // const toAmountBI = BigInt(
      //   new BigNumber(Number(toAmount))
      //     .multipliedBy(new BigNumber(10).pow(token2.decimals))
      //     .toFixed(0)
      // );

      // const buildN = [];
      // -------------------------------------------
      // approve spend tok A to app id
      // -------------------------------------------
      // buildN.push(
      //   builder.arc200.tokA.arc200_approve(
      //     algosdk.getApplicationAddress(ctcInfo),
      //     fromAmountBI
      //   )
      // );
      // -------------------------------------------
      // approve spend tok B to app id
      // -------------------------------------------
      // buildN.push(
      //   builder.arc200.tokB.arc200_approve(
      //     algosdk.getApplicationAddress(ctcInfo),
      //     toAmountBI
      //   )
      // );
      // -------------------------------------------
      // call provider deposit
      // -------------------------------------------
      // buildN.push(
      //   builder.swap200.Provider_deposit(0, [fromAmountBI, toAmountBI], 0)
      // );
      // -------------------------------------------
      // const buildP = (await Promise.all(buildN)).map(({ obj }) => obj);
      // -------------------------------------------
      // const ci = new CONTRACT(TOKEN_WVOI1, algodClient, indexerClient, spec, {
      //   addr: activeAccount.address,
      //   sk: new Uint8Array(0),
      // });
      // ci.setPaymentAmount(1e6);
      // ci.setExtraTxns(buildP);
      // ci.setFee(2000);
      // ci.setEnableGroupResourceSharing(true);
      // ci.setAccounts([algosdk.getApplicationAddress(ctcInfo)]);
      // const customR = await ci.custom();

      // if (!customR.success) throw new Error(customR.error);

      // console.log({ customR });

      // await toast.promise(
      //   signTransactions(
      //     customR.txns.map(
      //       (t: string) => new Uint8Array(Buffer.from(t, "base64"))
      //     )
      //   ).then(sendTransactions),
      //   {
      //     pending:
      //       "Pending transaction to finalize initial liquidity provisions",
      //     success: "Liquidity pool creation complete!",
      //   }
      // );

      // -------------------------------------------
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isLoading = !pools || !tokens;

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
      <Button
        className={isValid ? "active" : undefined}
        onClick={() => {
          if (!on) {
            handlePoolCreate();
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
    </SwapRoot>
  ) : null;
};

export default Swap;
