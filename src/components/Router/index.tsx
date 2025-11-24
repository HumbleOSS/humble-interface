import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import { CircularProgress, Box, Typography } from "@mui/material";
import { selectTokens, getTokensWithTickers } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import TokenSelect from "../TokenSelect";
import { ARC200TokenI } from "../../types";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import { TOKEN_WVOI1 } from "../../constants/tokens";
import { tokenSymbol } from "../../utils/dex";
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, swap, abi } from "ulujs";
import { getAlgorandClients } from "../../wallets";
import { toast } from "react-toastify";
import BigNumber from "bignumber.js";
import { getPool } from "../../store/poolSlice";
import algosdk from "algosdk";


interface PathOption {
  path: string[]; // Array of token IDs
  pools: string[]; // Array of pool IDs
  prices: string[]; // Array of prices at each step
  outputAmount: string; // Final output amount
  description: string; // Human-readable description
}

interface RouterResponse {
  tokenA: string;
  tokenB: string;
  paths: PathOption[];
  count: number;
}

const Container = styled.div`
  margin: 0 auto;
  padding: 1.5rem;
  max-width: 1200px;
`;

const Title = styled.h1<{ isDarkTheme: boolean }>`
  font-size: 1.875rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const TokenSelectionContainer = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: ${(props) => (props.isDarkTheme ? "#1F2937" : "white")};
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const TokenSelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const TokenSelectLabel = styled.label<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#4B5563")};
`;

const SwapArrow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: -0.5rem 0;
`;

const RouteContainer = styled.div<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#1F2937" : "white")};
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  padding: 1.5rem;
`;

const RouteHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const RouteTitle = styled.h2<{ isDarkTheme: boolean }>`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const RouteSummary = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: ${(props) =>
    props.isDarkTheme ? "rgba(65, 19, 126, 0.2)" : "rgba(65, 19, 126, 0.05)"};
  border-radius: 0.5rem;
`;

const RouteSummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RouteSummaryLabel = styled.span<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const RouteSummaryValue = styled.span<{ isDarkTheme: boolean }>`
  font-size: 1rem;
  font-weight: 600;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const RouteSteps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PathCard = styled.div<{ isDarkTheme: boolean; isBest?: boolean }>`
  padding: 1.5rem;
  background-color: ${(props) =>
    props.isBest
      ? props.isDarkTheme
        ? "rgba(65, 19, 126, 0.3)"
        : "rgba(65, 19, 126, 0.1)"
      : props.isDarkTheme
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.02)"};
  border-radius: 0.5rem;
  border: 2px solid
    ${(props) =>
      props.isBest
        ? props.isDarkTheme
          ? "rgba(65, 19, 126, 0.5)"
          : "rgba(65, 19, 126, 0.3)"
        : props.isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)"};
  margin-bottom: 1rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${(props) =>
      props.isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(65, 19, 126, 0.3)"};
  }
`;

const PathHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const PathTitle = styled.div<{ isDarkTheme: boolean }>`
  font-size: 1rem;
  font-weight: 600;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const PathOutput = styled.div<{ isDarkTheme: boolean; isBest?: boolean }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${(props) =>
    props.isBest
      ? props.isDarkTheme
        ? "#A78BFA"
        : "#7C3AED"
      : props.isDarkTheme
      ? "#F3F4F6"
      : "inherit"};
`;

const PathDescription = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: ${(props) =>
    props.isDarkTheme ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.03)"};
  border-radius: 0.375rem;
`;

const PathSteps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const RouteStepCard = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background-color: ${(props) =>
    props.isDarkTheme ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)"};
  border-radius: 0.375rem;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
`;

const RouteStepInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const RouteStepToken = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const RouteStepAmount = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const RouteStepPool = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  padding: 0.25rem 0.5rem;
  background-color: ${(props) =>
    props.isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  border-radius: 0.25rem;
`;

const ErrorMessage = styled.div<{ isDarkTheme: boolean }>`
  padding: 1rem;
  background-color: ${(props) =>
    props.isDarkTheme ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)"};
  border: 1px solid
    ${(props) =>
      props.isDarkTheme ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)"};
  border-radius: 0.5rem;
  color: ${(props) => (props.isDarkTheme ? "#FCA5A5" : "#DC2626")};
  margin-top: 1rem;
`;

const DebugInfo = styled.div<{ isDarkTheme: boolean }>`
  padding: 1rem;
  background: ${(props) =>
    props.isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-family: monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
`;

const DebugToggle = styled.button<{ isDarkTheme: boolean }>`
  padding: 0.5rem 1rem;
  margin-bottom: 1rem;
  background-color: ${(props) =>
    props.isDarkTheme ? "#374151" : "#F3F4F6"};
  border: 1px solid
    ${(props) =>
      props.isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  border-radius: 0.5rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  cursor: pointer;
  font-size: 0.875rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
`;

