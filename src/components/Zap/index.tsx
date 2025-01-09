import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  TextField,
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
import { swap } from "ulujs";
import { TOKEN_WVOI1 } from "@/constants/tokens";
import BigNumber from "bignumber.js";
import algosdk from "algosdk";
import { styled } from "@mui/material/styles";
import Confetti from "react-confetti";

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

  const loadingMessages = [
    "Preparing your transaction...",
    "Mixing the perfect cocktail of tokens...",
    "Teaching algorithms to dance...",
    "Consulting with crypto hamsters...",
    "Aligning the blockchain stars...",
    "Warming up the quantum computers...",
  ];

  useEffect(() => {
    if (isSigningModalOpen) {
      const interval = setInterval(() => {
        setLoadingMessage((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSigningModalOpen]);

  const handleInputSelect = useCallback((inputCurrency: Currency) => {
    setInputCurrency(inputCurrency);
  }, []);

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

  const handlePoolSelect = (poolId: string, contractId: string) => {
    setSelectedPoolId(poolId);
    setTargetPairAddress(contractId);
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

      const pool = availablePools.find(
        (p) => p.contractId === Number(targetPairAddress)
      );

      if (!pool) throw new Error("Pool not found");

      console.log({ pool });

      const swapAForB = pool.tokAId === `${inputCurrency?.contractId}`;

      const mA = {
        contractId: Number(pool.tokAId),
        tokenId: null,
        decimals: pool.tokADecimals,
        symbol: pool.symbolA,
      };

      const mB =
        pool.symbolB === "VOI"
          ? networkToken
          : {
              contractId: Number(pool.tokBId),
              tokenId: null,
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
      });

      // figure out to amount

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

      // logIndex
      // if symbolA or symbolB is VOI, then logIndex is -2, otherwise it is -1
      const logIndex =
        pool.symbolA === "VOI" || pool.symbolB === "VOI" ? -2 : -1;

      const swapR: any = await ci.swap(
        acc.addr,
        Number(pool.contractId),
        sA,
        sB
      );

      if (!swapR.success) throw new Error("Swap simulation failed");

      const swapTxnObjs = swapR.objs;

      const outAB = Buffer.from(
        swapR.response.txnGroups[0].txnResults
          .slice(logIndex)[0]
          .txnResult.logs.slice(-1)[0]
          .slice(4)
      );

      const outA = outAB.slice(0, 32);
      const outB = outAB.slice(32, 64);

      const out = swapAForB ? outB : outA;

      const outBn = new BigNumber("0x" + Buffer.from(out).toString("hex"));

      const outN = outBn
        .dividedBy(
          new BigNumber(10).pow(Number(swapAForB ? mB.decimals : mA.decimals))
        )
        .toFixed(Number(swapAForB ? mB.decimals : mA.decimals));

      console.log({ outBn, out, outA, outB, swapTxnObjs, outN });

      // deposit

      const dA = {
        ...mA,
        amount: swapAForB ? fromAmount : outN,
      };

      const dB = {
        ...mB,
        amount: swapAForB ? outN : fromAmount,
      };

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
    } catch (e: any) {
      console.log(e);
    } finally {
      setIsLoading(false);
      setIsSigningModalOpen(false);
    }
  };

  // Find the selected pool details
  const selectedPool = availablePools.find(
    (pool) => pool.contractId === Number(targetPairAddress)
  );

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
      <Card sx={{ p: 3, maxWidth: 480, mx: "auto", mt: 4 }}>
        <Box sx={{ mb: 2 }}>
          <CurrencyInputPanel
            value={inputAmount}
            onUserInput={handleInputAmountChange}
            onCurrencySelect={handleInputSelect}
            currency={inputCurrency}
            label="Input"
            id="zap-input-token"
          />
        </Box>

        {availablePools.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Available Pools
            </Typography>
            <List>
              {availablePools
                .slice((page - 1) * poolsPerPage, page * poolsPerPage)
                .map((pool) => (
                  <ListItem
                    key={pool.poolId}
                    button
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
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
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

        <Dialog open={isModalOpen} onClose={handleCloseModal}>
          <DialogTitle>Confirm Zap Transaction</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to zap {inputAmount} {inputCurrency?.symbol}{" "}
              into {selectedPool?.symbolA}/{selectedPool?.symbolB}?
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
          '& .MuiDialog-paper': {
            minWidth: '400px',
          },
          '& .MuiBackdrop-root': {
            backdropFilter: 'grayscale(1)',
          }
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
