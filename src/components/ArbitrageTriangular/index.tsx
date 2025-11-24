import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { Tooltip, CircularProgress } from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, swap, abi } from "ulujs";
import { getAlgorandClients } from "../../wallets";
import { toast } from "react-toastify";
import BigNumber from "bignumber.js";
import { getTokensWithTickers } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { ARC200TokenI } from "../../types";
import { getPool } from "../../store/poolSlice";
import algosdk from "algosdk";
import { TOKEN_WVOI1 } from "../../constants/tokens";

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
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const StatsCard = styled.div<{ isDarkTheme: boolean }>`
  padding: 1rem;
  background: ${(props) => (props.isDarkTheme ? "#1F2937" : "white")};
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const StatsCardTitle = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  margin-bottom: 0.5rem;
`;

const StatsCardValue = styled.div<{ isDarkTheme: boolean }>`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const TableWrapper = styled.div<{ isDarkTheme: boolean }>`
  overflow-x: auto;
  background-color: ${(props) => (props.isDarkTheme ? "#1F2937" : "white")};
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);

  @media (max-width: 768px) {
    overflow-x: visible;
  }
`;

const Table = styled.table<{ isDarkTheme: boolean }>`
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;

  @media (max-width: 768px) {
    display: block;

    & thead {
      display: none;
    }

    & tbody {
      display: block;
    }

    & tr {
      display: block;
      margin-bottom: 1.5rem;
      border: 1px solid
        ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};
      border-radius: 0.5rem;
      padding: 0.75rem;
    }

    & td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border: none;

      &::before {
        content: attr(data-label);
        font-weight: 600;
        margin-right: 1rem;
      }
    }
  }
`;

const TableHead = styled.thead<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#374151" : "#F9FAFB")};
`;

const TableHeader = styled.th<{ isDarkTheme: boolean }>`
  padding: 0.75rem 1.5rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const TableBody = styled.tbody<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#1F2937" : "white")};
  & > tr {
    border-bottom: 1px solid
      ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};

    &:hover {
      background-color: ${(props) =>
        props.isDarkTheme ? "#374151" : "#F3F4F6"};
    }
  }
`;

const TableCell = styled.td<{ isDarkTheme: boolean }>`
  padding: 1rem 1.5rem;
  white-space: nowrap;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  font-size: 0.875rem;
`;

const ProfitCell = styled(TableCell)<{ isDarkTheme: boolean; profit: number }>`
  font-weight: bold;
  color: ${(props) => {
    if (props.profit > 50) return "#10B981"; // green
    if (props.profit > 10) return "#F59E0B"; // orange
    return props.isDarkTheme ? "#F3F4F6" : "inherit";
  }};
`;

const PathCell = styled(TableCell)<{ isDarkTheme: boolean }>`
  white-space: normal;
  min-width: 300px;
`;

const PathContainer = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const TokenIconWrapper = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
`;

const TokenIcon = styled.img<{ isDarkTheme?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid ${(props) => (props.isDarkTheme ? "#4B5563" : "#D1D5DB")};
  background: ${(props) => (props.isDarkTheme ? "#1F2937" : "#F9FAFB")};
`;

const TokenIdLabel = styled.span<{ isDarkTheme: boolean }>`
  font-size: 0.625rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  font-family: monospace;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ArrowIcon = styled(ArrowRightAltIcon)<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#6B7280" : "#9CA3AF")};
  font-size: 1.25rem !important;
  flex-shrink: 0;
`;

const PoolId = styled.span<{ isDarkTheme: boolean }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  margin: 0.125rem;
  background: ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-family: monospace;
`;

const ExpandableRow = styled.tr<{ isDarkTheme: boolean; isExpanded: boolean }>`
  cursor: pointer;
  background-color: ${(props) =>
    props.isExpanded
      ? props.isDarkTheme
        ? "#4B5563"
        : "#E5E7EB"
      : "transparent"};

  &:hover {
    background-color: ${(props) => (props.isDarkTheme ? "#374151" : "#F3F4F6")};
  }
`;

const ExpandIcon = styled.div<{ isDarkTheme: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) =>
      props.isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  }
`;

const ExpandedContent = styled.tr<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#111827" : "#F9FAFB")};
`;

const ExpandedCell = styled.td<{ isDarkTheme: boolean }>`
  padding: 1rem 1.5rem;
  padding-left: 3rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const ExpandedContentWrapper = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ExpandedSection = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ExpandedLabel = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  margin-bottom: 0.25rem;
`;

const ExpandedValue = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  word-break: break-word;
`;

const SimulationResultsContainer = styled.div<{ isDarkTheme: boolean }>`
  margin-top: 1.5rem;
  padding: 1rem;
  background: ${(props) =>
    props.isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
  border-radius: 0.5rem;
  border: 1px solid ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};
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
  background: ${(props) =>
    props.success
      ? props.isDarkTheme
        ? "rgba(16, 185, 129, 0.1)"
        : "rgba(16, 185, 129, 0.05)"
      : props.isDarkTheme
      ? "rgba(239, 68, 68, 0.1)"
      : "rgba(239, 68, 68, 0.05)"};
  border-radius: 0.375rem;
  border-left: 3px solid ${(props) => (props.success ? "#10B981" : "#EF4444")};
`;

