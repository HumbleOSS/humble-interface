import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  List,
  ListItem,
  Typography,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Skeleton,
  TextField,
  InputAdornment,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { ARC200TokenI } from "@/types";
import {
  getTokensWithTickers,
  selectTokens,
  selectTickers,
} from "@/store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { tokenSymbol } from "@/utils/dex";
import TokenSelect from "../TokenSelect";
import { getAlgorandClients } from "@/wallets";
import { swap } from "ulujs";
import { TOKEN_WVOI1 } from "@/constants/tokens";
import BigNumber from "bignumber.js";
import algosdk from "algosdk";
import { styled } from "@mui/material/styles";
import Confetti from "react-confetti";
import axios from "axios";

const GradientCircularProgress = styled(CircularProgress)({
  color: "transparent",
  background: "conic-gradient(from 0deg, #6f2ae2, #ffd700)",
  borderRadius: "50%",
  position: "absolute",
  mixBlendMode: "color",
});

const GlobalStyles = styled("div")({
  "@keyframes spin": {
    "0%": {
      transform: "rotate(0deg)",
    },
    "100%": {
      transform: "rotate(360deg)",
    },
  },
  "@keyframes fadeInSlide": {
    "0%": {
      opacity: 0,
      transform: "translateY(-10px)",
    },
    "100%": {
      opacity: 1,
      transform: "translateY(0)",
    },
  },
});

// Custom Token Input Panel using TokenSelect
const StepIndicator: React.FC<{
  currentStep: number;
  onStepClick: (step: number) => void;
  canProceedToStep: (step: number) => boolean;
}> = ({ currentStep, onStepClick, canProceedToStep }) => {
  const steps = [
    { number: 1, title: "Select Token", description: "Choose the token to zap" },
    { number: 2, title: "Select Pool", description: "Choose the target pool" },
    { number: 3, title: "Enter Amount", description: "Enter amount and validate" },
  ];

  return (
    <Box sx={{ mb: { xs: 2, sm: 3 } }}>
      <Box sx={{ 
        display: "flex", 
        justifyContent: "space-between", 
        mb: { xs: 1.5, sm: 2 },
        gap: { xs: 1, sm: 2 }
      }}>
        {steps.map((step, index) => (
          <Box
            key={step.number}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              cursor: canProceedToStep(step.number) ? "pointer" : "default",
            }}
            onClick={() => canProceedToStep(step.number) && onStepClick(step.number)}
          >
            <Box
              sx={{
                width: { xs: 36, sm: 40, md: 44 },
                height: { xs: 36, sm: 40, md: 44 },
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: { xs: 0.5, sm: 1 },
                bgcolor: currentStep >= step.number ? "primary.main" : "grey.300",
                color: currentStep >= step.number ? "white" : "grey.600",
                fontWeight: "bold",
                transition: "all 0.3s ease",
                fontSize: { xs: "0.875rem", sm: "1rem" },
                boxShadow: currentStep >= step.number ? "0 4px 12px rgba(111, 42, 226, 0.3)" : "none",
                "&:hover": canProceedToStep(step.number) ? {
                  transform: "scale(1.05)",
                  boxShadow: "0 6px 16px rgba(111, 42, 226, 0.4)"
                } : {}
              }}
            >
              {currentStep > step.number ? "✓" : step.number}
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: currentStep === step.number ? "bold" : "normal",
                color: currentStep >= step.number ? "primary.main" : "text.secondary",
                textAlign: "center",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                lineHeight: 1.2
              }}
            >
              {step.title}
            </Typography>
          </Box>
        ))}
      </Box>
      
      {/* Progress bar */}
      <Box sx={{ 
        position: "relative", 
        height: { xs: 3, sm: 4 }, 
        bgcolor: "grey.200", 
        borderRadius: 2,
        overflow: "hidden"
      }}>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            bgcolor: "primary.main",
            borderRadius: 2,
            transition: "width 0.3s ease",
            width: `${((currentStep - 1) / 2) * 100}%`,
            boxShadow: "0 2px 8px rgba(111, 42, 226, 0.3)"
          }}
        />
      </Box>
    </Box>
  );
};

// Simple Token Selector for Step 1
const TokenSelector: React.FC<{
  onCurrencySelect: (currency: ARC200TokenI) => void;
  currency: ARC200TokenI | null;
}> = ({ onCurrencySelect, currency }) => {
  const [tokens, setTokens] = useState<ARC200TokenI[]>([]);
  const dispatch = useDispatch();
  const reduxTokens = useSelector(selectTokens);

  useEffect(() => {
    setTokens(reduxTokens);
  }, [reduxTokens]);

  const handleTokenSelect = (token: ARC200TokenI) => {
    onCurrencySelect(token);
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: { xs: 2, sm: 3 },
        bgcolor: "background.paper",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          borderColor: "primary.main"
        }
      }}
    >
      <TokenSelect
        token={currency || undefined}
        options={tokens}
        onSelect={handleTokenSelect}
      />
    </Box>
  );
};

