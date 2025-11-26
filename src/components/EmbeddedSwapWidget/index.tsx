import styled from "@emotion/styled";
import React, { useEffect, useMemo, useState } from "react";
import SwapIcon from "static/icon/icon-swap-stable-light.svg";
import ActiveSwapIcon from "static/icon/icon-swap-active-light.svg";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import {
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { CONTRACT, arc200, swap, abi } from "ulujs";
import {
  NETWORK_TOKEN,
  TOKEN_WVOI1,
} from "../../constants/tokens";
import { getAlgorandClients } from "../../wallets";
import TokenInput from "../TokenInput";
import { ARC200TokenI, PoolI } from "../../types";
import {
  getTokensWithTickers,
  selectTokens,
} from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getPools } from "../../store/poolSlice";
import { toast } from "react-toastify";
import { tokenId, tokenSymbol } from "../../utils/dex";
import BigNumber from "bignumber.js";
import SwapSuccessfulModal from "../modals/SwapSuccessfulModal";
import ProgressBar from "../ProgressBar";
import algosdk from "algosdk";
import { getAsaIdFromArc200Contract } from "../../config/arc200AsaMapping";

const SwapContainer = styled.div<{ gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${(props) => (props.gap ? `${props.gap}rem` : "12px")};
  width: 100%;
`;

const SwapIconButton = styled.img`
  width: 32px;
  height: 32px;
  cursor: pointer;
  align-self: center;
  transition: transform 0.3s ease;
  margin: 4px 0;

  &.rotate {
    animation: rotate 0.3s ease;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(180deg);
    }
  }
