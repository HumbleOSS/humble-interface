import styled from "@emotion/styled";
import React, { FC, useEffect, useMemo, useState, useCallback } from "react";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import {
  CircularProgress,
  Stack,
  Button as MButton,
  Alert,
  Box,
} from "@mui/material";
import { arc200, swap } from "ulujs";
import { CONNECTOR_ALGO_SWAP200, TOKEN_WVOI1 } from "../../constants/tokens";
import { getAlgorandClients } from "../../wallets";
import TokenInput from "../TokenInput";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ARC200TokenI, PoolI } from "../../types";
import { getToken, getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getPools } from "../../store/poolSlice";
import algosdk from "algosdk";
import { toast } from "react-toastify";
import axios from "axios";
import { tokenId, tokenSymbol } from "../../utils/dex";
import BigNumber from "bignumber.js";
import ProgressBar from "../ProgressBar";
import { POOL_SPEC } from "../../constants/poolSpec";
import { getAsaIdFromArc200Contract, populateMappingFromTokens } from "../../config/arc200AsaMapping";

// Types
interface PoolCreateState {
  token?: ARC200TokenI;
  token2?: ARC200TokenI;
  fromAmount: string;
  toAmount: string;
  balance?: string;
  balance2?: string;
  poolExists: boolean;
  pool?: PoolI;
  isLoading: boolean;
  isCreating: boolean;
  error?: string;
}

interface TokenBalance {
  token: ARC200TokenI;
  balance: string;
}

// Styled Components
const PoolCreateRoot = styled.div`
  display: flex;
  padding: var(--Spacing-1000, 40px);
  flex-direction: column;
  align-items: center;
  gap: var(--Spacing-800, 24px);
  border-radius: var(--Radius-800, 24px);
  max-width: 630px;
  width: 100%;

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
`;

const Header = styled.div`
  width: 100%;
  text-align: center;
`;

const Title = styled.h1`
  color: var(--Color-Neutral-Element-Primary, #0c0c10);
  font-family: "Plus Jakarta Sans";
  font-size: 24px;
  font-weight: 700;
  line-height: 120%;
  margin: 0 0 8px 0;

  &.dark {
    color: var(--Color-Neutral-Element-Primary, #fff);
  }
`;

const Subtitle = styled.p`
  color: var(--Color-Neutral-Element-Secondary, #7e7e9a);
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-weight: 400;
  line-height: 140%;
  margin: 0;
`;

const TokenContainer = styled(Stack)`
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: stretch;
  gap: 16px;
`;

