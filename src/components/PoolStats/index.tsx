import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import { CircularProgress, Tooltip as MuiTooltip } from "@mui/material";
import { selectTokens } from "../../store/tokenSlice";
import { tokenSymbol, getIconId } from "../../utils/dex";
import { useNavigate } from "react-router-dom";
import useDefiRewards from "../../hooks/useDefiRewards";
import { TOKEN_WVOI1 } from "../../constants/tokens";
import { API_BASE_URL } from "../../constants/api";
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, abi } from "ulujs";
import { getAlgorandClients } from "../../wallets";
import algosdk from "algosdk";
import { toast } from "react-toastify";
import PoolPosition from "../PoolPosition";
import Search from "../Search";
import axios from "axios";
import BigNumber from "bignumber.js";
import { BalanceI, IndexerPoolI } from "../../types";
import {
  fetchRewards,
  selectRewards,
  selectRewardsStatus,
} from "../../store/rewardsSlice";
import {
  LineChart as RechartsLineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface PoolStatData {
  poolId: string;
  pool: {
    txid: string;
    poolId: string;
    tokA: string;
    tokB: string;
    lastRound: number;
  };
  poolInfo: {
    poolId: string;
    lptBals: {
      lpHeld: string;
      lpMinted: string;
    };
    poolBals: {
      A: string;
      B: string;
    };
    protoInfo: {
      protoFee: number;
      lpFee: number;
      totFee: number;
      protoAddr: string;
      locked: number;
    };
    protoBals: {
      A: string;
      B: string;
    };
    tokB: number;
    tokA: number;
    lastUpdated: number;
  };
  tokens: {
    tokenA: {
      assetId: string;
      name: string;
      unitName: string;
      decimals: string;
      totalSupply: string;
      lastUpdated: number;
    };
    tokenB: {
      assetId: string;
      name: string;
      unitName: string;
      decimals: string;
      totalSupply: string;
      lastUpdated: number;
    };
  };
  tvl: {
    usd: string;
    tokenA: {
      amount: string;
      normalized: number;
      usdValue: string;
    };
    tokenB: {
      amount: string;
      normalized: number;
      usdValue: string;
    };
  };
  volume: {
    "24h": {
      baseVolume: string;
      targetVolume: string;
      usdVolume: string;
    };
  };
  fees: {
    protocolFee: number;
    lpFee: number;
    totalFee: number;
    "24hFeesUSD": string;
    apr: string;
  };
  lastUpdated: number;

  // RECOMMENDED: Add these fields to the API response for easier chart rendering
  // See POOLSTATS_API_ENHANCEMENTS.md for details

  // Option 1: Simple sparkline data (minimal, recommended to start)
  sparkline24h?: {
    prices: string[]; // 24 price values (one per hour, oldest to newest)
    priceChange24h: string; // Percentage change (e.g., "5.23" for +5.23%)
  };

  // Option 2: Full price history with timestamps (more flexible)
  priceHistory?: {
    "24h": {
      dataPoints: Array<{
        timestamp: number; // Unix timestamp in seconds
        price: string; // Average price for this hour
        volume?: string; // Volume in USD for this hour (optional)
      }>;
      priceChange24h: string; // Percentage change
      priceChange24hAbs: string; // Absolute price change
    };
    // Optional: Add 7d, 30d for future expansion
    "7d"?: {
      dataPoints: Array<{
        timestamp: number;
        price: string;
        volume?: string;
      }>;
      priceChange7d: string;
    };
  };

  // Option 3: Quick price metrics (for badges/indicators)
  priceMetrics?: {
    currentPrice: string;
    price24hAgo: string;
    priceChange24h: string;
    high24h: string;
    low24h: string;
    priceDirection: "up" | "down" | "neutral";
  };

  // Debug fields (when debug=true)
  debug?: {
    calculations?: any;
    method?: string;
    [key: string]: any;
  };
  [key: string]: any; // Allow additional debug fields
}

interface PoolStatsResponse {
  stats: PoolStatData[];
  count: number;
}

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(16px, 3vw, 32px);

  @media screen and (min-width: 1100px) {
    grid-template-columns: minmax(0, 3fr) minmax(280px, 1.1fr);
  }
`;

const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 3vw, 32px);
`;

const SideColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Panel = styled.div<{ isDarkTheme: boolean }>`
  border-radius: 24px;
  padding: clamp(20px, 2vw, 28px);
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const PanelTitle = styled.h2<{ isDarkTheme: boolean }>`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
`;

const PanelSubtitle = styled.p<{ isDarkTheme: boolean }>`
  margin: 0;
  font-size: 14px;
  color: ${(props) => (props.isDarkTheme ? "#a5a5c0" : "#56566e")};
`;

const SimpleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SimpleListRow = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid
    ${(props) =>
      props.isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"};
  color: inherit;
  &:last-of-type {
    border-bottom: none;
  }
`;

const SimpleListLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
`;

const SimpleListValue = styled.div`
  font-weight: 600;
  color: inherit;
`;

const EmptyState = styled.div<{ isDarkTheme: boolean }>`
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  border: 1px dashed
    ${(props) =>
      props.isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)"};
  color: ${(props) => (props.isDarkTheme ? "#a5a5c0" : "#56566e")};
`;

const UserStatsGrid = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 16px;
  padding: 16px 20px;
  border-radius: 16px;
  background: ${(props) =>
    props.isDarkTheme
      ? "rgba(255, 255, 255, 0.03)"
      : "rgba(41, 88, 255, 0.05)"};
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(41, 88, 255, 0.15)"};
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StatLabel = styled.div<{ isDarkTheme: boolean }>`
  font-size: 14px;
  color: ${(props) => (props.isDarkTheme ? "#a5a5c0" : "#56566e")};
`;

const StatValue = styled.div<{ isDarkTheme: boolean }>`
  font-size: 24px;
  font-weight: 700;
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
`;

const HeroCTA = styled.button<{ isDarkTheme: boolean }>`
  width: fit-content;
  border: none;
  border-radius: 16px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: #2958ff;
  transition: opacity 150ms ease;
  &:hover:not(:disabled) {
    opacity: 0.9;
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const HeroCard = styled.div<{ isDarkTheme: boolean }>`
  border-radius: 32px;
  padding: clamp(20px, 4vw, 40px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(41, 88, 255, 0.2)"};
  background: ${(props) =>
    props.isDarkTheme
      ? "linear-gradient(135deg, rgba(41, 88, 255, 0.35), rgba(65, 19, 126, 0.4)), #070709"
      : "linear-gradient(135deg, rgba(41, 88, 255, 0.35), rgba(41, 88, 255, 0.1)), #ffffff"};
  box-shadow: ${(props) =>
    props.isDarkTheme
      ? "0px 20px 50px rgba(9, 9, 17, 0.5)"
      : "0px 30px 60px rgba(41, 88, 255, 0.15)"};
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
`;

const HeroHeadline = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
`;

const HeroValue = styled.div<{ isDarkTheme: boolean }>`
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 700;
  line-height: 1;
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeroCaption = styled.div<{ isDarkTheme: boolean }>`
  color: ${(props) =>
    props.isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(12, 12, 16, 0.7)"};
  font-size: 16px;
`;

const formatter = new Intl.NumberFormat("en", { notation: "compact" });

// Normalize symbol: replace wVOI with VOI
const normalizeSymbol = (symbol: string, tokenId?: string | number): string => {
  if (!symbol) return symbol;
  const tokenIdNum = tokenId ? Number(tokenId) : null;
  const isVOI =
    tokenIdNum === 0 ||
    tokenIdNum === TOKEN_WVOI1 ||
    symbol.toUpperCase() === "WVOI" ||
    symbol.toUpperCase() === "VOI";
  if (isVOI) {
    return "VOI";
  }
  return symbol;
};

const PanelSurface = styled.div<{ isDarkTheme: boolean }>`
  border-radius: 24px;
  padding: clamp(20px, 2vw, 28px);
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
`;

const PanelHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
`;

const Title = styled.h1<{ isDarkTheme: boolean }>`
  font-size: 1.875rem;
  font-weight: bold;
  margin: 0;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const StatsCardWrapper = styled.div<{ isDarkTheme: boolean }>`
  padding: 16px;
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(41, 88, 255, 0.12)"};
  background: ${(props) =>
    props.isDarkTheme
      ? "rgba(255, 255, 255, 0.03)"
      : "rgba(41, 88, 255, 0.03)"};
`;

const StatsTitle = styled.h3<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#4B5563")};
  font-size: 0.875rem;
`;

const StatsValue = styled.div<{ isDarkTheme: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.5rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const StatsCard: React.FC<{
  title: string;
  value: string;
  isDarkTheme: boolean;
}> = ({ title, value, isDarkTheme }) => {
  return (
    <StatsCardWrapper isDarkTheme={isDarkTheme}>
      <StatsTitle isDarkTheme={isDarkTheme}>{title}</StatsTitle>
      <StatsValue isDarkTheme={isDarkTheme}>{value}</StatsValue>
    </StatsCardWrapper>
  );
};

const TableWrapper = styled.div<{ isTransitioning?: boolean }>`
  overflow-x: auto;
  border-radius: 16px;
  transition: opacity 0.2s ease-in-out;
  opacity: ${(props) => (props.isTransitioning ? 0.5 : 1)};

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
      cursor: pointer;
      transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
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
  background-color: ${(props) =>
    props.isDarkTheme
      ? "rgba(255, 255, 255, 0.04)"
      : "rgba(41, 88, 255, 0.05)"};
`;

const TableHeader = styled.th<{ isDarkTheme: boolean }>`
  padding: 0.75rem 1.5rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: ${(props) => (props.isDarkTheme ? "#4B5563" : "#E5E7EB")};
  }
`;

const TableBody = styled.tbody<{ isDarkTheme: boolean }>`
  background-color: transparent;
  & > tr {
    border-bottom: 1px solid
      ${(props) =>
        props.isDarkTheme
          ? "rgba(255, 255, 255, 0.08)"
          : "rgba(12, 12, 16, 0.08)"};
    transition: all 0.3s ease-in-out;
    opacity: 1;
    transform: translateY(0);

    &:hover {
      background-color: ${(props) =>
        props.isDarkTheme ? "#374151" : "#F3F4F6"};
    }
  }
`;

const TableCell = styled.td<{ isDarkTheme: boolean }>`
  padding: 14px 18px;
  white-space: nowrap;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  font-size: 0.875rem;
  transition: background-color 0.2s ease, color 0.2s ease;
`;

const TokenCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TokenIcon = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

const PairCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PriceCell = styled.div<{ isDarkTheme: boolean }>`
  font-family: monospace;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
`;

const ErrorMessage = styled.div<{ isDarkTheme: boolean }>`
  padding: 1rem;
  background-color: ${(props) => (props.isDarkTheme ? "#374151" : "#FEE2E2")};
  color: ${(props) => (props.isDarkTheme ? "#FCA5A5" : "#991B1B")};
  border-radius: 0.5rem;
  margin-bottom: 1rem;
`;

const EmptyMessage = styled.div<{ isDarkTheme: boolean }>`
  padding: 1rem;
  text-align: center;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  font-size: 0.875rem;
`;

const SortControls = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const SortButton = styled.button<{ isDarkTheme: boolean; active: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid
    ${(props) =>
      props.active
        ? props.isDarkTheme
          ? "#6366F1"
          : "#4F46E5"
        : props.isDarkTheme
        ? "#374151"
        : "#D1D5DB"};
  background-color: ${(props) =>
    props.active
      ? props.isDarkTheme
        ? "#4F46E5"
        : "#6366F1"
      : props.isDarkTheme
      ? "#1F2937"
      : "white"};
  color: ${(props) =>
    props.active ? "#FFFFFF" : props.isDarkTheme ? "#9CA3AF" : "#4B5563"};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) =>
      props.active
        ? props.isDarkTheme
          ? "#6366F1"
          : "#4F46E5"
        : props.isDarkTheme
        ? "#374151"
        : "#F3F4F6"};
  }
`;

const ExpandIcon = styled.span<{ isExpanded: boolean }>`
  display: inline-block;
  transition: transform 0.2s;
  transform: ${(props) =>
    props.isExpanded ? "rotate(90deg)" : "rotate(0deg)"};
  margin-right: 0.5rem;
  font-size: 0.75rem;
`;

const ExpandedRow = styled.tr<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#111827" : "#F9FAFB")};
  & > td {
    padding: 1rem 1.5rem;
    border-top: 1px solid
      ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};
  }