`;

const SwapButton = styled.button<{ isDarkTheme: boolean; disabled?: boolean }>`
  width: 100%;
  padding: 14px 24px;
  border-radius: 16px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s;
  margin-top: 8px;
  background: ${(props) =>
    props.disabled
      ? props.isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.05)"
      : "#2958ff"};
  color: ${(props) => (props.disabled ? "#9CA3AF" : "#FFFFFF")};
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};

  &:hover:not(:disabled) {
    background: ${(props) => (props.disabled ? undefined : "#1e40af")};
    transform: ${(props) => (props.disabled ? undefined : "translateY(-1px)")};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

interface EmbeddedSwapWidgetProps {
  defaultToken?: ARC200TokenI;
}

const EmbeddedSwapWidget: React.FC<EmbeddedSwapWidgetProps> = ({
  defaultToken,
}) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const dispatch = useDispatch();
  const tokens = useSelector(selectTokens);
  const pools: PoolI[] = useSelector((state: RootState) => state.pools.pools);
  const { activeAccount, signTransactions } = useWallet();

  useEffect(() => {
    dispatch(getTokensWithTickers() as unknown as UnknownAction);
    dispatch(getPools() as unknown as UnknownAction);
  }, [dispatch]);

  const [on, setOn] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [txId, setTxId] = useState("");
  const [poolId, setPoolId] = useState<number>();
  const [swapIn, setSwapIn] = useState("");
  const [swapOut, setSwapOut] = useState("");
  const [tokIn, setTokIn] = useState("");
  const [tokOut, setTokOut] = useState("");
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  const [focus, setFocus] = useState<"from" | "to" | undefined>();
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");

  const [token, setToken] = useState<ARC200TokenI | undefined>(defaultToken);
  const [token2, setToken2] = useState<ARC200TokenI>();
  const [tokenOptions, setTokenOptions] = useState<ARC200TokenI[]>([]);
  const [tokenOptions2, setTokenOptions2] = useState<ARC200TokenI[]>([]);

  const [balance, setBalance] = useState<string>();
  const [balance2, setBalance2] = useState<string>();

  // Update token when defaultToken changes or tokens load
  useEffect(() => {
    if (defaultToken && tokens.length > 0) {
      // Try to find a more complete token from the tokens array
      const foundToken = tokens.find(
        (t) =>
          (t.tokenId !== undefined && defaultToken.tokenId !== undefined && t.tokenId === defaultToken.tokenId) ||
          (t.contractId !== undefined && defaultToken.contractId !== undefined && t.contractId === defaultToken.contractId) ||
          (defaultToken.tokenId === 0 && (t.tokenId === 0 || t.contractId === TOKEN_WVOI1)) ||
          (defaultToken.contractId === TOKEN_WVOI1 && (t.tokenId === 0 || t.contractId === TOKEN_WVOI1))
      );
      if (foundToken) {
        setToken(foundToken);
      } else if (defaultToken.tokenId === 0 || defaultToken.contractId === TOKEN_WVOI1) {
        // For VOI, create a proper token object if not found
        const voiToken = {
          ...defaultToken,
          tokenId: 0,
          contractId: TOKEN_WVOI1,
          name: "Voi",
          symbol: "VOI",
          decimals: 6,
        };
        setToken(voiToken as ARC200TokenI);
      } else if (defaultToken) {
        setToken(defaultToken);
      }
    } else if (defaultToken) {
      // If tokens haven't loaded yet, still set the token but ensure VOI has proper properties
      if (defaultToken.tokenId === 0 || defaultToken.contractId === TOKEN_WVOI1) {
        const voiToken = {
          ...defaultToken,
          tokenId: 0,
          contractId: TOKEN_WVOI1,
          name: "Voi",
          symbol: "VOI",
          decimals: 6,
        };
        setToken(voiToken as ARC200TokenI);
      } else {
        setToken(defaultToken);
      }
    }
  }, [defaultToken, tokens]);

  // Reset balances when tokens change
  useEffect(() => {
    setBalance(undefined);
  }, [token]);

  useEffect(() => {
    setBalance2(undefined);
  }, [token2]);

  // Set default token2 to VOI if defaultToken is set
  useEffect(() => {
    if (defaultToken && !token2 && tokens.length > 0) {
      const voiToken = tokens.find(
        (t) => t.tokenId === 0 || t.contractId === TOKEN_WVOI1
      ) || {
        ...NETWORK_TOKEN.VOI,
        contractId: TOKEN_WVOI1,
      };
      setToken2(voiToken as ARC200TokenI);
    }
  }, [defaultToken, token2, tokens]);

  // Set token options
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
        contractId: TOKEN_WVOI1,
        name: "Voi",
        symbol: "VOI",
        decimals: 6,
        totalSupply: BigInt(10_000_000_000 * 1e6),
      },
      ...tokens.filter(
        (t: ARC200TokenI) =>
          t.tokenId !== undefined &&
          (poolTokens.includes(t.tokenId) ||
            (t.contractId !== undefined && poolTokens.includes(t.contractId)))
      ),
    ].filter((t: ARC200TokenI) => {
      if (t.tokenId === 0 && t.symbol === "VOI") {
        if (token2?.tokenId === 0 || token2?.contractId === TOKEN_WVOI1) {
          return false;
        }
        return true;
      }
      return (
        t.symbol !== "wVOI" &&
        t.tokenId !== token2?.tokenId &&
        t.contractId !== token2?.contractId
      );
    });
    tokenOptions.sort((a, b) => (a.tokenId ?? 0) - (b.tokenId ?? 0));
    setTokenOptions(tokenOptions as ARC200TokenI[]);
  }, [token2, tokens, pools]);

  useEffect(() => {
    if (!tokens || !pools || pools.length === 0) return;
    const newTokens = new Set<number>();
    for (const pool of pools) {
      newTokens.add(pool.tokA);
      newTokens.add(pool.tokB);
    }
    const poolTokens = Array.from(newTokens);
    const tokenOptions2 = [
      {
        tokenId: 0,
        contractId: TOKEN_WVOI1,
        name: "Voi",
        symbol: "VOI",
        decimals: 6,
        totalSupply: BigInt(10_000_000_000 * 1e6),
      },
      ...tokens.filter(
        (t: ARC200TokenI) =>
          t.tokenId !== undefined &&
          (poolTokens.includes(t.tokenId) ||
            (t.contractId !== undefined && poolTokens.includes(t.contractId)))
      ),
    ].filter((t: ARC200TokenI) => {
      if (t.tokenId === 0 && t.symbol === "VOI") {
        if (token?.tokenId === 0 || token?.contractId === TOKEN_WVOI1) {
          return false;
        }
        return true;
      }
      return (
        t.symbol !== "wVOI" &&
        t.tokenId !== token?.tokenId &&
        t.contractId !== token?.contractId
      );
    });
    tokenOptions2.sort((a, b) => (a.tokenId ?? 0) - (b.tokenId ?? 0));
    setTokenOptions2(tokenOptions2 as ARC200TokenI[]);
  }, [token, tokens, pools]);

  // Fetch balances
  useEffect(() => {
    if (!activeAccount || !token) {
      setBalance(undefined);
      return;
    }
    // Don't wait for tokens to load if we have a valid token object
    const fetchBalance = async () => {
      try {
        const { indexerClient } = getAlgorandClients();
        // Check for VOI token (tokenId 0 or contractId TOKEN_WVOI1)
        const isVOI = token.tokenId === 0 || token.contractId === TOKEN_WVOI1 || 
                     (token.tokenId === undefined && token.contractId === undefined && 
                      (token as any).assetId === "0");
        if (isVOI) {
          const accountInfo = await indexerClient
            .lookupAccountByID(activeAccount.address)
            .do();
          const balance =
            accountInfo.account?.amount || BigInt(0);
          setBalance(
            new BigNumber(balance.toString())
              .dividedBy(new BigNumber(10).pow(6))
              .toFixed(6)
          );
        } else if (token.contractId) {
          const { algodClient } = getAlgorandClients();
          const ci = new arc200(token.contractId, algodClient, indexerClient);
          const balance = await ci.arc200_balanceOf(activeAccount.address);
          if (balance.success) {
            setBalance(
              new BigNumber(balance.returnValue.toString())
                .dividedBy(new BigNumber(10).pow(token.decimals || 6))
                .toFixed(6)
            );
          } else {
            setBalance("0");
          }
        } else {
          setBalance("0");
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance("0");
      }
    };
    fetchBalance();
  }, [activeAccount, token]);

  useEffect(() => {
    if (!activeAccount || !token2) {
      setBalance2(undefined);
      return;
    }
    // Don't wait for tokens to load if we have a valid token object
    const fetchBalance = async () => {
      try {
        const { indexerClient } = getAlgorandClients();
        // Check for VOI token (tokenId 0 or contractId TOKEN_WVOI1)
        const isVOI = token2.tokenId === 0 || token2.contractId === TOKEN_WVOI1 || 
                     (token2.tokenId === undefined && token2.contractId === undefined && 
                      (token2 as any).assetId === "0");
        if (isVOI) {
          const accountInfo = await indexerClient
            .lookupAccountByID(activeAccount.address)
            .do();
          const balance =
            accountInfo.account?.amount || BigInt(0);
          setBalance2(
            new BigNumber(balance.toString())
              .dividedBy(new BigNumber(10).pow(6))
              .toFixed(6)
          );
        } else if (token2.contractId) {
          const { algodClient } = getAlgorandClients();
          const ci = new arc200(token2.contractId, algodClient, indexerClient);
          const balance = await ci.arc200_balanceOf(activeAccount.address);
          if (balance.success) {
            setBalance2(
              new BigNumber(balance.returnValue.toString())
                .dividedBy(new BigNumber(10).pow(token2.decimals || 6))
                .toFixed(6)
            );
          } else {
            setBalance2("0");
          }
        } else {
          setBalance2("0");
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance2("0");
      }
    };
    fetchBalance();
  }, [activeAccount, token2]);

  // Find eligible pools
  const [eligiblePools, setEligiblePools] = useState<PoolI[]>([]);
  useEffect(() => {
    async function fetchEligiblePools() {
      if (!token || !token2 || !pools || pools.length === 0) return;
      const tokenAId = tokenId(token);
      const tokenBId = tokenId(token2);
      const tokenAContractId = token.contractId;
      const tokenBContractId = token2.contractId;

      const filteredPools = pools.filter((p: PoolI) => {
        const hasTokenA =
          [p.tokA, p.tokB].includes(tokenAId) ||
          (tokenAContractId !== undefined &&
            [p.tokA, p.tokB].includes(tokenAContractId)) ||
          (token.tokenId === 0 && [p.tokA, p.tokB].includes(0)) ||
          (token.contractId === TOKEN_WVOI1 &&
            [p.tokA, p.tokB].includes(TOKEN_WVOI1));
        const hasTokenB =
          [p.tokA, p.tokB].includes(tokenBId) ||
          (tokenBContractId !== undefined &&
            [p.tokA, p.tokB].includes(tokenBContractId)) ||
          (token2.tokenId === 0 && [p.tokA, p.tokB].includes(0)) ||
          (token2.contractId === TOKEN_WVOI1 &&
            [p.tokA, p.tokB].includes(TOKEN_WVOI1));
        return hasTokenA && hasTokenB && p.tokA !== p.tokB;
      });

      let maxPool;
      let maxMintedLpt = BigInt(0);
      for await (const pool of filteredPools) {
        const { algodClient, indexerClient } = getAlgorandClients();
        const ci = new swap(pool.poolId, algodClient, indexerClient);
        const info = await ci.Info();
        if (info.success) {
          const {
            lptBals: { lpMinted },
          } = info.returnValue;
          if (lpMinted > maxMintedLpt) {
            maxMintedLpt = lpMinted;
            maxPool = pool;
          }
        }
      }
      setEligiblePools(maxPool ? [maxPool] : []);
    }
    fetchEligiblePools();
  }, [pools, token, token2]);

  // Get pool info and calculate rate
  const [info, setInfo] = useState<any>();
  useEffect(() => {
    if (!token || !token2 || !eligiblePools || eligiblePools.length === 0)
      return;
    const { algodClient, indexerClient } = getAlgorandClients();
    new swap(eligiblePools[0]?.poolId || 0, algodClient, indexerClient)
      .Info()
      .then((info: any) => {
        setInfo(info.returnValue);
      });
  }, [eligiblePools, token, token2]);

  const [lhs, rhs, rate, rateReady] = useMemo(() => {
    if (!info || !token || !token2) return [1, 1, 1, false];

    const tokenAId = tokenId(token);
    const tokenBId = tokenId(token2);
    const tokenAContractId = token.contractId;
    const tokenBContractId = token2.contractId;

    const isTokenA =
      info.tokA === tokenAId ||
      info.tokA === tokenAContractId ||
      (token.tokenId === 0 && info.tokA === 0) ||
      (token.contractId === TOKEN_WVOI1 && info.tokA === TOKEN_WVOI1);

    let calculatedRate: number;

    if (isTokenA) {
      const balA = Number(info.poolBals.A);
      const balB = Number(info.poolBals.B);
      const decimalsA = token.decimals ?? 6;
      const decimalsB = token2.decimals ?? 6;

      if (balA === 0 || balB === 0) {
        calculatedRate = 0;
      } else {
        calculatedRate = (balB / balA) * Math.pow(10, decimalsA - decimalsB);
      }
    } else {
      const balA = Number(info.poolBals.A);
      const balB = Number(info.poolBals.B);
      const decimalsA = token2.decimals ?? 6;
      const decimalsB = token.decimals ?? 6;

      if (balA === 0 || balB === 0) {
        calculatedRate = 0;
      } else {
        calculatedRate = (balA / balB) * Math.pow(10, decimalsB - decimalsA);
      }
    }

    if (!calculatedRate || !isFinite(calculatedRate) || calculatedRate <= 0) {
      const A = { ...token, tokenId: tokenAId };
      const B = { ...token2, tokenId: tokenBId };
      const res = swap.rate(info, A, B);
      calculatedRate = res && res > 0 ? res : 0;
    }

    return [1, calculatedRate > 0 ? 1 / calculatedRate : 0, calculatedRate, true];
  }, [info, token, token2]);

  // Calculate expected outcome
  const expectedOutcome = useMemo(() => {
    if (!rate || !fromAmount || !rateReady) return undefined;
    const amount = new BigNumber(fromAmount.replace(/,/g, ""));
    if (amount.isNaN()) return undefined;
    return amount
      .multipliedBy(rate)
      .decimalPlaces(token2?.decimals || 6, BigNumber.ROUND_DOWN)
      .toNumber();
  }, [rate, fromAmount, token2?.decimals, rateReady]);

  // Update toAmount when fromAmount changes
  useEffect(() => {
    if (focus === "from" && expectedOutcome !== undefined) {
      setToAmount(expectedOutcome.toString());
    }
  }, [expectedOutcome, focus]);

  // Calculate inverse rate for "to" focus
  const invRate = useMemo(() => {
    if (!rate || !rateReady || rate === 0) return undefined;
    const inv = 1 / rate;
    return isFinite(inv) ? inv : undefined;
  }, [rate, rateReady]);

  useEffect(() => {
    if (focus === "to" && invRate && toAmount) {
      const amount = new BigNumber(toAmount.replace(/,/g, ""));
      if (!amount.isNaN()) {
        const calculated = amount
          .multipliedBy(invRate)
          .decimalPlaces(token?.decimals || 6, BigNumber.ROUND_DOWN)
          .toNumber();
        setFromAmount(calculated.toString());
      }
    }
  }, [toAmount, invRate, focus, token?.decimals]);

  // Validation
  const isValid = useMemo(() => {
    if (!activeAccount || !token || !token2 || !fromAmount || !toAmount)
      return false;
    if (!eligiblePools || eligiblePools.length === 0) return false;
    const amount = new BigNumber(fromAmount.replace(/,/g, ""));
    if (amount.isNaN() || amount.lte(0)) return false;
    const bal = new BigNumber(balance || "0");
    return amount.lte(bal);
  }, [activeAccount, token, token2, fromAmount, toAmount, eligiblePools, balance]);

  const buttonLabel = useMemo(() => {
    if (!activeAccount) return "Connect Wallet";
    if (!token || !token2) return "Select tokens";
    if (!fromAmount || parseFloat(fromAmount) <= 0) return "Enter amount";
    if (!eligiblePools || eligiblePools.length === 0)
      return "No pool available";
    const amount = new BigNumber(fromAmount.replace(/,/g, ""));
    const bal = new BigNumber(balance || "0");
    if (amount.gt(bal)) return "Insufficient balance";
    return "Swap";
  }, [activeAccount, token, token2, fromAmount, eligiblePools, balance]);

  // Handle swap
  const handleSwap = async () => {
    if (!isValid || !activeAccount || !token || !token2) return;
    setShowConfirmation(true);
  };

  const handleConfirmedSwap = async () => {
    if (!activeAccount || !token || !token2 || !eligiblePools || eligiblePools.length === 0) return;
    setOn(true);
    setProgress(0);
    setMessage("Building transaction...");

    try {
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

      const mA = token;
      const mB = token2;

      // Helper function to get the correct tokenId (ASA asset ID) for transactions
      const getTokenIdForTransaction = (
        foundToken: any,
        contractId: number | undefined
      ): string | undefined => {
        if (!contractId) return undefined;

        // Priority: 1) ASA mapping from config, 2) tokenId from tokens2, 3) contract ID
        const asaAssetId = getAsaIdFromArc200Contract(contractId);
        if (asaAssetId) {
          return asaAssetId.toString();
        } else if (foundToken?.tokenId) {
          return foundToken.tokenId.toString();
        } else {
          return contractId.toString();
        }
      };

      // Build A object with contractId only if it exists
      const A: any = {
        ...mA,
        amount: fromAmount.replace(/,/g, ""),
        decimals: `${token?.decimals}`,
        tokenId: token?.tokenId?.toString(),
      };
      if (A.assetType === "arc200") {
        delete A.tokenId;
      }

      // Build B object with contractId only if it exists
      const B: any = {
        ...mB,
        amount: toAmount.replace(/,/g, ""),
        decimals: `${token2?.decimals}`,
        tokenId: token2?.tokenId?.toString(),
      };
      if (B.assetType === "arc200") {
        delete B.tokenId;
      }

      console.log({ A, B });

      setProgress(25);
      setMessage("Executing swap...");

      const swapR = await ci.swap(acc.addr, pool2.poolId, A, B, [], {
        debug: true,
        slippage: 0.01, // 1% slippage
        degenMode: false,
        skipWithdraw: false,
      });

      console.log("swapR", swapR);

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
        setOn(false);
        setShowConfirmation(false);
        setProgress(0);
        setMessage("");
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
        console.log(e);
        setOn(false);
        setMessage("");
        setProgress(0);
        setShowConfirmation(false);
        return;
      }

      if (!stxns) {
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

      await algosdk.waitForConfirmation(
        algodClient,
        res.txId,
        10
      );

      setProgress(100);
      setMessage("Swap successful!");

      setTxId(res.txId);
      setPoolId(pool2.poolId);
      setSwapIn(fromAmount);
      setSwapOut(toAmount);
      setTokIn(tokenSymbol(token));
      setTokOut(tokenSymbol(token2));
      setSwapModalOpen(true);

      setOn(false);
      setShowConfirmation(false);
      setProgress(0);
      setMessage("");
      setFromAmount("");
      setToAmount("");

      toast.success("Swap completed successfully!");
    } catch (error: any) {
      console.error("Swap error:", error);
      toast.error(error.message || "Swap failed");
      setOn(false);
      setShowConfirmation(false);
      setProgress(0);
      setMessage("");
    }
  };

  // Get token info for TokenInput
  const findTokenInfo = (token: ARC200TokenI, tokens: ARC200TokenI[]) => {
    return tokens.find(
      (t) =>
        t.contractId === token.contractId ||
        t.tokenId === token.tokenId ||
        (token.tokenId === 0 && (t.tokenId === 0 || t.contractId === TOKEN_WVOI1))
    );
  };

  const [tokAInfo, setTokAInfo] = useState<any>();
  const [tokBInfo, setTokBInfo] = useState<any>();

  useEffect(() => {
    if (!token || !tokens) return;
    const tokA = findTokenInfo(token, tokens);
    if (tokA) {
      setTokAInfo(tokA);
    } else {
      setTokAInfo({
        contractId: token.contractId || token.tokenId,
        tokenId: token.tokenId,
        symbol: token.symbol,
        name: token.name,
        verified: token.tokenId === 0 ? 2 : 1,
      });
    }
  }, [token, tokens]);

  useEffect(() => {
    if (!token2 || !tokens) return;
    const tokB = findTokenInfo(token2, tokens);
    if (tokB) {
      setTokBInfo(tokB);
    } else {
      setTokBInfo({
        contractId: token2.contractId || token2.tokenId,
        tokenId: token2.tokenId,
        symbol: token2.symbol,
        name: token2.name,
        verified: token2.tokenId === 0 ? 2 : 1,
      });
    }
  }, [token2, tokens]);

  return (
    <>
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
          displayId={token?.contractId || token?.tokenId || 0}
          tokInfo={tokAInfo}
          compact={true}
        />
        <SwapIconButton
          onClick={() => {
            const newToken = token;
            const newAmount = fromAmount;
            setToken(token2);
            setToken2(newToken);
            setToAmount(newAmount);
            setFromAmount(toAmount);
          }}
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
          displayId={token2?.contractId || token2?.tokenId || 0}
          tokInfo={tokBInfo}
          compact={true}
        />

        <SwapButton
          isDarkTheme={isDarkTheme}
          disabled={!isValid || on}
          onClick={handleSwap}
        >
          {on ? (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <CircularProgress size={16} sx={{ color: "#fff" }} />
              <Typography variant="body2" sx={{ color: "#fff" }}>
                {message || "Transaction in progress..."}
              </Typography>
            </Stack>
          ) : (
            buttonLabel
          )}
        </SwapButton>
      </SwapContainer>

      {/* Confirmation Modal - simplified version */}
      {showConfirmation && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
          }}
          onClick={() => {
            if (!on) {
              setShowConfirmation(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: isDarkTheme ? "#1F2937" : "#FFFFFF",
              borderRadius: "24px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", color: isDarkTheme ? "#FFFFFF" : "#0c0c10" }}>
              Confirm Swap
            </h3>
            <div style={{ marginBottom: "16px", color: isDarkTheme ? "#9CA3AF" : "#6B7280" }}>
              <div>Swap {fromAmount} {tokenSymbol(token)}</div>
              <div>For {toAmount} {tokenSymbol(token2)}</div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <SwapButton
                isDarkTheme={isDarkTheme}
                onClick={() => {
                  setOn(false);
                  setShowConfirmation(false);
                  setProgress(0);
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </SwapButton>
              {on ? (
                <SwapButton isDarkTheme={isDarkTheme} disabled style={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                    <CircularProgress size={16} sx={{ color: "#fff" }} />
                    <Typography variant="body2" sx={{ color: "#fff" }}>
                      Processing...
                    </Typography>
                  </Stack>
                </SwapButton>
              ) : (
                <SwapButton
                  isDarkTheme={isDarkTheme}
                  onClick={handleConfirmedSwap}
                  style={{ flex: 1 }}
                >
                  Confirm
                </SwapButton>
              )}
            </div>
          </div>
        </div>
      )}

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
    </>
  );
};

export default EmbeddedSwapWidget;