const ActionButtonsContainer = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{
  isDarkTheme: boolean;
  variant?: "primary" | "secondary";
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;

  ${(props) =>
    props.variant === "primary"
      ? `
    background: ${props.isDarkTheme ? "#2958FF" : "#2958FF"};
    color: white;
    
    &:hover:not(:disabled) {
      background: ${props.isDarkTheme ? "#1e3fd8" : "#1e3fd8"};
      opacity: 0.9;
    }
  `
      : `
    background: ${props.isDarkTheme ? "#374151" : "#E5E7EB"};
    color: ${props.isDarkTheme ? "#F3F4F6" : "#374151"};
    border: 1px solid ${props.isDarkTheme ? "#4B5563" : "#D1D5DB"};
    
    &:hover:not(:disabled) {
      background: ${props.isDarkTheme ? "#4B5563" : "#D1D5DB"};
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }
`;

const AmountInput = styled.input<{ isDarkTheme: boolean }>`
  padding: 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  background-color: ${(props) =>
    props.isDarkTheme ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)"};
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  font-size: 0.875rem;
  width: 150px;
  margin-right: 0.5rem;
`;

const CustomAmountInput = styled.input<{ isDarkTheme: boolean }>`
  padding: 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"};
  background-color: ${(props) =>
    props.isDarkTheme ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.05)"};
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  font-size: 0.75rem;
  flex: 1;
  margin-left: 0.5rem;
`;

const SimulationResultsContainer = styled.div<{ isDarkTheme: boolean }>`
  margin-top: 1rem;
  padding: 1rem;
  background-color: ${(props) =>
    props.isDarkTheme ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)"};
  border-radius: 0.5rem;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const SimulationResultsTitle = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  margin-bottom: 0.75rem;
`;

const SimulationStep = styled.div<{ isDarkTheme: boolean; success: boolean }>`
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: ${(props) =>
    props.success
      ? props.isDarkTheme
        ? "rgba(16, 185, 129, 0.1)"
        : "rgba(16, 185, 129, 0.05)"
      : props.isDarkTheme
      ? "rgba(239, 68, 68, 0.1)"
      : "rgba(239, 68, 68, 0.05)"};
  border-radius: 0.375rem;
  border: 1px solid
    ${(props) =>
      props.success
        ? props.isDarkTheme
          ? "rgba(16, 185, 129, 0.3)"
          : "rgba(16, 185, 129, 0.2)"
        : props.isDarkTheme
        ? "rgba(239, 68, 68, 0.3)"
        : "rgba(239, 68, 68, 0.2)"};
`;

const SimulationStepHeader = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  margin-bottom: 0.25rem;
`;

const SimulationStepDetail = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const SimulationSummary = styled.div<{ isDarkTheme: boolean }>`
  margin-top: 1rem;
  padding: 0.75rem;
  background: ${(props) => (props.isDarkTheme ? "#1F2937" : "#F9FAFB")};
  border-radius: 0.375rem;
  border: 1px solid ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};
`;

const SimulationSummaryRow = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
  font-size: 0.8125rem;
`;

const SimulationSummaryLabel = styled.span<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const SimulationSummaryValue = styled.span<{
  isDarkTheme: boolean;
  positive?: boolean;
}>`
  color: ${(props) =>
    props.positive ? "#10B981" : props.isDarkTheme ? "#F3F4F6" : "inherit"};
  font-weight: 600;
  font-family: monospace;
`;

const AmountTestsContainer = styled.div<{ isDarkTheme: boolean }>`
  margin-top: 1rem;
  padding: 0.75rem;
  background: ${(props) => (props.isDarkTheme ? "#1F2937" : "#F9FAFB")};
  border-radius: 0.375rem;
  border: 1px solid ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};
`;

const AmountTestsTitle = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  margin-bottom: 0.75rem;
`;

const AmountTestRow = styled.div<{
  isDarkTheme: boolean;
  isNegative: boolean;
  isSelected: boolean;
}>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  background: ${(props) =>
    props.isSelected
      ? props.isDarkTheme
        ? "rgba(41, 88, 255, 0.2)"
        : "rgba(41, 88, 255, 0.1)"
      : props.isNegative
      ? props.isDarkTheme
        ? "rgba(239, 68, 68, 0.1)"
        : "rgba(239, 68, 68, 0.05)"
      : "transparent"};
  border-radius: 0.25rem;
  border-left: ${(props) =>
    props.isSelected
      ? "3px solid #2958FF"
      : props.isNegative
      ? "3px solid #EF4444"
      : "none"};
  cursor: ${(props) => (!props.isNegative ? "pointer" : "not-allowed")};
  transition: all 0.2s;

  &:hover {
    background: ${(props) =>
      !props.isNegative && !props.isSelected
        ? props.isDarkTheme
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)"
        : undefined};
  }
`;

const RadioInput = styled.input<{ isDarkTheme: boolean }>`
  margin-right: 0.5rem;
  cursor: pointer;
`;

const AmountTestLabel = styled.span<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  font-family: monospace;
`;

const AmountTestValue = styled.span<{
  isDarkTheme: boolean;
  positive?: boolean;
}>`
  font-size: 0.75rem;
  color: ${(props) =>
    props.positive ? "#10B981" : props.isDarkTheme ? "#F3F4F6" : "inherit"};
  font-weight: 600;
  font-family: monospace;
`;

const Router: React.FC = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const dispatch = useDispatch();
  const tokens = useSelector(selectTokens);
  const { activeAccount, signTransactions } = useWallet();

  const [tokenA, setTokenA] = useState<ARC200TokenI | null>(null);
  const [tokenB, setTokenB] = useState<ARC200TokenI | null>(null);
  const [routeData, setRouteData] = useState<RouterResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [simulatingIndex, setSimulatingIndex] = useState<number | null>(null);
  const [executingIndex, setExecutingIndex] = useState<number | null>(null);
  const [selectedAmounts, setSelectedAmounts] = useState<Map<number, string>>(
    new Map()
  );
  const [customAmounts, setCustomAmounts] = useState<Map<number, string>>(
    new Map()
  );
  const [isCustomSelected, setIsCustomSelected] = useState<Map<number, boolean>>(
    new Map()
  );
  const [simulationResults, setSimulationResults] = useState<
    Map<
      number,
      {
        results: Array<{
          step: number;
          poolId: string;
          inputToken: string;
          outputToken: string;
          inputAmount: string;
          outputAmount: string;
          expectedOutput: string;
          slippage: string;
          price: string;
          success: boolean;
          error?: string;
        }>;
        initialAmount: string;
        finalAmount: string;
        allSuccessful: boolean;
        amountTests?: Array<{
          amount: string;
          amountDisplay: string;
          outputAmount: string;
          outputAmountDisplay: string;
          success: boolean;
        }>;
        selectedAmountResult?: {
          amount: string;
          amountDisplay: string;
          outputAmount: string;
          outputAmountDisplay: string;
          success: boolean;
        };
      }
    >
  >(new Map());

  useEffect(() => {
    dispatch(getTokensWithTickers() as unknown as UnknownAction);
  }, [dispatch]);

  // Helper function to get token ID for API
  const getTokenIdForAPI = (token: ARC200TokenI): number => {
    // VOI uses 390001 in the API
    if (token.symbol === "VOI" || token.tokenId === 0) {
      return 390001;
    }
    // Use contractId if available, otherwise tokenId
    return token.contractId ?? token.tokenId ?? 0;
  };

  // Fetch route when both tokens are selected
  useEffect(() => {
    const fetchRoute = async () => {
      if (!tokenA || !tokenB) {
        setRouteData(null);
        return;
      }

      // Don't fetch if tokens are the same
      if (
        getTokenIdForAPI(tokenA) === getTokenIdForAPI(tokenB) ||
        (tokenA.symbol === tokenB.symbol && tokenA.symbol === "VOI")
      ) {
        setRouteData(null);
        setError("Please select two different tokens");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const tokenAId = getTokenIdForAPI(tokenA);
        const tokenBId = getTokenIdForAPI(tokenB);

        const response = await fetch(
          `https://humble-api.voi.nautilus.sh/router/${tokenAId}/${tokenBId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch route: ${response.statusText}`);
        }

        const data: RouterResponse = await response.json();
        console.log("Router API response (raw):", JSON.stringify(data, null, 2));
        
        // Sort paths by outputAmount (descending - best routes first)
        const sortedPaths = [...(data.paths || [])].sort((a, b) => {
          const amountA = parseFloat(a.outputAmount || "0");
          const amountB = parseFloat(b.outputAmount || "0");
          return amountB - amountA;
        });
        
        const normalizedData: RouterResponse = {
          ...data,
          paths: sortedPaths,
        };
        
        console.log("Normalized route data:", normalizedData);
        setRouteData(normalizedData);
      } catch (err: any) {
        setError(err.message || "Failed to fetch routing information");
        setRouteData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [tokenA, tokenB]);

  const getTokenSymbol = (tokenId: string | number): string => {
    // Handle VOI token ID mapping
    const tokenIdNum = typeof tokenId === "string" ? parseInt(tokenId) : tokenId;
    if (tokenIdNum === 390001 || tokenIdNum === 0 || tokenId === "390001" || tokenId === "0") {
      return "VOI";
    }
    const token = tokens.find(
      (t) =>
        t.contractId?.toString() === tokenId.toString() ||
        t.tokenId?.toString() === tokenId.toString()
    );
    return token?.symbol || tokenId.toString();
  };

  const formatAmount = (amount: string, decimals: number = 6): string => {
    try {
      const num = parseFloat(amount);
      if (isNaN(num)) return amount;
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: decimals,
      });
    } catch {
      return amount;
    }
  };

  // Helper function to simulate swap path for a given input amount
  const simulateSwapPath = async (
    pathOption: PathOption,
    inputAmount: string,
    algodClient: any,
    indexerClient: any,
    acc: any,
    sourceDecimals: number
  ) => {
    const stepResults: Array<{
      step: number;
      poolId: string;
      inputToken: string;
      outputToken: string;
      inputAmount: string;
      outputAmount: string;
      expectedOutput: string;
      slippage: string;
      price: string;
      success: boolean;
      error?: string;
    }> = [];

    let currentAmount = inputAmount;
    const path = pathOption.path || [];
    const pools = pathOption.pools || [];
    const prices = pathOption.prices || [];

    // Pool spec for simulation
    const poolSpec = {
      name: "pool",
      desc: "pool",
      methods: [
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
      ],
      events: [],
    };

    // Simulate each swap in the path
    for (let i = 0; i < pools.length; i++) {
      const poolId = pools[i];
      const inputTokenId = path[i];
      const outputTokenId = path[i + 1];
      const expectedPrice = prices[i];

      try {
        // Fetch pool information
        const poolInfo = await getPool(Number(poolId));
        if (!poolInfo) {
          throw new Error(`Pool ${poolId} not found`);
        }

        // Determine if input token is token A or token B
        const inputTokenIdNum = Number(inputTokenId);
        const isInputTokenA =
          poolInfo.tokA === inputTokenIdNum ||
          poolInfo.tokA === Number(inputTokenId);
        const isInputTokenB =
          poolInfo.tokB === inputTokenIdNum ||
          poolInfo.tokB === Number(inputTokenId);

        if (!isInputTokenA && !isInputTokenB) {
          throw new Error(
            `Input token ${inputTokenId} is not in pool ${poolId}`
          );
        }

        // Get token metadata
        const inputToken = tokens.find(
          (t: ARC200TokenI) =>
            t.contractId?.toString() === inputTokenId ||
            t.tokenId?.toString() === inputTokenId
        );
        const outputToken = tokens.find(
          (t: ARC200TokenI) =>
            t.contractId?.toString() === outputTokenId ||
            t.tokenId?.toString() === outputTokenId
        );

        // Create contract instance for simulation
        const simulateCi = new CONTRACT(
          Number(poolId),
          algodClient,
          indexerClient,
          poolSpec,
          acc
        );
        simulateCi.setFee(3000);

        const amountInBN = new BigNumber(currentAmount).decimalPlaces(
          0,
          BigNumber.ROUND_DOWN
        );
        const amountIn = BigInt(amountInBN.toFixed(0));

        // Simulate swap
        let swapResult;
        if (isInputTokenA) {
          swapResult = await simulateCi.Trader_swapAForB(1, amountIn, BigInt(0));
        } else {
          swapResult = await simulateCi.Trader_swapBForA(1, amountIn, BigInt(0));
        }

        if (!swapResult?.success) {
          throw new Error(
            `Simulation failed: ${swapResult?.error || "Unknown error"}`
          );
        }

        // Extract output amount
        let outputAmount = "0";
        if (swapResult.returnValue && Array.isArray(swapResult.returnValue)) {
          outputAmount = isInputTokenA
            ? swapResult.returnValue[1].toString()
            : swapResult.returnValue[0].toString();
        }

        // Calculate expected output from price
        const expectedOutputBN = new BigNumber(currentAmount).multipliedBy(
          new BigNumber(expectedPrice)
        );
        const expectedOutput = expectedOutputBN.toFixed(0);

        // Calculate slippage
        const outputAmountBN = new BigNumber(outputAmount);
        const slippage = expectedOutputBN.isGreaterThan(0)
          ? outputAmountBN
              .minus(expectedOutputBN)
              .dividedBy(expectedOutputBN)
              .multipliedBy(100)
              .toFixed(2)
          : "0";

        stepResults.push({
          step: i + 1,
          poolId,
          inputToken: inputTokenId,
          outputToken: outputTokenId,
          inputAmount: currentAmount,
          outputAmount,
          expectedOutput,
          slippage,
          price: expectedPrice,
          success: true,
        });

        currentAmount = outputAmount;
      } catch (err: any) {
        stepResults.push({
          step: i + 1,
          poolId,
          inputToken: inputTokenId,
          outputToken: outputTokenId,
          inputAmount: currentAmount,
          outputAmount: "0",
          expectedOutput: "0",
          slippage: "0",
          price: expectedPrice,
          success: false,
          error: err.message || "Unknown error",
        });
        break;
      }
    }

    return {
      stepResults,
      finalAmount: stepResults[stepResults.length - 1]?.outputAmount || "0",
      success: stepResults.every((r) => r.success),
    };
  };

  const handleSimulate = async (pathOption: PathOption, index: number) => {
    if (!activeAccount) {
      toast.error("Please connect your wallet to simulate swap");
      return;
    }

    setSimulatingIndex(index);
    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      const acc = { addr: activeAccount.address, sk: new Uint8Array(0) };

      // Get source token (first token in path) to determine decimals
      const sourceTokenId = pathOption.path[0];
      const sourceToken = tokens.find(
        (t: ARC200TokenI) =>
          t.contractId?.toString() === sourceTokenId ||
          t.tokenId?.toString() === sourceTokenId
      );
      const sourceDecimals = sourceToken?.decimals ?? 6;

      // Get output token to determine decimals
      const outputTokenId = pathOption.path[pathOption.path.length - 1];
      const outputToken = tokens.find(
        (t: ARC200TokenI) =>
          t.contractId?.toString() === outputTokenId ||
          t.tokenId?.toString() === outputTokenId
      );
      const outputDecimals = outputToken?.decimals ?? 6;

      // Check if an amount is selected (from list or custom)
      const selectedAmount = selectedAmounts.get(index);
      
      if (selectedAmount) {
        // Simulate selected amount
        let testAmount: string;
        let amountDisplay: string;
        
        if (selectedAmount.includes("e") || selectedAmount.length > 10) {
          // Already in smallest units (from amount tests)
          testAmount = selectedAmount;
          const amountBN = new BigNumber(selectedAmount);
          amountDisplay = amountBN
            .dividedBy(new BigNumber(10).pow(sourceDecimals))
            .toFixed(6);
        } else {
          // In token units (from custom input)
          const amountBN = new BigNumber(selectedAmount)
            .multipliedBy(new BigNumber(10).pow(sourceDecimals))
            .decimalPlaces(0, BigNumber.ROUND_DOWN);
          testAmount = amountBN.toString();
          amountDisplay = selectedAmount;
        }

        // Simulate swap path for selected amount
        const result = await simulateSwapPath(
          pathOption,
          testAmount,
          algodClient,
          indexerClient,
          acc,
          sourceDecimals
        );

        // Calculate output amount in token units
        const outputAmountBN = new BigNumber(result.finalAmount);
        const outputAmountDisplay = outputAmountBN
          .dividedBy(new BigNumber(10).pow(outputDecimals))
          .toFixed(6);

        // Update simulation results with selected amount results
        setSimulationResults((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(index);
          newMap.set(index, {
            results: result.stepResults,
            initialAmount: testAmount,
            finalAmount: result.finalAmount,
            allSuccessful: result.success,
            amountTests: existing?.amountTests || [],
            selectedAmountResult: {
              amount: testAmount,
              amountDisplay,
              outputAmount: result.finalAmount,
              outputAmountDisplay,
              success: result.success,
            },
          });
          return newMap;
        });

        if (result.success) {
          toast.success(
            `Simulation complete! ${amountDisplay} ${tokenA?.symbol || "tokens"} → ${outputAmountDisplay} ${tokenB?.symbol || "tokens"}`
          );
        } else {
          toast.warning("Simulation completed with errors");
        }
      } else {
        // No amount selected, simulate all amounts (1, 10, 100, etc.)
        // Test amounts: 1, 10, 100, 1000, 10000, 100000, etc. (in token units)
        const amountTests: Array<{
          amount: string;
          amountDisplay: string;
          outputAmount: string;
          outputAmountDisplay: string;
          success: boolean;
        }> = [];

        // Start with 1 token and multiply by 10 each time
        let multiplier = 1;
        let firstSuccessfulResult: any = null;

        while (true) {
          // Calculate test amount in smallest units
          const testAmountTokens = multiplier; // e.g., 1, 10, 100, 1000...
          const testAmount = new BigNumber(testAmountTokens)
            .multipliedBy(new BigNumber(10).pow(sourceDecimals))
            .toString();

          // Simulate swap path for this amount
          const result = await simulateSwapPath(
            pathOption,
            testAmount,
            algodClient,
            indexerClient,
            acc,
            sourceDecimals
          );

          if (!result.success) {
            // If simulation failed, stop testing
            break;
          }

          // Calculate output amount in token units
          const outputAmountBN = new BigNumber(result.finalAmount);
          const outputAmountDisplay = outputAmountBN
            .dividedBy(new BigNumber(10).pow(outputDecimals))
            .toFixed(6);

          amountTests.push({
            amount: testAmount,
            amountDisplay: testAmountTokens.toString(),
            outputAmount: result.finalAmount,
            outputAmountDisplay,
            success: true,
          });

          // Store first successful result for detailed display
          if (!firstSuccessfulResult) {
            firstSuccessfulResult = result;
          }

          // Stop if we've tested enough amounts (prevent infinite loop)
          if (multiplier >= 1000000) {
            break;
          }

          // Increase multiplier for next test
          multiplier *= 10;
        }

        // Store simulation results
        setSimulationResults((prev) => {
          const newMap = new Map(prev);
          const firstTest = amountTests.find((t) => t.success);
          newMap.set(index, {
            results: firstSuccessfulResult?.stepResults || [],
            initialAmount: firstTest?.amount || "0",
            finalAmount: firstTest?.outputAmount || "0",
            allSuccessful: firstSuccessfulResult?.success || false,
            amountTests,
          });
          return newMap;
        });

        // Show simulation results
        if (amountTests.length > 0) {
          toast.success(
            `Simulation complete! Tested ${amountTests.length} amounts.`
          );
        } else {
          toast.warning("Simulation completed with errors");
        }
      }
    } catch (error: any) {
      console.error("Simulation error:", error);
      toast.error(`Simulation failed: ${error.message || "Unknown error"}`);
    } finally {
      setSimulatingIndex(null);
    }
  };

  const handleExecute = async (pathOption: PathOption, index: number) => {
    if (!activeAccount) {
      toast.error("Please connect your wallet to execute swap");
      return;
    }

    const selectedAmount = selectedAmounts.get(index);
    if (!selectedAmount) {
      toast.error("Please enter an amount to execute");
      return;
    }

    setExecutingIndex(index);
    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      const acc = {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      };

      // Pool spec for builder pattern
      const poolSpec = {
        name: "pool",
        desc: "pool",
        methods: [
          {
            name: "custom",
            args: [],
            returns: { type: "void" },
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
        ],
        events: [],
      };

      // Get source token to determine decimals
      const sourceTokenId = pathOption.path[0];
      const sourceToken = tokens.find(
        (t: ARC200TokenI) =>
          t.contractId?.toString() === sourceTokenId ||
          t.tokenId?.toString() === sourceTokenId
      );
      const sourceDecimals = sourceToken?.decimals ?? 6;

      // Convert input amount to smallest units
      // selectedAmount might already be in smallest units (from amount tests) or in token units (from manual input)
      let inputAmountBN: BigNumber;
      if (selectedAmount.includes("e") || selectedAmount.length > 10) {
        // Likely already in smallest units (from amount tests)
        inputAmountBN = new BigNumber(selectedAmount).decimalPlaces(0, BigNumber.ROUND_DOWN);
      } else {
        // In token units, convert to smallest units
        inputAmountBN = new BigNumber(selectedAmount)
          .multipliedBy(new BigNumber(10).pow(sourceDecimals))
          .decimalPlaces(0, BigNumber.ROUND_DOWN);
      }
      const inputAmount = BigInt(inputAmountBN.toFixed(0));

      toast.info("Building transactions...");

      // Step 1: Simulate all swaps to get amounts for each step
      let currentAmount = inputAmount;
      const swapAmounts: BigInt[] = [inputAmount];
      const swapInfos: Array<{
        poolId: string;
        inputTokenId: string;
        outputTokenId: string;
        amountIn: BigInt;
        isInputTokenA: boolean;
        poolInfo: any;
        inputToken: ARC200TokenI | undefined;
      }> = [];

      const path = pathOption.path || [];
      const pools = pathOption.pools || [];

      for (let i = 0; i < pools.length; i++) {
        const poolId = pools[i];
        const inputTokenId = path[i];
        const outputTokenId = path[i + 1];

        // Fetch pool information
        const poolInfo = await getPool(Number(poolId));
        if (!poolInfo) {
          throw new Error(`Pool ${poolId} not found`);
        }

        // Get input token metadata
        const inputToken = tokens.find(
          (t: ARC200TokenI) =>
            t.contractId?.toString() === inputTokenId ||
            t.tokenId?.toString() === inputTokenId
        );

        // Determine if input token is token A or token B
        const inputTokenIdNum = Number(inputTokenId);
        const isInputTokenA =
          poolInfo.tokA === inputTokenIdNum ||
          poolInfo.tokA === Number(inputTokenId);
        const isInputTokenB =
          poolInfo.tokB === inputTokenIdNum ||
          poolInfo.tokB === Number(inputTokenId);

        if (!isInputTokenA && !isInputTokenB) {
          throw new Error(
            `Input token ${inputTokenId} is not in pool ${poolId}`
          );
        }

        // Simulate swap to get output amount
        const simulateCi = new CONTRACT(
          Number(poolId),
          algodClient,
          indexerClient,
          poolSpec,
          acc
        );
        simulateCi.setFee(3000);

        let swapResult;
        if (isInputTokenA) {
          swapResult = await simulateCi.Trader_swapAForB(1, currentAmount, BigInt(0));
        } else {
          swapResult = await simulateCi.Trader_swapBForA(1, currentAmount, BigInt(0));
        }

        if (!swapResult?.success) {
          throw new Error(
            `Simulation failed for swap ${i + 1}: ${swapResult?.error}`
          );
        }

        // Extract output amount
        if (swapResult.returnValue && Array.isArray(swapResult.returnValue)) {
          const outputAmount = isInputTokenA
            ? swapResult.returnValue[1].toString()
            : swapResult.returnValue[0].toString();
          currentAmount = BigInt(outputAmount);
          swapAmounts.push(currentAmount);
        } else {
          throw new Error(`Could not determine output amount for swap ${i + 1}`);
        }

        swapInfos.push({
          poolId,
          inputTokenId,
          outputTokenId,
          amountIn: currentAmount,
          isInputTokenA,
          poolInfo,
          inputToken,
        });
      }

      // Step 2: Build all transactions
      const builderAcc = {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      };

      // Check if we need wVOI builder
      const firstInputToken = swapInfos[0]?.inputToken;
      const isFirstTokenNetwork =
        firstInputToken &&
        (firstInputToken.assetType === "network" ||
          firstInputToken.tokenId === 0 ||
          Number(swapInfos[0].inputTokenId) === 0);

      const finalTokenId = path[path.length - 1];
      const finalToken = tokens.find(
        (t: ARC200TokenI) =>
          t.contractId?.toString() === finalTokenId ||
          t.tokenId?.toString() === finalTokenId
      );

      const isFinalTokenNetwork =
        finalToken &&
        (finalToken.assetType === "network" ||
          finalToken.tokenId === 0 ||
          Number(finalTokenId) === 0);

      let wVOIBuilder: any = null;
      if (isFirstTokenNetwork || isFinalTokenNetwork) {
        wVOIBuilder = new CONTRACT(
          TOKEN_WVOI1,
          algodClient,
          indexerClient,
          {
            ...abi.arc200,
            methods: [
              ...abi.arc200.methods,
              {
                name: "deposit",
                args: [{ name: "amount", type: "uint64" }],
                returns: { type: "uint256" },
              },
              {
                name: "withdraw",
                args: [{ name: "amount", type: "uint64" }],
                returns: { type: "uint256" },
              },
            ],
          },
          builderAcc,
          true,
          false,
          true
        );
      }

      // Create builders for all pools and tokens
      const poolBuilders: any[] = [];
      const tokenBuilders: Map<number, any> = new Map();
      const poolAddrs: string[] = [];

      for (let i = 0; i < swapInfos.length; i++) {
        const swapInfo = swapInfos[i];
        const poolId = Number(swapInfo.poolId);
        const poolAddr = algosdk.getApplicationAddress(poolId);
        poolAddrs.push(poolAddr);

        // Create pool builder
        const poolBuilder = new CONTRACT(
          poolId,
          algodClient,
          indexerClient,
          poolSpec,
          builderAcc,
          true,
          false,
          true
        );
        poolBuilders.push({ pool: poolBuilder, poolAddr });

        // Create token builder if needed
        if (
          swapInfo.inputToken?.contractId &&
          swapInfo.inputToken.contractId !== 0
        ) {
          const contractId = swapInfo.inputToken.contractId;
          if (!tokenBuilders.has(contractId)) {
            const tokenBuilder = new CONTRACT(
              contractId,
              algodClient,
              indexerClient,
              { ...abi.arc200 },
              builderAcc,
              true,
              false,
              true
            );
            tokenBuilders.set(contractId, tokenBuilder);
          }
        }
      }

      // Step 3: Build all transaction objects
      const buildN: any[] = [];

      // 1. Deposit if network token (first swap only)
      if (isFirstTokenNetwork && wVOIBuilder) {
        const depositAmount = swapAmounts[0];
        const depositTxnO = (await wVOIBuilder.deposit(depositAmount)).obj;
        buildN.push({
          ...depositTxnO,
          payment: depositAmount,
          note: new TextEncoder().encode(
            `Deposit ${new BigNumber(depositAmount.toString())
              .dividedBy(new BigNumber(10).pow(6))
              .toFixed(6)} VOI to wVOI contract`
          ),
        });
      }

      // 2. Approve all tokens to all pools
      for (let i = 0; i < swapInfos.length; i++) {
        const swapInfo = swapInfos[i];
        const poolAddr = algosdk.getApplicationAddress(Number(swapInfo.poolId));

        // Check if token needs approval (all tokens with contractId except network on first swap)
        const needsApproval =
          swapInfo.inputToken &&
          swapInfo.inputToken.contractId &&
          swapInfo.inputToken.contractId !== 0 &&
          !(i === 0 && isFirstTokenNetwork);

        if (needsApproval && swapInfo.inputToken?.contractId) {
          const tokenBuilder = tokenBuilders.get(swapInfo.inputToken.contractId);
          if (tokenBuilder) {
            const approvalAmount = BigInt(Number.MAX_SAFE_INTEGER);
            const approvalTxnO = (
              await tokenBuilder.arc200_approve(poolAddr, approvalAmount)
            ).obj;
            buildN.push({
              ...approvalTxnO,
              note: new TextEncoder().encode(
                `Approve ${swapInfo.inputToken.symbol || "token"} (${
                  swapInfo.inputToken.contractId
                }) for pool ${swapInfo.poolId}`
              ),
            });
          }
        }
      }

      // 3. Build all swaps in order
      for (let i = 0; i < swapInfos.length; i++) {
        const swapInfo = swapInfos[i];
        const poolBuilder = poolBuilders[i].pool;
        const amountIn = swapAmounts[i];

        let swapTxnO;
        if (swapInfo.isInputTokenA) {
          swapTxnO = (await poolBuilder.Trader_swapAForB(0, amountIn, BigInt(0)))
            .obj;
        } else {
          swapTxnO = (await poolBuilder.Trader_swapBForA(0, amountIn, BigInt(0)))
            .obj;
        }

        buildN.push({
          ...swapTxnO,
          note: new TextEncoder().encode(
            `Swap ${i + 1}/${swapInfos.length}: ${swapInfo.inputTokenId} -> ${swapInfo.outputTokenId}`
          ),
        });
      }

      // 4. Withdraw if final destination token is network token
      if (isFinalTokenNetwork && wVOIBuilder) {
        // The final amount is the last element in swapAmounts
        const finalAmount = swapAmounts[swapAmounts.length - 1];
        const withdrawTxnO = (await wVOIBuilder.withdraw(finalAmount)).obj;
        buildN.push({
          ...withdrawTxnO,
          note: new TextEncoder().encode(
            `Withdraw ${new BigNumber(finalAmount.toString())
              .dividedBy(new BigNumber(10).pow(6))
              .toFixed(6)} VOI from wVOI contract`
          ),
        });
      }

      // Step 4: Combine all transactions into single group using first pool
      const firstPoolId = Number(pathOption.pools[0]);
      const ci = new CONTRACT(
        firstPoolId,
        algodClient,
        indexerClient,
        poolSpec,
        acc
      );
      ci.setFee(4000);
      ci.setAccounts(poolAddrs);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);

      toast.info("Signing all transactions...");

      // Build the transaction group
      const customR = await ci.custom();

      console.log({ customR });

      if (!customR.success) {
        throw new Error(
          customR.error || "Transaction group build failed"
        );
      }

      if (!customR.txns || customR.txns.length === 0) {
        throw new Error("No transactions returned");
      }

      // Step 5: Sign once
      const unsignedTxns = customR.txns.map(
        (t: string) => new Uint8Array(Buffer.from(t, "base64"))
      );

      let signedTxns;
      try {
        signedTxns = await signTransactions(unsignedTxns);
      } catch (e: any) {
        if (
          e.message?.includes("User rejected") ||
          e.message?.includes("cancelled")
        ) {
          toast.info("Transaction cancelled by user");
          return;
        }
        throw e;
      }

      if (!signedTxns) {
        toast.info("Transaction cancelled by user");
        return;
      }

      // Step 6: Send once
      toast.info("Sending transaction group...");
      const res = await algodClient
        .sendRawTransaction(signedTxns as Uint8Array[])
        .do();

      // Wait for confirmation
      toast.info("Waiting for confirmation...");
      await algosdk.waitForConfirmation(algodClient, res.txId, 10);

      toast.success(
        `Swap executed successfully! Transaction ID: ${res.txId}`
      );

      // Clear selected amount after successful execution
      setSelectedAmounts((prev) => {
        const newMap = new Map(prev);
        newMap.delete(index);
        return newMap;
      });
    } catch (error: any) {
      console.error("Execute swap error:", error);
      toast.error(`Swap execution failed: ${error.message || "Unknown error"}`);
    } finally {
      setExecutingIndex(null);
    }
  };

  return (
    <Container>
      <Title isDarkTheme={isDarkTheme}>Router</Title>
      <Typography
        variant="body2"
        sx={{
          color: isDarkTheme ? "#9CA3AF" : "#6B7280",
          marginBottom: "2rem",
        }}
      >
        Find the optimal routing path between two tokens
      </Typography>

      <TokenSelectionContainer isDarkTheme={isDarkTheme}>
        <TokenSelectWrapper>
          <TokenSelectLabel isDarkTheme={isDarkTheme}>
            Token A (From)
          </TokenSelectLabel>
          <TokenSelect
            token={tokenA || undefined}
            onSelect={setTokenA}
          />
        </TokenSelectWrapper>

        <SwapArrow>
          <ArrowRightAltIcon
            sx={{
              color: isDarkTheme ? "#9CA3AF" : "#6B7280",
              transform: "rotate(90deg)",
            }}
          />
        </SwapArrow>

        <TokenSelectWrapper>
          <TokenSelectLabel isDarkTheme={isDarkTheme}>
            Token B (To)
          </TokenSelectLabel>
          <TokenSelect
            token={tokenB || undefined}
            onSelect={setTokenB}
          />
        </TokenSelectWrapper>
      </TokenSelectionContainer>

      {loading && (
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      )}

      {error && (
        <ErrorMessage isDarkTheme={isDarkTheme}>{error}</ErrorMessage>
      )}

      {routeData && !loading && (
        <>
          <DebugToggle
            isDarkTheme={isDarkTheme}
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? "Hide" : "Show"} Debug Info
          </DebugToggle>
          {showDebug && (
            <DebugInfo isDarkTheme={isDarkTheme}>
              <strong>Route Data:</strong>
              {JSON.stringify(routeData, null, 2)}
            </DebugInfo>
          )}
        </>
      )}

      {routeData && !loading && (
        <RouteContainer isDarkTheme={isDarkTheme}>
          <RouteHeader>
            <RouteTitle isDarkTheme={isDarkTheme}>
              Available Routes ({routeData.paths?.length || 0})
            </RouteTitle>
            <Typography
              variant="caption"
              sx={{
                color: isDarkTheme ? "#9CA3AF" : "#6B7280",
                fontSize: "0.75rem",
              }}
            >
              Sorted by best output
            </Typography>
          </RouteHeader>

          {routeData.paths && routeData.paths.length > 0 ? (
            routeData.paths.map((pathOption, pathIndex) => {
              const isBest = pathIndex === 0;
              const steps = pathOption.path || [];
              const pools = pathOption.pools || [];
              
              return (
                <PathCard
                  key={pathIndex}
                  isDarkTheme={isDarkTheme}
                  isBest={isBest}
                >
                  <PathHeader>
                    <PathTitle isDarkTheme={isDarkTheme}>
                      Route #{pathIndex + 1}
                      {isBest && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.75rem",
                            color: isDarkTheme ? "#A78BFA" : "#7C3AED",
                            fontWeight: 600,
                          }}
                        >
                          (Best)
                        </span>
                      )}
                    </PathTitle>
                    <PathOutput isDarkTheme={isDarkTheme} isBest={isBest}>
                      {formatAmount(pathOption.outputAmount)}{" "}
                      {tokenB?.symbol || "Token B"}
                    </PathOutput>
                  </PathHeader>

                  <PathDescription isDarkTheme={isDarkTheme}>
                    {pathOption.description}
                  </PathDescription>

                  <PathSteps>
                    {steps.map((tokenId, stepIndex) => {
                      const nextTokenId =
                        stepIndex < steps.length - 1
                          ? steps[stepIndex + 1]
                          : null;
                      const poolId =
                        stepIndex < pools.length ? pools[stepIndex] : null;
                      const price =
                        stepIndex < pathOption.prices.length
                          ? pathOption.prices[stepIndex]
                          : null;

                      if (!nextTokenId) return null;

                      const tokenInSymbol = getTokenSymbol(tokenId);
                      const tokenOutSymbol = getTokenSymbol(nextTokenId);

                      return (
                        <React.Fragment key={stepIndex}>
                          <RouteStepCard isDarkTheme={isDarkTheme}>
                            <RouteStepInfo>
                              <RouteStepToken isDarkTheme={isDarkTheme}>
                                {tokenInSymbol} → {tokenOutSymbol}
                              </RouteStepToken>
                              {price && (
                                <RouteStepAmount isDarkTheme={isDarkTheme}>
                                  Price: {formatAmount(price)}
                                </RouteStepAmount>
                              )}
                            </RouteStepInfo>
                            {poolId && (
                              <RouteStepPool isDarkTheme={isDarkTheme}>
                                Pool #{poolId}
                              </RouteStepPool>
                            )}
                          </RouteStepCard>
                          {stepIndex < steps.length - 2 && (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                margin: "-0.25rem 0",
                              }}
                            >
                              <ArrowRightAltIcon
                                sx={{
                                  color: isDarkTheme ? "#9CA3AF" : "#6B7280",
                                  transform: "rotate(90deg)",
                                  fontSize: "1.25rem",
                                }}
                              />
                            </Box>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </PathSteps>

                  <ActionButtonsContainer isDarkTheme={isDarkTheme}>
                    <ActionButton
                      isDarkTheme={isDarkTheme}
                      variant="secondary"
                      disabled={
                        simulatingIndex === pathIndex ||
                        simulatingIndex !== null ||
                        executingIndex === pathIndex
                      }
                      onClick={() => handleSimulate(pathOption, pathIndex)}
                    >
                      {simulatingIndex === pathIndex ? (
                        <>
                          <CircularProgress size={16} />
                          <span style={{ marginLeft: "0.5rem" }}>Simulating...</span>
                        </>
                      ) : (
                        "Simulate"
                      )}
                    </ActionButton>
                    {simulationResults.has(pathIndex) &&
                      simulationResults.get(pathIndex)?.amountTests &&
                      simulationResults.get(pathIndex)!.amountTests!.length > 0 ? (
                      <ActionButton
                        isDarkTheme={isDarkTheme}
                        variant="primary"
                        disabled={
                          !selectedAmounts.has(pathIndex) ||
                          executingIndex === pathIndex ||
                          executingIndex !== null ||
                          simulatingIndex === pathIndex
                        }
                        onClick={() => handleExecute(pathOption, pathIndex)}
                        style={{ marginTop: "1rem" }}
                      >
                        {executingIndex === pathIndex ? (
                          <>
                            <CircularProgress size={16} />
                            <span style={{ marginLeft: "0.5rem" }}>Executing...</span>
                          </>
                        ) : (
                          "Execute Selected Amount"
                        )}
                      </ActionButton>
                    ) : null}
                    {(!simulationResults.has(pathIndex) ||
                      !simulationResults.get(pathIndex)?.amountTests ||
                      simulationResults.get(pathIndex)!.amountTests!.length === 0) && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <AmountInput
                          isDarkTheme={isDarkTheme}
                          type="number"
                          placeholder="Amount"
                          value={selectedAmounts.get(pathIndex) || ""}
                          onChange={(e) => {
                            const newMap = new Map(selectedAmounts);
                            newMap.set(pathIndex, e.target.value);
                            setSelectedAmounts(newMap);
                          }}
                          disabled={executingIndex === pathIndex}
                        />
                        <ActionButton
                          isDarkTheme={isDarkTheme}
                          variant="primary"
                          disabled={
                            !selectedAmounts.get(pathIndex) ||
                            executingIndex === pathIndex ||
                            executingIndex !== null ||
                            simulatingIndex === pathIndex
                          }
                          onClick={() => handleExecute(pathOption, pathIndex)}
                        >
                          {executingIndex === pathIndex ? (
                            <>
                              <CircularProgress size={16} />
                              <span style={{ marginLeft: "0.5rem" }}>Executing...</span>
                            </>
                          ) : (
                            "Execute"
                          )}
                        </ActionButton>
                      </Box>
                    )}
                  </ActionButtonsContainer>

                  {simulationResults.has(pathIndex) && (
                    <SimulationResultsContainer isDarkTheme={isDarkTheme}>
                      <SimulationResultsTitle isDarkTheme={isDarkTheme}>
                        Simulation Results
                      </SimulationResultsTitle>
                      
                      <SimulationSummary isDarkTheme={isDarkTheme}>
                        {simulationResults.get(pathIndex)?.selectedAmountResult ? (
                          <>
                            <SimulationSummaryRow isDarkTheme={isDarkTheme}>
                              <SimulationSummaryLabel isDarkTheme={isDarkTheme}>
                                Selected Amount:
                              </SimulationSummaryLabel>
                              <SimulationSummaryValue isDarkTheme={isDarkTheme}>
                                {simulationResults.get(pathIndex)?.selectedAmountResult?.amountDisplay}{" "}
                                {tokenA?.symbol || "Token A"}
                              </SimulationSummaryValue>
                            </SimulationSummaryRow>
                            <SimulationSummaryRow isDarkTheme={isDarkTheme}>
                              <SimulationSummaryLabel isDarkTheme={isDarkTheme}>
                                Output Amount:
                              </SimulationSummaryLabel>
                              <SimulationSummaryValue
                                isDarkTheme={isDarkTheme}
                                positive={simulationResults.get(pathIndex)?.selectedAmountResult?.success}
                              >
                                {simulationResults.get(pathIndex)?.selectedAmountResult?.outputAmountDisplay}{" "}
                                {tokenB?.symbol || "Token B"}
                              </SimulationSummaryValue>
                            </SimulationSummaryRow>
                            <SimulationSummaryRow isDarkTheme={isDarkTheme}>
                              <SimulationSummaryLabel isDarkTheme={isDarkTheme}>
                                Status:
                              </SimulationSummaryLabel>
                              <SimulationSummaryValue
                                isDarkTheme={isDarkTheme}
                                positive={simulationResults.get(pathIndex)?.selectedAmountResult?.success}
                              >
                                {simulationResults.get(pathIndex)?.selectedAmountResult?.success
                                  ? "✓ Success"
                                  : "✗ Failed"}
                              </SimulationSummaryValue>
                            </SimulationSummaryRow>
                          </>
                        ) : (
                          <>
                            <SimulationSummaryRow isDarkTheme={isDarkTheme}>
                              <SimulationSummaryLabel isDarkTheme={isDarkTheme}>
                                Status:
                              </SimulationSummaryLabel>
                              <SimulationSummaryValue
                                isDarkTheme={isDarkTheme}
                                positive={simulationResults.get(pathIndex)?.allSuccessful}
                              >
                                {simulationResults.get(pathIndex)?.allSuccessful
                                  ? "✓ All Successful"
                                  : "✗ Errors Found"}
                              </SimulationSummaryValue>
                            </SimulationSummaryRow>
                            {simulationResults.get(pathIndex)?.initialAmount && (
                              <SimulationSummaryRow isDarkTheme={isDarkTheme}>
                                <SimulationSummaryLabel isDarkTheme={isDarkTheme}>
                                  Test Amount:
                                </SimulationSummaryLabel>
                                <SimulationSummaryValue isDarkTheme={isDarkTheme}>
                                  {formatAmount(simulationResults.get(pathIndex)?.initialAmount || "0")}{" "}
                                  {tokenA?.symbol || "Token A"}
                                </SimulationSummaryValue>
                              </SimulationSummaryRow>
                            )}
                            {simulationResults.get(pathIndex)?.finalAmount && (
                              <SimulationSummaryRow isDarkTheme={isDarkTheme}>
                                <SimulationSummaryLabel isDarkTheme={isDarkTheme}>
                                  Output Amount:
                                </SimulationSummaryLabel>
                                <SimulationSummaryValue isDarkTheme={isDarkTheme}>
                                  {formatAmount(simulationResults.get(pathIndex)?.finalAmount || "0")}{" "}
                                  {tokenB?.symbol || "Token B"}
                                </SimulationSummaryValue>
                              </SimulationSummaryRow>
                            )}
                          </>
                        )}
                      </SimulationSummary>

                      {simulationResults.get(pathIndex)?.amountTests &&
                        simulationResults.get(pathIndex)!.amountTests!.length > 0 && (
                          <AmountTestsContainer isDarkTheme={isDarkTheme}>
                            <AmountTestsTitle isDarkTheme={isDarkTheme}>
                              Select Amount to Execute
                            </AmountTestsTitle>
                            {simulationResults
                              .get(pathIndex)
                              ?.amountTests?.map((test, testIndex) => {
                                const isSelected =
                                  !isCustomSelected.get(pathIndex) &&
                                  selectedAmounts.get(pathIndex) === test.amount;
                                return (
                                  <AmountTestRow
                                    key={testIndex}
                                    isDarkTheme={isDarkTheme}
                                    isNegative={false}
                                    isSelected={isSelected}
                                    onClick={() => {
                                      setIsCustomSelected((prev) => {
                                        const newMap = new Map(prev);
                                        newMap.set(pathIndex, false);
                                        return newMap;
                                      });
                                      setSelectedAmounts((prev) => {
                                        const newMap = new Map(prev);
                                        newMap.set(pathIndex, test.amount);
                                        return newMap;
                                      });
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        flex: 1,
                                      }}
                                    >
                                      <RadioInput
                                        type="radio"
                                        isDarkTheme={isDarkTheme}
                                        checked={isSelected}
                                        onChange={() => {
                                          setIsCustomSelected((prev) => {
                                            const newMap = new Map(prev);
                                            newMap.set(pathIndex, false);
                                            return newMap;
                                          });
                                          setSelectedAmounts((prev) => {
                                            const newMap = new Map(prev);
                                            newMap.set(pathIndex, test.amount);
                                            return newMap;
                                          });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <AmountTestLabel isDarkTheme={isDarkTheme}>
                                        {test.amountDisplay} {tokenA?.symbol || "tokens"} →{" "}
                                        {test.outputAmountDisplay} {tokenB?.symbol || "tokens"}
                                      </AmountTestLabel>
                                    </div>
                                  </AmountTestRow>
                                );
                              })}
                            {/* Custom Amount Option */}
                            <AmountTestRow
                              isDarkTheme={isDarkTheme}
                              isNegative={false}
                              isSelected={isCustomSelected.get(pathIndex) || false}
                              onClick={() => {
                                setIsCustomSelected((prev) => {
                                  const newMap = new Map(prev);
                                  newMap.set(pathIndex, true);
                                  return newMap;
                                });
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  flex: 1,
                                  width: "100%",
                                }}
                              >
                                <RadioInput
                                  type="radio"
                                  isDarkTheme={isDarkTheme}
                                  checked={isCustomSelected.get(pathIndex) || false}
                                  onChange={() => {
                                    setIsCustomSelected((prev) => {
                                      const newMap = new Map(prev);
                                      newMap.set(pathIndex, true);
                                      return newMap;
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <AmountTestLabel isDarkTheme={isDarkTheme}>
                                  Custom Amount:
                                </AmountTestLabel>
                                <CustomAmountInput
                                  isDarkTheme={isDarkTheme}
                                  type="number"
                                  placeholder="Enter amount"
                                  value={customAmounts.get(pathIndex) || ""}
                                  onChange={(e) => {
                                    const newMap = new Map(customAmounts);
                                    newMap.set(pathIndex, e.target.value);
                                    setCustomAmounts(newMap);
                                    // Update selected amount when custom amount changes
                                    if (e.target.value) {
                                      setIsCustomSelected((prev) => {
                                        const newMap = new Map(prev);
                                        newMap.set(pathIndex, true);
                                        return newMap;
                                      });
                                      setSelectedAmounts((prev) => {
                                        const newMap = new Map(prev);
                                        newMap.set(pathIndex, e.target.value);
                                        return newMap;
                                      });
                                    }
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCustomSelected((prev) => {
                                      const newMap = new Map(prev);
                                      newMap.set(pathIndex, true);
                                      return newMap;
                                    });
                                  }}
                                />
                              </div>
                            </AmountTestRow>
                          </AmountTestsContainer>
                        )}

                      {simulationResults
                        .get(pathIndex)
                        ?.results.map((result, resultIndex) => (
                          <SimulationStep
                            key={resultIndex}
                            isDarkTheme={isDarkTheme}
                            success={result.success}
                          >
                            <SimulationStepHeader isDarkTheme={isDarkTheme}>
                              Step {result.step}:{" "}
                              {result.success ? "✓ Success" : "✗ Failed"}
                            </SimulationStepHeader>
                            <SimulationStepDetail isDarkTheme={isDarkTheme}>
                              Pool: {result.poolId}
                            </SimulationStepDetail>
                            <SimulationStepDetail isDarkTheme={isDarkTheme}>
                              {getTokenSymbol(result.inputToken)} →{" "}
                              {getTokenSymbol(result.outputToken)}
                            </SimulationStepDetail>
                            {result.success && (
                              <>
                                <SimulationStepDetail isDarkTheme={isDarkTheme}>
                                  Input: {formatAmount(result.inputAmount)} | Output:{" "}
                                  {formatAmount(result.outputAmount)}
                                </SimulationStepDetail>
                                {result.slippage && (
                                  <SimulationStepDetail isDarkTheme={isDarkTheme}>
                                    Slippage: {result.slippage}%
                                  </SimulationStepDetail>
                                )}
                              </>
                            )}
                            {result.error && (
                              <SimulationStepDetail isDarkTheme={isDarkTheme}>
                                Error: {result.error}
                              </SimulationStepDetail>
                            )}
                          </SimulationStep>
                        ))}
                    </SimulationResultsContainer>
                  )}
                </PathCard>
              );
            })
          ) : (
            <Box
              sx={{
                padding: "2rem",
                textAlign: "center",
                color: isDarkTheme ? "#9CA3AF" : "#6B7280",
              }}
            >
              <Typography variant="body2">
                No routes found between these tokens.
              </Typography>
            </Box>
          )}
        </RouteContainer>
      )}

      {!tokenA || !tokenB ? (
        <Box
          sx={{
            padding: "2rem",
            textAlign: "center",
            color: isDarkTheme ? "#9CA3AF" : "#6B7280",
          }}
        >
          <Typography variant="body1">
            Select two tokens to find the optimal routing path
          </Typography>
        </Box>
      ) : null}
    </Container>
  );
};

export default Router;