`;

const DebugContent = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  line-height: 1.6;
`;

const DebugSection = styled.div<{ isDarkTheme: boolean }>`
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: ${(props) => (props.isDarkTheme ? "#1F2937" : "#FFFFFF")};
  border-radius: 0.375rem;
  border: 1px solid ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};
`;

const DebugSectionTitle = styled.div<{ isDarkTheme: boolean }>`
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "#111827")};
  font-size: 0.8rem;
`;

const DebugPre = styled.pre<{ isDarkTheme: boolean }>`
  font-size: 0.7rem;
  margin: 0.25rem 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#4B5563")};
  background-color: ${(props) => (props.isDarkTheme ? "#111827" : "#F3F4F6")};
  padding: 0.5rem;
  border-radius: 0.25rem;
  overflow-x: auto;
`;

const SparklineContainer = styled.div<{
  isDarkTheme: boolean;
  apr: number;
  pulseSpeed: number;
}>`
  width: 100px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  position: relative;

  /* Prevent chart clicks from triggering row navigation */
  * {
    pointer-events: none;
  }

  /* Pulsing glow effect based on APR */
  &::before {
    content: "";
    position: absolute;
    inset: -2px;
    border-radius: 8px;
    background: ${(props) => {
      const apr = props.apr;
      if (apr > 20)
        return props.isDarkTheme
          ? "rgba(16, 185, 129, 0.3)"
          : "rgba(16, 185, 129, 0.2)";
      if (apr > 10)
        return props.isDarkTheme
          ? "rgba(59, 130, 246, 0.25)"
          : "rgba(59, 130, 246, 0.15)";
      if (apr > 5)
        return props.isDarkTheme
          ? "rgba(251, 191, 36, 0.2)"
          : "rgba(251, 191, 36, 0.1)";
      return "transparent";
    }};
    opacity: ${(props) => (props.apr > 5 ? 0.6 : 0)};
    animation: ${(props) =>
      props.pulseSpeed > 0
        ? `pulse ${props.pulseSpeed}s ease-in-out infinite`
        : "none"};
    z-index: -1;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: ${(props) => (props.apr > 5 ? 0.4 : 0)};
      transform: scale(1);
    }
    50% {
      opacity: ${(props) => (props.apr > 5 ? 0.8 : 0)};
      transform: scale(1.02);
    }
  }
`;

interface SparklineChartProps {
  poolId: string;
  isDarkTheme: boolean;
  apr?: string | number; // APR value for animation effects
  // Optional: Price history from API response
  priceHistory?: {
    "24h": {
      dataPoints: Array<{
        timestamp: number;
        price: string;
        volume?: string;
      }>;
      priceChange24h: string;
    };
  };
  sparkline24h?: {
    prices: string[];
    priceChange24h: string;
  };
  // Volume data from pool stats (for fallback)
  volume24h?: {
    baseVolume: string;
    targetVolume: string;
    usdVolume: string;
  };
}

