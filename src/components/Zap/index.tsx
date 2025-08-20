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
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import CurrencyInputPanel from "../CurrencyInputPanel";
import { getAlgorandClients } from "@/wallets";
import { swap, arc200 } from "ulujs";
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

type Currency = any;

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
  const [inputCurrency, setInputCurrency] = useState<Currency | null>(null);
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
  const [availableTokens, setAvailableTokens] = useState<Currency[]>([]);
  
  // Add tokens2 state for wrapped token support
  const [tokens2, setTokens2] = useState<any[]>();

  const loadingMessages = [
    "Preparing your transaction...",
    "Mixing the perfect cocktail of tokens...",
    "Teaching algorithms to dance...",
    "Consulting with crypto hamsters...",
    "Aligning the blockchain stars...",
    "Warming up the quantum computers...",
  ];

  // Fetch tokens2 for wrapped token support
  useEffect(() => {
    axios
      .get(
        "https://raw.githubusercontent.com/tinymanorg/tinyman-analytics-indexer/main/synced_tokens.json"
      )
      .then((res) => {
        setTokens2(res.data);
      })
      .catch((error) => {
        console.error("Failed to fetch external tokens, falling back to local tokens:", error);
        // Fallback to local tokens if external API is blocked
        axios
          .get("/api/tokens.json")
          .then((res) => {
            // Transform local token format to match expected format
            const transformedTokens = res.data.map((token: any) => ({
              contractId: token.tokenId,
              tokenId: token.tokenId,
              symbol: token.symbol.replace(/\0/g, '').trim(),
              name: token.name.replace(/\0/g, '').trim(),
              decimals: token.decimals,
            }));
            setTokens2(transformedTokens);
          })
          .catch((localError) => {
            console.error("Failed to fetch local tokens:", localError);
          });
      });
  }, []);

  console.log({ tokens2 });

  useEffect(() => {
    if (isSigningModalOpen) {
      const interval = setInterval(() => {
        setLoadingMessage((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSigningModalOpen]);

  useEffect(() => {
    // Add VOI as a default option when loading tokens
    const voiToken = {
      contractId: TOKEN_WVOI1,
      tokenId: "0",
      decimals: 6,
      symbol: "VOI",
      name: "Voi",
      balance: "0", // This will be updated when wallet is connected
    };

    if (activeAccount) {
      // Update VOI balance
      const fetchVoiBalance = async () => {
        try {
          const { algodClient } = getAlgorandClients();
          const accountInfo = await algodClient
            .accountInformation(activeAccount.address)
            .do();
          voiToken.balance = (accountInfo.amount / 1e6).toString();
        } catch (error) {
          console.error("Failed to fetch VOI balance:", error);
        }
      };
      fetchVoiBalance();
    }

    // Make VOI available in token selection
    setAvailableTokens((prevTokens) => {
      if (!prevTokens.some((token) => token.symbol === "VOI")) {
        return [voiToken, ...prevTokens];
      }
      return prevTokens;
    });
  }, [activeAccount]);

  // Add effect to update inputCurrency balance when selected (including wrapped tokens)
  useEffect(() => {
    if (!inputCurrency || !activeAccount || !tokens2) return;
    
    const updateBalance = async () => {
      try {
        const { algodClient, indexerClient } = getAlgorandClients();
        
        // Check if this is a wrapped token
        const wrappedTokenId = Number(
          tokens2.find((t) => t.contractId === inputCurrency.contractId)?.tokenId
        );
        
        if (inputCurrency.tokenId === "0") {
          // Native VOI token
          const accountInfo = await algodClient
            .accountInformation(activeAccount.address)
            .do();
          const amount = accountInfo.amount;
          const minBalance = accountInfo["min-balance"];
          const txnCost = 1e5; // conservative estimate of txn cost
          const available = Math.max(0, amount - minBalance - txnCost);
          const balance = (available / 10 ** inputCurrency.decimals).toLocaleString();
          
          setInputCurrency((prev: Currency | null) => prev ? { ...prev, balance } : null);
        } else if (wrappedTokenId !== 0 && !isNaN(wrappedTokenId)) {
          // Wrapped token - get both native asset balance and ARC200 balance
          const accAssetInfo = await algodClient
            .accountAssetInformation(activeAccount.address, wrappedTokenId)
            .do();
          const assetInfo = await indexerClient
            .lookupAssetByID(wrappedTokenId)
            .do();
          
          const decimals = assetInfo.asset.params.decimals;
          const balance1Bi = BigInt(accAssetInfo["asset-holding"].amount);
          
          const ci = new arc200(inputCurrency.contractId, algodClient, indexerClient);
          const balanceResult = await ci.arc200_balanceOf(activeAccount.address);
          
          if (balanceResult.success) {
            const balance2Bi = BigInt(balanceResult.returnValue);
            const totalBalance = new BigNumber((balance1Bi + balance2Bi).toString())
              .dividedBy(new BigNumber(10).pow(decimals));
            const balance = totalBalance.toFixed(decimals);
            
            setInputCurrency((prev: Currency | null) => prev ? { ...prev, balance } : null);
          }
        } else {
          // Regular ARC200 token
          const ci = new arc200(inputCurrency.contractId, algodClient, indexerClient);
          const balanceResult = await ci.arc200_balanceOf(activeAccount.address);
          
          if (balanceResult.success) {
            const balanceBi = BigInt(balanceResult.returnValue);
            const balance = new BigNumber(balanceBi.toString())
              .dividedBy(new BigNumber(10).pow(inputCurrency.decimals))
              .toFixed(inputCurrency.decimals);
            
            setInputCurrency((prev: Currency | null) => prev ? { ...prev, balance } : null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch token balance:", error);
      }
    };
    
    updateBalance();
  }, [inputCurrency?.contractId, activeAccount, tokens2]);

  console.log({ availableTokens });

  const handleInputSelect = useCallback((inputCurrency: Currency) => {
    setInputCurrency(inputCurrency);
  }, []);

  console.log({ inputCurrency });

  const handleInputAmountChange = useCallback((value: string) => {
    setInputAmount(value);
  }, []);

  // Add new useEffect to fetch pools when input currency changes
  useEffect(() => {
    const fetchPools = async () => {
      if (inputCurrency?.contractId) {
        try {
          const response = await fetch(
            `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools?tokenId=${inputCurrency.contractId}`
          );
          const data = await response.json();
          setAvailablePools(data.pools);
        } catch (error) {
          console.error("Failed to fetch pools:", error);
        }
      }
    };

    fetchPools();
  }, [inputCurrency]);

  const handleMaxClick = () => {
    if (inputCurrency?.balance) {
      setInputAmount(inputCurrency.balance);
    }
  };

  const handlePoolSelect = (poolId: string, contractId: string) => {
    setSelectedPoolId(poolId);
    setTargetPairAddress(contractId);
  };

  const handleOpenModal = async () => {
    setIsLoadingTokens(true);
    try {
      // ... existing fetch code ...
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const handleZapConfirm = () => {
    setIsModalOpen(true);
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

      const swapAForB = pool.tokAId === `${inputCurrency?.contractId}`;

      // Get the correct tokenId for wrapped tokens
      const getTokenId = (currency: Currency) => {
        if (currency?.tokenId === "0") return null; // VOI/native token
        if (!tokens2) return currency?.tokenId;
        
        // For wrapped tokens, find the native asset tokenId
        const wrappedToken = tokens2.find((t) => t.contractId === currency?.contractId);
        return wrappedToken?.tokenId || currency?.tokenId;
      };

      const mA =
        pool.symbolA === "VOI"
          ? networkToken
          : {
              contractId: Number(pool.tokAId),
              tokenId: swapAForB ? getTokenId(inputCurrency) : null,
              decimals: pool.tokADecimals,
              symbol: pool.symbolA,
            };

      const mB =
        pool.symbolB === "VOI"
          ? networkToken
          : {
              contractId: Number(pool.tokBId),
              tokenId: !swapAForB ? getTokenId(inputCurrency) : null,
              decimals: pool.tokBDecimals,
              symbol: pool.symbolB,
            };

      console.log({ mA, mB });

      const fromAtomicUnit = new BigNumber(1)
        .dividedBy(new BigNumber(10).pow(inputCurrency.decimals))
        .toString();

      const fromAmount = new BigNumber(inputAmount)
        .dividedBy(2)
        .toFixed(inputCurrency.decimals);

      const fromLessAmount = new BigNumber(fromAmount)
        .minus(new BigNumber(fromAtomicUnit))
        .toFixed(inputCurrency.decimals);

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
            tokenId: mA.tokenId ?? undefined,
          }
        : {
            ...mB,
            amount: fromLessAmount,
            decimals: `${mB.decimals}`,
            tokenId: mB.tokenId ?? undefined,
          };

      const sB = swapAForB
        ? {
            ...mB,
            decimals: `${mB.decimals}`,
            tokenId: mB.tokenId ?? undefined,
          }
        : {
            ...mA,
            decimals: `${mA.decimals}`,
            tokenId: mA.tokenId ?? undefined,
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
        tokenId: swapAForB ? getTokenId(inputCurrency) : null,
      };

      // remove tokenId conditionally to prevent deposit of wrapped token
      const dB = {
        ...mB,
        decimals: `${mB.decimals}`,
        amount: swapAForB ? outN : fromAmount,
        tokenId: swapAForB ? null : getTokenId(inputCurrency),
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
          p: { xs: 2, sm: 3 },
          maxWidth: 480,
          mx: "auto",
          mt: { xs: 2, sm: 4 },
          width: { xs: "95%", sm: "auto" },
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Box sx={{ position: "relative" }}>
            <CurrencyInputPanel
              value={inputAmount}
              onUserInput={handleInputAmountChange}
              onCurrencySelect={handleInputSelect}
              currency={inputCurrency}
              id="zap-input-token"
            />
          </Box>
          {inputCurrency?.balance && inputCurrency.balance !== "0" && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                mt: 1,
                animation: "fadeInSlide 0.3s ease-out",
              }}
            >
              <Button
                variant="text"
                size="small"
                aria-label="Select maximum token amount"
                onClick={handleMaxClick}
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
            </Box>
          )}
        </Box>

        {availablePools.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Available Pools
            </Typography>
            <List>{memoizedPoolList}</List>

            {availablePools.length > poolsPerPage && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <Pagination
                  count={Math.ceil(availablePools.length / poolsPerPage)}
                  page={page}
                  onChange={(event, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </Box>
        )}

        {!activeAccount ? (
          <Button variant="contained" fullWidth color="primary" disabled>
            Connect Wallet
          </Button>
        ) : !inputAmount || !targetPairAddress ? (
          <Button variant="contained" fullWidth color="primary" disabled>
            Enter an amount and target pair
          </Button>
        ) : (
          <Button
            variant="contained"
            fullWidth
            color="primary"
            onClick={handleZapConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Confirm Zap"}
          </Button>
        )}

        <Dialog
          open={isModalOpen}
          onClose={handleCloseModal}
          aria-labelledby="zap-confirmation-title"
          aria-describedby="zap-confirmation-description"
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
            minWidth: "400px",
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
    </GlobalStyles>
  );
};

export default Zap;