const SimulationStepHeader = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  margin-bottom: 0.5rem;
`;

const SimulationStepDetail = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.isDarkTheme ? "#D1D5DB" : "#6B7280")};
  margin-top: 0.25rem;
  font-family: monospace;
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

const ActionCell = styled(TableCell)<{ isDarkTheme: boolean }>`
  text-align: center;
  width: 80px;
`;

interface ArbitrageOpportunity {
  path: string[];
  pools: string[];
  prices: string[];
  profitPercent: number;
  description: string;
}

interface ArbitrageResponse {
  opportunities: ArbitrageOpportunity[];
  count: number;
  minProfitPercent: number;
  type: string;
}

const API_URL = "https://humble-api.voi.nautilus.sh/arbitrage/triangular";

const LoadingWrapper = styled.div<{ isDarkTheme: boolean }>`
  padding: 2rem;
  text-align: center;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
`;

const ErrorMessage = styled.div<{ isDarkTheme: boolean }>`
  padding: 1rem;
  background: ${(props) =>
    props.isDarkTheme ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)"};
  border: 1px solid ${(props) => (props.isDarkTheme ? "#DC2626" : "#EF4444")};
  border-radius: 0.5rem;
  color: ${(props) => (props.isDarkTheme ? "#FCA5A5" : "#DC2626")};
  margin-bottom: 1rem;