const AddIcon: FC<{ theme: "light" | "dark" }> = ({ theme }) => (
  <svg
    width="49"
    height="71"
    viewBox="0 0 49 71"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line
      x1="22.0342"
      y1="0"
      x2="22.0342"
      y2="71"
      stroke={theme === "dark" ? "rgba(255,255,255,0.2)" : "#D8D8E1"}
    />
    <rect
      x="0.53418"
      y="11"
      width="48"
      height="48"
      rx="24"
      fill={theme === "dark" ? "black" : "white"}
    />
    <rect
      x="1.03418"
      y="11.5"
      width="47"
      height="47"
      rx="23.5"
      stroke={theme === "dark" ? "rgba(255,255,255,0.2)" : "#D8D8E1"}
    />
    <path
      d="M8.53418 35H40.5342"
      stroke={theme === "dark" ? "white" : "#141010"}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M24.5342 51V19"
      stroke={theme === "dark" ? "white" : "#141010"}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ActionButton = styled.button`
  display: flex;
  padding: 16px 24px;
  justify-content: center;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  font-family: "Plus Jakarta Sans";
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &.primary {
    background: var(--Color-Accent-CTA-Background-Default, #2958ff);
    color: white;

    &:hover:not(:disabled) {
      background: var(--Color-Accent-CTA-Background-Hover, #1e3fd8);
    }
  }

  &.secondary {
    background: var(--Color-Accent-Disabled-Soft, #d8d8e1);
    color: var(--Color-Neutral-Element-Secondary, #7e7e9a);
  }
`;

const InfoNote = styled.div`
  color: var(--Color-Neutral-Element-Primary, #fff);
  font-family: "IBM Plex Sans Condensed";
  font-size: 12px;
  font-weight: 400;
  line-height: 140%;
  text-align: center;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
`;

const ErrorAlert = styled(Alert)`
  width: 100%;
  margin-bottom: 16px;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 24px;
  z-index: 10;
`;

// Custom Hooks
const useTokenBalances = (tokens2: any[] | undefined, activeAccount: any) => {
  const [balances, setBalances] = useState<Map<string, string>>(new Map());

  const fetchBalance = useCallback(
    async (token: ARC200TokenI) => {
      if (!activeAccount) return;

      const { algodClient, indexerClient } = getAlgorandClients();

      try {
        // VOI tokens can be fetched without tokens2
        if (token.tokenId === 0) {
          const accInfo = await algodClient
            .accountInformation(activeAccount.address)
            .do();
          const balance = Number(accInfo.amount);
          const minBalance = Number(accInfo["min-balance"]);
          const txnCost = 1e5;
          const availableBalance = Math.max(0, balance - minBalance - txnCost);
          return (availableBalance / 1e6).toLocaleString();
        }

        // For other tokens, we need tokens2
        if (!tokens2) return;

        // First try to get ASA ID from config mapping, fallback to tokens2 lookup
        let wrappedTokenId: number | undefined = getAsaIdFromArc200Contract(token.tokenId);
        
        if (wrappedTokenId === undefined) {
          // Fallback to tokens2 lookup if not in config
          wrappedTokenId = Number(
            tokens2.find((t) => t.contractId === token.tokenId)?.tokenId
          );
        }

        // For tokens with tokenId !== 0, always check both asset balance and ARC200 balance
        let assetBalanceBi = BigInt(0);
        let decimals = token.decimals;

        // Try to get asset balance if the token has an asset ID
        if (wrappedTokenId !== 0 && !isNaN(wrappedTokenId)) {
          try {
            const accAssetInfo = await algodClient
              .accountAssetInformation(activeAccount.address, wrappedTokenId)
              .do();
            const assetInfo = await indexerClient
              .lookupAssetByID(wrappedTokenId)
              .do();
            decimals = assetInfo.asset.params.decimals;
            assetBalanceBi = BigInt(accAssetInfo["asset-holding"].amount);
          } catch (error) {
            // Asset doesn't exist or account doesn't hold it, continue with 0
            console.log(`No asset balance for token ${token.tokenId}`);
          }
        }

        // Always get ARC200 balance
        const ci = new arc200(token.tokenId, algodClient, indexerClient);
        const r = await ci.arc200_balanceOf(activeAccount.address);
        if (r.success) {
          const arc200BalanceBi = BigInt(r.returnValue);
          // Add asset balance and ARC200 balance together
          const totalBalance = new BigNumber(
            (assetBalanceBi + arc200BalanceBi).toString()
          ).dividedBy(new BigNumber(10).pow(decimals));
          return totalBalance.toFixed(decimals);
        }
      } catch (error) {
        console.error(
          `Error fetching balance for token ${token.tokenId}:`,
          error
        );
      }
      return "0";
    },
    [activeAccount, tokens2]
  );

  const updateBalance = useCallback(
    async (token: ARC200TokenI) => {
      const balance = await fetchBalance(token);
      if (balance) {
        setBalances((prev) =>
          new Map(prev).set(token.tokenId.toString(), balance)
        );
      }
    },
    [fetchBalance]
  );

  return { balances, updateBalance };
};

// Main Component
const PoolCreate: FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const { activeAccount, signTransactions } = useWallet();
  const [searchParams] = useSearchParams();

  // Redux state
  const tokens = useSelector((state: RootState) => state.tokens.tokens);
  const pools: PoolI[] = useSelector((state: RootState) => state.pools.pools);

  // Local state
  const [state, setState] = useState<PoolCreateState>({
    fromAmount: "",
    toAmount: "",
    poolExists: false,
    isLoading: true,
    isCreating: false,
  });

  const [tokens2, setTokens2] = useState<any[]>();
  const [stubs, setStubs] = useState<any[]>();
  const [tokenOptions, setTokenOptions] = useState<ARC200TokenI[]>();
  const [tokenOptions2, setTokenOptions2] = useState<ARC200TokenI[]>();
  const [message, setMessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  // Custom hooks
  const { balances, updateBalance } = useTokenBalances(tokens2, activeAccount);

  // URL parameters
  const paramPoolId = searchParams.get("poolId");
  const paramTokAId = searchParams.get("tokAId");
  const paramTokBId = searchParams.get("tokBId");

  // Fetch initial data
  useEffect(() => {
    dispatch(getTokens() as unknown as UnknownAction);
    dispatch(getPools() as unknown as UnknownAction);

    // Fetch tokens2
    axios
      .get("https://humble-api.voi.nautilus.sh/tokens")
      .then((res) => {
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
        setTokens2(mappedTokens);
        // Populate the ARC200 to ASA mapping from the API data
        populateMappingFromTokens(mappedTokens);
      })
      .catch(console.error);

    // Fetch stubs
    const exchangeHash =
      "1365fd96882cef38c711ca95a04f8b933ca151ad6a2470dae62c3036bfdd8147";
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/stubs/pool?active=0&hash=${exchangeHash}`
      )
      .then((res) => setStubs(res.data.stubs))
      .catch(console.error);
  }, [dispatch]);

  // Initialize token options
  useEffect(() => {
    if (!tokens) return;
    const voiToken = {
      tokenId: 0, // Display as 0
      contractId: TOKEN_WVOI1, // Use 390001 internally
      name: "Voi",
      symbol: "VOI",
      decimals: 6,
      totalSupply: "10000000000000000",
    };
    setTokenOptions([voiToken, ...tokens]);
  }, [tokens]);

  // Handle URL parameters for token selection
  useEffect(() => {
    if (paramTokAId && !isNaN(Number(paramTokAId))) {
      if (paramTokAId === "0") {
        setState((prev) => ({
          ...prev,
          token: {
            tokenId: 0, // Display as 0
            contractId: TOKEN_WVOI1, // Use 390001 internally
            name: "Voi",
            symbol: "VOI",
            decimals: 6,
            totalSupply: "10000000000000000",
          },
        }));
      } else {
        getToken(Number(paramTokAId)).then((token) =>
          setState((prev) => ({ ...prev, token }))
        );
      }
    }
  }, [paramTokAId]);

  useEffect(() => {
    if (!activeAccount || !paramTokBId || isNaN(Number(paramTokBId))) return;
    if (paramTokBId === "0") {
      setState((prev) => ({
        ...prev,
        token2: {
          tokenId: 0, // Display as 0
          contractId: TOKEN_WVOI1, // Use 390001 internally
          name: "Voi",
          symbol: "VOI",
          decimals: 6,
          totalSupply: "10000000000000000",
        },
      }));
    } else {
      getToken(Number(paramTokBId)).then((token2) =>
        setState((prev) => ({ ...prev, token2 }))
      );
    }
  }, [activeAccount, paramTokBId]);

  // Update token options for second token
  useEffect(() => {
    if (!state.token || !tokenOptions) return;
    const exclude = [0, TOKEN_WVOI1].includes(state.token.tokenId)
      ? [0, TOKEN_WVOI1]
      : [state.token.tokenId];
    const filteredOptions = tokenOptions.filter(
      (t) => !exclude.includes(t.tokenId)
    );
    setTokenOptions2(filteredOptions);
  }, [state.token, tokenOptions]);

  // Update balances when tokens change or tokens2 becomes available
  useEffect(() => {
    if (state.token && tokens2 && activeAccount) {
      updateBalance(state.token);
    }
  }, [state.token, tokens2, activeAccount, updateBalance]);

  useEffect(() => {
    if (state.token2 && tokens2 && activeAccount) {
      updateBalance(state.token2);
    }
  }, [state.token2, tokens2, activeAccount, updateBalance]);

  // Check for existing pools
  const eligiblePools = useMemo(() => {
    return pools.filter((p: PoolI) => {
      return (
        [p.tokA, p.tokB].includes(tokenId(state.token)) &&
        [p.tokA, p.tokB].includes(tokenId(state.token2)) &&
        p.tokA !== p.tokB
      );
    });
  }, [pools, state.token, state.token2]);

  useEffect(() => {
    if (!state.token || !state.token2 || !eligiblePools.length) {
      setState((prev) => ({ ...prev, poolExists: false, pool: undefined }));
      return;
    }

    const { algodClient, indexerClient } = getAlgorandClients();
    const A = { ...state.token, tokenId: tokenId(state.token) };
    const B = { ...state.token2, tokenId: tokenId(state.token2) };

    new swap(0, algodClient, indexerClient)
      .selectPool(eligiblePools, A, B, "round")
      .then((pool: any) => {
        if (pool) {
          toast.info(
            <div>
              Existing {state.token?.symbol}/{state.token2?.symbol} pool found!
              <br />
              <MButton
                onClick={() => navigate(`/pool/add?poolId=${pool.poolId}`)}
                variant="contained"
                size="small"
                sx={{ mt: 1 }}
              >
                Go to pool
              </MButton>
            </div>
          );
          setState((prev) => ({ ...prev, poolExists: true, pool }));
        } else {
          setState((prev) => ({ ...prev, poolExists: false, pool: undefined }));
        }
      })
      .catch(console.error);
  }, [eligiblePools, state.token, state.token2, navigate]);

  // Validation
  const isValid = useMemo(() => {
    const fromBalance = balances.get(state.token?.tokenId.toString() || "");
    const toBalance = balances.get(state.token2?.tokenId.toString() || "");

    return !!(
      state.token &&
      state.token2 &&
      state.fromAmount &&
      state.toAmount &&
      fromBalance &&
      toBalance &&
      Number(state.fromAmount.replace(/,/g, "")) <=
        Number(fromBalance.replace(/,/g, "")) &&
      Number(state.toAmount.replace(/,/g, "")) <=
        Number(toBalance.replace(/,/g, ""))
    );
  }, [state.token, state.token2, state.fromAmount, state.toAmount, balances]);

  const buttonLabel = useMemo(() => {
    if (state.poolExists) return "Go to existing pool";
    if (!state.token || !state.token2) return "Select tokens";
    if (!state.fromAmount || !state.toAmount) return "Enter amounts";

    const fromBalance = balances.get(state.token.tokenId.toString());
    const toBalance = balances.get(state.token2.tokenId.toString());

    if (
      Number(state.fromAmount.replace(/,/g, "")) >
      Number(fromBalance?.replace(/,/g, "") || 0)
    ) {
      return `Insufficient ${tokenSymbol(state.token)} balance`;
    }
    if (
      Number(state.toAmount.replace(/,/g, "")) >
      Number(toBalance?.replace(/,/g, "") || 0)
    ) {
      return `Insufficient ${tokenSymbol(state.token2)} balance`;
    }

    return isValid ? "Create Pool" : "Invalid input";
  }, [state, balances, isValid]);

  // Pool creation handler
  const handlePoolCreate = async () => {
    if (!activeAccount || !state.token || !state.token2 || !pools || !stubs) {
      setState((prev) => ({ ...prev, error: "Missing required data" }));
      return;
    }

    setState((prev) => ({ ...prev, isCreating: true, error: undefined }));

    try {
      const { algodClient, indexerClient } = getAlgorandClients();

      setProgress(10);
      setMessage("Building transaction");

      // Select stub
      let stub;
      // let stub = stubs.find((s) => s.creator === activeAccount.address);
      // if (!stub) {
      //   stub = stubs.find((s) => s.active === 0);
      // }

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

      // if (!stub) {
      setProgress(20);
      setMessage("Deploying pool contract");

      const stxns2 = await signTransactions([appCreateTxn.toByte()]);
      const { txId } = await algodClient
        .sendRawTransaction(stxns2 as Uint8Array[])
        .do();

      const res = await algosdk.waitForConfirmation(algodClient, txId, 3);

      console.log({ res });

      ctcInfo = res["application-index"];

      console.log({ ctcInfo });
      //}
      // else {
      //   ctcInfo = stub.contractId;
      // }

      setProgress(40);
      setMessage("Adding initial liquidity");

      const acc = {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      };
      const ci = new swap(ctcInfo, algodClient, indexerClient, { acc });

      const networkToken = {
        contractId: TOKEN_WVOI1,
        tokenId: "0",
        decimals: "6",
        symbol: "VOI",
      };

      // Helper function to get token metadata, with fallback to state token
      const getTokenMetadata = (
        token: ARC200TokenI,
        isNetworkToken: boolean
      ) => {
        if (isNetworkToken) {
          // For VOI (tokenId 0), use 390001 internally but display as 0
          return {
            ...networkToken,
            contractId: TOKEN_WVOI1, // Use 390001 internally
            tokenId: "0", // Display as 0
          };
        }

        // Use contractId if available (for VOI it will be 390001), otherwise map tokenId
        const internalId = token.contractId || tokenId(token);
        const foundToken = tokens2?.find((t) => t.contractId === internalId);

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

      const mA = getTokenMetadata(state.token, state.token.tokenId === 0);
      const mB = getTokenMetadata(state.token2, state.token2.tokenId === 0);

      const A = { ...mA, amount: state.fromAmount.replace(/,/g, "") };
      const B = { ...mB, amount: state.toAmount.replace(/,/g, "") };

      console.log({ A, B, acc, ctcInfo });

      const swapR = await ci.deposit(acc.addr, ctcInfo, A, B, [], {
        debug: true,
      });

      console.log({ swapR });

      if (!swapR.success) {
        throw new Error("Failed to create deposit transaction");
      }

      const unsignedTxns = swapR.txns.map(
        (t: string) => new Uint8Array(Buffer.from(t, "base64"))
      );

      setProgress(60);
      setMessage("Signing transaction");

      const stxns = await signTransactions(unsignedTxns);

      setProgress(80);
      setMessage("Submitting transaction");

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      setProgress(90);
      setMessage("Confirming pool creation");

      await new Promise((res) => setTimeout(res, 60_000));

      setProgress(100);
      setMessage("Pool created successfully!");

      toast.success(`Pool created successfully!`);
      navigate(`/pool?filter=${state.token.symbol.toUpperCase()}`);
    } catch (error: any) {
      console.error("Pool creation error:", error);
      setState((prev) => ({
        ...prev,
        error: error.message || "Failed to create pool",
      }));
      toast.error(error.message || "Failed to create pool");
    } finally {
      setState((prev) => ({ ...prev, isCreating: false }));
      setProgress(0);
      setMessage("");
    }
  };

  const handleNavigateToPool = () => {
    if (state.pool) {
      navigate(`/pool/add?poolId=${state.pool.poolId}`);
    }
  };

  const isLoading = !pools || !tokens || !tokens2 || !stubs;

  if (isLoading) {
    return (
      <PoolCreateRoot className={isDarkTheme ? "dark" : "light"}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      </PoolCreateRoot>
    );
  }

  return (
    <PoolCreateRoot className={isDarkTheme ? "dark" : "light"}>
      {state.isCreating && (
        <LoadingOverlay>
          <CircularProgress color="primary" />
        </LoadingOverlay>
      )}

      <Header>
        <Title className={isDarkTheme ? "dark" : "light"}>Create Pool</Title>
        <Subtitle>Create a new liquidity pool to earn trading fees</Subtitle>
      </Header>

      {state.error && (
        <ErrorAlert
          severity="error"
          onClose={() => setState((prev) => ({ ...prev, error: undefined }))}
        >
          {state.error}
        </ErrorAlert>
      )}

      <TokenContainer>
        <TokenInput
          label="First token"
          amount={state.fromAmount}
          setAmount={(amount) =>
            setState((prev) => ({ ...prev, fromAmount: amount }))
          }
          token={state.token}
          setToken={(token) => setState((prev) => ({ ...prev, token }))}
          balance={balances.get(state.token?.tokenId.toString() || "")}
          onFocus={() => {}}
          options={tokenOptions}
          showInput={!state.poolExists}
        />

        <AddIcon theme={isDarkTheme ? "dark" : "light"} />

        <TokenInput
          label="Second token"
          amount={state.toAmount}
          setAmount={(amount) =>
            setState((prev) => ({ ...prev, toAmount: amount }))
          }
          token={state.token2}
          setToken={(token2) => setState((prev) => ({ ...prev, token2 }))}
          options={tokenOptions2}
          balance={balances.get(state.token2?.tokenId.toString() || "")}
          onFocus={() => {}}
          showInput={!state.poolExists}
        />
      </TokenContainer>

      <ActionButton
        className={isValid || state.poolExists ? "primary" : "secondary"}
        disabled={state.isCreating || (!isValid && !state.poolExists)}
        onClick={state.poolExists ? handleNavigateToPool : handlePoolCreate}
      >
        {state.isCreating ? (
          <>
            <CircularProgress size={20} color="inherit" />
            Creating pool...
          </>
        ) : (
          buttonLabel
        )}
      </ActionButton>

      <InfoNote>
        By creating a pool, you'll earn 0.25% of trades on this pair
        proportional to your share. Fees are added to the pool, accumulate in
        real time and can be claimed by removing your liquidity.
      </InfoNote>

      <ProgressBar
        message={message}
        isActive={![0, 100].includes(progress)}
        currentStep={progress}
        totalSteps={100}
      />
    </PoolCreateRoot>
  );
};

export default PoolCreate;