const SparklineChart: React.FC<SparklineChartProps> = React.memo(
  ({ poolId, isDarkTheme, apr, priceHistory, sparkline24h, volume24h }) => {
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState<"price" | "volume">("price");

    // Calculate pulse speed based on APR (higher APR = faster pulse)
    const aprValue = parseFloat(String(apr || "0"));
    const pulseSpeed = React.useMemo(() => {
      if (aprValue > 20) return 1.5; // Very fast for high APR
      if (aprValue > 10) return 2; // Fast for medium-high APR
      if (aprValue > 5) return 3; // Medium for medium APR
      return 0; // No animation for low APR
    }, [aprValue]);

    // First, try to use price history from API response
    const apiPriceData = React.useMemo(() => {
      // Option 1: Use full priceHistory if available
      if (priceHistory?.["24h"]?.dataPoints) {
        return priceHistory["24h"].dataPoints.map((point) => ({
          time: point.timestamp * 1000, // Convert to milliseconds
          value: parseFloat(point.price),
          type: "price" as const,
        }));
      }

      // Option 2: Use simple sparkline24h if available
      if (sparkline24h?.prices) {
        const now = Date.now();
        return sparkline24h.prices.map((price, index) => ({
          time: now - (24 - index) * 60 * 60 * 1000,
          value: parseFloat(price),
          type: "price" as const,
        }));
      }

      return null;
    }, [priceHistory, sparkline24h]);

    useEffect(() => {
      // If we have price data from API, use it immediately
      if (apiPriceData) {
        setChartData(apiPriceData);
        setChartType("price");
        setLoading(false);
        return;
      }

      // Otherwise, fetch volume data as fallback
      let cancelled = false;

      const fetchVolumeData = async () => {
        try {
          setLoading(true);
          const now = Math.floor(Date.now() / 1000);
          const start_time = now - 24 * 60 * 60; // 24 hours ago

          const response = await fetch(
            `https://mainnet-idx.nautilus.sh/integrations/coingecko/historical_trades?start_time=${start_time}`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (cancelled) return;

          // Debug: Log the data structure
          console.log(`[SparklineChart] Pool ${poolId} - API response:`, {
            hasBuy: Array.isArray(data.buy),
            hasSell: Array.isArray(data.sell),
            buyCount: data.buy?.length || 0,
            sellCount: data.sell?.length || 0,
          });

          // Filter trades for this pool and group by hour
          // Try multiple poolId formats
          const poolTrades = [...(data.buy || []), ...(data.sell || [])].filter(
            (trade: any) => {
              const tradePoolId =
                trade.contract_id || trade.pool_id || trade.poolId;
              return (
                `${tradePoolId}` === `${poolId}` ||
                `${tradePoolId}` === poolId ||
                tradePoolId === Number(poolId)
              );
            }
          );

          console.log(
            `[SparklineChart] Pool ${poolId} - Found ${poolTrades.length} trades`
          );

          if (poolTrades.length === 0) {
            // If no trades found, create a simple chart from volume data if available
            if (volume24h?.usdVolume) {
              const usdVol = parseFloat(volume24h.usdVolume);
              if (usdVol > 0) {
                // Create a simple flat line chart from the 24h volume
                const now = Date.now();
                const chartDataArray = Array.from({ length: 24 }, (_, i) => ({
                  time: now - (24 - i) * 60 * 60 * 1000,
                  value: usdVol / 24, // Distribute volume evenly (simplified)
                  type: "volume" as const,
                }));
                if (!cancelled) {
                  setChartData(chartDataArray);
                  setChartType("volume");
                  setLoading(false);
                }
                return;
              }
            }
            setChartData([]);
            setLoading(false);
            return;
          }

          // Group trades by hour and calculate volume (USD)
          const groupedData = poolTrades.reduce(
            (acc: Record<string, any>, trade: any) => {
              const timestamp = trade.trade_timestamp || trade.timestamp;
              if (!timestamp) return acc;

              const date = new Date(timestamp * 1000);
              const hour = date.toISOString().slice(0, 13);

              if (!acc[hour]) {
                acc[hour] = {
                  volumes: [],
                  timestamp: date.getTime(),
                };
              }

              // Calculate volume in USD (using base and target volumes)
              const baseVol = parseFloat(
                trade.base_volume || trade.baseVolume || "0"
              );
              const targetVol = parseFloat(
                trade.target_volume || trade.targetVolume || "0"
              );
              // Use USD volume if available, otherwise approximate
              const usdVolume =
                parseFloat(trade.usd_volume || trade.usdVolume || "0") ||
                baseVol + targetVol; // Fallback to sum if no USD volume

              if (usdVolume > 0) {
                acc[hour].volumes.push(usdVolume);
              }

              return acc;
            },
            {}
          );

          // Convert to array and calculate total volume for each hour
          const chartDataArray = Object.entries(groupedData)
            .map(([hour, data]: [string, any]) => ({
              time: data.timestamp,
              value:
                data.volumes.length > 0
                  ? data.volumes.reduce((a: number, b: number) => a + b, 0)
                  : 0,
              type: "volume" as const,
            }))
            .sort((a, b) => a.time - b.time)
            .slice(-24); // Last 24 data points

          console.log(
            `[SparklineChart] Pool ${poolId} - Generated ${chartDataArray.length} data points`
          );

          if (!cancelled) {
            if (chartDataArray.length > 0) {
              setChartData(chartDataArray);
              setChartType("volume");
            } else {
              setChartData([]);
            }
            setLoading(false);
          }
        } catch (error) {
          if (!cancelled) {
            console.error(
              `[SparklineChart] Pool ${poolId} - Error fetching chart data:`,
              error
            );
            setChartData([]);
            setLoading(false);
          }
        }
      };

      fetchVolumeData();

      return () => {
        cancelled = true;
      };
    }, [poolId, apiPriceData]);

    if (loading) {
      return (
        <SparklineContainer
          isDarkTheme={isDarkTheme}
          apr={aprValue}
          pulseSpeed={0}
        >
          <CircularProgress size={16} />
        </SparklineContainer>
      );
    }

    // Ensure we have at least 2 data points for the chart to render
    if (chartData.length < 2) {
      return (
        <SparklineContainer
          isDarkTheme={isDarkTheme}
          apr={aprValue}
          pulseSpeed={0}
        >
          <span
            style={{
              fontSize: "0.75rem",
              color: isDarkTheme ? "#6B7280" : "#9CA3AF",
            }}
          >
            {chartData.length === 0 ? "N/A" : "Loading..."}
          </span>
        </SparklineContainer>
      );
    }

    const firstValue = chartData[0]?.value || 0;
    const lastValue = chartData[chartData.length - 1]?.value || 0;
    const isPositive = lastValue >= firstValue;

    // Ensure all values are valid numbers
    const validChartData = chartData.filter(
      (d) =>
        d && typeof d.value === "number" && !isNaN(d.value) && isFinite(d.value)
    );

    // When no chart data is available, show a useful alternative
    if (validChartData.length < 2) {
      // Option 1: Show a simple trend indicator using 24h volume
      if (volume24h?.usdVolume) {
        const volume = parseFloat(volume24h.usdVolume);
        const hasVolume = volume > 0;

        // Create a simple placeholder chart with volume data
        const placeholderData = [
          { time: Date.now() - 24 * 60 * 60 * 1000, value: volume * 0.8 },
          { time: Date.now() - 12 * 60 * 60 * 1000, value: volume * 0.9 },
          { time: Date.now(), value: volume },
        ].filter((d) => d.value > 0);

        if (placeholderData.length >= 2) {
          const firstVal = placeholderData[0]?.value || 0;
          const lastVal =
            placeholderData[placeholderData.length - 1]?.value || 0;
          const isPositive = lastVal >= firstVal;

          return (
            <SparklineContainer
              isDarkTheme={isDarkTheme}
              apr={aprValue}
              pulseSpeed={0}
            >
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={placeholderData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={isPositive ? "#10B981" : "#6B7280"}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkTheme ? "#1F2937" : "#FFFFFF",
                      border: `1px solid ${
                        isDarkTheme ? "#374151" : "#E5E7EB"
                      }`,
                      borderRadius: "8px",
                      fontSize: "12px",
                      padding: "8px",
                    }}
                    formatter={(value: any) => [
                      `$${Number(value).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`,
                      "Est. Volume",
                    ]}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </SparklineContainer>
          );
        }
      }

      // Option 2: Show APR badge with trend indicator
      if (aprValue > 0) {
        const aprColor =
          aprValue > 20
            ? "#10B981"
            : aprValue > 10
            ? "#3B82F6"
            : aprValue > 5
            ? "#FBBF24"
            : "#6B7280";
        return (
          <SparklineContainer
            isDarkTheme={isDarkTheme}
            apr={aprValue}
            pulseSpeed={0}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                width: "100%",
                height: "100%",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: aprColor,
                }}
              >
                {aprValue.toFixed(2)}%
              </div>
              <div
                style={{
                  fontSize: "8px",
                  color: isDarkTheme ? "#6B7280" : "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                APR
              </div>
            </div>
          </SparklineContainer>
        );
      }

      // Option 3: Fallback - show a subtle placeholder
      return (
        <SparklineContainer
          isDarkTheme={isDarkTheme}
          apr={aprValue}
          pulseSpeed={0}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              opacity: 0.5,
            }}
          >
            <svg
              width="80"
              height="30"
              viewBox="0 0 80 30"
              style={{ overflow: "visible" }}
            >
              <line
                x1="5"
                y1="25"
                x2="75"
                y2="25"
                stroke={isDarkTheme ? "#374151" : "#D1D5DB"}
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx="5"
                cy="25"
                r="2"
                fill={isDarkTheme ? "#374151" : "#D1D5DB"}
              />
              <circle
                cx="75"
                cy="25"
                r="2"
                fill={isDarkTheme ? "#374151" : "#D1D5DB"}
              />
            </svg>
          </div>
        </SparklineContainer>
      );
    }

    // Determine stroke color and width based on APR
    const getStrokeColor = () => {
      if (aprValue > 20) return isPositive ? "#10B981" : "#EF4444";
      if (aprValue > 10) return isPositive ? "#3B82F6" : "#F59E0B";
      if (aprValue > 5) return isPositive ? "#FBBF24" : "#F97316";
      return isPositive ? "#10B981" : "#EF4444";
    };

    const strokeWidth = aprValue > 20 ? 2.5 : aprValue > 10 ? 2.2 : 2;

    return (
      <SparklineContainer
        isDarkTheme={isDarkTheme}
        apr={aprValue}
        pulseSpeed={pulseSpeed}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={validChartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={getStrokeColor()}
              strokeWidth={strokeWidth}
              dot={false}
              isAnimationActive={aprValue > 5} // Animate line drawing for higher APR
              animationDuration={pulseSpeed * 1000}
              animationEasing="ease-in-out"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkTheme ? "#1F2937" : "#FFFFFF",
                border: `1px solid ${isDarkTheme ? "#374151" : "#E5E7EB"}`,
                borderRadius: "8px",
                fontSize: "12px",
                padding: "8px",
              }}
              labelStyle={{
                color: isDarkTheme ? "#9CA3AF" : "#6B7280",
              }}
              formatter={(value: any) => {
                if (chartType === "price") {
                  return [`$${Number(value).toFixed(6)}`, "Price"];
                } else {
                  return [
                    `$${Number(value).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                    "Volume",
                  ];
                }
              }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </SparklineContainer>
    );
  }
);

SparklineChart.displayName = "SparklineChart";

const BLOCK_REWARD_ADJUSTMENT = 17.05 / 2; // block rewards for VOI pairs

const PoolStats: React.FC = () => {
  const dispatch = useDispatch();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const tokens = useSelector(selectTokens);
  const navigate = useNavigate();
  const rewards = useDefiRewards();
  const { activeAccount, signTransactions } = useWallet();
  const fetchedRewards = useSelector(selectRewards);
  const rewardsStatus = useSelector(selectRewardsStatus);
  const [statsData, setStatsData] = useState<PoolStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("tvl");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Positions state
  const [balances, setBalances] = useState<BalanceI[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [pools, setPools] = useState<IndexerPoolI[]>([]);
  const [filter2, setFilter2] = useState<string>("");
  const [page2, setPage2] = useState<number>(1);
  const positionsPageSize = 6;

  // Claim rewards state
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);

  useEffect(() => {
    const fetchPoolStats = async () => {
      try {
        setIsTransitioning(true);
        setLoading(true);
        setError(null);
        const baseUrl = `${API_BASE_URL}pools/stats`;
        const url = `${baseUrl}?sortBy=${sortBy}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch pool stats");
        }
        const data: PoolStatsResponse = await response.json();
        console.log("Pool Stats API Response:", data);

        // Small delay for smooth transition
        await new Promise((resolve) => setTimeout(resolve, 100));
        setStatsData(data);
        // Fade back in after data is set
        setTimeout(() => setIsTransitioning(false), 50);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsTransitioning(false);
      } finally {
        setLoading(false);
      }
    };

    fetchPoolStats();
  }, [sortBy]);

  // Fetch balances when user is connected
  useEffect(() => {
    if (!activeAccount) return;
    axios
      .get(
        `https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/balances?accountId=${activeAccount.address}`
      )
      .then((res) => {
        setBalances(res.data.balances);
      });
  }, [activeAccount]);

  // Fetch rewards when user is connected
  useEffect(() => {
    if (!activeAccount?.address) return;
    dispatch(fetchRewards({ userAddress: activeAccount.address }) as any);
  }, [activeAccount?.address, dispatch]);

  // Fetch pools for positions and widgets
  useEffect(() => {
    const fetchPools = async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE_URL}pools/stats?sortBy=tvl`
        );
        const poolsStats = data.stats || [];
        const poolsWithStats = poolsStats.map((poolStat: any) => {
          const poolId = Number(poolStat.poolId);
          const pool = poolStat.pool || {};
          const poolInfo = poolStat.poolInfo || {};
          const tokens = poolStat.tokens || {};
          const tvl = poolStat.tvl || {};
          const volume = poolStat.volume || {};
          const fees = poolStat.fees || {};
          const tokenA = tokens.tokenA || {};
          const tokenB = tokens.tokenB || {};
          const tokAId = String(pool.tokA || poolInfo.tokA || "");
          const tokBId = String(pool.tokB || poolInfo.tokB || "");
          const symbolA = normalizeSymbol(
            tokenA.unitName || tokenA.symbol || "",
            tokAId
          );
          const symbolB = normalizeSymbol(
            tokenB.unitName || tokenB.symbol || "",
            tokBId
          );
          const poolBalA = poolInfo.poolBals?.A || "0";
          const poolBalB = poolInfo.poolBals?.B || "0";
          const tvlUsd = parseFloat(tvl.usd || "0");
          const tvlA = tvl.tokenA?.amount || "0";
          const tvlB = tvl.tokenB?.amount || "0";
          const vol24h = volume["24h"] || {};
          const volA = vol24h.baseVolume || "0";
          const volB = vol24h.targetVolume || "0";
          const volUsd = parseFloat(vol24h.usdVolume || "0");
          const apr = fees.apr || "0";
          const supply = poolInfo.lptBals?.lpMinted || "0";
          const unitValue = poolStat.unitValue || undefined;
          return {
            contractId: poolId,
            poolId: String(poolId),
            tokAId: tokAId,
            tokBId: tokBId,
            symbolA: symbolA,
            symbolB: symbolB,
            tvl: tvlUsd,
            tvlA: tvlA,
            tvlB: tvlB,
            poolBalA: poolBalA,
            poolBalB: poolBalB,
            vol: volUsd,
            volA: volA,
            volB: volB,
            apr: apr,
            supply: supply,
            unitValue: unitValue,
            providerId: "01",
          } as IndexerPoolI;
        });
        setPools(poolsWithStats);
      } catch (error) {
        console.error("Error fetching pools stats:", error);
      }
    };
    fetchPools();
  }, []);

  // Calculate positions
  useEffect(() => {
    if (!activeAccount || !balances || !tokens || !pools.length) return;
    (async () => {
      const positions = [];
      for (const bal of balances) {
        const balance = BigInt(bal.balance);
        const pool = pools.find((p) => p.contractId === bal.contractId);
        if (!pool || balance === BigInt(0)) continue;
        const tokenA = tokens.find(
          (t) => `${t.contractId}` === `${pool.tokAId}`
        );
        const tokenB = tokens.find(
          (t) => `${t.contractId}` === `${pool.tokBId}`
        );
        const value = pool.unitValue
          ? new BigNumber(bal.balance)
              .dividedBy(new BigNumber(10).pow(6))
              .multipliedBy(new BigNumber(pool.unitValue))
              .toNumber()
          : pool.supply && pool.supply !== "0"
          ? new BigNumber(bal.balance)
              .dividedBy(new BigNumber(10).pow(6))
              .dividedBy(new BigNumber(pool.supply))
              .multipliedBy(
                Number(pool.tvlA) > Number(pool.tvlB)
                  ? new BigNumber(pool.tvlB).multipliedBy(2)
                  : new BigNumber(pool.tvlA).multipliedBy(2)
              )
              .toNumber()
          : 0;
        positions.push({
          ...pool,
          balance: BigInt(bal.balance),
          value,
          formattedValue: formatter.format(value),
          tokenA,
          tokenB,
        });
      }
      setPositions(positions);
    })();
  }, [activeAccount, pools, balances, tokens]);

  const applyFilter = (p: any, f: string, tokens?: any[]) => {
    const filterUpper = f.toUpperCase();
    if (
      `${p.tokAId}` === f ||
      `${p.tokBId}` === f ||
      p.poolId === filterUpper
    ) {
      return true;
    }
    if (
      p.symbolA &&
      String(p.symbolA).toUpperCase().indexOf(filterUpper) >= 0
    ) {
      return true;
    }
    if (
      p.symbolB &&
      String(p.symbolB).toUpperCase().indexOf(filterUpper) >= 0
    ) {
      return true;
    }
    if (tokens && tokens.length > 0) {
      const findToken = (tokenIdStr: string) => {
        const id = Number(tokenIdStr);
        let token = tokens.find((t: any) => `${t.contractId}` === tokenIdStr);
        if (!token) {
          token = tokens.find((t: any) => `${t.tokenId}` === tokenIdStr);
        }
        if (!token && (id === 0 || id === 390001)) {
          token = tokens.find(
            (t: any) => t.tokenId === 0 || t.contractId === 390001
          );
        }
        return token;
      };
      const tokA = findToken(p.tokAId);
      const tokB = findToken(p.tokBId);
      if (
        tokA &&
        (tokA.symbol?.toUpperCase().indexOf(filterUpper) >= 0 ||
          tokA.name?.toUpperCase().indexOf(filterUpper) >= 0)
      ) {
        return true;
      }
      if (
        tokB &&
        (tokB.symbol?.toUpperCase().indexOf(filterUpper) >= 0 ||
          tokB.name?.toUpperCase().indexOf(filterUpper) >= 0)
      ) {
        return true;
      }
    }
    return false;
  };

  const filteredPositions = useMemo(() => {
    return positions
      .filter((p) => applyFilter(p, filter2, tokens))
      .sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [positions, filter2, tokens]);

  // Get WAD token info (contractId 47138068) for rewards
  const rewardToken = useMemo(() => {
    return tokens.find((t) => t.contractId === 47138068);
  }, [tokens]);

  // Calculate total rewards earned from fetched reward allowances
  const fetchedRewardsTotal = useMemo(() => {
    if (!fetchedRewards || fetchedRewards.length === 0) return 0;

    const totalAmount = fetchedRewards.reduce((sum, reward) => {
      // For allowance-based rewards, use allowance field first, then fallback to amount/value
      const amount = reward.allowance || reward.amount || reward.value || "0";
      // Handle BigInt string conversion - use BigNumber for precision with large numbers
      const amountStr = typeof amount === "string" ? amount : String(amount);
      const decimals = reward.decimals || 6;

      // Use BigNumber to handle large numbers and divide by 10^decimals
      const rawAmount = new BigNumber(amountStr);
      const normalizedAmount = rawAmount
        .dividedBy(new BigNumber(10).pow(decimals))
        .toNumber();

      console.log("Reward normalization:", {
        rawAmount: amountStr,
        decimals,
        normalizedAmount,
      });

      return sum + normalizedAmount;
    }, 0);

    console.log("Total fetchedRewardsTotal:", totalAmount);
    // Return the total amount in WAD tokens (normalized by decimals)
    return totalAmount;
  }, [fetchedRewards]);

  // Total rewards earned = position values + fetched rewards (in USD equivalent)
  // For now, we'll use position values as the primary metric
  // Fetched rewards are in WAD tokens, so we'd need a price to convert to USD
  const rewardsEarned = useMemo(
    () => filteredPositions.reduce((acc, val) => acc + val.value, 0),
    [filteredPositions]
  );

  // Format fetched rewards amount
  const formatRewardsAmount = useCallback((amount: number) => {
    if (amount === 0) return "0";
    if (amount < 0.000001) {
      return amount.toExponential(2);
    }
    if (amount < 1) {
      return amount.toFixed(6);
    }
    // For amounts >= 1, use standard formatting with up to 1 decimal place
    // Don't use compact notation to avoid showing "M" or "K" suffixes
    return new Intl.NumberFormat("en", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  const rewardTokenSymbol = rewardToken
    ? tokenSymbol(rewardToken, true)
    : "WAD";

  // Calculate total raw reward amount (not normalized) for claiming
  const totalRewardAmount = useMemo(() => {
    if (!fetchedRewards || fetchedRewards.length === 0) return BigInt(0);

    return fetchedRewards.reduce((sum, reward) => {
      const amount = reward.allowance || reward.amount || reward.value || "0";
      const amountStr = typeof amount === "string" ? amount : String(amount);
      return sum + BigInt(amountStr);
    }, BigInt(0));
  }, [fetchedRewards]);

  // Handle claim rewards
  const handleClaimRewards = useCallback(async () => {
    if (
      !activeAccount ||
      fetchedRewardsTotal <= 0 ||
      isClaimingRewards ||
      totalRewardAmount === BigInt(0)
    )
      return;

    try {
      setIsClaimingRewards(true);

      const rewardOwnerAddress =
        "P3ODBTMBYB6UAN3NTYPAKEQOOZJMMT3JHZRT5ONSBTFPQDJ36JUQZVDR2I";
      const wadContractId = 47138068; // WAD token contract ID

      const { algodClient, indexerClient } = getAlgorandClients();

      // Create CONTRACT instance for WAD token
      const wadContract = new CONTRACT(
        wadContractId,
        algodClient,
        indexerClient,
        abi.nt200,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(0),
        }
      );

      console.log({
        rewardOwnerAddress,
        activeAccountAddress: activeAccount.address,
        totalRewardAmount,
      });

      // Call arc200_transferFrom to transfer rewards from owner to user
      const transferFromResult = await wadContract.arc200_transferFrom(
        rewardOwnerAddress, // from: reward owner address
        activeAccount.address, // to: user's address
        totalRewardAmount // amount: total reward amount
      );

      if (!transferFromResult.success) {
        console.log({ transferFromResult });
        throw new Error("Failed to create transferFrom transaction");
      }

      // Sign the transaction
      let signedTxns;
      try {
        signedTxns = await signTransactions(
          transferFromResult.txns.map(
            (t: string) => new Uint8Array(Buffer.from(t, "base64"))
          )
        );
      } catch (e: any) {
        console.error("Transaction signing cancelled or failed:", e);
        toast.error("Transaction signing cancelled or failed");
        return;
      }

      if (!signedTxns) {
        toast.error("No signed transactions");
        return;
      }

      // Send the transaction
      const res = await algodClient
        .sendRawTransaction(signedTxns as Uint8Array[])
        .do();

      // Wait for confirmation and show toast notifications
      await toast.promise(
        algosdk.waitForConfirmation(algodClient, res.txId, 10),
        {
          pending: "Claiming rewards...",
          success: "Rewards claimed successfully!",
          error: "Failed to claim rewards",
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 3000));
      // Refresh rewards after successful confirmation
      await dispatch(
        fetchRewards({ userAddress: activeAccount.address }) as any
      );
    } catch (error: any) {
      console.error("Error claiming rewards:", error);
      toast.error(error?.message || "Failed to claim rewards");
    } finally {
      setIsClaimingRewards(false);
    }
  }, [
    activeAccount,
    fetchedRewardsTotal,
    isClaimingRewards,
    totalRewardAmount,
    signTransactions,
    dispatch,
  ]);

  // Calculate total APR including boosts for widgets
  const calculateTotalApr = useCallback(
    (pool: IndexerPoolI): number => {
      const baseApr = Number(pool.apr || "0");
      const poolIdNum = pool.contractId;
      const reward = rewards.find(
        (r) =>
          r.poolId === poolIdNum ||
          `${r.poolId}` === `${poolIdNum}` ||
          `${r.poolId}` === `${pool.poolId}`
      ) || {
        aprBoost: 0,
        blockReward: 0,
        additionalAprBoost: 0,
      };
      const tokAValues = [Number(pool.tokAId), Number(pool.tokBId)];
      const isVOIPair =
        tokAValues.includes(0) || tokAValues.includes(TOKEN_WVOI1);
      let blockReward = reward.blockReward || 0;
      if (isVOIPair) {
        blockReward = BLOCK_REWARD_ADJUSTMENT;
      }
      const totalApr =
        baseApr +
        (reward.aprBoost || 0) +
        blockReward +
        (reward.additionalAprBoost || 0);
      return totalApr;
    },
    [rewards]
  );

  const rewardPools = useMemo(() => {
    return [...pools]
      .map((pool) => ({
        ...pool,
        totalApr: calculateTotalApr(pool),
      }))
      .filter((pool) => pool.totalApr > 0)
      .sort((a, b) => b.totalApr - a.totalApr)
      .slice(0, 3);
  }, [pools, calculateTotalApr]);

  const topPoolsByTVL = useMemo(() => {
    return [...pools].sort((a, b) => Number(b.tvl) - Number(a.tvl)).slice(0, 3);
  }, [pools]);

  const topPoolsByVolume = useMemo(() => {
    return [...pools].sort((a, b) => Number(b.vol) - Number(a.vol)).slice(0, 3);
  }, [pools]);

  const formatUSD = (value: number, showDecimals: boolean = false) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: showDecimals ? 2 : 0,
      minimumFractionDigits: 0,
    }).format(value || 0);

  const formatAPR = (value?: string | number) => {
    const aprNumber = Number(value || 0);
    if (!aprNumber) return "—";
    return `${aprNumber.toFixed(2)}% APR`;
  };

  const totalPages = Math.ceil(filteredPositions.length / positionsPageSize);
  const startIndex = (page2 - 1) * positionsPageSize;
  const endIndex = startIndex + positionsPageSize;
  const currentPositions = filteredPositions.slice(startIndex, endIndex);

  const getTokenInfo = (tokenId: string | number) => {
    const tokenIdNum = Number(tokenId);
    if (!isNaN(tokenIdNum)) {
      const token = tokens.find(
        (t) => t.tokenId === tokenIdNum || t.contractId === tokenIdNum
      );
      return token;
    }
    return null;
  };

  const getTokenIconUrl = (tokenId: string | number) => {
    const token = getTokenInfo(tokenId);
    if (token) {
      const id = token.contractId ?? token.tokenId ?? 0;
      const iconId = getIconId(id);
      return `https://asset-verification.nautilus.sh/icons/${iconId}.png`;
    }
    const tokenIdNum = Number(tokenId);
    if (!isNaN(tokenIdNum)) {
      const iconId = getIconId(tokenIdNum);
      return `https://asset-verification.nautilus.sh/icons/${iconId}.png`;
    }
    return "https://asset-verification.nautilus.sh/icons/0.png";
  };

  const formatNumber = (value: string | number | undefined): string => {
    if (!value) return "0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0";
    if (num === 0) return "0";
    if (num < 0.000001) {
      return num.toExponential(2);
    }
    if (num < 1) {
      return num.toFixed(6);
    }
    if (num < 1000) {
      return num.toFixed(2);
    }
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatCurrency = (value: string | number | undefined): string => {
    if (!value) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Calculate total APR including boosts for a pool stat (for stats table)
  const calculateTotalAprForStat = useCallback(
    (stat: PoolStatData): number => {
      const baseApr = parseFloat(stat.fees.apr || "0");
      const poolIdNum = Number(stat.poolId);

      // Find matching reward - check both string and number poolId formats
      const reward = rewards.find(
        (r) =>
          r.poolId === poolIdNum ||
          r.poolId === Number(stat.pool.poolId) ||
          `${r.poolId}` === `${stat.poolId}` ||
          `${r.poolId}` === `${stat.pool.poolId}`
      ) || {
        aprBoost: 0,
        blockReward: 0,
        additionalAprBoost: 0,
      };

      // Check for VOI pairs - check both pool.tokA/tokB (strings) and poolInfo.tokA/tokB (numbers)
      // VOI can be represented as 0 or 390001 (TOKEN_WVOI1)
      const tokAValues = [
        Number(stat.pool.tokA),
        Number(stat.pool.tokB),
        stat.poolInfo.tokA,
        stat.poolInfo.tokB,
      ];
      const isVOIPair =
        tokAValues.includes(0) || tokAValues.includes(TOKEN_WVOI1);

      // Apply block reward adjustment for VOI pairs
      let blockReward = reward.blockReward || 0;
      if (isVOIPair) {
        blockReward = BLOCK_REWARD_ADJUSTMENT;
      }

      const totalApr =
        baseApr +
        (reward.aprBoost || 0) +
        blockReward +
        (reward.additionalAprBoost || 0);

      return totalApr;
    },
    [rewards]
  );

  // Get APR breakdown for tooltip
  const getAprBreakdown = useCallback(
    (stat: PoolStatData) => {
      const baseApr = parseFloat(stat.fees.apr || "0");
      const poolIdNum = Number(stat.poolId);

      const reward = rewards.find(
        (r) =>
          r.poolId === poolIdNum ||
          r.poolId === Number(stat.pool.poolId) ||
          `${r.poolId}` === `${stat.poolId}` ||
          `${r.poolId}` === `${stat.pool.poolId}`
      ) || {
        aprBoost: 0,
        blockReward: 0,
        additionalAprBoost: 0,
      };

      const tokAValues = [
        Number(stat.pool.tokA),
        Number(stat.pool.tokB),
        stat.poolInfo.tokA,
        stat.poolInfo.tokB,
      ];
      const isVOIPair =
        tokAValues.includes(0) || tokAValues.includes(TOKEN_WVOI1);

      let blockReward = reward.blockReward || 0;
      if (isVOIPair) {
        blockReward = BLOCK_REWARD_ADJUSTMENT;
      }

      const totalApr =
        baseApr +
        (reward.aprBoost || 0) +
        blockReward +
        (reward.additionalAprBoost || 0);

      return {
        totalApr,
        baseApr,
        aprBoost: reward.aprBoost || 0,
        blockReward,
        additionalAprBoost: reward.additionalAprBoost || 0,
        poolId: poolIdNum,
        rewardFound: !!rewards.find(
          (r) =>
            r.poolId === poolIdNum ||
            r.poolId === Number(stat.pool.poolId) ||
            `${r.poolId}` === `${stat.poolId}` ||
            `${r.poolId}` === `${stat.pool.poolId}`
        ),
      };
    },
    [rewards]
  );

  // Generate page numbers for positions pagination
  const getPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const isMobile = totalPages > 5;
    const maxVisible = isMobile ? 3 : totalPages;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page2 <= 2) {
      for (let i = 1; i <= Math.min(maxVisible, totalPages); i++) {
        pages.push(i);
      }
      if (totalPages > maxVisible) {
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    } else if (page2 >= totalPages - 1) {
      pages.push(1);
      if (totalPages > maxVisible) {
        pages.push("ellipsis");
      }
      for (
        let i = Math.max(1, totalPages - maxVisible + 1);
        i <= totalPages;
        i++
      ) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      pages.push("ellipsis");
      for (let i = page2 - 1; i <= Math.min(page2 + 1, totalPages); i++) {
        pages.push(i);
      }
      if (page2 + 1 < totalPages) {
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    return pages;
  }, [totalPages, page2]);

  const handleRowClick = (poolId: string, e: React.MouseEvent) => {
    // If clicking on expand icon or in first column, toggle expansion
    const target = e.target as HTMLElement;
    if (target.closest(".expand-cell") || target.closest(".expand-icon")) {
      e.stopPropagation();
      setExpandedRows((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(poolId)) {
          newSet.delete(poolId);
        } else {
          newSet.add(poolId);
        }
        return newSet;
      });
    } else {
      // Otherwise navigate to pool page
      navigate(`/pool/${poolId}`);
    }
  };

  const toggleRowExpansion = (poolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(poolId)) {
        newSet.delete(poolId);
      } else {
        newSet.add(poolId);
      }
      return newSet;
    });
  };

  // Memoize valid stats with client-side sorting and filtering - must be before conditional returns
  const validStats = useMemo(() => {
    if (!statsData || !statsData.stats || !Array.isArray(statsData.stats)) {
      return [];
    }

    let filtered = statsData.stats.filter((s) => parseFloat(s.tvl.usd) > 0);

    // Apply search filter if search query exists
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      filtered = filtered.filter((stat) => {
        // Search by pool ID
        if (stat.poolId && String(stat.poolId).toUpperCase().includes(query)) {
          return true;
        }

        // Get token info for search
        const tokenA = getTokenInfo(stat.poolInfo.tokA);
        const tokenB = getTokenInfo(stat.poolInfo.tokB);
        const tokenASymbol = tokenA
          ? tokenSymbol(tokenA)
          : stat.tokens.tokenA.unitName || stat.tokens.tokenA.name || "";
        const tokenBSymbol = tokenB
          ? tokenSymbol(tokenB)
          : stat.tokens.tokenB.unitName || stat.tokens.tokenB.name || "";

        // Search by token symbols
        if (
          tokenASymbol.toUpperCase().includes(query) ||
          tokenBSymbol.toUpperCase().includes(query)
        ) {
          return true;
        }

        // Search by token names
        if (
          (stat.tokens.tokenA.name &&
            stat.tokens.tokenA.name.toUpperCase().includes(query)) ||
          (stat.tokens.tokenB.name &&
            stat.tokens.tokenB.name.toUpperCase().includes(query))
        ) {
          return true;
        }

        // Search by token IDs
        if (
          String(stat.poolInfo.tokA).includes(query) ||
          String(stat.poolInfo.tokB).includes(query)
        ) {
          return true;
        }

        return false;
      });
    }

    // Client-side sorting for smoother transitions
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "tvl":
          return parseFloat(b.tvl.usd || "0") - parseFloat(a.tvl.usd || "0");
        case "volume":
          return (
            parseFloat(b.volume["24h"].usdVolume || "0") -
            parseFloat(a.volume["24h"].usdVolume || "0")
          );
        case "fees":
          return (
            parseFloat(b.fees["24hFeesUSD"] || "0") -
            parseFloat(a.fees["24hFeesUSD"] || "0")
          );
        case "apr":
          return calculateTotalAprForStat(b) - calculateTotalAprForStat(a);
        default:
          return 0;
      }
    });

    return sorted;
  }, [statsData, sortBy, searchQuery, calculateTotalAprForStat]);

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Title isDarkTheme={isDarkTheme}>Pool Stats</Title>
        <ErrorMessage isDarkTheme={isDarkTheme}>Error: {error}</ErrorMessage>
      </Container>
    );
  }

  if (!statsData || !statsData.stats || !Array.isArray(statsData.stats)) {
    return (
      <Container>
        <Title isDarkTheme={isDarkTheme}>Pool Stats</Title>
        <EmptyMessage isDarkTheme={isDarkTheme}>
          No pool stats data available
        </EmptyMessage>
      </Container>
    );
  }

  // Calculate totals
  const totalTVL = validStats.reduce((sum, s) => {
    const tvl = parseFloat(s.tvl.usd || "0");
    return sum + (isNaN(tvl) ? 0 : tvl);
  }, 0);

  const totalVolume = validStats.reduce((sum, s) => {
    const vol = parseFloat(s.volume["24h"].usdVolume || "0");
    return sum + (isNaN(vol) ? 0 : vol);
  }, 0);

  const totalFees = validStats.reduce((sum, s) => {
    const fees = parseFloat(s.fees["24hFeesUSD"] || "0");
    return sum + (isNaN(fees) ? 0 : fees);
  }, 0);

  return (
    <Container>
      {activeAccount && fetchedRewardsTotal > 0 && (
        <HeroCard isDarkTheme={isDarkTheme}>
            <HeroHeadline>
              <div>
                <PanelTitle isDarkTheme={isDarkTheme}>
                  Rewards earned
                </PanelTitle>
                <HeroCaption isDarkTheme={isDarkTheme}>
                  {filteredPositions.length > 0
                    ? `${filteredPositions.length} active position${
                        filteredPositions.length !== 1 ? "s" : ""
                      }`
                    : "Rewards received from providing liquidity"}
                </HeroCaption>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <HeroValue isDarkTheme={isDarkTheme}>
                  {fetchedRewardsTotal > 0
                    ? formatUSD(fetchedRewardsTotal, true)
                    : filteredPositions.length > 0
                    ? formatUSD(rewardsEarned)
                    : formatUSD(0)}
                </HeroValue>
                {fetchedRewardsTotal > 0 && (
                  <HeroCTA
                    isDarkTheme={isDarkTheme}
                    onClick={handleClaimRewards}
                    disabled={isClaimingRewards}
                    style={{
                      opacity: isClaimingRewards ? 0.7 : 1,
                      cursor: isClaimingRewards ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {isClaimingRewards && (
                      <CircularProgress size={14} sx={{ color: "#fff" }} />
                    )}
                    {isClaimingRewards ? "Claiming..." : "Claim rewards"}
                  </HeroCTA>
                )}
              </div>
            </HeroHeadline>
            <HeroCaption isDarkTheme={isDarkTheme}>
              {fetchedRewardsTotal > 0 && filteredPositions.length > 0
                ? `You've received ${formatRewardsAmount(
                    fetchedRewardsTotal
                  )} ${rewardTokenSymbol} in rewards.`
                : filteredPositions.length > 0
                ? "Provide liquidity to pools to start earning fees and on-chain rewards."
                : fetchedRewardsTotal > 0
                ? `You've received ${formatRewardsAmount(
                    fetchedRewardsTotal
                  )} ${rewardTokenSymbol} in rewards from providing liquidity.`
                : "Provide liquidity to pools to start earning fees and on-chain rewards."}
            </HeroCaption>
          </HeroCard>
        )}

      {activeAccount && (
        <LayoutGrid>
          <MainColumn>
            <Panel isDarkTheme={isDarkTheme}>
              <PanelHeader>
                <div>
                  <PanelTitle isDarkTheme={isDarkTheme}>
                    Your positions
                  </PanelTitle>
                  <PanelSubtitle isDarkTheme={isDarkTheme}>
                    Provide liquidity to start earning fees and on-chain
                    rewards.
                  </PanelSubtitle>
                </div>
                <HeroCTA
                  isDarkTheme={isDarkTheme}
                  onClick={() => navigate("/pool/create")}
                >
                  New position
                </HeroCTA>
              </PanelHeader>

              <UserStatsGrid isDarkTheme={isDarkTheme}>
                <StatItem>
                  <StatLabel isDarkTheme={isDarkTheme}>Positions</StatLabel>
                  <StatValue isDarkTheme={isDarkTheme}>
                    {filteredPositions.length}
                  </StatValue>
                </StatItem>
              </UserStatsGrid>

              {filteredPositions.length > 0 ? (
                <>
                  <PoolPosition
                    positions={currentPositions}
                    value={rewardsEarned}
                    showing={currentPositions.length}
                    tokens={tokens || ([] as any[])}
                    onFilter={(v) => {
                      setFilter2(v);
                      setPage2(1);
                    }}
                  />
                  {totalPages > 1 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "8px",
                        marginTop: "16px",
                      }}
                    >
                      <button
                        disabled={page2 === 1}
                        onClick={() => setPage2(page2 - 1)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "8px",
                          border: `1px solid ${
                            isDarkTheme
                              ? "rgba(255, 255, 255, 0.15)"
                              : "rgba(41, 88, 255, 0.15)"
                          }`,
                          background: isDarkTheme ? "#050507" : "#ffffff",
                          color: isDarkTheme ? "#fff" : "#0c0c10",
                          cursor: page2 === 1 ? "not-allowed" : "pointer",
                          opacity: page2 === 1 ? 0.5 : 1,
                        }}
                      >
                        Previous
                      </button>
                      {getPageNumbers.map((pageItem, index) => {
                        if (pageItem === "ellipsis") {
                          return (
                            <span
                              key={`ellipsis-${index}`}
                              style={{
                                padding: "0 4px",
                                color: isDarkTheme
                                  ? "rgba(255, 255, 255, 0.5)"
                                  : "rgba(12, 12, 16, 0.5)",
                                fontSize: "14px",
                              }}
                            >
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={pageItem}
                            onClick={() => setPage2(pageItem as number)}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "8px",
                              border: `1px solid ${
                                page2 === pageItem
                                  ? "#2958ff"
                                  : isDarkTheme
                                  ? "rgba(255, 255, 255, 0.15)"
                                  : "rgba(41, 88, 255, 0.15)"
                              }`,
                              background:
                                page2 === pageItem
                                  ? "#2958ff"
                                  : isDarkTheme
                                  ? "#050507"
                                  : "#ffffff",
                              color:
                                page2 === pageItem
                                  ? "#fff"
                                  : isDarkTheme
                                  ? "#fff"
                                  : "#0c0c10",
                              cursor: "pointer",
                            }}
                          >
                            {pageItem}
                          </button>
                        );
                      })}
                      <button
                        disabled={page2 === totalPages}
                        onClick={() => setPage2(page2 + 1)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "8px",
                          border: `1px solid ${
                            isDarkTheme
                              ? "rgba(255, 255, 255, 0.15)"
                              : "rgba(41, 88, 255, 0.15)"
                          }`,
                          background: isDarkTheme ? "#050507" : "#ffffff",
                          color: isDarkTheme ? "#fff" : "#0c0c10",
                          cursor:
                            page2 === totalPages ? "not-allowed" : "pointer",
                          opacity: page2 === totalPages ? 0.5 : 1,
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState isDarkTheme={isDarkTheme}>
                  You don't have liquidity positions yet. Create one to see it
                  here.
                </EmptyState>
              )}
            </Panel>
          </MainColumn>

          <SideColumn>
            <Panel isDarkTheme={isDarkTheme}>
              <PanelHeader>
                <div>
                  <PanelTitle isDarkTheme={isDarkTheme}>
                    Pools with rewards
                  </PanelTitle>
                  <PanelSubtitle isDarkTheme={isDarkTheme}>
                    APR includes token incentives if available.
                  </PanelSubtitle>
                </div>
              </PanelHeader>
              <SimpleList>
                {rewardPools.length ? (
                  rewardPools.map((pool) => (
                    <SimpleListRow
                      key={`reward-${pool.contractId}`}
                      isDarkTheme={isDarkTheme}
                    >
                      <SimpleListLabel>
                        {(() => {
                          const tokAId = Number(pool.tokAId);
                          const tokBId = Number(pool.tokBId);
                          const shouldSwap = tokAId > tokBId;
                          return shouldSwap
                            ? `${normalizeSymbol(pool.symbolB, pool.tokBId)}/${normalizeSymbol(pool.symbolA, pool.tokAId)}`
                            : `${normalizeSymbol(pool.symbolA, pool.tokAId)}/${normalizeSymbol(pool.symbolB, pool.tokBId)}`;
                        })()}
                      </SimpleListLabel>
                      <SimpleListValue>
                        {formatAPR(pool.totalApr)}
                      </SimpleListValue>
                    </SimpleListRow>
                  ))
                ) : (
                  <PanelSubtitle isDarkTheme={isDarkTheme}>
                    No incentivized pools at the moment.
                  </PanelSubtitle>
                )}
              </SimpleList>
            </Panel>

            <Panel isDarkTheme={isDarkTheme}>
              <PanelHeader>
                <div>
                  <PanelTitle isDarkTheme={isDarkTheme}>
                    Top pools by TVL
                  </PanelTitle>
                  <PanelSubtitle isDarkTheme={isDarkTheme}>
                    Most capitalized pools in the network.
                  </PanelSubtitle>
                </div>
              </PanelHeader>
              <SimpleList>
                {topPoolsByTVL.map((pool) => (
                    <SimpleListRow
                      key={`tvl-${pool.contractId}`}
                      isDarkTheme={isDarkTheme}
                    >
                      <SimpleListLabel>
                        {(() => {
                          const tokAId = Number(pool.tokAId);
                          const tokBId = Number(pool.tokBId);
                          const shouldSwap = tokAId > tokBId;
                          return shouldSwap
                            ? `${normalizeSymbol(pool.symbolB, pool.tokBId)}/${normalizeSymbol(pool.symbolA, pool.tokAId)}`
                            : `${normalizeSymbol(pool.symbolA, pool.tokAId)}/${normalizeSymbol(pool.symbolB, pool.tokBId)}`;
                        })()}
                      </SimpleListLabel>
                    <SimpleListValue>
                      {formatUSD(Number(pool.tvl))}
                    </SimpleListValue>
                  </SimpleListRow>
                ))}
              </SimpleList>
            </Panel>

            <Panel isDarkTheme={isDarkTheme}>
              <PanelHeader>
                <div>
                  <PanelTitle isDarkTheme={isDarkTheme}>
                    Top pools by Volume
                  </PanelTitle>
                  <PanelSubtitle isDarkTheme={isDarkTheme}>
                    Highest 24h trading volume pools.
                  </PanelSubtitle>
                </div>
              </PanelHeader>
              <SimpleList>
                {topPoolsByVolume.map((pool) => (
                    <SimpleListRow
                      key={`volume-${pool.contractId}`}
                      isDarkTheme={isDarkTheme}
                    >
                      <SimpleListLabel>
                        {(() => {
                          const tokAId = Number(pool.tokAId);
                          const tokBId = Number(pool.tokBId);
                          const shouldSwap = tokAId > tokBId;
                          return shouldSwap
                            ? `${normalizeSymbol(pool.symbolB, pool.tokBId)}/${normalizeSymbol(pool.symbolA, pool.tokAId)}`
                            : `${normalizeSymbol(pool.symbolA, pool.tokAId)}/${normalizeSymbol(pool.symbolB, pool.tokBId)}`;
                        })()}
                      </SimpleListLabel>
                    <SimpleListValue>
                      {formatUSD(Number(pool.vol))}
                    </SimpleListValue>
                  </SimpleListRow>
                ))}
              </SimpleList>
            </Panel>
          </SideColumn>
        </LayoutGrid>
      )}

      <PanelSurface isDarkTheme={isDarkTheme}>
        <PanelHeaderRow>
          <Title isDarkTheme={isDarkTheme}>Pool Stats</Title>
          <SortControls>
            <SortButton
              isDarkTheme={isDarkTheme}
              active={sortBy === "tvl"}
              onClick={() => setSortBy("tvl")}
            >
              Sort by TVL
            </SortButton>
            <SortButton
              isDarkTheme={isDarkTheme}
              active={sortBy === "volume"}
              onClick={() => setSortBy("volume")}
            >
              Sort by Volume
            </SortButton>
            <SortButton
              isDarkTheme={isDarkTheme}
              active={sortBy === "fees"}
              onClick={() => setSortBy("fees")}
            >
              Sort by Fees
            </SortButton>
            <SortButton
              isDarkTheme={isDarkTheme}
              active={sortBy === "apr"}
              onClick={() => setSortBy("apr")}
            >
              Sort by APR
            </SortButton>
          </SortControls>
        </PanelHeaderRow>

        <div style={{ marginBottom: "16px" }}>
          <Search
            onChange={(value) => setSearchQuery(value)}
            placeholder="Search by pool ID, token symbol, or token name"
          />
        </div>

        <StatsGrid>
          <StatsCard
            title="Total Pools"
            value={validStats.length.toString()}
            isDarkTheme={isDarkTheme}
          />
          <StatsCard
            title="Total TVL"
            value={formatCurrency(totalTVL)}
            isDarkTheme={isDarkTheme}
          />
          <StatsCard
            title="24h Volume"
            value={formatCurrency(totalVolume)}
            isDarkTheme={isDarkTheme}
          />
        </StatsGrid>
      </PanelSurface>

      <PanelSurface isDarkTheme={isDarkTheme}>
        <TableWrapper isTransitioning={isTransitioning}>
          <Table isDarkTheme={isDarkTheme}>
            <TableHead isDarkTheme={isDarkTheme}>
              <tr>
                <TableHeader isDarkTheme={isDarkTheme}>Pair</TableHeader>
                <TableHeader isDarkTheme={isDarkTheme}>Pool ID</TableHeader>
                <TableHeader isDarkTheme={isDarkTheme}>TVL (USD)</TableHeader>
                <TableHeader isDarkTheme={isDarkTheme}>24h Volume</TableHeader>
                <TableHeader isDarkTheme={isDarkTheme}>24h Fees</TableHeader>
                <TableHeader isDarkTheme={isDarkTheme}>APR</TableHeader>
                <TableHeader isDarkTheme={isDarkTheme}>1d Chart</TableHeader>
              </tr>
            </TableHead>
            <TableBody isDarkTheme={isDarkTheme}>
              {validStats.map((stat) => {
                const tokenA = getTokenInfo(stat.poolInfo.tokA);
                const tokenB = getTokenInfo(stat.poolInfo.tokB);
                const tokenASymbol = tokenA
                  ? tokenSymbol(tokenA)
                  : stat.tokens.tokenA.unitName || stat.tokens.tokenA.name;
                const tokenBSymbol = tokenB
                  ? tokenSymbol(tokenB)
                  : stat.tokens.tokenB.unitName || stat.tokens.tokenB.name;

                // Order pair so asset with lower contractId is on left
                const tokAId = Number(stat.poolInfo.tokA);
                const tokBId = Number(stat.poolInfo.tokB);
                const shouldSwap = tokAId > tokBId;
                const displayTokenA = shouldSwap ? tokenB : tokenA;
                const displayTokenB = shouldSwap ? tokenA : tokenB;
                const displayTokenASymbol = shouldSwap ? tokenBSymbol : tokenASymbol;
                const displayTokenBSymbol = shouldSwap ? tokenASymbol : tokenBSymbol;
                const displayTokAId = shouldSwap ? tokBId : tokAId;
                const displayTokBId = shouldSwap ? tokAId : tokBId;

                const isExpanded = expandedRows.has(stat.poolId);
                const hasDebugInfo = false; // Debug info feature removed

                return (
                  <React.Fragment key={stat.poolId}>
                    <tr
                      onClick={(e) => handleRowClick(stat.poolId, e)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell
                        isDarkTheme={isDarkTheme}
                        data-label="Pair"
                        className="expand-cell"
                      >
                        <PairCell>
                          {hasDebugInfo && (
                            <ExpandIcon
                              isExpanded={isExpanded}
                              className="expand-icon"
                              onClick={(e) =>
                                toggleRowExpansion(stat.poolId, e)
                              }
                              style={{ cursor: "pointer" }}
                            >
                              ▶
                            </ExpandIcon>
                          )}
                          <TokenIcon
                            src={getTokenIconUrl(displayTokAId)}
                            alt={displayTokenASymbol}
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://asset-verification.nautilus.sh/icons/0.png";
                            }}
                          />
                          <span style={{ fontWeight: 500 }}>
                            {displayTokenASymbol}
                          </span>
                          <span>/</span>
                          <TokenIcon
                            src={getTokenIconUrl(displayTokBId)}
                            alt={displayTokenBSymbol}
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://asset-verification.nautilus.sh/icons/0.png";
                            }}
                          />
                          <span style={{ fontWeight: 500 }}>
                            {displayTokenBSymbol}
                          </span>
                        </PairCell>
                      </TableCell>
                      <TableCell isDarkTheme={isDarkTheme} data-label="Pool ID">
                        {stat.poolId}
                      </TableCell>
                      <TableCell
                        isDarkTheme={isDarkTheme}
                        data-label="TVL (USD)"
                      >
                        {formatCurrency(stat.tvl.usd)}
                      </TableCell>
                      <TableCell
                        isDarkTheme={isDarkTheme}
                        data-label="24h Volume"
                      >
                        {formatCurrency(stat.volume["24h"].usdVolume)}
                      </TableCell>
                      <TableCell
                        isDarkTheme={isDarkTheme}
                        data-label="24h Fees"
                      >
                        {formatCurrency(stat.fees["24hFeesUSD"])}
                      </TableCell>
                      <TableCell isDarkTheme={isDarkTheme} data-label="APR">
                        {(() => {
                          const breakdown = getAprBreakdown(stat);
                          const totalApr = calculateTotalAprForStat(stat);
                          const tooltipContent = (
                            <div>
                              <p>
                                <strong>
                                  Total APR: {breakdown.totalApr.toFixed(2)}%
                                </strong>
                              </p>
                              <p>
                                Base Swap APR: {breakdown.baseApr.toFixed(2)}%
                              </p>
                              {breakdown.aprBoost > 0 && (
                                <p>
                                  DeFi Boost: {breakdown.aprBoost.toFixed(2)}%
                                </p>
                              )}
                              {breakdown.blockReward > 0 && (
                                <p>
                                  Block Rewards:{" "}
                                  {breakdown.blockReward.toFixed(2)}%
                                </p>
                              )}
                              {breakdown.additionalAprBoost > 0 && (
                                <p>
                                  Additional APR Boost:{" "}
                                  {breakdown.additionalAprBoost.toFixed(2)}%
                                </p>
                              )}
                              {!breakdown.rewardFound &&
                                breakdown.totalApr === breakdown.baseApr && (
                                  <p
                                    style={{ fontSize: "0.8em", color: "#999" }}
                                  >
                                    No rewards found for pool {breakdown.poolId}
                                  </p>
                                )}
                            </div>
                          );
                          return (
                            <MuiTooltip
                              title={tooltipContent}
                              arrow
                              placement="top"
                            >
                              <span style={{ cursor: "help" }}>
                                {`${totalApr.toFixed(2)}%`}
                              </span>
                            </MuiTooltip>
                          );
                        })()}
                      </TableCell>
                      <TableCell
                        isDarkTheme={isDarkTheme}
                        data-label="1d Chart"
                      >
                        <SparklineChart
                          poolId={stat.poolId}
                          isDarkTheme={isDarkTheme}
                          apr={calculateTotalAprForStat(stat)}
                          priceHistory={stat.priceHistory}
                          sparkline24h={stat.sparkline24h}
                          volume24h={stat.volume["24h"]}
                        />
                      </TableCell>
                    </tr>
                    {isExpanded && hasDebugInfo && (
                      <ExpandedRow isDarkTheme={isDarkTheme}>
                        <TableCell
                          isDarkTheme={isDarkTheme}
                          colSpan={7}
                          style={{ padding: "1rem 1.5rem" }}
                        >
                          <DebugContent isDarkTheme={isDarkTheme}>
                            {stat.debug && (
                              <DebugSection isDarkTheme={isDarkTheme}>
                                <DebugSectionTitle isDarkTheme={isDarkTheme}>
                                  Debug Information
                                </DebugSectionTitle>
                                {stat.debug.method && (
                                  <div style={{ marginBottom: "0.5rem" }}>
                                    <strong>Method:</strong> {stat.debug.method}
                                  </div>
                                )}
                                {stat.debug.calculations && (
                                  <div>
                                    <div style={{ marginBottom: "0.25rem" }}>
                                      <strong>Calculations:</strong>
                                    </div>
                                    <DebugPre isDarkTheme={isDarkTheme}>
                                      {JSON.stringify(
                                        stat.debug.calculations,
                                        null,
                                        2
                                      )}
                                    </DebugPre>
                                  </div>
                                )}
                              </DebugSection>
                            )}
                            {stat.poolInfo && (
                              <DebugSection isDarkTheme={isDarkTheme}>
                                <DebugSectionTitle isDarkTheme={isDarkTheme}>
                                  Pool Information
                                </DebugSectionTitle>
                                <div style={{ marginBottom: "0.5rem" }}>
                                  <strong>Pool Balances:</strong>
                                  <div
                                    style={{
                                      marginLeft: "0.5rem",
                                      marginTop: "0.25rem",
                                    }}
                                  >
                                    Token A:{" "}
                                    {formatNumber(stat.poolInfo.poolBals.A)} (
                                    {stat.tokens.tokenA.unitName})
                                    <br />
                                    Token B:{" "}
                                    {formatNumber(stat.poolInfo.poolBals.B)} (
                                    {stat.tokens.tokenB.unitName})
                                  </div>
                                </div>
                                <div style={{ marginBottom: "0.5rem" }}>
                                  <strong>LP Tokens:</strong>
                                  <div
                                    style={{
                                      marginLeft: "0.5rem",
                                      marginTop: "0.25rem",
                                    }}
                                  >
                                    Minted:{" "}
                                    {formatNumber(
                                      stat.poolInfo.lptBals.lpMinted
                                    )}
                                    <br />
                                    Held:{" "}
                                    {formatNumber(stat.poolInfo.lptBals.lpHeld)}
                                  </div>
                                </div>
                                <div>
                                  <strong>Protocol Balances:</strong>
                                  <div
                                    style={{
                                      marginLeft: "0.5rem",
                                      marginTop: "0.25rem",
                                    }}
                                  >
                                    A: {formatNumber(stat.poolInfo.protoBals.A)}
                                    <br />
                                    B: {formatNumber(stat.poolInfo.protoBals.B)}
                                  </div>
                                </div>
                              </DebugSection>
                            )}
                            {Object.keys(stat).filter(
                              (key) =>
                                ![
                                  "poolId",
                                  "pool",
                                  "poolInfo",
                                  "tokens",
                                  "tvl",
                                  "volume",
                                  "fees",
                                  "lastUpdated",
                                  "debug",
                                ].includes(key)
                            ).length > 0 && (
                              <DebugSection isDarkTheme={isDarkTheme}>
                                <DebugSectionTitle isDarkTheme={isDarkTheme}>
                                  Additional Debug Fields
                                </DebugSectionTitle>
                                <DebugPre isDarkTheme={isDarkTheme}>
                                  {JSON.stringify(
                                    Object.fromEntries(
                                      Object.entries(stat).filter(
                                        ([key]) =>
                                          ![
                                            "poolId",
                                            "pool",
                                            "poolInfo",
                                            "tokens",
                                            "tvl",
                                            "volume",
                                            "fees",
                                            "lastUpdated",
                                            "debug",
                                          ].includes(key)
                                      )
                                    ),
                                    null,
                                    2
                                  )}
                                </DebugPre>
                              </DebugSection>
                            )}
                          </DebugContent>
                        </TableCell>
                      </ExpandedRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableWrapper>
      </PanelSurface>
    </Container>
  );
};

export default PoolStats;
