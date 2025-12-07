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
import { getDefaultPool, setDefaultPool, clearDefaultPool, findDefaultPoolsForToken, cleanupDuplicateDefaultPools } from "../../utils/poolSettings";
import SettingsIcon from "@mui/icons-material/Settings";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import Tooltip from "@mui/material/Tooltip";

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

const PoolInfoContainer = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${(props) =>
    props.isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)"};
  margin-top: 4px;
  font-size: 12px;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const PoolInfoText = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const DefaultPoolButton = styled.button<{ isDarkTheme: boolean; isDefault: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: ${(props) =>
    props.isDefault
      ? props.isDarkTheme
        ? "#FFBE1D"
        : "#9933FF"
      : props.isDarkTheme
      ? "#9CA3AF"
      : "#6B7280"};
  transition: all 0.2s;

  &:hover {
    background: ${(props) =>
      props.isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  }

  svg {
    font-size: 16px;
  }
`;

interface EmbeddedSwapWidgetProps {
  defaultToken?: ARC200TokenI;
  defaultToken2?: ARC200TokenI;
}

const EmbeddedSwapWidget: React.FC<EmbeddedSwapWidgetProps> = ({
  defaultToken,
  defaultToken2,
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
    
    // Clean up duplicate default pool entries on component mount
    cleanupDuplicateDefaultPools();
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
  const [defaultsCleared, setDefaultsCleared] = useState(false);

  const [balance, setBalance] = useState<string>();
  const [balance2, setBalance2] = useState<string>();

  // Update token when defaultToken changes or tokens load
  useEffect(() => {
    if (defaultsCleared) return; // Don't re-apply defaults if user has cleared them
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

  // Set default token2 - prioritize defaultToken2, otherwise VOI if defaultToken is set
  useEffect(() => {
    if (defaultsCleared) return; // Don't re-apply defaults if user has cleared them
    if (defaultToken2 && tokens.length > 0) {
      // Try to find a more complete token from the tokens array
      const foundToken = tokens.find(
        (t) =>
          (t.tokenId !== undefined && defaultToken2.tokenId !== undefined && t.tokenId === defaultToken2.tokenId) ||
          (t.contractId !== undefined && defaultToken2.contractId !== undefined && t.contractId === defaultToken2.contractId) ||
          (defaultToken2.tokenId === 0 && (t.tokenId === 0 || t.contractId === TOKEN_WVOI1)) ||
          (defaultToken2.contractId === TOKEN_WVOI1 && (t.tokenId === 0 || t.contractId === TOKEN_WVOI1))
      );
      if (foundToken) {
        setToken2(foundToken);
      } else if (defaultToken2.tokenId === 0 || defaultToken2.contractId === TOKEN_WVOI1) {
        // For VOI, create a proper token object if not found
        const voiToken = {
          ...defaultToken2,
          tokenId: 0,
          contractId: TOKEN_WVOI1,
          name: "Voi",
          symbol: "VOI",
          decimals: 6,
        };
        setToken2(voiToken as ARC200TokenI);
      } else if (defaultToken2) {
        setToken2(defaultToken2);
      }
    } else if (defaultToken && !token2 && tokens.length > 0) {
      // Check if there's a default pool set for this token - if so, use the paired token from that default
      const defaultPoolsForToken = findDefaultPoolsForToken(
        defaultToken.tokenId,
        defaultToken.contractId
      );
      
      if (defaultPoolsForToken.length > 0) {
        // Use the first default pool's paired token
        const defaultPool = defaultPoolsForToken[0];
        const pairedToken = tokens.find(
          (t) => {
            const normalizeId = (id: number | undefined, cId: number | undefined) => {
              if (id === 0 || cId === 390001 || id === 390001) return 0;
              return id ?? cId ?? 0;
            };
            const tNormalized = normalizeId(t.tokenId, t.contractId);
            return tNormalized === defaultPool.otherTokenId;
          }
        );
        
        if (pairedToken) {
          console.log("Using token2 from default pool:", {
            defaultToken: { id: defaultToken.tokenId, contractId: defaultToken.contractId },
            defaultPool,
            pairedToken: { id: pairedToken.tokenId, contractId: pairedToken.contractId },
          });
          setToken2(pairedToken);
          return; // Don't continue with other logic
        }
      }
      
      // Don't default to VOI if defaultToken is already VOI (would show "Voi to Voi")
      const isDefaultTokenVOI = 
        defaultToken.tokenId === 0 || 
        defaultToken.contractId === TOKEN_WVOI1 ||
        defaultToken.tokenId === TOKEN_WVOI1;
      
      if (!isDefaultTokenVOI) {
        // Default to VOI only if defaultToken is not VOI
        const voiToken = tokens.find(
          (t) => t.tokenId === 0 || t.contractId === TOKEN_WVOI1
        ) || {
          ...NETWORK_TOKEN.VOI,
          contractId: TOKEN_WVOI1,
        };
        setToken2(voiToken as ARC200TokenI);
      } else if (isDefaultTokenVOI && pools.length > 0) {
        // If defaultToken is VOI, find a token that pairs with VOI in pools
        const voiTokenId = 0;
        const voiContractId = TOKEN_WVOI1;
        
        // Find a pool that contains VOI
        const voiPool = pools.find(
          (p) => p.tokA === voiTokenId || p.tokB === voiTokenId || 
                 p.tokA === voiContractId || p.tokB === voiContractId
        );
        
        if (voiPool) {
          // Get the other token from the pool (not VOI)
          const otherTokenId = voiPool.tokA === voiTokenId || voiPool.tokA === voiContractId 
            ? voiPool.tokB 
            : voiPool.tokA;
          
          // Find the token in the tokens array
          const pairedToken = tokens.find(
            (t) => t.tokenId === otherTokenId || t.contractId === otherTokenId
          );
          
          if (pairedToken) {
            setToken2(pairedToken);
          }
        }
        // If no pool found, leave token2 undefined so user can select
      }
    }
  }, [defaultToken, defaultToken2, token2, tokens, pools]);

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

  // Track if current pool is set as default
  const [isDefaultPool, setIsDefaultPool] = useState(false);

  // Find eligible pools
  const [eligiblePools, setEligiblePools] = useState<PoolI[]>([]);
  useEffect(() => {
    async function fetchEligiblePools() {
      console.log("fetchEligiblePools called:", {
        hasToken: !!token,
        hasToken2: !!token2,
        poolsCount: pools?.length || 0,
        token: token ? { id: token.tokenId, contractId: token.contractId, symbol: token.symbol } : null,
        token2: token2 ? { id: token2.tokenId, contractId: token2.contractId, symbol: token2.symbol } : null,
      });
      
      if (!token || !token2 || !pools || pools.length === 0) {
        console.log("fetchEligiblePools: Early return - missing requirements");
        return;
      }
      // Get token IDs - use tokenId() for pool matching, but also keep original values for default pool lookup
      const tokenAId = tokenId(token);
      const tokenBId = tokenId(token2);
      const tokenAContractId = token.contractId;
      const tokenBContractId = token2.contractId;
      
      // For default pool lookup, we need to use the actual tokenId and contractId values
      // not the processed tokenId() which might convert 0 to 390001
      const tokenAIdForLookup = token.tokenId;
      const tokenBIdForLookup = token2.tokenId;

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

      // Check for default pool setting first
      // Use original tokenId values, not processed ones, for consistent lookup
      const defaultPoolId = getDefaultPool(
        tokenAIdForLookup,
        tokenAContractId,
        tokenBIdForLookup,
        tokenBContractId
      );
      
      console.log("Pool selection - tokens:", {
        tokenA: { 
          id: tokenAId, 
          idForLookup: tokenAIdForLookup,
          contractId: tokenAContractId, 
          symbol: token?.symbol,
          fullToken: token,
        },
        tokenB: { 
          id: tokenBId, 
          idForLookup: tokenBIdForLookup,
          contractId: tokenBContractId, 
          symbol: token2?.symbol,
          fullToken: token2,
        },
        defaultPoolId,
        filteredPoolsCount: filteredPools.length,
      });

      let selectedPool: PoolI | undefined;

      if (defaultPoolId) {
        console.log("Default pool ID found:", defaultPoolId, "for tokens:", {
          tokenAId: tokenAIdForLookup,
          tokenAContractId,
          tokenBId: tokenBIdForLookup,
          tokenBContractId,
        });
        
        // Try to find the default pool in filtered pools first
        const defaultPool = filteredPools.find((p) => p.poolId === defaultPoolId);
        if (defaultPool) {
          console.log("Default pool found in filtered pools:", defaultPool.poolId);
          // Use the pool immediately if it's in filtered pools (it's already validated by being in the list)
          // Verify asynchronously but don't block on it
          selectedPool = defaultPool;
          console.log("Using default pool:", defaultPool.poolId);
          
          // Verify the pool is still valid asynchronously (for future reference)
          (async () => {
            try {
              const { algodClient, indexerClient } = getAlgorandClients();
              const ci = new swap(defaultPool.poolId, algodClient, indexerClient);
              const info = await ci.Info();
              if (!info.success) {
                console.warn("Default pool verification failed, but pool is still being used");
              }
            } catch (error) {
              console.warn("Default pool verification error (non-blocking):", error);
            }
          })();
        } else {
          console.log("Default pool not found in filtered pools, checking all pools...");
          // Default pool not in filtered pools - check if it exists in all pools
          const allPoolsDefaultPool = pools.find((p) => p.poolId === defaultPoolId);
          if (allPoolsDefaultPool) {
            // Check if this pool actually matches the token pair
            const poolHasTokenA =
              [allPoolsDefaultPool.tokA, allPoolsDefaultPool.tokB].includes(tokenAId) ||
              (tokenAContractId !== undefined &&
                [allPoolsDefaultPool.tokA, allPoolsDefaultPool.tokB].includes(tokenAContractId)) ||
              (token.tokenId === 0 && [allPoolsDefaultPool.tokA, allPoolsDefaultPool.tokB].includes(0)) ||
              (token.contractId === TOKEN_WVOI1 &&
                [allPoolsDefaultPool.tokA, allPoolsDefaultPool.tokB].includes(TOKEN_WVOI1));
            const poolHasTokenB =
              [allPoolsDefaultPool.tokA, allPoolsDefaultPool.tokB].includes(tokenBId) ||
              (tokenBContractId !== undefined &&
                [allPoolsDefaultPool.tokA, allPoolsDefaultPool.tokB].includes(tokenBContractId)) ||
              (token2.tokenId === 0 && [allPoolsDefaultPool.tokA, allPoolsDefaultPool.tokB].includes(0)) ||
              (token2.contractId === TOKEN_WVOI1 &&
                [allPoolsDefaultPool.tokA, allPoolsDefaultPool.tokB].includes(TOKEN_WVOI1));
            
            if (poolHasTokenA && poolHasTokenB) {
              // Pool matches the token pair, verify it's valid
              try {
                const { algodClient, indexerClient } = getAlgorandClients();
                const ci = new swap(allPoolsDefaultPool.poolId, algodClient, indexerClient);
                const info = await ci.Info();
                if (info.success) {
                  selectedPool = allPoolsDefaultPool;
                  console.log("Using default pool (found in all pools):", allPoolsDefaultPool.poolId);
                }
              } catch (error) {
                console.warn("Default pool verification error, falling back to auto negotiation:", error);
              }
            } else {
              console.warn("Default pool doesn't match token pair, clearing default and using auto negotiation");
              // Clear invalid default pool
              clearDefaultPool(
                tokenAIdForLookup,
                tokenAContractId,
                tokenBIdForLookup,
                tokenBContractId
              );
            }
          } else {
            console.warn("Default pool not found in any pools, clearing default and using auto negotiation");
            // Clear invalid default pool
            clearDefaultPool(
              tokenAIdForLookup,
              tokenAContractId,
              tokenBIdForLookup,
              tokenBContractId
            );
          }
        }
      }

      // If no default pool or default pool not available, use auto negotiation
      if (!selectedPool) {
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
        selectedPool = maxPool;
        if (selectedPool) {
          console.log("Using auto-negotiated pool (highest liquidity):", selectedPool.poolId);
        }
      }

      if (selectedPool) {
        setEligiblePools([selectedPool]);
        console.log("fetchEligiblePools: Final selected pool:", selectedPool.poolId, {
          isDefault: !!defaultPoolId && selectedPool.poolId === defaultPoolId,
          defaultPoolId,
          selectedPoolId: selectedPool.poolId,
          willTriggerPoolInfoFetch: true,
        });
      } else {
        setEligiblePools([]);
        console.log("fetchEligiblePools: No pool selected");
      }
    }
    
    // Only run if we have all required data
    if (token && token2 && pools && pools.length > 0) {
      console.log("fetchEligiblePools: All requirements met, running fetch...");
      fetchEligiblePools();
    } else {
      console.log("fetchEligiblePools: Waiting for requirements:", {
        hasToken: !!token,
        hasToken2: !!token2,
        hasPools: !!(pools && pools.length > 0),
      });
    }
  }, [pools, token, token2]);

  // Check if current pool is set as default
  useEffect(() => {
    if (!token || !token2 || eligiblePools.length === 0) {
      setIsDefaultPool(false);
      return;
    }

    // Use original tokenId values for consistent lookup
    const tokenAIdForLookup = token.tokenId;
    const tokenBIdForLookup = token2.tokenId;
    const tokenAContractId = token.contractId;
    const tokenBContractId = token2.contractId;

    const defaultPoolId = getDefaultPool(
      tokenAIdForLookup,
      tokenAContractId,
      tokenBIdForLookup,
      tokenBContractId
    );

    const currentPoolId = eligiblePools[0]?.poolId;
    setIsDefaultPool(defaultPoolId === currentPoolId);
  }, [token, token2, eligiblePools]);

  // Get pool info and calculate rate
  const [info, setInfo] = useState<any>();
  useEffect(() => {
    if (!token || !token2 || !eligiblePools || eligiblePools.length === 0) {
      setInfo(undefined); // Clear info when pools are cleared
      return;
    }
    
    const poolId = eligiblePools[0]?.poolId;
    if (!poolId) return;
    
    console.log("Fetching pool info for pool:", poolId);
    
    const { algodClient, indexerClient } = getAlgorandClients();
    new swap(poolId, algodClient, indexerClient)
      .Info()
      .then((info: any) => {
        if (info.success) {
          console.log("Pool info fetched successfully for pool:", poolId);
          setInfo(info.returnValue);
        } else {
          console.warn("Pool info fetch failed for pool:", poolId, info);
          setInfo(undefined);
        }
      })
      .catch((error: any) => {
        console.error("Error fetching pool info for pool:", poolId, error);
        setInfo(undefined);
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
            // Only swap if both tokens are defined
            if (!token || !token2) return;
            
            // Swap tokens and amounts when switching direction
            setDefaultsCleared(true);
            const newToken = token;
            const newToken2 = token2;
            const newFromAmount = fromAmount;
            const newToAmount = toAmount;
            const newBalance = balance;
            const newBalance2 = balance2;
            
            // Swap tokens
            setToken(newToken2);
            setToken2(newToken);
            
            // Swap amounts
            setFromAmount(newToAmount);
            setToAmount(newFromAmount);
            
            // Swap balances
            setBalance(newBalance2);
            setBalance2(newBalance);
            
            // Swap focus if needed
            if (focus === "from") {
              setFocus("to");
            } else if (focus === "to") {
              setFocus("from");
            }
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

        {/* Pool Info and Default Pool Setting */}
        {token && token2 && eligiblePools.length > 0 && (
          <PoolInfoContainer isDarkTheme={isDarkTheme}>
            <PoolInfoText>
              Pool: {eligiblePools[0]?.poolId}
              {isDefaultPool && (
                <Tooltip title="Using default pool for this token pair">
                  <StarIcon sx={{ fontSize: 14, color: isDarkTheme ? "#FFBE1D" : "#9933FF" }} />
                </Tooltip>
              )}
            </PoolInfoText>
            <DefaultPoolButton
              isDarkTheme={isDarkTheme}
              isDefault={isDefaultPool}
              onClick={() => {
                if (!token || !token2 || eligiblePools.length === 0) return;

                // Use original tokenId values for consistent storage/retrieval
                const tokenAIdForStorage = token.tokenId;
                const tokenBIdForStorage = token2.tokenId;
                const tokenAContractId = token.contractId;
                const tokenBContractId = token2.contractId;
                const currentPoolId = eligiblePools[0]?.poolId;

                if (isDefaultPool) {
                  // Clear default pool
                  clearDefaultPool(
                    tokenAIdForStorage,
                    tokenAContractId,
                    tokenBIdForStorage,
                    tokenBContractId
                  );
                  setIsDefaultPool(false);
                  toast.info("Default pool cleared. Using auto negotiation.");
                } else {
                  // Set as default pool
                  if (currentPoolId) {
                    setDefaultPool(
                      tokenAIdForStorage,
                      tokenAContractId,
                      tokenBIdForStorage,
                      tokenBContractId,
                      currentPoolId
                    );
                    setIsDefaultPool(true);
                    toast.success("Pool set as default for this token pair.");
                  }
                }
              }}
            >
              {isDefaultPool ? (
                <>
                  <StarIcon sx={{ fontSize: 16 }} />
                  Default
                </>
              ) : (
                <>
                  <StarBorderIcon sx={{ fontSize: 16 }} />
                  Set as default
                </>
              )}
            </DefaultPoolButton>
          </PoolInfoContainer>
        )}

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

