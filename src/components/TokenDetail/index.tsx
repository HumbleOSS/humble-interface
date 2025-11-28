import React, { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import { CircularProgress } from "@mui/material";
import { selectTokens } from "../../store/tokenSlice";
import { tokenSymbol, getIconId } from "../../utils/dex";
import { TOKEN_WVOI1 } from "../../constants/tokens";
import { API_BASE_URL } from "../../constants/api";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import {
  LineChart as RechartsLineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import EmbeddedSwapWidget from "../EmbeddedSwapWidget";
import { ARC200TokenI } from "../../types";
import { useWallet } from "@txnlab/use-wallet-react";

interface TokenStatData {
  assetId: string;
  token?: {
    assetId: string;
    name: string;
    unitName: string;
    decimals: string;
    totalSupply: string;
    lastUpdated: number;
  };
  name?: string;
  unitName?: string;
  symbol?: string;
  decimals?: string;
  totalSupply?: string;
  price?: {
    usd?: string;
    voi?: string;
    quoteTokenId?: string;
    change24h?: string;
  };
  priceChange?: {
    "24h"?: {
      percent?: string;
      absolute?: string;
    };
  };
  volume?: {
    "24h"?: {
      usdVolume?: string;
    };
  };
  liquidity?: {
    totalUSD?: string;
    pools?: number;
  };
  tvl?: {
    usd?: string;
  };
  marketCap?: {
    usd?: string;
  };
  fdv?: {
    usd?: string;
  };
  lastUpdated?: number;
  [key: string]: any;
}

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0;
`;

const BreadcrumbContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const BreadcrumbLink = styled(Link)<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  text-decoration: none;
  font-size: 14px;
  &:hover {
    color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  }
`;

const BreadcrumbSeparator = styled.span<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  font-size: 14px;
`;

const BreadcrumbCurrent = styled.span<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  font-size: 14px;
  font-weight: 600;
`;

const TokenHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const TokenIcon = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
`;

const PoolIcon = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #FFFFFF;
  background: #FFFFFF;
`;

const PoolIconContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
`;

const PoolIconsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: -8px;
  position: relative;
  margin-right: 8px;
`;

const PoolIconFirst = styled.img<{ isDarkTheme: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid ${(props) => (props.isDarkTheme ? "#1F2937" : "#FFFFFF")};
  background: ${(props) => (props.isDarkTheme ? "#1F2937" : "#FFFFFF")};
  position: relative;
  z-index: 2;
`;

const PoolIconSecond = styled.img<{ isDarkTheme: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid ${(props) => (props.isDarkTheme ? "#1F2937" : "#FFFFFF")};
  background: ${(props) => (props.isDarkTheme ? "#1F2937" : "#FFFFFF")};
  position: relative;
  margin-left: -8px;
  z-index: 1;
`;

const PoolNameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TokenInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TokenName = styled.h1<{ isDarkTheme: boolean }>`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
`;

const Price = styled.div<{ isDarkTheme: boolean }>`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
`;

const PriceChange = styled.div<{ isPositive: boolean; isDarkTheme: boolean }>`
  font-size: 1rem;
  font-weight: 500;
  color: ${(props) =>
    props.isPositive
      ? props.isDarkTheme
        ? "#10B981"
        : "#059669"
      : props.isDarkTheme
      ? "#EF4444"
      : "#DC2626"};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 1200px) {
    grid-template-columns: 1fr 400px;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ChartSection = styled.div<{ isDarkTheme: boolean }>`
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

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const TimeRangeButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const TimeRangeButton = styled.button<{
  active: boolean;
  isDarkTheme: boolean;
}>`
  padding: 6px 12px;
  border-radius: 8px;
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

const ChartContainer = styled.div`
  width: 100%;
  height: 400px;
  margin-top: 16px;
`;

const SwapPanel = styled.div<{ isDarkTheme: boolean }>`
  border-radius: 24px;
  padding: clamp(16px, 2vw, 20px);
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
  height: fit-content;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0;
`;

const StatsHeading = styled.h2<{ isDarkTheme: boolean }>`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
`;

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const StatsCard = styled.div<{ isDarkTheme: boolean }>`
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
  margin: 0 0 8px 0;
  font-weight: 500;
`;

const StatsValue = styled.div<{ isDarkTheme: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const InfoSection = styled.div<{ isDarkTheme: boolean }>`
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

const InfoTitle = styled.h2<{ isDarkTheme: boolean }>`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
`;

const InfoLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const InfoLink = styled.a<{ isDarkTheme: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${(props) => (props.isDarkTheme ? "#6366F1" : "#4F46E5")};
  text-decoration: none;
  font-size: 0.875rem;
  &:hover {
    text-decoration: underline;
  }
`;

const InfoDescription = styled.p<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0;
`;

const IBuyVOIWidgetContainer = styled.div<{ isDarkTheme: boolean }>`
  border-radius: 24px;
  padding: clamp(20px, 2vw, 28px);
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
  margin-top: 24px;
  overflow: hidden;
`;

const IBuyVOIWidgetTitle = styled.h2<{ isDarkTheme: boolean }>`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 24px 0 16px 0;
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
`;

const IBuyVOIIframe = styled.iframe`
  width: 100%;
  min-height: 500px;
  height: 600px;
  border: none;
  border-radius: 16px;
  display: block;
  margin-top: 24px;
  
  @media (max-width: 768px) {
    height: 500px;
    min-height: 400px;
  }
`;

const IBuyVOIButton = styled.button<{ isDarkTheme: boolean }>`
  width: 100%;
  padding: 22px 40px;
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  &:hover {
    background: ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(41, 88, 255, 0.1)"};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const TransactionsSection = styled.div<{ isDarkTheme: boolean }>`
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

const TabsContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Tab = styled.button<{ active: boolean; isDarkTheme: boolean }>`
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: ${(props) =>
    props.active
      ? props.isDarkTheme
        ? "#FFFFFF"
        : "#0c0c10"
      : props.isDarkTheme
      ? "#9CA3AF"
      : "#6B7280"};
  font-size: 0.875rem;
  font-weight: ${(props) => (props.active ? "600" : "500")};
  cursor: pointer;
  border-bottom: 2px solid
    ${(props) => (props.active ? "#6366F1" : "transparent")};
  transition: all 0.2s;

  &:hover {
    color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  }
`;

const Table = styled.table<{ isDarkTheme: boolean }>`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th<{ isDarkTheme: boolean }>`
  padding: 12px;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  border-bottom: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(12, 12, 16, 0.08)"};
`;

const TableCell = styled.td<{ isDarkTheme: boolean }>`
  padding: 12px;
  font-size: 0.875rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  border-bottom: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(12, 12, 16, 0.08)"};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
`;

const PaginationContainer = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const PaginationButton = styled.button<{ isDarkTheme: boolean; active?: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid
    ${(props) =>
      props.active
        ? "#2958ff"
        : props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) =>
    props.active
      ? "#2958ff"
      : props.isDarkTheme
      ? "#050507"
      : "#ffffff"};
  color: ${(props) =>
    props.active
      ? "#FFFFFF"
      : props.isDarkTheme
      ? "#F3F4F6"
      : "#0c0c10"};
  font-size: 0.875rem;
  font-weight: ${(props) => (props.active ? "600" : "500")};
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.active
        ? "#1e40af"
        : props.isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(41, 88, 255, 0.1)"};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TokenDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const tokens = useSelector(selectTokens);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { activeAccount } = useWallet();
  const [tokenData, setTokenData] = useState<TokenStatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"1H" | "1D" | "1W" | "1M" | "1Y">(
    "1D"
  );
  const [activeTab, setActiveTab] = useState<"transactions" | "pools">(
    "transactions"
  );
  const [chartData, setChartData] = useState<any[]>([]);
  const [poolsData, setPoolsData] = useState<any[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(false);
  const [poolsPage, setPoolsPage] = useState<number>(1);
  const poolsPerPage = 25;
  const [showIBuyVOIWidget, setShowIBuyVOIWidget] = useState<boolean>(false);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        setLoading(true);
        const url = `${API_BASE_URL}tokens/${id}/stats`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch token data");
        }
        const data:
          | TokenStatData
          | { tokens?: TokenStatData[]; stats?: TokenStatData[] } =
          await response.json();

        // Handle both single token object and array response formats
        let token: TokenStatData | null = null;
        if (Array.isArray(data)) {
          token =
            data.find((t) => t.assetId === id || t.token?.assetId === id) ||
            null;
        } else if (data && typeof data === "object" && "assetId" in data) {
          // Direct token object
          token = data as TokenStatData;
        } else if (
          data &&
          typeof data === "object" &&
          ("tokens" in data || "stats" in data)
        ) {
          // Response with tokens/stats array
          const tokensList = (data as any).tokens || (data as any).stats || [];
          token =
            tokensList.find(
              (t: TokenStatData) => t.assetId === id || t.token?.assetId === id
            ) || null;
        }

        if (token) {
          setTokenData(token);
        }
      } catch (err) {
        console.error("Error fetching token data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTokenData();
    }
  }, [id]);

  // Fetch pools data
  useEffect(() => {
    const fetchPools = async () => {
      if (!id || activeTab !== "pools") return;
      try {
        setPoolsLoading(true);
        const url = `${API_BASE_URL}tokens/${id}/pools?sortBy=tvl`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch pools data");
        }
        const data = await response.json();
        // Handle different response formats
        const pools = Array.isArray(data)
          ? data
          : data.pools || data.stats || [];
        setPoolsData(pools);
        setPoolsPage(1); // Reset to first page when new data is fetched
      } catch (err) {
        console.error("Error fetching pools data:", err);
        setPoolsData([]);
      } finally {
        setPoolsLoading(false);
      }
    };

    fetchPools();
  }, [id, activeTab]);


  // Generate mock chart data (replace with real API call)
  useEffect(() => {
    if (!tokenData) return;

    const price = parseFloat(tokenData.price?.usd || "0");
    const now = Date.now();
    const dataPoints = [];

    for (let i = 23; i >= 0; i--) {
      const timestamp = now - i * 60 * 60 * 1000;
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      dataPoints.push({
        time: timestamp,
        price: price * (1 + variation),
      });
    }

    setChartData(dataPoints);
  }, [tokenData, timeRange]);

  const getTokenInfo = (assetId: string | number) => {
    const assetIdNum = Number(assetId);
    if (!isNaN(assetIdNum)) {
      const token = tokens.find(
        (t) => t.tokenId === assetIdNum || t.contractId === assetIdNum
      );
      return token;
    }
    return null;
  };

  const getTokenIconUrl = (assetId: string | number) => {
    const token = getTokenInfo(assetId);
    if (token) {
      const id = token.contractId ?? token.tokenId ?? 0;
      const iconId = getIconId(id);
      return `https://asset-verification.nautilus.sh/icons/${iconId}.png`;
    }
    const assetIdNum = Number(assetId);
    if (!isNaN(assetIdNum)) {
      const iconId = getIconId(assetIdNum);
      return `https://asset-verification.nautilus.sh/icons/${iconId}.png`;
    }
    return "https://asset-verification.nautilus.sh/icons/0.png";
  };

  const formatCurrency = (value: string | number | undefined): string => {
    if (!value) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "$0.00";
    if (num === 0) return "$0.00";
    if (num < 0.01) {
      return `$${num.toFixed(6)}`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: num > 1000000 ? "compact" : "standard",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatPrice = (value: string | number | undefined): string => {
    if (!value) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "$0.00";
    if (num === 0) return "$0.00";
    if (num < 0.000001) {
      return `$${num.toExponential(2)}`;
    }
    if (num < 1) {
      return `$${num.toFixed(6)}`;
    }
    return `$${num.toFixed(2)}`;
  };

  const formatUSD = (value: number | string | undefined): string => {
    if (!value) return "$0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "$0";
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  const formatAPR = (value?: string | number): string => {
    const aprNumber = Number(value || 0);
    if (!aprNumber) return "—";
    return `${aprNumber.toFixed(2)}%`;
  };

  const normalizeSymbol = (
    symbol: string,
    tokenId?: string | number
  ): string => {
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

  // Find token in Redux store for Swap component - must be called before conditional returns
  const tokenInStore = useMemo(() => {
    return getTokenInfo(id || "0");
  }, [id, tokens]);

  // Find swapTo token from query parameter
  const swapToTokenId = searchParams.get("swapTo");
  const swapToToken = useMemo(() => {
    if (!swapToTokenId) return undefined;
    return getTokenInfo(swapToTokenId);
  }, [swapToTokenId, tokens]);

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      </Container>
    );
  }

  if (!tokenData) {
    return (
      <Container>
        <div>Token not found</div>
      </Container>
    );
  }

  const tokenName = tokenData.token?.name || tokenData.name || "Unknown";
  const tokenSymbolValue =
    tokenData.token?.unitName ||
    tokenData.symbol ||
    tokenData.unitName ||
    "N/A";
  const price = tokenData.price?.usd || "0";
  const priceChangePercent =
    tokenData.priceChange?.["24h"]?.percent ||
    tokenData.price?.change24h ||
    "0";
  const priceChangeAbsolute = tokenData.priceChange?.["24h"]?.absolute || "0";
  const isPositive = parseFloat(priceChangePercent) >= 0;
  const tvl = tokenData.liquidity?.totalUSD || tokenData.tvl?.usd || "0";
  const marketCap = tokenData.marketCap?.usd || "0";
  const fdv = tokenData.fdv?.usd || marketCap;
  const volume24h = tokenData.volume?.["24h"]?.usdVolume || "0";
  const poolsCount = tokenData.liquidity?.pools || 0;

  // Calculate pagination for pools
  const poolsTotalPages = Math.ceil(poolsData.length / poolsPerPage);
  const poolsStartIndex = (poolsPage - 1) * poolsPerPage;
  const poolsEndIndex = poolsStartIndex + poolsPerPage;
  const paginatedPoolsData = poolsData.slice(poolsStartIndex, poolsEndIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (poolsTotalPages <= maxVisible) {
      for (let i = 1; i <= poolsTotalPages; i++) {
        pages.push(i);
      }
    } else {
      if (poolsPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(poolsTotalPages);
      } else if (poolsPage >= poolsTotalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = poolsTotalPages - 3; i <= poolsTotalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = poolsPage - 1; i <= poolsPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(poolsTotalPages);
      }
    }
    return pages;
  };

  return (
    <Container>
      <BreadcrumbContainer>
        <BreadcrumbLink to="/explore/tokens" isDarkTheme={isDarkTheme}>
          Explore
        </BreadcrumbLink>
        <BreadcrumbSeparator isDarkTheme={isDarkTheme}>/</BreadcrumbSeparator>
        <BreadcrumbLink to="/explore/tokens" isDarkTheme={isDarkTheme}>
          Tokens
        </BreadcrumbLink>
        <BreadcrumbSeparator isDarkTheme={isDarkTheme}>/</BreadcrumbSeparator>
        <BreadcrumbCurrent isDarkTheme={isDarkTheme}>
          {tokenSymbolValue}
        </BreadcrumbCurrent>
      </BreadcrumbContainer>

      <TokenHeader>
        <TokenIcon
          src={getTokenIconUrl(id || "0")}
          alt={tokenSymbolValue}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://asset-verification.nautilus.sh/icons/0.png";
          }}
        />
        <TokenInfo>
          <TokenName isDarkTheme={isDarkTheme}>
            {tokenName} {tokenSymbolValue}
          </TokenName>
          <PriceContainer>
            <Price isDarkTheme={isDarkTheme}>{formatPrice(price)}</Price>
            <PriceChange isPositive={isPositive} isDarkTheme={isDarkTheme}>
              {isPositive ? "▲" : "▼"} {formatPrice(priceChangeAbsolute)} (
              {isPositive ? "+" : ""}
              {parseFloat(priceChangePercent).toFixed(2)}%)
            </PriceChange>
          </PriceContainer>
        </TokenInfo>
      </TokenHeader>

      <MainLayout>
        <LeftColumn>
          <ChartSection isDarkTheme={isDarkTheme}>
            <ChartHeader>
              <TimeRangeButtons>
                {(["1H", "1D", "1W", "1M", "1Y"] as const).map((range) => (
                  <TimeRangeButton
                    key={range}
                    active={timeRange === range}
                    isDarkTheme={isDarkTheme}
                    onClick={() => setTimeRange(range)}
                  >
                    {range}
                  </TimeRangeButton>
                ))}
              </TimeRangeButtons>
            </ChartHeader>
            <ChartContainer>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDarkTheme ? "#374151" : "#E5E7EB"}
                    />
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={["auto", "auto"]}
                      tickFormatter={(timestamp) => {
                        const date = new Date(timestamp);
                        return date.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                      }}
                      stroke={isDarkTheme ? "#9CA3AF" : "#6B7280"}
                    />
                    <YAxis
                      stroke={isDarkTheme ? "#9CA3AF" : "#6B7280"}
                      tickFormatter={(value) => formatPrice(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkTheme ? "#1F2937" : "white",
                        border: `1px solid ${
                          isDarkTheme ? "#374151" : "#E5E7EB"
                        }`,
                        borderRadius: "8px",
                      }}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleString()
                      }
                      formatter={(value: number) => [
                        formatPrice(value),
                        "Price",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#6366f1"
                      dot={false}
                      strokeWidth={2}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: isDarkTheme ? "#9CA3AF" : "#6B7280",
                  }}
                >
                  No chart data available
                </div>
              )}
            </ChartContainer>
          </ChartSection>

          <div>
            <StatsHeading isDarkTheme={isDarkTheme}>Stats</StatsHeading>
            <StatsSection>
              <StatsCard isDarkTheme={isDarkTheme}>
                <StatsTitle isDarkTheme={isDarkTheme}>TVL</StatsTitle>
                <StatsValue isDarkTheme={isDarkTheme}>
                  {formatCurrency(tvl)}
                </StatsValue>
              </StatsCard>
              <StatsCard isDarkTheme={isDarkTheme}>
                <StatsTitle isDarkTheme={isDarkTheme}>1 day volume</StatsTitle>
                <StatsValue isDarkTheme={isDarkTheme}>
                  {formatCurrency(volume24h)}
                </StatsValue>
              </StatsCard>
              <StatsCard isDarkTheme={isDarkTheme}>
                <StatsTitle isDarkTheme={isDarkTheme}>Pools</StatsTitle>
                <StatsValue isDarkTheme={isDarkTheme}>{poolsCount}</StatsValue>
              </StatsCard>
            </StatsSection>
          </div>

          <TransactionsSection isDarkTheme={isDarkTheme}>
            <TabsContainer>
              <Tab
                active={activeTab === "transactions"}
                isDarkTheme={isDarkTheme}
                onClick={() => setActiveTab("transactions")}
              >
                Transactions
              </Tab>
              <Tab
                active={activeTab === "pools"}
                isDarkTheme={isDarkTheme}
                onClick={() => setActiveTab("pools")}
              >
                Pools
              </Tab>
            </TabsContainer>
            {activeTab === "transactions" ? (
              <Table isDarkTheme={isDarkTheme}>
                <thead>
                  <tr>
                    <TableHeader isDarkTheme={isDarkTheme}>Time</TableHeader>
                    <TableHeader isDarkTheme={isDarkTheme}>Type</TableHeader>
                    <TableHeader isDarkTheme={isDarkTheme}>
                      ${tokenSymbolValue}
                    </TableHeader>
                    <TableHeader isDarkTheme={isDarkTheme}>For</TableHeader>
                    <TableHeader isDarkTheme={isDarkTheme}>USD</TableHeader>
                    <TableHeader isDarkTheme={isDarkTheme}>Wallet</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <TableCell
                      isDarkTheme={isDarkTheme}
                      colSpan={6}
                      style={{ textAlign: "center", padding: "2rem" }}
                    >
                      No transactions available
                    </TableCell>
                  </tr>
                </tbody>
              </Table>
            ) : activeTab === "pools" ? (
              <Table isDarkTheme={isDarkTheme}>
                <thead>
                  <tr>
                    <TableHeader isDarkTheme={isDarkTheme}>Pool</TableHeader>
                    <TableHeader isDarkTheme={isDarkTheme}>TVL</TableHeader>
                    <TableHeader isDarkTheme={isDarkTheme}>
                      Volume 24h
                    </TableHeader>
                    <TableHeader isDarkTheme={isDarkTheme}>APR</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {poolsLoading ? (
                    <tr>
                      <TableCell
                        isDarkTheme={isDarkTheme}
                        colSpan={4}
                        style={{ textAlign: "center", padding: "2rem" }}
                      >
                        <CircularProgress size={24} />
                      </TableCell>
                    </tr>
                  ) : poolsData.length > 0 ? (
                    paginatedPoolsData.map((pool: any) => {
                      const poolId = pool.poolId || pool.pool?.poolId || "";
                      const tokens = pool.tokens || {};
                      const tokenA = tokens.tokenA || {};
                      const tokenB = tokens.tokenB || {};
                      const poolInfo = pool.pool || pool.poolInfo || {};
                      const tokAId = poolInfo.tokA || tokenA.assetId || "";
                      const tokBId = poolInfo.tokB || tokenB.assetId || "";
                      const symbolA = normalizeSymbol(
                        tokenA.unitName || tokenA.symbol || "",
                        tokAId
                      );
                      const symbolB = normalizeSymbol(
                        tokenB.unitName || tokenB.symbol || "",
                        tokBId
                      );
                      const tvl = pool.tvl?.usd || pool.tvl || "0";
                      const volume =
                        pool.volume?.["24h"]?.usdVolume ||
                        pool.volume?.["24h"] ||
                        "0";
                      const apr = pool.fees?.apr || pool.apr || "0";

                      // Get icon URLs for both tokens
                      const iconAId =
                        tokAId === "0" || tokAId === TOKEN_WVOI1.toString()
                          ? 0
                          : getIconId(Number(tokAId));
                      const iconBId =
                        tokBId === "0" || tokBId === TOKEN_WVOI1.toString()
                          ? 0
                          : getIconId(Number(tokBId));
                      const iconAUrl = `https://asset-verification.nautilus.sh/icons/${iconAId}.png`;
                      const iconBUrl = `https://asset-verification.nautilus.sh/icons/${iconBId}.png`;

                      return (
                        <tr
                          key={poolId}
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/pool/${poolId}`)}
                        >
                          <TableCell isDarkTheme={isDarkTheme}>
                            <PoolNameCell>
                              <PoolIconsWrapper>
                                <PoolIconFirst
                                  isDarkTheme={isDarkTheme}
                                  src={iconAUrl}
                                  alt={symbolA}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "https://asset-verification.nautilus.sh/icons/0.png";
                                  }}
                                />
                                <PoolIconSecond
                                  isDarkTheme={isDarkTheme}
                                  src={iconBUrl}
                                  alt={symbolB}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "https://asset-verification.nautilus.sh/icons/0.png";
                                  }}
                                />
                              </PoolIconsWrapper>
                              <span>
                                {symbolA}/{symbolB}
                              </span>
                            </PoolNameCell>
                          </TableCell>
                          <TableCell isDarkTheme={isDarkTheme}>
                            {formatUSD(tvl)}
                          </TableCell>
                          <TableCell isDarkTheme={isDarkTheme}>
                            {formatUSD(volume)}
                          </TableCell>
                          <TableCell isDarkTheme={isDarkTheme}>
                            {formatAPR(apr)}
                          </TableCell>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <TableCell
                        isDarkTheme={isDarkTheme}
                        colSpan={4}
                        style={{ textAlign: "center", padding: "2rem" }}
                      >
                        No pools available
                      </TableCell>
                    </tr>
                  )}
                </tbody>
              </Table>
            ) : null}
            {activeTab === "pools" && poolsData.length > 0 && poolsTotalPages > 1 && (
              <PaginationContainer isDarkTheme={isDarkTheme}>
                <PaginationButton
                  isDarkTheme={isDarkTheme}
                  onClick={() => setPoolsPage(poolsPage - 1)}
                  disabled={poolsPage === 1}
                >
                  Previous
                </PaginationButton>
                {getPageNumbers().map((pageItem: number | string, index: number) => (
                  <PaginationButton
                    key={index}
                    isDarkTheme={isDarkTheme}
                    active={pageItem === poolsPage}
                    onClick={() => {
                      if (typeof pageItem === "number") {
                        setPoolsPage(pageItem);
                      }
                    }}
                    disabled={pageItem === "..."}
                  >
                    {pageItem}
                  </PaginationButton>
                ))}
                <PaginationButton
                  isDarkTheme={isDarkTheme}
                  onClick={() => setPoolsPage(poolsPage + 1)}
                  disabled={poolsPage === poolsTotalPages}
                >
                  Next
                </PaginationButton>
              </PaginationContainer>
            )}
          </TransactionsSection>
        </LeftColumn>

        <RightColumn>
          <SwapPanel isDarkTheme={isDarkTheme}>
            <EmbeddedSwapWidget 
              defaultToken={tokenInStore || undefined}
              defaultToken2={swapToToken || undefined}
            />
          </SwapPanel>

          <InfoSection isDarkTheme={isDarkTheme}>
            <InfoTitle isDarkTheme={isDarkTheme}>Info</InfoTitle>
            <InfoLinks>
              <InfoLink
                href={`https://voiager.xyz/token/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                isDarkTheme={isDarkTheme}
              >
                <span>🔗</span> Voiager
              </InfoLink>
              <InfoLink
                href={`https://explorer.voi.network/asset/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                isDarkTheme={isDarkTheme}
              >
                <span>🔗</span> Explorer
              </InfoLink>
            </InfoLinks>
            <InfoDescription isDarkTheme={isDarkTheme}>
              {tokenName} ({tokenSymbolValue}) is a token on the Voi network.
              {tokenData.token?.name &&
                ` ${tokenData.token.name} provides various utilities within the ecosystem.`}
            </InfoDescription>
          </InfoSection>

          {activeAccount && (
            <>
              {!showIBuyVOIWidget ? (
                <IBuyVOIButton
                  isDarkTheme={isDarkTheme}
                  onClick={() => setShowIBuyVOIWidget(true)}
                >
                  <span>💳</span>
                  Buy VOI
                </IBuyVOIButton>
              ) : (
                <IBuyVOIIframe
                  src={`https://ibuyvoi.com/widget?destination=${activeAccount.address}&theme=${isDarkTheme ? "dark" : "light"}`}
                  title="VOI Purchase Widget"
                  allow="payment"
                />
              )}
            </>
          )}
        </RightColumn>
      </MainLayout>
    </Container>
  );
};

export default TokenDetail;