`;

const ArbitrageTriangular: React.FC = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const debug = searchParams.get("debug") === "true";
  const { activeAccount, signTransactions } = useWallet();

  // Get tokens from Redux store
  const tokens = useSelector((state: RootState) => state.tokens.tokens);

  const [data, setData] = useState<ArbitrageResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [simulatingIndex, setSimulatingIndex] = useState<number | null>(null);
  const [executingIndex, setExecutingIndex] = useState<number | null>(null);
  const [selectedAmounts, setSelectedAmounts] = useState<Map<number, string>>(
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
        profit: string;
        profitPercent: string;
        allSuccessful: boolean;
        amountTests?: Array<{
          amount: string;
          amountDisplay: string;
          profit: string;
          profitPercent: string;
          success: boolean;
        }>;
      }
    >
  >(new Map());

  // Fetch tokens on mount
  useEffect(() => {
    dispatch(getTokensWithTickers() as unknown as UnknownAction);
  }, [dispatch]);

  useEffect(() => {
    const fetchArbitrageData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch arbitrage data: ${response.statusText}`
          );
        }
        const responseData: ArbitrageResponse = await response.json();
        setData(responseData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchArbitrageData();
  }, []);

  const sortedOpportunities = useMemo(() => {
    if (!data) return [];
    return [...data.opportunities].sort(
      (a, b) => b.profitPercent - a.profitPercent
    );
  }, [data]);

  const maxProfit = useMemo(() => {
    if (!data || data.opportunities.length === 0) return 0;
    return Math.max(...data.opportunities.map((o) => o.profitPercent));
  }, [data]);

  const getTokenIconUrl = (tokenId: string): string => {
    const tokenIdNum = parseInt(tokenId);
    // Handle wVOI special case (390001 -> 0)
    if (tokenIdNum === 390001) {
      return "https://asset-verification.nautilus.sh/icons/0.png";
    }
    return `https://asset-verification.nautilus.sh/icons/${tokenIdNum}.png`;
  };

  const handleRowToggle = (index: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const formatAmount = (amount: string): string => {
    try {
      const num = new BigNumber(amount);
      if (num.isZero()) return "0";
      // Format with commas for readability
      return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } catch {
      return amount;
    }
  };

  // Helper function to simulate arbitrage for a given input amount
  const simulateArbitrageForAmount = async (
    opportunity: ArbitrageOpportunity,
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
    let currentTokenId = opportunity.path[0];

    // Simulate each swap in the arbitrage path
    for (let i = 0; i < opportunity.pools.length; i++) {
      const poolId = opportunity.pools[i];
      const inputTokenId = opportunity.path[i];
      const outputTokenId = opportunity.path[i + 1];
      const price = opportunity.prices[i];

      try {
        // Fetch pool information to determine which token is A and which is B
        const poolInfo = await getPool(Number(poolId));
        if (!poolInfo) {
          throw new Error(`Pool ${poolId} not found`);
        }

        // Determine if input token is token A or token B in the pool
        const inputTokenIdNum = Number(inputTokenId);
        const isInputTokenA =
          poolInfo.tokA === inputTokenIdNum ||
          poolInfo.tokA === Number(inputTokenId);
        const isInputTokenB =
          poolInfo.tokB === inputTokenIdNum ||
          poolInfo.tokB === Number(inputTokenId);

        if (!isInputTokenA && !isInputTokenB) {
          throw new Error(
            `Input token ${inputTokenId} is not in pool ${poolId} (tokA: ${poolInfo.tokA}, tokB: ${poolInfo.tokB})`
          );
        }

        // Get token metadata for input and output tokens
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

        const inputDecimals = inputToken?.decimals ?? 6;
        const outputDecimals = outputToken?.decimals ?? 6;

        // Create contract instance for the pool
        const ci = new CONTRACT(
          Number(poolId),
          algodClient,
          indexerClient,
          {
            name: "pool",
            desc: "pool",
            methods: [
              {
                name: "Trader_swapAForB",
                args: [
                  {
                    type: "byte",
                    name: "simulate",
                    desc: "Simulate the swap (1 = Y, 0 = N)",
                  },
                  {
                    type: "uint256",
                    name: "amountIn",
                    desc: "The amount of token A to swap",
                  },
                  {
                    type: "uint256",
                    name: "outSlippage",
                    desc: "The slippage tolerance for the output amount",
                  },
                ],
                returns: {
                  type: "(uint256,uint256)",
                  desc: "The amount of A and B received",
                },
              },
              {
                name: "Trader_swapBForA",
                args: [
                  {
                    type: "byte",
                    name: "simulate",
                    desc: "Simulate the swap (1 = Y, 0 = N)",
                  },
                  {
                    type: "uint256",
                    name: "amountIn",
                    desc: "The amount of token B to swap",
                  },
                  {
                    type: "uint256",
                    name: "outSlippage",
                    desc: "The slippage tolerance for the output amount",
                  },
                ],
                returns: {
                  type: "(uint256,uint256)",
                  desc: "The amount of A and B received",
                },
              },
            ],
            events: [],
          },
          acc
        );
        ci.setFee(3000);

        // Convert currentAmount to BigInt (it's already in smallest units)
        const amountInBN = new BigNumber(currentAmount).decimalPlaces(
          0,
          BigNumber.ROUND_DOWN
        );
        const amountIn = BigInt(amountInBN.toFixed(0));

        // Call the appropriate method based on whether input is token A or B
        let swapR;
        if (isInputTokenA) {
          swapR = await ci.Trader_swapAForB(1, amountIn, 0);
        } else {
          swapR = await ci.Trader_swapBForA(1, amountIn, 0);
        }

        if (!swapR?.success) {
          // Calculate expected output even for failed swaps
          const priceBN = new BigNumber(price);
          const inputBN = new BigNumber(currentAmount);
          const expectedOutputBN = inputBN
            .multipliedBy(priceBN)
            .dividedBy(new BigNumber(10).pow(18));
          const expectedOutput = expectedOutputBN.toFixed(0);

          stepResults.push({
            step: i + 1,
            poolId,
            inputToken: inputTokenId,
            outputToken: outputTokenId,
            inputAmount: currentAmount,
            outputAmount: "0",
            expectedOutput: expectedOutput,
            slippage: "0",
            price,
            success: false,
            error: swapR?.error || "Swap simulation failed",
          });
          return { stepResults, finalAmount: "0", success: false };
        }

        // Calculate expected output from price
        const priceBN = new BigNumber(price);
        const inputBN = new BigNumber(currentAmount);
        const expectedOutputBN = inputBN
          .multipliedBy(priceBN)
          .dividedBy(new BigNumber(10).pow(18));
        const expectedOutput = expectedOutputBN.toFixed(0);

        // Extract actual output amount from swap result
        let outputAmount: string;
        if (swapR.returnValue && Array.isArray(swapR.returnValue)) {
          outputAmount = isInputTokenA
            ? swapR.returnValue[1].toString()
            : swapR.returnValue[0].toString();
        } else {
          // Fallback: use expected output if return value format is unexpected
          outputAmount = expectedOutput;
        }

        // Calculate slippage: (actual - expected) / expected * 100
        const actualOutputBN = new BigNumber(outputAmount);
        const slippageBN = expectedOutputBN.isGreaterThan(0)
          ? actualOutputBN
              .minus(expectedOutputBN)
              .dividedBy(expectedOutputBN)
              .multipliedBy(100)
          : new BigNumber(0);
        const slippage = slippageBN.toFixed(4);

        stepResults.push({
          step: i + 1,
          poolId,
          inputToken: inputTokenId,
          outputToken: outputTokenId,
          inputAmount: currentAmount,
          outputAmount: outputAmount,
          expectedOutput: expectedOutput,
          slippage: slippage,
          price,
          success: true,
        });

        // Update for next iteration
        currentAmount = outputAmount;
        currentTokenId = outputTokenId;
      } catch (error: any) {
        // Calculate expected output even for errors
        const priceBN = new BigNumber(price);
        const inputBN = new BigNumber(currentAmount);
        const expectedOutputBN = inputBN
          .multipliedBy(priceBN)
          .dividedBy(new BigNumber(10).pow(18));
        const expectedOutput = expectedOutputBN.toFixed(0);

        stepResults.push({
          step: i + 1,
          poolId,
          inputToken: inputTokenId,
          outputToken: outputTokenId,
          inputAmount: currentAmount,
          outputAmount: "0",
          expectedOutput: expectedOutput,
          slippage: "0",
          price,
          success: false,
          error: error.message || "Simulation error",
        });
        return { stepResults, finalAmount: "0", success: false };
      }
    }

    return {
      stepResults,
      finalAmount: stepResults[stepResults.length - 1]?.outputAmount || "0",
      success: stepResults.every((r) => r.success),
    };
  };

  const handleSimulate = async (
    opportunity: ArbitrageOpportunity,
    index: number
  ) => {
    if (!activeAccount) {
      toast.error("Please connect your wallet to simulate arbitrage");
      return;
    }

    setSimulatingIndex(index);
    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      const acc = { addr: activeAccount.address, sk: new Uint8Array(0) };

      // Get source token (first token in path) to determine decimals
      const sourceTokenId = opportunity.path[0];
      const sourceToken = tokens.find(
        (t: ARC200TokenI) =>
          t.contractId?.toString() === sourceTokenId ||
          t.tokenId?.toString() === sourceTokenId
      );

      // Default to 6 decimals if token not found (common for VOI and many tokens)
      const sourceDecimals = sourceToken?.decimals ?? 6;

      // Test amounts: 1, 10, 100, 1000, 10000, 100000, etc. (in token units)
      const amountTests: Array<{
        amount: string;
        amountDisplay: string;
        profit: string;
        profitPercent: string;
        success: boolean;
      }> = [];

      // Start with 1 token and multiply by 10 each time
      let multiplier = 1;
      let lastProfitPercent = Infinity;

      while (true) {
        // Calculate test amount in smallest units
        const testAmountTokens = multiplier; // e.g., 1, 10, 100, 1000...
        const testAmount = new BigNumber(testAmountTokens)
          .multipliedBy(new BigNumber(10).pow(sourceDecimals))
          .toString();

        // Simulate arbitrage for this amount
        const result = await simulateArbitrageForAmount(
          opportunity,
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

        // Calculate profit
        const initialAmount = new BigNumber(testAmount);
        const finalAmount = new BigNumber(result.finalAmount);
        const profit = finalAmount.minus(initialAmount);
        const profitPercent = profit.dividedBy(initialAmount).multipliedBy(100);

        amountTests.push({
          amount: testAmount,
          amountDisplay: testAmountTokens.toString(),
          profit: profit.toString(),
          profitPercent: profitPercent.toFixed(2),
          success: true,
        });

        // Stop if profit becomes negative
        if (profitPercent.isLessThan(0)) {
          break;
        }

        // Stop if we've tested enough amounts (prevent infinite loop)
        if (multiplier >= 1000000) {
          break;
        }

        // Increase multiplier for next test
        multiplier *= 10;
      }

      // Use the first successful test result for detailed display
      const firstSuccessfulTest = amountTests.find((t) => t.success);
      const simulationResults = firstSuccessfulTest
        ? (
            await simulateArbitrageForAmount(
              opportunity,
              firstSuccessfulTest.amount,
              algodClient,
              indexerClient,
              acc,
              sourceDecimals
            )
          ).stepResults
        : [];

      // Calculate final profit from first test
      const initialAmount = firstSuccessfulTest
        ? new BigNumber(firstSuccessfulTest.amount)
        : new BigNumber(0);
      const finalAmount = new BigNumber(
        simulationResults[simulationResults.length - 1]?.outputAmount || "0"
      );
      const profit = finalAmount.minus(initialAmount);
      const profitPercent = initialAmount.isGreaterThan(0)
        ? profit.dividedBy(initialAmount).multipliedBy(100)
        : new BigNumber(0);

      // Store simulation results in state
      const allSuccessful = simulationResults.every((r) => r.success);
      setSimulationResults((prev) => {
        const newMap = new Map(prev);
        newMap.set(index, {
          results: simulationResults,
          initialAmount: firstSuccessfulTest?.amount || "0",
          finalAmount:
            simulationResults[simulationResults.length - 1]?.outputAmount ||
            "0",
          profit: profit.toString(),
          profitPercent: profitPercent.toFixed(2),
          allSuccessful,
          amountTests,
        });
        return newMap;
      });

      // Show simulation results
      if (allSuccessful && amountTests.length > 0) {
        const bestTest = amountTests.reduce((best, current) => {
          const currentProfit = parseFloat(current.profitPercent);
          const bestProfit = parseFloat(best.profitPercent);
          return currentProfit > bestProfit ? current : best;
        });
        toast.success(
          `Simulation complete! Best profit: ${bestTest.profitPercent}% at ${bestTest.amountDisplay} tokens. Tested ${amountTests.length} amounts.`
        );
        console.log("Simulation Results:", {
          opportunity,
          simulationResults,
          amountTests,
          bestTest,
        });
      } else {
        toast.warning(
          "Simulation completed with errors. Check console for details."
        );
        console.error("Simulation Errors:", simulationResults);
      }
    } catch (error: any) {
      console.error("Simulation error:", error);
      toast.error(`Simulation failed: ${error.message || "Unknown error"}`);
    } finally {
      setSimulatingIndex(null);
    }
  };

  const handleExecute = async (
    opportunity: ArbitrageOpportunity,
    index: number
  ) => {
    if (!activeAccount) {
      toast.error("Please connect your wallet to execute arbitrage");
      return;
    }

    const selectedAmount = selectedAmounts.get(index);
    if (!selectedAmount) {
      toast.error("Please select an amount to execute");
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
      const sourceTokenId = opportunity.path[0];
      const sourceToken = tokens.find(
        (t: ARC200TokenI) =>
          t.contractId?.toString() === sourceTokenId ||
          t.tokenId?.toString() === sourceTokenId
      );
      const sourceDecimals = sourceToken?.decimals ?? 6;

      toast.info("Building all transactions...");

      // Step 1: Simulate all swaps to get amounts for each step
      let currentAmount = selectedAmount;
      const swapAmounts: BigInt[] = [BigInt(currentAmount)];
      const swapInfos: Array<{
        poolId: string;
        inputTokenId: string;
        outputTokenId: string;
        amountIn: BigInt;
        isInputTokenA: boolean;
        poolInfo: any;
        inputToken: ARC200TokenI | undefined;
      }> = [];

      for (let i = 0; i < opportunity.pools.length; i++) {
        const poolId = opportunity.pools[i];
        const inputTokenId = opportunity.path[i];
        const outputTokenId = opportunity.path[i + 1];

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

        const amountInBN = new BigNumber(currentAmount).decimalPlaces(
          0,
          BigNumber.ROUND_DOWN
        );
        const amountIn = BigInt(amountInBN.toFixed(0));

        let swapResult;
        if (isInputTokenA) {
          swapResult = await simulateCi.Trader_swapAForB(1, amountIn, BigInt(0));
        } else {
          swapResult = await simulateCi.Trader_swapBForA(1, amountIn, BigInt(0));
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
          currentAmount = outputAmount;
          swapAmounts.push(BigInt(outputAmount));
        } else {
          throw new Error(`Could not determine output amount for swap ${i + 1}`);
        }

        swapInfos.push({
          poolId,
          inputTokenId,
          outputTokenId,
          amountIn,
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

      // Create wVOI builder if needed (for deposit or withdraw)
      const firstInputToken = swapInfos[0]?.inputToken;
      const isFirstTokenNetwork =
        firstInputToken &&
        (firstInputToken.assetType === "network" ||
          firstInputToken.tokenId === 0 ||
          Number(swapInfos[0].inputTokenId) === 0);

      const finalTokenId = opportunity.path[opportunity.path.length - 1];
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
      const firstPoolId = Number(opportunity.pools[0]);
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
        `Arbitrage executed successfully! Transaction ID: ${res.txId}`
      );

      // Clear selected amount after successful execution
      setSelectedAmounts((prev) => {
        const newMap = new Map(prev);
        newMap.delete(index);
        return newMap;
      });
    } catch (error: any) {
      console.error("Execute arbitrage error:", error);
      toast.error(
        `Arbitrage execution failed: ${error.message || "Unknown error"}`
      );
    } finally {
      setExecutingIndex(null);
    }
  };

  const renderPath = (path: string[]) => {
    return (
      <PathContainer isDarkTheme={isDarkTheme}>
        {path.map((tokenId, index) => (
          <React.Fragment key={index}>
            <Tooltip title={`Token ID: ${tokenId}`} placement="top" arrow>
              <TokenIconWrapper isDarkTheme={isDarkTheme}>
                <TokenIcon
                  isDarkTheme={isDarkTheme}
                  src={getTokenIconUrl(tokenId)}
                  alt={`Token ${tokenId}`}
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://asset-verification.nautilus.sh/icons/0.png";
                  }}
                />
                <TokenIdLabel isDarkTheme={isDarkTheme}>
                  {tokenId.length > 8 ? `${tokenId.slice(0, 6)}...` : tokenId}
                </TokenIdLabel>
              </TokenIconWrapper>
            </Tooltip>
            {index < path.length - 1 && <ArrowIcon isDarkTheme={isDarkTheme} />}
          </React.Fragment>
        ))}
      </PathContainer>
    );
  };

  if (loading) {
    return (
      <Container>
        <Title isDarkTheme={isDarkTheme}>Triangular Arbitrage</Title>
        <LoadingWrapper isDarkTheme={isDarkTheme}>
          <CircularProgress />
          <div>Loading arbitrage opportunities...</div>
        </LoadingWrapper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Title isDarkTheme={isDarkTheme}>Triangular Arbitrage</Title>
        <ErrorMessage isDarkTheme={isDarkTheme}>Error: {error}</ErrorMessage>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container>
        <Title isDarkTheme={isDarkTheme}>Triangular Arbitrage</Title>
        <LoadingWrapper isDarkTheme={isDarkTheme}>
          <div>No data available</div>
        </LoadingWrapper>
      </Container>
    );
  }

  return (
    <Container>
      <Title isDarkTheme={isDarkTheme}>Triangular Arbitrage</Title>
      {debug && (
        <DebugInfo isDarkTheme={isDarkTheme}>
          {JSON.stringify(data, null, 2)}
        </DebugInfo>
      )}

      <StatsGrid>
        <StatsCard isDarkTheme={isDarkTheme}>
          <StatsCardTitle isDarkTheme={isDarkTheme}>
            Total Opportunities
          </StatsCardTitle>
          <StatsCardValue isDarkTheme={isDarkTheme}>
            {data.count.toLocaleString()}
          </StatsCardValue>
        </StatsCard>
        <StatsCard isDarkTheme={isDarkTheme}>
          <StatsCardTitle isDarkTheme={isDarkTheme}>Max Profit</StatsCardTitle>
          <StatsCardValue isDarkTheme={isDarkTheme}>
            {maxProfit.toFixed(2)}%
          </StatsCardValue>
        </StatsCard>
        <StatsCard isDarkTheme={isDarkTheme}>
          <StatsCardTitle isDarkTheme={isDarkTheme}>Min Profit</StatsCardTitle>
          <StatsCardValue isDarkTheme={isDarkTheme}>
            {data.minProfitPercent.toFixed(2)}%
          </StatsCardValue>
        </StatsCard>
      </StatsGrid>

      <TableWrapper isDarkTheme={isDarkTheme}>
        <Table isDarkTheme={isDarkTheme}>
          <TableHead isDarkTheme={isDarkTheme}>
            <tr>
              <TableHeader isDarkTheme={isDarkTheme}>Profit %</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Path</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Pools</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Actions</TableHeader>
            </tr>
          </TableHead>
          <TableBody isDarkTheme={isDarkTheme}>
            {sortedOpportunities.length === 0 ? (
              <tr>
                <TableCell
                  colSpan={4}
                  isDarkTheme={isDarkTheme}
                  style={{ textAlign: "center", padding: "2rem" }}
                >
                  No arbitrage opportunities found
                </TableCell>
              </tr>
            ) : (
              sortedOpportunities.map((opportunity, index) => {
                const isExpanded = expandedRows.has(index);
                return (
                  <React.Fragment key={index}>
                    <ExpandableRow
                      isDarkTheme={isDarkTheme}
                      isExpanded={isExpanded}
                      onClick={() => handleRowToggle(index)}
                    >
                      <ProfitCell
                        isDarkTheme={isDarkTheme}
                        profit={opportunity.profitPercent}
                        data-label="Profit %"
                      >
                        {opportunity.profitPercent.toFixed(2)}%
                      </ProfitCell>
                      <PathCell isDarkTheme={isDarkTheme} data-label="Path">
                        {renderPath(opportunity.path)}
                      </PathCell>
                      <TableCell isDarkTheme={isDarkTheme} data-label="Pools">
                        {opportunity.pools.map((pool, i) => (
                          <PoolId key={i} isDarkTheme={isDarkTheme}>
                            {pool}
                          </PoolId>
                        ))}
                      </TableCell>
                      <ActionCell
                        isDarkTheme={isDarkTheme}
                        data-label="Actions"
                      >
                        <ExpandIcon
                          isDarkTheme={isDarkTheme}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowToggle(index);
                          }}
                        >
                          {isExpanded ? (
                            <ExpandLessIcon fontSize="small" />
                          ) : (
                            <ExpandMoreIcon fontSize="small" />
                          )}
                        </ExpandIcon>
                      </ActionCell>
                    </ExpandableRow>
                    {isExpanded && (
                      <ExpandedContent isDarkTheme={isDarkTheme}>
                        <ExpandedCell isDarkTheme={isDarkTheme} colSpan={4}>
                          <ExpandedContentWrapper isDarkTheme={isDarkTheme}>
                            <ExpandedSection isDarkTheme={isDarkTheme}>
                              <ExpandedLabel isDarkTheme={isDarkTheme}>
                                Description
                              </ExpandedLabel>
                              <ExpandedValue isDarkTheme={isDarkTheme}>
                                {opportunity.description}
                              </ExpandedValue>
                            </ExpandedSection>
                            <ExpandedSection isDarkTheme={isDarkTheme}>
                              <ExpandedLabel isDarkTheme={isDarkTheme}>
                                Prices
                              </ExpandedLabel>
                              <ExpandedValue isDarkTheme={isDarkTheme}>
                                {opportunity.prices.map((price, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      fontFamily: "monospace",
                                      fontSize: "0.75rem",
                                      marginBottom: "0.25rem",
                                    }}
                                  >
                                    Step {i + 1}: {price}
                                  </div>
                                ))}
                              </ExpandedValue>
                            </ExpandedSection>
                            <ActionButtonsContainer isDarkTheme={isDarkTheme}>
                              <ActionButton
                                isDarkTheme={isDarkTheme}
                                variant="secondary"
                                disabled={
                                  simulatingIndex === index ||
                                  simulatingIndex !== null
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSimulate(opportunity, index);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                {simulatingIndex === index ? (
                                  <>
                                    <CircularProgress size={16} />
                                    <span>Simulating...</span>
                                  </>
                                ) : (
                                  "Simulate"
                                )}
                              </ActionButton>
                            </ActionButtonsContainer>
                            {simulationResults.has(index) && (
                              <SimulationResultsContainer
                                isDarkTheme={isDarkTheme}
                              >
                                <SimulationResultsTitle
                                  isDarkTheme={isDarkTheme}
                                >
                                  Simulation Results (Debug)
                                  {simulationResults.get(index)
                                    ?.profitPercent && (
                                    <div
                                      style={{
                                        marginTop: "0.5rem",
                                        fontSize: "1rem",
                                        fontWeight: 700,
                                        color:
                                          parseFloat(
                                            simulationResults.get(index)
                                              ?.profitPercent || "0"
                                          ) > 0
                                            ? "#10B981"
                                            : "#EF4444",
                                      }}
                                    >
                                      Actual Profit:{" "}
                                      {
                                        simulationResults.get(index)
                                          ?.profitPercent
                                      }
                                      %
                                      {opportunity.profitPercent && (
                                        <span
                                          style={{
                                            fontSize: "0.875rem",
                                            fontWeight: 400,
                                            color: isDarkTheme
                                              ? "#9CA3AF"
                                              : "#6B7280",
                                            marginLeft: "0.5rem",
                                          }}
                                        >
                                          (Expected:{" "}
                                          {opportunity.profitPercent.toFixed(2)}
                                          %)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </SimulationResultsTitle>
                                {simulationResults
                                  .get(index)
                                  ?.results.map((result, resultIndex) => (
                                    <SimulationStep
                                      key={resultIndex}
                                      isDarkTheme={isDarkTheme}
                                      success={result.success}
                                    >
                                      <SimulationStepHeader
                                        isDarkTheme={isDarkTheme}
                                      >
                                        Step {result.step}:{" "}
                                        {result.success
                                          ? "✓ Success"
                                          : "✗ Failed"}
                                      </SimulationStepHeader>
                                      <SimulationStepDetail
                                        isDarkTheme={isDarkTheme}
                                      >
                                        Pool: {result.poolId}
                                      </SimulationStepDetail>
                                      <SimulationStepDetail
                                        isDarkTheme={isDarkTheme}
                                      >
                                        Input Token: {result.inputToken} →
                                        Output Token: {result.outputToken}
                                      </SimulationStepDetail>
                                      <SimulationStepDetail
                                        isDarkTheme={isDarkTheme}
                                      >
                                        Input Amount:{" "}
                                        {formatAmount(result.inputAmount)}
                                      </SimulationStepDetail>
                                      <SimulationStepDetail
                                        isDarkTheme={isDarkTheme}
                                      >
                                        Expected Output:{" "}
                                        {formatAmount(
                                          result.expectedOutput || "0"
                                        )}
                                      </SimulationStepDetail>
                                      <SimulationStepDetail
                                        isDarkTheme={isDarkTheme}
                                      >
                                        Actual Output:{" "}
                                        {formatAmount(result.outputAmount)}
                                      </SimulationStepDetail>
                                      {result.slippage && (
                                        <SimulationStepDetail
                                          isDarkTheme={isDarkTheme}
                                          style={{
                                            color:
                                              parseFloat(result.slippage) < 0
                                                ? "#EF4444"
                                                : parseFloat(result.slippage) >
                                                  0
                                                ? "#10B981"
                                                : undefined,
                                            fontWeight: 600,
                                          }}
                                        >
                                          Slippage: {result.slippage}%
                                          {parseFloat(result.slippage) < 0 &&
                                            " (Worse than expected)"}
                                          {parseFloat(result.slippage) > 0 &&
                                            " (Better than expected)"}
                                        </SimulationStepDetail>
                                      )}
                                      <SimulationStepDetail
                                        isDarkTheme={isDarkTheme}
                                      >
                                        Price: {result.price}
                                      </SimulationStepDetail>
                                      {result.error && (
                                        <SimulationStepDetail
                                          isDarkTheme={isDarkTheme}
                                          style={{ color: "#EF4444" }}
                                        >
                                          Error: {result.error}
                                        </SimulationStepDetail>
                                      )}
                                    </SimulationStep>
                                  ))}
                                <SimulationSummary isDarkTheme={isDarkTheme}>
                                  <SimulationSummaryRow
                                    isDarkTheme={isDarkTheme}
                                  >
                                    <SimulationSummaryLabel
                                      isDarkTheme={isDarkTheme}
                                    >
                                      Initial Amount:
                                    </SimulationSummaryLabel>
                                    <SimulationSummaryValue
                                      isDarkTheme={isDarkTheme}
                                    >
                                      {formatAmount(
                                        simulationResults.get(index)
                                          ?.initialAmount || "0"
                                      )}
                                    </SimulationSummaryValue>
                                  </SimulationSummaryRow>
                                  <SimulationSummaryRow
                                    isDarkTheme={isDarkTheme}
                                  >
                                    <SimulationSummaryLabel
                                      isDarkTheme={isDarkTheme}
                                    >
                                      Final Amount:
                                    </SimulationSummaryLabel>
                                    <SimulationSummaryValue
                                      isDarkTheme={isDarkTheme}
                                    >
                                      {formatAmount(
                                        simulationResults.get(index)
                                          ?.finalAmount || "0"
                                      )}
                                    </SimulationSummaryValue>
                                  </SimulationSummaryRow>
                                  <SimulationSummaryRow
                                    isDarkTheme={isDarkTheme}
                                  >
                                    <SimulationSummaryLabel
                                      isDarkTheme={isDarkTheme}
                                    >
                                      Profit:
                                    </SimulationSummaryLabel>
                                    <SimulationSummaryValue
                                      isDarkTheme={isDarkTheme}
                                      positive={
                                        parseFloat(
                                          simulationResults.get(index)
                                            ?.profit || "0"
                                        ) > 0
                                      }
                                    >
                                      {formatAmount(
                                        simulationResults.get(index)?.profit ||
                                          "0"
                                      )}
                                    </SimulationSummaryValue>
                                  </SimulationSummaryRow>
                                  <SimulationSummaryRow
                                    isDarkTheme={isDarkTheme}
                                    style={{
                                      borderTop: `1px solid ${
                                        isDarkTheme ? "#374151" : "#E5E7EB"
                                      }`,
                                      paddingTop: "0.5rem",
                                      marginTop: "0.5rem",
                                    }}
                                  >
                                    <SimulationSummaryLabel
                                      isDarkTheme={isDarkTheme}
                                      style={{
                                        fontSize: "0.875rem",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Actual Profit %:
                                    </SimulationSummaryLabel>
                                    <SimulationSummaryValue
                                      isDarkTheme={isDarkTheme}
                                      positive={
                                        parseFloat(
                                          simulationResults.get(index)
                                            ?.profitPercent || "0"
                                        ) > 0
                                      }
                                      style={{ fontSize: "1rem" }}
                                    >
                                      {
                                        simulationResults.get(index)
                                          ?.profitPercent
                                      }
                                      %
                                    </SimulationSummaryValue>
                                  </SimulationSummaryRow>
                                  {opportunity.profitPercent && (
                                    <SimulationSummaryRow
                                      isDarkTheme={isDarkTheme}
                                    >
                                      <SimulationSummaryLabel
                                        isDarkTheme={isDarkTheme}
                                      >
                                        Expected Profit %:
                                      </SimulationSummaryLabel>
                                      <SimulationSummaryValue
                                        isDarkTheme={isDarkTheme}
                                        positive={opportunity.profitPercent > 0}
                                      >
                                        {opportunity.profitPercent.toFixed(2)}%
                                      </SimulationSummaryValue>
                                    </SimulationSummaryRow>
                                  )}
                                  {simulationResults.get(index)
                                    ?.profitPercent &&
                                    opportunity.profitPercent && (
                                      <SimulationSummaryRow
                                        isDarkTheme={isDarkTheme}
                                      >
                                        <SimulationSummaryLabel
                                          isDarkTheme={isDarkTheme}
                                        >
                                          Difference:
                                        </SimulationSummaryLabel>
                                        <SimulationSummaryValue
                                          isDarkTheme={isDarkTheme}
                                          positive={
                                            parseFloat(
                                              simulationResults.get(index)
                                                ?.profitPercent || "0"
                                            ) -
                                              opportunity.profitPercent >
                                            0
                                          }
                                        >
                                          {(
                                            parseFloat(
                                              simulationResults.get(index)
                                                ?.profitPercent || "0"
                                            ) - opportunity.profitPercent
                                          ).toFixed(2)}
                                          %
                                        </SimulationSummaryValue>
                                      </SimulationSummaryRow>
                                    )}
                                  <SimulationSummaryRow
                                    isDarkTheme={isDarkTheme}
                                  >
                                    <SimulationSummaryLabel
                                      isDarkTheme={isDarkTheme}
                                    >
                                      Status:
                                    </SimulationSummaryLabel>
                                    <SimulationSummaryValue
                                      isDarkTheme={isDarkTheme}
                                      positive={
                                        simulationResults.get(index)
                                          ?.allSuccessful
                                      }
                                    >
                                      {simulationResults.get(index)
                                        ?.allSuccessful
                                        ? "✓ All Successful"
                                        : "✗ Errors Found"}
                                    </SimulationSummaryValue>
                                  </SimulationSummaryRow>
                                </SimulationSummary>
                                {simulationResults.get(index)?.amountTests &&
                                  simulationResults.get(index)!.amountTests!
                                    .length > 0 && (
                                    <AmountTestsContainer
                                      isDarkTheme={isDarkTheme}
                                    >
                                      <AmountTestsTitle
                                        isDarkTheme={isDarkTheme}
                                      >
                                        Select Amount to Execute (Stopped at
                                        negative profit)
                                      </AmountTestsTitle>
                                      {simulationResults
                                        .get(index)
                                        ?.amountTests?.map(
                                          (test, testIndex) => {
                                            const isNegative =
                                              parseFloat(test.profitPercent) <
                                              0;
                                            const isSelected =
                                              selectedAmounts.get(index) ===
                                              test.amount;
                                            return (
                                              <AmountTestRow
                                                key={testIndex}
                                                isDarkTheme={isDarkTheme}
                                                isNegative={isNegative}
                                                isSelected={isSelected}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (!isNegative) {
                                                    setSelectedAmounts(
                                                      (prev) => {
                                                        const newMap = new Map(
                                                          prev
                                                        );
                                                        newMap.set(
                                                          index,
                                                          test.amount
                                                        );
                                                        return newMap;
                                                      }
                                                    );
                                                  }
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    flex: 1,
                                                  }}
                                                >
                                                  {!isNegative && (
                                                    <RadioInput
                                                      type="radio"
                                                      isDarkTheme={isDarkTheme}
                                                      checked={isSelected}
                                                      onChange={() => {
                                                        setSelectedAmounts(
                                                          (prev) => {
                                                            const newMap =
                                                              new Map(prev);
                                                            newMap.set(
                                                              index,
                                                              test.amount
                                                            );
                                                            return newMap;
                                                          }
                                                        );
                                                      }}
                                                      onClick={(e) =>
                                                        e.stopPropagation()
                                                      }
                                                    />
                                                  )}
                                                  <AmountTestLabel
                                                    isDarkTheme={isDarkTheme}
                                                  >
                                                    {test.amountDisplay} tokens:
                                                  </AmountTestLabel>
                                                </div>
                                                <AmountTestValue
                                                  isDarkTheme={isDarkTheme}
                                                  positive={
                                                    parseFloat(
                                                      test.profitPercent
                                                    ) > 0
                                                  }
                                                >
                                                  {test.profitPercent}% profit
                                                </AmountTestValue>
                                              </AmountTestRow>
                                            );
                                          }
                                        )}
                                    </AmountTestsContainer>
                                  )}
                                {simulationResults.has(index) && (
                                  <ActionButtonsContainer
                                    isDarkTheme={isDarkTheme}
                                    style={{ marginTop: "1rem" }}
                                  >
                                    <ActionButton
                                      isDarkTheme={isDarkTheme}
                                      variant="primary"
                                      disabled={
                                        !selectedAmounts.has(index) ||
                                        executingIndex === index ||
                                        executingIndex !== null
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleExecute(opportunity, index);
                                      }}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                      }}
                                    >
                                      {executingIndex === index ? (
                                        <>
                                          <CircularProgress size={16} />
                                          <span>Executing...</span>
                                        </>
                                      ) : (
                                        "Execute Arbitrage"
                                      )}
                                    </ActionButton>
                                  </ActionButtonsContainer>
                                )}
                              </SimulationResultsContainer>
                            )}
                          </ExpandedContentWrapper>
                        </ExpandedCell>
                      </ExpandedContent>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableWrapper>
    </Container>
  );
};

export default ArbitrageTriangular;