// Custom Token Input Panel using TokenSelect
const TokenInputPanel: React.FC<{
  value: string;
  onUserInput: (value: string) => void;
  onCurrencySelect: (currency: ARC200TokenI) => void;
  currency: ARC200TokenI | null;
  id: string;
  tokenBalances?: Record<number, string>;
  dexPrices?: Record<string, number>;
  onMaxClick?: () => void;
  balanceLoading?: boolean;
  balanceError?: string | null;
  getTokenIconUrl: (tokenId: string | number, symbol: string) => string;
}> = ({ 
  value, 
  onUserInput, 
  onCurrencySelect, 
  currency, 
  id,
  tokenBalances = {},
  dexPrices = {},
  onMaxClick,
  balanceLoading = false,
  balanceError = null,
  getTokenIconUrl
}) => {
  const [tokens, setTokens] = useState<ARC200TokenI[]>([]);
  const dispatch = useDispatch();
  const reduxTokens = useSelector(selectTokens);

  useEffect(() => {
    setTokens(reduxTokens);
  }, [reduxTokens]);

  const handleTokenSelect = (token: ARC200TokenI) => {
    onCurrencySelect(token);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 1.5, sm: 2 },
        p: { xs: 1.5, sm: 2 },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: { xs: 2, sm: 3 },
        bgcolor: "background.paper",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          borderColor: "primary.main"
        }
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
        <TokenSelect
          token={currency || undefined}
          options={tokens}
          onSelect={handleTokenSelect}
        />
        <TextField
          type="number"
          value={value}
          onChange={(e) => onUserInput(e.target.value)}
          placeholder="0.0"
          variant="outlined"
          size="small"
          sx={{ 
            flex: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: { xs: 2, sm: 2.5 },
              fontSize: { xs: "0.875rem", sm: "1rem" },
              "&:hover": {
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.main"
                }
              },
              "&.Mui-focused": {
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.main",
                  borderWidth: 2
                }
              }
            }
          }}
          InputProps={{
            startAdornment: currency && (
              <InputAdornment position="start">
                <img
                  src={getTokenIconUrl(currency.tokenId, currency.symbol)}
                  alt={`${currency.symbol} icon`}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    objectFit: "cover"
                  }}
                  onError={(e) => {
                    // Fallback to a default icon if the image fails to load
                    e.currentTarget.src = "https://asset-verification.nautilus.sh/icons/0.png";
                  }}
                />
              </InputAdornment>
            ),
            endAdornment: currency && (
              <InputAdornment position="end">
                <Typography variant="caption" color="text.secondary">
                  {currency.symbol}
                </Typography>
              </InputAdornment>
            ),
          }}
        />
      </Box>
      {currency && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            {currency.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Decimals: {currency.decimals}
          </Typography>
        </Box>
      )}
      
      {/* Balance Display and Max Button */}
      {currency && (
        (() => {
          // Get balance for the currency, trying both tokenId and contractId
          let balance = null;
          if (currency.symbol === "VOI") {
            balance = tokenBalances[0];
          } else {
            balance = tokenBalances[currency.tokenId];
            if (!balance && currency.contractId !== undefined) {
              balance = tokenBalances[currency.contractId];
            }
          }
          return balance && balance !== "0";
        })()
      ) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 1,
            animation: "fadeInSlide 0.3s ease-out",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Balance: {(() => {
                let balance = null;
                if (currency.symbol === "VOI") {
                  balance = tokenBalances[0];
                } else {
                  balance = tokenBalances[currency.tokenId];
                  if (!balance && currency.contractId !== undefined) {
                    balance = tokenBalances[currency.contractId];
                  }
                }
                return `${balance} ${currency.symbol}`;
              })()}
            </Typography>
            {(() => {
              let balance = null;
              if (currency.symbol === "VOI") {
                balance = tokenBalances[0];
              } else {
                balance = tokenBalances[currency.tokenId];
                if (!balance && currency.contractId !== undefined) {
                  balance = tokenBalances[currency.contractId];
                }
              }
              const balanceNum = parseFloat(balance.replace(/,/g, ""));
              const usdPrice = dexPrices[currency.tokenId.toString()] || 0;
              const usdValue = balanceNum * usdPrice;
              return usdValue > 0 ? (
                <Typography variant="caption" color="text.secondary">
                  ≈ ${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Typography>
              ) : null;
            })()}
          </Box>
          {onMaxClick && (
            <Button
              variant="text"
              size="small"
              aria-label="Select maximum token amount"
              onClick={onMaxClick}
              sx={{
                textTransform: "none",
                fontSize: "0.875rem",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  transform: "scale(1.05)",
                },
              }}
            >
              Max
            </Button>
          )}
        </Box>
      )}
      
      {balanceLoading && currency && (
        <Box sx={{ mt: 1 }}>
          <Skeleton variant="text" width="60%" height={20} />
        </Box>
      )}
      
      {balanceError && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="error">
            Failed to load balance: {balanceError}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

interface Pool {
  contractId: number;
  poolId: string;
  symbolA: string;
  symbolB: string;
  tokAId: string;
  tokBId: string;
  tokADecimals: number;
  tokBDecimals: number;
  tvl: number;
  tvlA: string;
  tvlB: string;
  apr: string;
  iconA?: string;
  iconB?: string;
}

const ZapAnimation = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      position: "relative",
      height: 120,
      width: 120,
      opacity: 0.7,
    }}
  >
    <svg width="0" height="0">
      <filter id="pixelate" x="0" y="0">
        <feFlood x="8" y="8" height="4" width="4" />
        <feComposite width="20" height="20" />
        <feTile result="a" />
        <feComposite in="SourceGraphic" in2="a" operator="in" />
        <feMorphology operator="dilate" radius="3" />
      </filter>
    </svg>
    <GradientCircularProgress
      size={120}
      sx={{ animation: "spin 2s linear infinite" }}
    />
  </Box>
);

const Zap: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const dispatch = useDispatch();
  const tokens: ARC200TokenI[] = useSelector(selectTokens);
  const tickers = useSelector(selectTickers);
  const tokenStatus = useSelector((state: RootState) => state.tokens.status);
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [canProceedToNext, setCanProceedToNext] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [inputCurrency, setInputCurrency] = useState<ARC200TokenI | null>(null);
  const [inputAmount, setInputAmount] = useState<string>("");
  const [targetPairAddress, setTargetPairAddress] = useState<string>("");
  const [availablePools, setAvailablePools] = useState<Pool[]>([]);
  const [page, setPage] = useState(1);
  const poolsPerPage = 4;
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [maxBalance, setMaxBalance] = useState<string>("0");
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [estimatedOutput, setEstimatedOutput] = useState<string | null>(null);
  const [poolSearchQuery, setPoolSearchQuery] = useState("");
  const [availableTokens, setAvailableTokens] = useState<ARC200TokenI[]>([]);

  // Enhanced state for balance and price management
  const [tokenBalances, setTokenBalances] = useState<Record<number, string>>({});
  const [dexPrices, setDexPrices] = useState<Record<string, number>>({});
  const [usdcPrice, setUsdcPrice] = useState<number>(1);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Token pair switching state
  const [selectedTokenInPair, setSelectedTokenInPair] = useState<"A" | "B">("A");

  // Success state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    inputAmount: string;
    inputToken: string;
    poolName: string;
    transactionId: string;
  } | null>(null);

  // Price impact and share calculations
  const [priceImpact, setPriceImpact] = useState<number>(0);
  const [estimatedShare, setEstimatedShare] = useState<number>(0);
  const [impactLoading, setImpactLoading] = useState(false);

  const loadingMessages = [
    "Preparing your transaction...",
    "Mixing the perfect cocktail of tokens...",
    "Teaching algorithms to dance...",
    "Consulting with crypto hamsters...",
    "Aligning the blockchain stars...",
    "Warming up the quantum computers...",
  ];

  // Load tokens from Redux store
  useEffect(() => {
    dispatch(getTokensWithTickers() as unknown as UnknownAction);
  }, [dispatch]);

  // Fetch DEX prices for USD calculations
  const fetchDexPrices = useCallback(async () => {
    try {
      const response = await axios.get(
        "https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/prices",
        { timeout: 10000 }
      );

      if (response.data?.prices && Array.isArray(response.data.prices)) {
        const priceMap: Record<string, number> = {};

        response.data.prices.forEach((priceData: any) => {
          // Extract token IDs from poolId (format: "tokenA-tokenB")
          const [tokenAId, tokenBId] = priceData.poolId.split("-");

          // Store prices relative to VOI (tokenId: 0)
          if (tokenAId === "0") {
            // VOI is token A, so price is how many VOI per token B
            priceMap[tokenBId] = 1 / priceData.price;
          } else if (tokenBId === "0") {
            // VOI is token B, so price is how many VOI per token A
            priceMap[tokenAId] = priceData.price;
          }
        });

        // Find USDC (aUSDC - tokenId: 395614) price in VOI
        const usdcTokenId = "395614";
        const usdcToVoiPrice = priceMap[usdcTokenId];

        if (usdcToVoiPrice) {
          // If 1 USDC = X VOI, then 1 VOI = 1/X USDC
          const voiToUsdcPrice = 1 / usdcToVoiPrice;
          setUsdcPrice(voiToUsdcPrice);

          // Convert all VOI prices to USD using USDC as reference
          const usdPrices: Record<string, number> = {};
          Object.entries(priceMap).forEach(([tokenId, voiPrice]) => {
            usdPrices[tokenId] = voiPrice * voiToUsdcPrice;
          });

          // Add VOI itself
          usdPrices["0"] = voiToUsdcPrice;

          setDexPrices(usdPrices);
        } else {
          console.warn("USDC price not found in DEX data");
          setDexPrices(priceMap);
        }
      }
    } catch (error) {
      console.error("Error fetching DEX prices:", error);
    }
  }, []);

  // Fetch balances using Nautilus indexer API
  const fetchBalances = useCallback(async () => {
    if (!activeAccount) {
      setTokenBalances({});
      return;
    }

    setBalanceLoading(true);
    setBalanceError(null);

    try {
      // Fetch account balances from Nautilus indexer
      const response = await axios.get(
        `https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/balances?accountId=${activeAccount.address}`,
        { timeout: 10000 } // 10 second timeout
      );

      const balances: Record<number, string> = {};

      // Process all balances from the API response (including zero balances for proper display)
      if (response.data?.balances && Array.isArray(response.data.balances)) {
        console.log("Processing balances:", response.data.balances.length, "items");
        response.data.balances.forEach((balanceItem: any) => {
          const contractId = balanceItem.contractId;
          const balance = balanceItem.balance || "0";
          const decimals = balanceItem.decimals || 0;

          console.log("Processing balance item:", { contractId, balance, decimals });

          // Convert balance to human readable format
          if (balance !== "0") {
            const balanceNumber = parseFloat(balance) / Math.pow(10, decimals);
            balances[contractId] = balanceNumber.toLocaleString(undefined, {
              maximumFractionDigits: Math.min(6, decimals),
              minimumFractionDigits: 0,
            });
            console.log("Set balance for contractId", contractId, ":", balances[contractId]);
          } else {
            balances[contractId] = "0";
          }
        });
      }

      // Also fetch VOI balance from account info
      try {
        const { algodClient } = getAlgorandClients();
        const accountInfo = await algodClient
          .accountInformation(activeAccount.address)
          .do();
        const voiAmount = accountInfo.amount || 0;
        const minBalance = accountInfo["min-balance"] || 0;
        const availableVoi = Math.max(0, voiAmount - minBalance);
        balances[0] = (availableVoi / 1e6).toLocaleString(undefined, {
          maximumFractionDigits: 6,
          minimumFractionDigits: 0,
        });
      } catch (voiError) {
        console.warn("Error fetching VOI balance:", voiError);
        balances[0] = "0";
      }

      setTokenBalances(balances);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error("Error fetching balances:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch balances";

      // Auto-retry up to 2 times with exponential backoff
      if (retryCount < 2) {
        console.log(`Retrying balance fetch (attempt ${retryCount + 1})...`);
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          fetchBalances();
        }, Math.pow(2, retryCount) * 1000); // 1s, 2s, 4s delays
      } else {
        setBalanceError(errorMessage);
        setTokenBalances({});
      }
    } finally {
      setBalanceLoading(false);
    }
  }, [activeAccount, retryCount]);

  // Helper function to get token USD price from DEX data
  const getTokenUsdPrice = useCallback(
    (token: ARC200TokenI): number => {
      return dexPrices[token.tokenId.toString()] || 0;
    },
    [dexPrices]
  );

  // Helper function to calculate balance value in USD
  const getBalanceValue = useCallback(
    (token: ARC200TokenI): number => {
      const balance = tokenBalances[token.tokenId];
      if (!balance || balance === "0") {
        return 0;
      }

      // Parse balance (remove commas)
      const balanceNum = parseFloat(balance.replace(/,/g, ""));
      if (isNaN(balanceNum)) return 0;

      // Get USD price from DEX data
      const usdPrice = getTokenUsdPrice(token);
      if (!usdPrice) {
        return 0;
      }

      return balanceNum * usdPrice;
    },
    [tokenBalances, getTokenUsdPrice]
  );

  // Filter tokens with balances for better UX
  const tokensWithBalances = useMemo(() => {
    return tokens.filter((token) => {
      const balance = tokenBalances[token.tokenId];
      const num = balance ? parseFloat(balance.replace(/,/g, "")) : 0;
      return !!num && !isNaN(num) && num > 0;
    }).sort((a, b) => (getBalanceValue(b) - getBalanceValue(a)));
  }, [tokens, tokenBalances, getBalanceValue]);

  // Initial balance and price fetch
  useEffect(() => {
    fetchBalances();
    fetchDexPrices();
  }, [fetchBalances, fetchDexPrices]);

  // Periodic refresh
  useEffect(() => {
    const balanceInterval = setInterval(fetchBalances, 300000); // 5 minutes
    const priceInterval = setInterval(fetchDexPrices, 60000); // 1 minute

    return () => {
      clearInterval(balanceInterval);
      clearInterval(priceInterval);
    };
  }, [fetchBalances, fetchDexPrices]);

  useEffect(() => {
    if (isSigningModalOpen) {
      const interval = setInterval(() => {
        setLoadingMessage((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSigningModalOpen]);

  // Step validation
  const validateStep = useCallback((step: number) => {
    console.log("validateStep called", { step, inputCurrency, targetPairAddress, inputAmount });
    switch (step) {
      case 1:
        return !!inputCurrency;
      case 2:
        return !!inputCurrency; // Only require inputCurrency for step 2, not targetPairAddress
      case 3:
        return !!inputCurrency && !!targetPairAddress && !!inputAmount && parseFloat(inputAmount) > 0;
      default:
        return false;
    }
  }, [inputCurrency, targetPairAddress, inputAmount]);

  // Update can proceed when dependencies change
  useEffect(() => {
    setCanProceedToNext(validateStep(currentStep));
  }, [currentStep, validateStep]);

  // Enhanced token selection with balance information
  const handleInputSelect = useCallback((inputCurrency: ARC200TokenI) => {
    console.log("Token selected:", inputCurrency);
    setInputCurrency(inputCurrency);
    // Reset subsequent steps when token changes
    setTargetPairAddress("");
    setSelectedPoolId(null);
    setInputAmount("");
    setCurrentStep(1);
    setShowConfirmation(false);
  }, []);

  const handleInputAmountChange = useCallback((value: string) => {
    setInputAmount(value);
  }, []);

  // Step navigation
  const handleNextStep = useCallback(() => {
    console.log("handleNextStep called", { canProceedToNext, currentStep, inputCurrency });
    if (canProceedToNext && currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    }
  }, [canProceedToNext, currentStep, inputCurrency]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setShowConfirmation(false);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((step: number) => {
    // Only allow clicking on completed steps or current step
    if (step <= currentStep || validateStep(step - 1)) {
      setCurrentStep(step);
    }
  }, [currentStep, validateStep]);

  // Add new useEffect to fetch pools when input currency changes
  useEffect(() => {
    const fetchPools = async () => {
      if (inputCurrency && inputCurrency.tokenId !== undefined) {
        console.log("Fetching pools for token:", inputCurrency.symbol, "tokenId:", inputCurrency.tokenId);
        
        // Handle VOI tokenId mapping - VOI uses 390001 in the API, not 0
        let searchTokenId = inputCurrency.tokenId;
        if (inputCurrency.symbol === "VOI") {
          searchTokenId = 390001;
          console.log("VOI detected, using tokenId:", searchTokenId);
        }
        
        try {
          const response = await fetch(
            `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools?tokenId=${searchTokenId}`
          );
          const data = await response.json();
          console.log("Pool API response:", data);
          if (data.pools && Array.isArray(data.pools)) {
            console.log("Found pools:", data.pools.length);
            setAvailablePools(data.pools);
          } else {
            console.log("No pools found or invalid response format");
            // Try alternative API endpoint or show fallback pools
            try {
              const fallbackResponse = await fetch(
                `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools`
              );
              const fallbackData = await fallbackResponse.json();
              console.log("Fallback API response:", fallbackData);
              if (fallbackData.pools && Array.isArray(fallbackData.pools)) {
                // Filter pools that contain the selected token
                const relevantPools = fallbackData.pools.filter((pool: any) => 
                  pool.tokAId === searchTokenId.toString() || 
                  pool.tokBId === searchTokenId.toString()
                );
                console.log("Found relevant pools from fallback:", relevantPools.length);
                setAvailablePools(relevantPools);
              } else {
                setAvailablePools([]);
              }
            } catch (fallbackError) {
              console.error("Fallback API also failed:", fallbackError);
              setAvailablePools([]);
            }
          }
        } catch (error) {
          console.error("Failed to fetch pools:", error);
          setAvailablePools([]);
        }
      } else {
        console.log("No input currency or tokenId, clearing pools");
        setAvailablePools([]);
      }
    };

    fetchPools();
  }, [inputCurrency]);

  const handleMaxClick = () => {
    console.log("Max button clicked", { inputCurrency, tokenBalances });
    
    if (!inputCurrency) {
      console.log("No input currency selected");
      return;
    }

    // Get the appropriate balance for the selected token
    let balance = null;
    if (inputCurrency.symbol === "VOI") {
      balance = tokenBalances[0]; // VOI uses tokenId 0
    } else {
      // For ARC200 tokens, try both tokenId and contractId
      balance = tokenBalances[inputCurrency.tokenId];
      
      // If not found by tokenId, try contractId
      if (!balance && inputCurrency.contractId !== undefined) {
        balance = tokenBalances[inputCurrency.contractId];
      }
    }

    console.log("Balance lookup result:", {
      symbol: inputCurrency.symbol,
      tokenId: inputCurrency.tokenId,
      contractId: inputCurrency.contractId,
      balance: balance,
      availableBalances: Object.keys(tokenBalances)
    });

    if (balance && balance !== "0") {
      // Remove commas from balance for number input
      const cleanBalance = balance.replace(/,/g, "");
      console.log("Setting max amount:", cleanBalance);
      setInputAmount(cleanBalance);
    } else {
      console.log("Cannot set max amount - no balance available:", {
        symbol: inputCurrency.symbol,
        tokenId: inputCurrency.tokenId,
        contractId: inputCurrency.contractId,
        balance: balance || "N/A",
        allBalances: tokenBalances
      });
    }
  };

  const handlePoolSelect = (poolId: string, contractId: string) => {
    setSelectedPoolId(poolId);
    setTargetPairAddress(contractId);
    
    // Set the initial token to token A of the selected pool
    setSelectedTokenInPair("A");
    
    // Auto-advance to next step when pool is selected
    setTimeout(() => {
      setCurrentStep(3);
    }, 100);
  };

  const handleOpenModal = async () => {
    setIsLoadingTokens(true);
    try {
      // Token loading is now handled by Redux
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const handleZapConfirm = () => {
    setShowConfirmation(true);
  };

  const handleBackFromConfirmation = () => {
    setShowConfirmation(false);
  };

  const handleExecuteZap = () => {
    setShowConfirmation(false);
    handleZap();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleZap = async () => {
    if (!activeAccount) return;
    setIsModalOpen(false);
    setIsLoading(true);
    setIsSigningModalOpen(true);

    const pool = availablePools.find(
      (p) => p.contractId === Number(targetPairAddress)
    );

    if (!pool) {
      setErrorMessage("Pool not found");
      setIsLoading(false);
      setIsSigningModalOpen(false);
      return;
    }

    const acc = {
      addr: activeAccount.address,
      sk: new Uint8Array(0),
    };

    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      // pick a pool with best rate

      // get last round
      const status = await algodClient.status().do();
      const { ["last-round"]: lastRound } = status;

      const ci = new swap(
        Number(targetPairAddress),
        algodClient,
        indexerClient,
        {
          acc,
        }
      );

      const networkToken = {
        contractId: TOKEN_WVOI1,
        tokenId: "0",
        decimals: 6,
        symbol: "VOI",
      };

      const swapAForB = pool.tokAId === `${inputCurrency?.tokenId}`;

      const mA =
        pool.symbolA === "VOI"
          ? networkToken
          : {
              contractId: Number(pool.tokAId),
              tokenId: swapAForB ? inputCurrency?.tokenId : null,
              decimals: pool.tokADecimals,
              symbol: pool.symbolA,
            };

      const mB =
        pool.symbolB === "VOI"
          ? networkToken
          : {
              contractId: Number(pool.tokBId),
              tokenId: !swapAForB ? inputCurrency?.tokenId : null,
              decimals: pool.tokBDecimals,
              symbol: pool.symbolB,
            };

      console.log({ mA, mB });

      const fromAtomicUnit = new BigNumber(1)
        .dividedBy(new BigNumber(10).pow(inputCurrency?.decimals || 6))
        .toString();

      const fromAmount = new BigNumber(inputAmount)
        .dividedBy(2)
        .toFixed(inputCurrency?.decimals || 6);

      const fromLessAmount = new BigNumber(fromAmount)
        .minus(new BigNumber(fromAtomicUnit))
        .toFixed(inputCurrency?.decimals || 6);

      console.log({
        fromAmount,
        swapAForB,
        tokAId: pool.tokAId,
        tokBId: pool.tokBId,
        targetPairAddress,
        inputCurrency,
        fromLessAmount,
        fromAtomicUnit,
      });

      // figure out to amount

      console.log({ swapAForB });

      const sA = swapAForB
        ? {
            ...mA,
            amount: fromLessAmount,
            decimals: `${mA.decimals}`,
            tokenId: mA.tokenId?.toString() ?? undefined,
          }
        : {
            ...mB,
            amount: fromLessAmount,
            decimals: `${mB.decimals}`,
            tokenId: mB.tokenId?.toString() ?? undefined,
          };

      const sB = swapAForB
        ? {
            ...mB,
            decimals: `${mB.decimals}`,
            tokenId: mB.tokenId?.toString() ?? undefined,
          }
        : {
            ...mA,
            decimals: `${mA.decimals}`,
            tokenId: mA.tokenId?.toString() ?? undefined,
          };

      console.log({ sA, sB });

      // logIndex
      // if symbolA or symbolB is VOI, then logIndex is -2, otherwise it is -1

      const skipWithdraw = pool.symbolA === "VOI" || pool.symbolB === "VOI";

      const logIndex = skipWithdraw
        ? -1
        : ["VOI", "aUSDC"].includes(pool.symbolA)
        ? -2
        : -1;

      const swapR: any = await ci.swap(
        acc.addr,
        Number(pool.contractId),
        sA,
        sB,
        [],
        {
          debug: true,
          slippage: 0.1,
          degenMode: true,
          skipWithdraw: true,
        }
      );

      console.log({ swapR });

      if (!swapR.success) throw new Error("Swap simulation failed");

      const swapTxnObjs = swapR.objs;

      // pay pool fee for balance box (non wrapped tokens)
      // if (!inputCurrency.tokenId) {
      //   for (let i = 0; i < swapTxnObjs.length; i++) {
      //     if (swapTxnObjs[i].appIndex === pool.contractId) {
      //       console.log("found pool fee", swapTxnObjs[i], pool.contractId);
      //       swapTxnObjs[i].payment = 28500;
      //       console.log("found pool fee", swapTxnObjs[i], pool.contractId);
      //       break;
      //     }
      //   }
      // }

      const outAB = Buffer.from(
        swapR.response.txnGroups[0].txnResults
          .slice(logIndex)[0]
          .txnResult.logs.slice(-1)[0]
          .slice(4)
      );

      console.log({ outAB });

      const outA = outAB.slice(0, 32);
      const outB = outAB.slice(32, 64);

      const out = swapAForB ? outB : outA;

      console.log({ swapAForB, out });

      const outBn = new BigNumber("0x" + Buffer.from(out).toString("hex"));

      console.log({ outBn });

      const outN = outBn
        .dividedBy(
          new BigNumber(10).pow(Number(swapAForB ? mB.decimals : mA.decimals))
        )
        .toFixed(Number(swapAForB ? mB.decimals : mA.decimals));

      console.log({ outBn, out, outA, outB, swapTxnObjs, outN });

      // deposit

      // remove tokenId conditionally to prevent deposit of wrapped token
      const dA = {
        ...mA,
        decimals: `${mA.decimals}`,
        amount: swapAForB ? fromAmount : outN,
        tokenId: swapAForB ? inputCurrency?.tokenId?.toString() : null,
      };

      // remove tokenId conditionally to prevent deposit of wrapped token
      const dB = {
        ...mB,
        decimals: `${mB.decimals}`,
        amount: swapAForB ? outN : fromAmount,
        tokenId: swapAForB ? null : inputCurrency?.tokenId?.toString(),
      };

      console.log(acc.addr, Number(pool.contractId), dA, dB, swapTxnObjs, {
        debug: true,
        swapAForB,
        outN,
        fromAmount,
      });

      const depositR: any = await ci.deposit(
        acc.addr,
        Number(pool.contractId),
        dA,
        dB,
        swapTxnObjs,
        {
          debug: true,
        }
      );

      console.log({ depositR });

      if (!depositR.success) throw new Error("Deposit failed");

      setIsSigningModalOpen(true);
      const stxns = await signTransactions(
        depositR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      console.log({ stxns });

      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await algosdk.waitForConfirmation(algodClient, res.txId, 1000);

      setInputCurrency(null);
      setTargetPairAddress("");
      setInputAmount("");
      setAvailablePools([]);
      setSelectedPoolId(null);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000); // Hide confetti after 5 seconds

      let swapEvents: any;
      do {
        swapEvents = await ci.SwapEvents({
          minRound: lastRound,
          sender: activeAccount.address,
        });
      } while (!swapEvents.length);

      setIsSigningModalOpen(false);
      handleCloseModal();

      // Show success modal with transaction details
      setSuccessDetails({
        inputAmount: inputAmount,
        inputToken: inputCurrency?.symbol || "Unknown",
        poolName: `${pool.symbolA}/${pool.symbolB}`,
        transactionId: res.txId
      });
      setShowSuccessModal(true);

      // trackZapTransaction(true, {
      //   inputToken: inputCurrency?.symbol,
      //   inputAmount,
      //   targetPool: `${pool.symbolA}/${pool.symbolB}`,
      //   ...(swapR.response ? { swapResponse: swapR.response } : {}),
      // });
    } catch (error: any) {
      //setErrorMessage(error.message);
      // trackZapTransaction(false, {
      //   inputToken: inputCurrency?.symbol,
      //   inputAmount,
      //   targetPool: `${pool.symbolA}/${pool.symbolB}`,
      //   error: error.message,
      // });
    } finally {
      setIsLoading(false);
      setIsSigningModalOpen(false);
    }
  };

  // Find the selected pool details
  const selectedPool = availablePools.find(
    (pool) => pool.contractId === Number(targetPairAddress)
  );

  // Helper function to get token icon URL
  const getTokenIconUrl = useCallback((tokenId: string | number, symbol: string) => {
    // Handle VOI token (tokenId: 0)
    if (symbol === "VOI" || tokenId === "0" || tokenId === 0) {
      return "https://asset-verification.nautilus.sh/icons/0.png";
    }
    return `https://asset-verification.nautilus.sh/icons/${tokenId}.png`;
  }, []);

  // Helper function to calculate price impact and share
  const calculateImpactAndShare = useCallback(async () => {
    if (!selectedPool || !inputCurrency || !inputAmount || parseFloat(inputAmount) <= 0) {
      setPriceImpact(0);
      setEstimatedShare(0);
      return;
    }

    setImpactLoading(true);
    try {
      const amount = parseFloat(inputAmount);
      const poolTvl = selectedPool.tvl;
      
      // Calculate estimated share based on input amount relative to pool TVL
      const inputValueUSD = amount * (dexPrices[inputCurrency.tokenId.toString()] || 0);
      const sharePercentage = (inputValueUSD / poolTvl) * 100;
      setEstimatedShare(Math.min(sharePercentage, 100)); // Cap at 100%
      
      // Calculate price impact (simplified model)
      // Higher share = higher price impact
      let impact = 0;
      if (sharePercentage > 0) {
        // Exponential impact model: impact increases with share size
        impact = Math.pow(sharePercentage / 10, 1.5) * 0.1; // Base 0.1% impact
        impact = Math.min(impact, 5); // Cap at 5% impact
      }
      setPriceImpact(impact);
      
    } catch (error) {
      console.error("Error calculating impact:", error);
      setPriceImpact(0);
      setEstimatedShare(0);
    } finally {
      setImpactLoading(false);
    }
  }, [selectedPool, inputCurrency, inputAmount, dexPrices]);

  // Helper function to get tokens from selected pool
  const getPoolTokens = useCallback(() => {
    if (!selectedPool) return { tokenA: null, tokenB: null };
    
    // Find token A in the tokens list
    const tokenA = tokens.find(t => {
      if (selectedPool.symbolA === "VOI") {
        return t.symbol === "VOI" && t.tokenId === 0;
      }
      return t.tokenId.toString() === selectedPool.tokAId;
    });
    
    // Find token B in the tokens list
    const tokenB = tokens.find(t => {
      if (selectedPool.symbolB === "VOI") {
        return t.symbol === "VOI" && t.tokenId === 0;
      }
      return t.tokenId.toString() === selectedPool.tokBId;
    });
    
    return { tokenA, tokenB };
  }, [selectedPool, tokens]);

  // Helper function to switch between tokens in the pair
  const switchTokenInPair = useCallback(() => {
    const { tokenA, tokenB } = getPoolTokens();
    const otherToken = selectedTokenInPair === "A" ? tokenB : tokenA;
    
    if (otherToken) {
      setSelectedTokenInPair(selectedTokenInPair === "A" ? "B" : "A");
      setInputCurrency(otherToken);
      setInputAmount(""); // Reset amount when switching tokens
    }
  }, [selectedTokenInPair, getPoolTokens]);

  // Effect to set initial input currency when pool is selected
  useEffect(() => {
    if (selectedPool && selectedTokenInPair) {
      const { tokenA, tokenB } = getPoolTokens();
      const initialToken = selectedTokenInPair === "A" ? tokenA : tokenB;
      
      if (initialToken && (!inputCurrency || inputCurrency.tokenId !== initialToken.tokenId)) {
        setInputCurrency(initialToken);
        setInputAmount(""); // Reset amount when switching tokens
      }
    }
  }, [selectedPool, selectedTokenInPair, getPoolTokens, inputCurrency]);

  // Effect to calculate impact and share when values change
  useEffect(() => {
    calculateImpactAndShare();
  }, [calculateImpactAndShare]);

  // Memoize complex calculations or components
  const memoizedPoolList = useMemo(
    () =>
      availablePools
        .slice((page - 1) * poolsPerPage, page * poolsPerPage)
        .map((pool) => (
          <ListItem
            key={pool.poolId}
            onClick={() =>
              handlePoolSelect(pool.poolId, pool.contractId.toString())
            }
            sx={{
              border: "1px solid #eee",
              borderRadius: 1,
              mb: 1,
              backgroundColor:
                selectedPoolId === pool.poolId
                  ? "rgba(111, 42, 226, 0.08)"
                  : "transparent",
              "&:hover": {
                backgroundColor:
                  selectedPoolId === pool.poolId
                    ? "rgba(111, 42, 226, 0.12)"
                    : "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {pool.iconA && (
                    <img
                      src={pool.iconA}
                      alt={pool.symbolA}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                      }}
                    />
                  )}
                  {pool.iconB && (
                    <img
                      src={pool.iconB}
                      alt={pool.symbolB}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        marginLeft: -8,
                      }}
                    />
                  )}
                </Box>
                <Typography>{`${pool.symbolA}/${pool.symbolB}`}</Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography>
                  <svg
                    className="h-[14px] inline-block mb-4 p-1 w-[14px]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 500 446.4"
                    style={{
                      verticalAlign: "middle",
                      marginRight: "2px",
                      width: "14px",
                      height: "14px",
                    }}
                  >
                    <path
                      fill="#6f2ae2"
                      d="M243.7,446.3c-34.1,0-65.5-18.1-82.6-47.6L12.9,143.6C-13.6,97.9,2,39.4,47.6,12.9 C93.3-13.6,151.7,2,178.2,47.6l65.5,112.8l65.5-112.8c26.5-45.6,85-61.2,130.6-34.7c45.6,26.5,61.2,85,34.7,130.6L326.4,398.8 C309.3,428.2,277.8,446.3,243.7,446.3z"
                    />
                  </svg>
                  {pool.tvl.toLocaleString()}
                </Typography>
                <Typography>APR: {pool.apr}%</Typography>
              </Box>
            </Box>
          </ListItem>
        )),
    [availablePools, page, poolsPerPage, selectedPoolId]
  );

  const filteredPools = useMemo(
    () =>
      availablePools.filter(
        (pool) =>
          pool.symbolA.toLowerCase().includes(poolSearchQuery.toLowerCase()) ||
          pool.symbolB.toLowerCase().includes(poolSearchQuery.toLowerCase())
      ),
    [availablePools, poolSearchQuery]
  );

  const trackZapTransaction = (success: boolean, details: any) => {
    // Integration with analytics platform
    // analytics.track('Zap Transaction', {
    //   success,
    //   inputToken: inputCurrency?.symbol,
    //   inputAmount,
    //   targetPool: `${selectedPool?.symbolA}/${selectedPool?.symbolB}`,
    //   ...details
    // });
  };

  return (
    <GlobalStyles>
      {showConfetti && (
        <Confetti
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 999,
          }}
        />
      )}
      <Card
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          maxWidth: { xs: "100%", sm: 480, md: 520 },
          mx: "auto",
          mt: { xs: 1, sm: 2, md: 4 },
          width: { xs: "95%", sm: "auto" },
          borderRadius: { xs: 3, sm: 4, md: 5 },
          boxShadow: {
            xs: "0 4px 12px rgba(0,0,0,0.1)",
            sm: "0 8px 24px rgba(0,0,0,0.12)",
            md: "0 12px 32px rgba(0,0,0,0.15)"
          },
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden"
        }}
      >
        {/* Step Indicator */}
        {!showConfirmation && (
          <StepIndicator
            currentStep={currentStep}
            onStepClick={handleStepClick}
            canProceedToStep={(step) => step <= currentStep || validateStep(step - 1)}
          />
        )}

        {/* Step 1: Select Token */}
        {currentStep === 1 && !showConfirmation && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Select Token to Zap
            </Typography>
            {!activeAccount ? (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Please connect your wallet to start zapping
                </Typography>
                <Button variant="contained" color="primary" disabled>
                  Connect Wallet
                </Button>
              </Box>
            ) : (
              <>
                <TokenSelector
                  onCurrencySelect={handleInputSelect}
                  currency={inputCurrency}
                />
                            <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" color="text.secondary">
                Debug: {tokens.length} tokens loaded
              </Typography>
              <Box sx={{ display: "flex", gap: { xs: 0.5, sm: 1 } }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    console.log("Manual pool fetch test");
                    const testToken = { symbol: "VOI", tokenId: 0 } as ARC200TokenI;
                    setInputCurrency(testToken);
                  }}
                  sx={{
                    borderRadius: { xs: 1.5, sm: 2 },
                    fontSize: { xs: "0.75rem", sm: "0.875rem" }
                  }}
                >
                  Test VOI
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNextStep}
                  disabled={!canProceedToNext}
                  sx={{
                    borderRadius: { xs: 2, sm: 2.5 },
                    fontSize: { xs: "0.875rem", sm: "1rem" }
                  }}
                >
                  Next: Select Pool
                </Button>
              </Box>
            </Box>
              </>
            )}
          </Box>
        )}

        {/* Step 2: Select Pool */}
        {currentStep === 2 && !showConfirmation && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Select Target Pool
            </Typography>
            {inputCurrency && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Available pools for {inputCurrency.symbol} (Debug: {availablePools.length} pools found)
              </Typography>
            )}
            {availablePools.length > 0 ? (
              <List sx={{ mb: 2 }}>
                {availablePools
                  .slice((page - 1) * poolsPerPage, page * poolsPerPage)
                  .map((pool) => (
                    <ListItem
                      key={pool.poolId}
                      onClick={() => handlePoolSelect(pool.poolId, pool.contractId.toString())}
                      sx={{
                        border: "1px solid #eee",
                        borderRadius: { xs: 2, sm: 3 },
                        mb: { xs: 0.5, sm: 1 },
                        p: { xs: 1, sm: 1.5 },
                        backgroundColor:
                          selectedPoolId === pool.poolId
                            ? "rgba(111, 42, 226, 0.08)"
                            : "transparent",
                        "&:hover": {
                          backgroundColor:
                            selectedPoolId === pool.poolId
                              ? "rgba(111, 42, 226, 0.12)"
                              : "rgba(0, 0, 0, 0.04)",
                          transform: "translateY(-1px)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                        },
                        transition: "all 0.2s ease",
                        cursor: "pointer"
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            {pool.iconA && (
                              <img
                                src={pool.iconA}
                                alt={pool.symbolA}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: "50%",
                                }}
                              />
                            )}
                            {pool.iconB && (
                              <img
                                src={pool.iconB}
                                alt={pool.symbolB}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: "50%",
                                  marginLeft: -8,
                                }}
                              />
                            )}
                          </Box>
                          <Typography>{`${pool.symbolA}/${pool.symbolB}`}</Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography>
                            <svg
                              className="h-[14px] inline-block mb-4 p-1 w-[14px]"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 500 446.4"
                              style={{
                                verticalAlign: "middle",
                                marginRight: "2px",
                                width: "14px",
                                height: "14px",
                              }}
                            >
                              <path
                                fill="#6f2ae2"
                                d="M243.7,446.3c-34.1,0-65.5-18.1-82.6-47.6L12.9,143.6C-13.6,97.9,2,39.4,47.6,12.9 C93.3-13.6,151.7,2,178.2,47.6l65.5,112.8l65.5-112.8c26.5-45.6,85-61.2,130.6-34.7c45.6,26.5,61.2,85,34.7,130.6L326.4,398.8 C309.3,428.2,277.8,446.3,243.7,446.3z"
                              />
                            </svg>
                            {pool.tvl.toLocaleString()}
                          </Typography>
                          <Typography>APR: {pool.apr}%</Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                No pools available for this token
              </Typography>
            )}
            <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
              <Button 
                variant="outlined" 
                onClick={handlePrevStep}
                sx={{
                  borderRadius: { xs: 2, sm: 2.5 },
                  fontSize: { xs: "0.875rem", sm: "1rem" }
                }}
              >
                Back: Select Token
              </Button>
              <Button
                variant="contained"
                onClick={handleNextStep}
                disabled={!canProceedToNext}
                sx={{
                  borderRadius: { xs: 2, sm: 2.5 },
                  fontSize: { xs: "0.875rem", sm: "1rem" }
                }}
              >
                Next: Enter Amount
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 3: Enter Amount */}
        {currentStep === 3 && !showConfirmation && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Enter Amount
            </Typography>
            
            {/* Token Pair Info and Switch */}
            {selectedPool && (
              <Box sx={{ 
                mb: 2, 
                p: { xs: 1.5, sm: 2 },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: { xs: 2, sm: 3 },
                bgcolor: "background.paper",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Pool:
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <img
                      src={getTokenIconUrl(selectedPool.tokAId, selectedPool.symbolA)}
                      alt={selectedPool.symbolA}
                      style={{ width: 20, height: 20, borderRadius: "50%" }}
                      onError={(e) => {
                        // Fallback to a default icon if the image fails to load
                        e.currentTarget.src = "https://asset-verification.nautilus.sh/icons/0.png";
                      }}
                    />
                    <Typography variant="body2" fontWeight="medium">
                      {selectedPool.symbolA}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      /
                    </Typography>
                    <img
                      src={getTokenIconUrl(selectedPool.tokBId, selectedPool.symbolB)}
                      alt={selectedPool.symbolB}
                      style={{ width: 20, height: 20, borderRadius: "50%" }}
                      onError={(e) => {
                        // Fallback to a default icon if the image fails to load
                        e.currentTarget.src = "https://asset-verification.nautilus.sh/icons/0.png";
                      }}
                    />
                    <Typography variant="body2" fontWeight="medium">
                      {selectedPool.symbolB}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={switchTokenInPair}
                  sx={{
                    borderRadius: { xs: 1.5, sm: 2 },
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    minWidth: "auto",
                    px: { xs: 1, sm: 1.5 }
                  }}
                >
                  Switch Token
                </Button>
              </Box>
            )}
            
            <TokenInputPanel
              value={inputAmount}
              onUserInput={handleInputAmountChange}
              onCurrencySelect={handleInputSelect}
              currency={inputCurrency}
              id="zap-input-token"
              tokenBalances={tokenBalances}
              dexPrices={dexPrices}
              onMaxClick={handleMaxClick}
              balanceLoading={balanceLoading}
              balanceError={balanceError}
              getTokenIconUrl={getTokenIconUrl}
            />

            {/* Impact and Share Display - Hidden for now */}
            {/* {selectedPool && inputAmount && parseFloat(inputAmount) > 0 && (
              <Box sx={{ 
                mt: 2,
                p: { xs: 1.5, sm: 2 },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: { xs: 2, sm: 3 },
                bgcolor: "background.paper",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: "bold", color: "text.primary" }}>
                  Transaction Impact
                </Typography>
                
                {impactLoading ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="40%" height={20} />
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Estimated Pool Share:
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium" color="primary.main">
                          {estimatedShare.toFixed(4)}%
                        </Typography>
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: "50%", 
                          bgcolor: estimatedShare > 1 ? "warning.main" : "success.main" 
                        }} />
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Price Impact:
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          color={
                            priceImpact > 2 ? "error.main" :
                            priceImpact > 1 ? "warning.main" :
                            "success.main"
                          }
                        >
                          {priceImpact.toFixed(3)}%
                        </Typography>
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: "50%", 
                          bgcolor: 
                            priceImpact > 2 ? "error.main" :
                            priceImpact > 1 ? "warning.main" :
                            "success.main"
                        }} />
                      </Box>
                    </Box>
                    
                    <Box sx={{ 
                      mt: 1,
                      p: { xs: 1, sm: 1.5 },
                      borderRadius: 1,
                      bgcolor: 
                        priceImpact > 2 ? "error.light" :
                        priceImpact > 1 ? "warning.light" :
                        "success.light",
                      border: "1px solid",
                      borderColor: 
                        priceImpact > 2 ? "error.main" :
                        priceImpact > 1 ? "warning.main" :
                        "success.main"
                    }}>
                      <Typography 
                        variant="caption" 
                        color={
                          priceImpact > 2 ? "error.dark" :
                          priceImpact > 1 ? "warning.dark" :
                          "success.dark"
                        }
                        sx={{ fontWeight: "medium" }}
                      >
                        {priceImpact > 2 ? "⚠️ High Impact" :
                         priceImpact > 1 ? "⚡ Moderate Impact" :
                         "✅ Low Impact"}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color={
                          priceImpact > 2 ? "error.dark" :
                          priceImpact > 1 ? "warning.dark" :
                          "success.dark"
                        }
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        {priceImpact > 2 ? "Large transaction may significantly affect pool price" :
                         priceImpact > 1 ? "Transaction will have noticeable price impact" :
                         "Transaction will have minimal price impact"}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )} */}
            <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
              <Button 
                variant="outlined" 
                onClick={handlePrevStep}
                sx={{
                  borderRadius: { xs: 2, sm: 2.5 },
                  fontSize: { xs: "0.875rem", sm: "1rem" }
                }}
              >
                Back: Select Pool
              </Button>
              <Button
                variant="contained"
                onClick={handleZapConfirm}
                disabled={!canProceedToNext || isLoading}
                sx={{
                  borderRadius: { xs: 2, sm: 2.5 },
                  fontSize: { xs: "0.875rem", sm: "1rem" }
                }}
              >
                {isLoading ? "Processing..." : "Confirm Zap"}
              </Button>
            </Box>
          </Box>
        )}

        {/* Confirmation Page */}
        {showConfirmation && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Confirm Zap Transaction
            </Typography>
            
            {/* Transaction Summary */}
            <Box sx={{ 
              p: { xs: 1.5, sm: 2 },
              border: "1px solid", 
              borderColor: "divider", 
              borderRadius: { xs: 2, sm: 3 }, 
              mb: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
                Transaction Summary
              </Typography>
              
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Input Token */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Input Token:
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <img
                      src={`https://asset-verification.nautilus.sh/icons/${inputCurrency?.tokenId || 0}.png`}
                      alt={`${inputCurrency?.symbol} icon`}
                      style={{ width: 20, height: 20, borderRadius: "50%" }}
                    />
                    <Typography variant="body2" fontWeight="medium">
                      {inputAmount} {inputCurrency?.symbol}
                    </Typography>
                  </Box>
                </Box>

                {/* Target Pool */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Target Pool:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {selectedPool && `${selectedPool.symbolA}/${selectedPool.symbolB}`}
                  </Typography>
                </Box>

                {/* Pool TVL */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Pool TVL:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {selectedPool && (
                      <>
                        <svg
                          className="h-[14px] inline-block mb-4 p-1 w-[14px]"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 500 446.4"
                          style={{
                            verticalAlign: "middle",
                            marginRight: "2px",
                            width: "14px",
                            height: "14px",
                          }}
                        >
                          <path
                            fill="#6f2ae2"
                            d="M243.7,446.3c-34.1,0-65.5-18.1-82.6-47.6L12.9,143.6C-13.6,97.9,2,39.4,47.6,12.9 C93.3-13.6,151.7,2,178.2,47.6l65.5,112.8l65.5-112.8c26.5-45.6,85-61.2,130.6-34.7c45.6,26.5,61.2,85,34.7,130.6L326.4,398.8 C309.3,428.2,277.8,446.3,243.7,446.3z"
                          />
                        </svg>
                        {selectedPool.tvl.toLocaleString()}
                      </>
                    )}
                  </Typography>
                </Box>

                {/* Pool APR */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Pool APR:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" color="success.main">
                    {selectedPool && `${selectedPool.apr}%`}
                  </Typography>
                </Box>

                {/* Estimated USD Value */}
                {inputCurrency && (() => {
                  const amountNum = parseFloat(inputAmount);
                  const usdPrice = dexPrices[inputCurrency.tokenId.toString()] || 0;
                  const usdValue = amountNum * usdPrice;
                  return usdValue > 0 ? (
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Estimated Value:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        ≈ ${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  ) : null;
                })()}
              </Box>
            </Box>

            {/* Warning Message */}
            <Box sx={{ 
              p: { xs: 1.5, sm: 2 },
              border: "1px solid", 
              borderColor: "warning.main", 
              borderRadius: { xs: 2, sm: 3 }, 
              mb: { xs: 2, sm: 3 },
              bgcolor: "warning.light"
            }}>
              <Typography variant="body2" color="warning.dark" sx={{ fontWeight: "medium" }}>
                ⚠️ Important: Transaction may revert if price moves significantly
              </Typography>
              <Typography variant="caption" color="warning.dark" sx={{ mt: 1, display: "block" }}>
                Zap transactions involve swapping tokens and adding liquidity. Price movements during transaction processing may cause the transaction to fail.
              </Typography>
            </Box>

            {/* Transaction Note */}
            <Box sx={{ 
              p: { xs: 1.5, sm: 2 },
              border: "1px solid", 
              borderColor: "info.main", 
              borderRadius: { xs: 2, sm: 3 }, 
              mb: { xs: 2, sm: 3 },
              bgcolor: "info.light"
            }}>
              <Typography variant="body2" color="info.dark" sx={{ fontWeight: "medium" }}>
                📝 Transaction Note
              </Typography>
              <Typography variant="caption" color="info.dark" sx={{ mt: 1, display: "block" }}>
                This zap transaction will swap {inputAmount} {inputCurrency?.symbol} for pool tokens and add liquidity to the {selectedPool && `${selectedPool.symbolA}/${selectedPool.symbolB}`} pool. 
                You will receive LP tokens representing your share of the pool.
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ 
              display: "flex", 
              justifyContent: "space-between",
              gap: { xs: 1, sm: 2 },
              flexDirection: { xs: "column", sm: "row" }
            }}>
              <Button 
                variant="outlined" 
                onClick={handleBackFromConfirmation}
                sx={{ 
                  minWidth: { xs: "100%", sm: 120 },
                  borderRadius: { xs: 2, sm: 2.5 },
                  py: { xs: 1.5, sm: 1 },
                  fontSize: { xs: "0.875rem", sm: "1rem" }
                }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleExecuteZap}
                disabled={isLoading}
                sx={{ 
                  minWidth: { xs: "100%", sm: 120 },
                  borderRadius: { xs: 2, sm: 2.5 },
                  py: { xs: 1.5, sm: 1 },
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  background: "linear-gradient(45deg, #6f2ae2, #ffd700)",
                  "&:hover": {
                    background: "linear-gradient(45deg, #5a1ba8, #e6c200)",
                  }
                }}
              >
                {isLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} color="inherit" />
                    Processing...
                  </Box>
                ) : (
                  "Execute Zap"
                )}
              </Button>
            </Box>
          </Box>
        )}

        {/* Show pools pagination if on step 2 */}
        {currentStep === 2 && !showConfirmation && availablePools.length > poolsPerPage && (
          <Box sx={{ 
            display: "flex", 
            justifyContent: "center", 
            mt: { xs: 1.5, sm: 2 },
            "& .MuiPagination-root": {
              "& .MuiPaginationItem-root": {
                borderRadius: { xs: 1.5, sm: 2 },
                fontSize: { xs: "0.875rem", sm: "1rem" }
              }
            }
          }}>
            <Pagination
              count={Math.ceil(availablePools.length / poolsPerPage)}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}

        <Dialog
          open={isModalOpen}
          onClose={handleCloseModal}
          aria-labelledby="zap-confirmation-title"
          aria-describedby="zap-confirmation-description"
          PaperProps={{
            sx: {
              borderRadius: { xs: 3, sm: 4 },
              maxWidth: { xs: "95%", sm: 480 },
              width: { xs: "95%", sm: "auto" }
            }
          }}
        >
          <DialogTitle>Confirm Zap Transaction</DialogTitle>
          <DialogContent>
            <Typography>
              Input: {inputAmount} {inputCurrency?.symbol}
            </Typography>
            {estimatedOutput && (
              <Typography>Estimated Output: {estimatedOutput}</Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Transaction may revert if price moves significantly
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button variant="contained" color="primary" onClick={handleZap}>
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Card>

      <Dialog
        open={isSigningModalOpen}
        sx={{
          "& .MuiDialog-paper": {
            minWidth: { xs: "90%", sm: "400px" },
            borderRadius: { xs: 3, sm: 4 },
            maxWidth: { xs: "95%", sm: 480 }
          },
          "& .MuiBackdrop-root": {
            backdropFilter: "grayscale(1)",
          },
        }}
      >
        <DialogTitle>Almost there!</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              py: 3,
              minWidth: "360px",
              minHeight: "240px",
            }}
          >
            <ZapAnimation />
            <Typography
              align="center"
              sx={{
                minHeight: "3em",
                display: "flex",
                alignItems: "center",
                width: "100%",
                maxWidth: "320px",
              }}
            >
              {loadingMessages[loadingMessage]}
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        aria-labelledby="zap-success-title"
        aria-describedby="zap-success-description"
        PaperProps={{
          sx: {
            borderRadius: { xs: 3, sm: 4 },
            maxWidth: { xs: "95%", sm: 480 },
            width: { xs: "95%", sm: "auto" }
          }
        }}
      >
        <DialogTitle sx={{ textAlign: "center", pb: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "linear-gradient(45deg, #4caf50, #8bc34a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)"
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "white" }}
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </Box>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "success.main" }}>
            Zap Successful! 🎉
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          {successDetails && (
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body1" sx={{ mb: 3, color: "text.secondary" }}>
                Your tokens have been successfully zapped into the pool!
              </Typography>
              
              <Box sx={{ 
                p: { xs: 1.5, sm: 2 },
                border: "1px solid",
                borderColor: "success.light",
                borderRadius: { xs: 2, sm: 3 },
                bgcolor: "success.light",
                mb: 3
              }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: "bold", color: "success.dark" }}>
                  Transaction Details
                </Typography>
                
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      Amount Zapped:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {successDetails.inputAmount} {successDetails.inputToken}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      Target Pool:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {successDetails.poolName}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      Transaction ID:
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        color: "primary.main",
                        cursor: "pointer",
                        "&:hover": { textDecoration: "underline" }
                      }}
                      onClick={() => {
                        navigator.clipboard.writeText(successDetails.transactionId);
                      }}
                    >
                      {successDetails.transactionId.slice(0, 8)}...
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                You now own LP tokens representing your share of the {successDetails.poolName} pool.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={() => {
              setShowSuccessModal(false);
              setSuccessDetails(null);
              // Reset the form to start fresh
              setCurrentStep(1);
              setInputCurrency(null);
              setTargetPairAddress("");
              setInputAmount("");
              setAvailablePools([]);
              setSelectedPoolId(null);
              setShowConfirmation(false);
            }}
            sx={{
              borderRadius: { xs: 2, sm: 2.5 },
              fontSize: { xs: "0.875rem", sm: "1rem" },
              background: "linear-gradient(45deg, #4caf50, #8bc34a)",
              "&:hover": {
                background: "linear-gradient(45deg, #45a049, #7cb342)",
              }
            }}
          >
            Start New Zap
          </Button>
        </DialogActions>
      </Dialog>
    </GlobalStyles>
  );
};

export default Zap;
