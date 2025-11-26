import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import { CircularProgress } from "@mui/material";
import { selectTokens } from "../../store/tokenSlice";
import { tokenSymbol, getIconId } from "../../utils/dex";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../constants/api";

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
  // Fallback fields for direct access
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
  lastUpdated?: number;
  [key: string]: any; // Allow additional fields
}

interface TokensStatsResponse {
  tokens?: TokenStatData[];
  stats?: TokenStatData[];
  count?: number;
  [key: string]: any; // Allow flexible response structure
}

interface ProtocolStats {
  pools?: {
    total?: number;
    active?: number;
  };
  tokens?: {
    total?: number;
    unique?: number;
  };
  tvl?: {
    total?: string;
    usd?: string;
  };
  volume?: {
    "24h"?: {
      total?: string;
      usdVolume?: string;
    };
  };
  fees?: {
    "24h"?: {
      total?: string;
    };
  };
  lastUpdated?: number;
  // Fallback fields for different API formats
  totalLiquidity?: string;
  total_liquidity?: string;
  totalVolume?: string;
  total_volume?: string;
  liquidity?: string;
  [key: string]: any;
}

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PanelSurface = styled.div<{ isDarkTheme: boolean }>`
  border-radius: 24px;
  padding: clamp(20px, 2vw, 28px);
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) =>
    props.isDarkTheme ? "#050507" : "#ffffff"};
  color: ${(props) =>
    props.isDarkTheme ? "#fff" : "#0c0c10"};
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
    props.isDarkTheme ? "rgba(255, 255, 255, 0.04)" : "rgba(41, 88, 255, 0.05)"};
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
    background-color: ${(props) =>
      props.isDarkTheme ? "#4B5563" : "#E5E7EB"};
  }
`;

const TableBody = styled.tbody<{ isDarkTheme: boolean }>`
  background-color: transparent;
  & > tr {
    border-bottom: 1px solid
      ${(props) =>
        props.isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(12, 12, 16, 0.08)"};
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
  width: 32px;
  height: 32px;
  border-radius: 50%;
`;

const TokenInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TokenName = styled.div<{ isDarkTheme: boolean }>`
  font-weight: 600;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  font-size: 0.875rem;
`;

const TokenSymbol = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const PriceCell = styled.div<{ isDarkTheme: boolean }>`
  font-family: monospace;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const ChangeCell = styled.div<{ isDarkTheme: boolean; isPositive: boolean }>`
  color: ${(props) =>
    props.isPositive
      ? props.isDarkTheme
        ? "#10B981"
        : "#059669"
      : props.isDarkTheme
      ? "#EF4444"
      : "#DC2626"};
  font-weight: 500;
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
    props.active
      ? "#FFFFFF"
      : props.isDarkTheme
      ? "#9CA3AF"
      : "#4B5563"};
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

const Tokens: React.FC = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const tokens = useSelector(selectTokens);
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState<TokensStatsResponse | null>(null);
  const [protocolStats, setProtocolStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("marketCap");
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const fetchTokenStats = async () => {
      try {
        setIsTransitioning(true);
        setLoading(true);
        setError(null);
        const baseUrl = `${API_BASE_URL}tokens/stats`;
        const url = `${baseUrl}?sortBy=${sortBy}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch token stats");
        }
        const data: TokensStatsResponse = await response.json();
        console.log("Token Stats API Response:", data);
        
        // Small delay for smooth transition
        await new Promise(resolve => setTimeout(resolve, 100));
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

    const fetchProtocolStats = async () => {
      try {
        const url = `${API_BASE_URL}protocol/stats`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch protocol stats");
        }
        const data: ProtocolStats = await response.json();
        console.log("Protocol Stats API Response:", data);
        setProtocolStats(data);
      } catch (err) {
        console.error("Error fetching protocol stats:", err);
        // Don't set error state for protocol stats, just log it
        // This allows token stats to still display even if protocol stats fail
      }
    };

    fetchTokenStats();
    fetchProtocolStats();
  }, [sortBy]);

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
    if (num === 0) return "$0.00";
    if (num < 0.01) {
      return `$${num.toFixed(6)}`;
    }
    return new Intl.NumberFormat("en", {
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

  const formatChange = (value: string | number | undefined): string => {
    if (!value) return "0.00%";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0.00%";
    const sign = num >= 0 ? "+" : "";
    return `${sign}${num.toFixed(2)}%`;
  };

  // Extract tokens array from response (handle different response formats)
  const tokensList = React.useMemo((): TokenStatData[] => {
    if (!statsData) return [];
    
    // Handle different response structures
    if (Array.isArray(statsData)) {
      return statsData as TokenStatData[];
    }
    if (Array.isArray(statsData.tokens)) {
      return statsData.tokens as TokenStatData[];
    }
    if (Array.isArray(statsData.stats)) {
      return statsData.stats as TokenStatData[];
    }
    if (statsData.data && Array.isArray(statsData.data.tokens)) {
      return statsData.data.tokens as TokenStatData[];
    }
    if (statsData.data && Array.isArray(statsData.data.stats)) {
      return statsData.data.stats as TokenStatData[];
    }
    
    return [];
  }, [statsData]);

  // Calculate aggregate stats
  const aggregateStats = React.useMemo(() => {
    if (!tokensList.length) return null;

    const totalMarketCap = tokensList.reduce((sum: number, token: TokenStatData) => {
      const marketCap = token.marketCap?.usd || token.marketCap || "0";
      return sum + parseFloat(String(marketCap));
    }, 0);

    const totalVolume24h = tokensList.reduce((sum: number, token: TokenStatData) => {
      const volume = token.volume?.["24h"]?.usdVolume || token.volume?.["24h"] || "0";
      return sum + parseFloat(String(volume));
    }, 0);

    const totalTVL = tokensList.reduce((sum: number, token: TokenStatData) => {
      // Use liquidity.totalUSD (primary) or fallback to tvl.usd
      const tvl = token.liquidity?.totalUSD || token.tvl?.usd || token.tvl || "0";
      return sum + parseFloat(String(tvl));
    }, 0);

    return {
      totalMarketCap,
      totalVolume24h,
      totalTVL,
      tokenCount: tokensList.length,
    };
  }, [tokensList]);

  // Sort tokens
  const sortedTokens = React.useMemo(() => {
    const sorted = [...tokensList];
    
    sorted.sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      switch (sortBy) {
        case "marketCap":
          aValue = parseFloat(String(a.marketCap?.usd || a.marketCap || "0"));
          bValue = parseFloat(String(b.marketCap?.usd || b.marketCap || "0"));
          break;
        case "volume":
          aValue = parseFloat(String(a.volume?.["24h"]?.usdVolume || a.volume?.["24h"] || "0"));
          bValue = parseFloat(String(b.volume?.["24h"]?.usdVolume || b.volume?.["24h"] || "0"));
          break;
        case "tvl":
          // Use liquidity.totalUSD (primary) or fallback to tvl.usd
          aValue = parseFloat(String(a.liquidity?.totalUSD || a.tvl?.usd || a.tvl || "0"));
          bValue = parseFloat(String(b.liquidity?.totalUSD || b.tvl?.usd || b.tvl || "0"));
          break;
        case "price":
          aValue = parseFloat(String(a.price?.usd || a.price || "0"));
          bValue = parseFloat(String(b.price?.usd || b.price || "0"));
          break;
        case "change":
          // Use new priceChange.24h.percent structure, with fallbacks
          aValue = parseFloat(String(
            a.priceChange?.["24h"]?.percent || 
            a.price?.change24h || 
            a.change24h || 
            "0"
          ));
          bValue = parseFloat(String(
            b.priceChange?.["24h"]?.percent || 
            b.price?.change24h || 
            b.change24h || 
            "0"
          ));
          break;
        default:
          aValue = parseFloat(String(a.marketCap?.usd || a.marketCap || "0"));
          bValue = parseFloat(String(b.marketCap?.usd || b.marketCap || "0"));
      }

      return bValue - aValue;
    });

    return sorted;
  }, [tokensList, sortBy]);

  const handleTokenClick = (assetId: string) => {
    navigate(`/explore/tokens/${assetId}`);
  };

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
        <ErrorMessage isDarkTheme={isDarkTheme}>{error}</ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <PanelSurface isDarkTheme={isDarkTheme}>
        <PanelHeaderRow>
          <Title isDarkTheme={isDarkTheme}>Token Statistics</Title>
        </PanelHeaderRow>

        {aggregateStats && (
          <StatsGrid>
            <StatsCard
              title="Total Tokens"
              value={aggregateStats.tokenCount.toString()}
              isDarkTheme={isDarkTheme}
            />
            {protocolStats && (protocolStats.tvl?.usd || protocolStats.tvl?.total || protocolStats.totalLiquidity || protocolStats.total_liquidity || protocolStats.liquidity) && (
              <StatsCard
                title="Total TVL"
                value={formatCurrency(
                  protocolStats.tvl?.usd || 
                  protocolStats.tvl?.total || 
                  protocolStats.totalLiquidity || 
                  protocolStats.total_liquidity || 
                  protocolStats.liquidity || 
                  "0"
                )}
                isDarkTheme={isDarkTheme}
              />
            )}
            <StatsCard
              title="24h Volume"
              value={formatCurrency(aggregateStats.totalVolume24h)}
              isDarkTheme={isDarkTheme}
            />
          </StatsGrid>
        )}
      </PanelSurface>

      <PanelSurface isDarkTheme={isDarkTheme}>
        <PanelHeaderRow>
          <Title isDarkTheme={isDarkTheme}>Tokens</Title>
          <SortControls>
            <SortButton
              isDarkTheme={isDarkTheme}
              active={sortBy === "volume"}
              onClick={() => setSortBy("volume")}
            >
              Volume
            </SortButton>
            <SortButton
              isDarkTheme={isDarkTheme}
              active={sortBy === "tvl"}
              onClick={() => setSortBy("tvl")}
            >
              TVL
            </SortButton>
            <SortButton
              isDarkTheme={isDarkTheme}
              active={sortBy === "price"}
              onClick={() => setSortBy("price")}
            >
              Price
            </SortButton>
          </SortControls>
        </PanelHeaderRow>

        <TableWrapper isTransitioning={isTransitioning}>
          {sortedTokens.length === 0 ? (
            <EmptyMessage isDarkTheme={isDarkTheme}>
              No token statistics available
            </EmptyMessage>
          ) : (
            <Table isDarkTheme={isDarkTheme}>
              <TableHead isDarkTheme={isDarkTheme}>
                <tr>
                  <TableHeader isDarkTheme={isDarkTheme}>Token</TableHeader>
                  <TableHeader isDarkTheme={isDarkTheme}>Price</TableHeader>
                  <TableHeader isDarkTheme={isDarkTheme}>24h Volume</TableHeader>
                  <TableHeader isDarkTheme={isDarkTheme}>TVL</TableHeader>
                </tr>
              </TableHead>
              <TableBody isDarkTheme={isDarkTheme}>
                {sortedTokens.map((token) => {
                  const assetId = token.assetId || token.tokenId || "0";
                  // Use nested token object if available, otherwise fallback to direct fields
                  let tokenName = token.token?.name || token.name || "Unknown";
                  let tokenSymbol = token.token?.unitName || token.symbol || token.unitName || "N/A";
                  
                  // Override wVOI (390001) to display as Voi/VOI
                  if (assetId === "390001" || assetId === "0" || assetId === 390001 || assetId === 0) {
                    tokenName = "Voi";
                    tokenSymbol = "VOI";
                  }
                  const price: string = typeof token.price === "object" && token.price !== null ? (token.price?.usd || "0") : (typeof token.price === "string" ? token.price : "0");
                  // Use new priceChange.24h.percent structure, with fallbacks
                  const change24h: string = token.priceChange?.["24h"]?.percent || 
                    (typeof token.price === "object" && token.price !== null ? (token.price?.change24h || "0") : (typeof token.change24h === "string" ? token.change24h : "0"));
                  const marketCap: string = typeof token.marketCap === "object" && token.marketCap !== null ? (token.marketCap?.usd || "0") : (typeof token.marketCap === "string" ? token.marketCap : "0");
                  const volume24hObj = token.volume?.["24h"];
                  const volume24h: string = typeof volume24hObj === "object" && volume24hObj !== null ? (volume24hObj?.usdVolume || "0") : (typeof volume24hObj === "string" ? volume24hObj : "0");
                  // Use liquidity.totalUSD (primary) or fallback to tvl.usd
                  const tvl: string = token.liquidity?.totalUSD || (typeof token.tvl === "object" && token.tvl !== null ? (token.tvl?.usd || "0") : (typeof token.tvl === "string" ? token.tvl : "0"));
                  const changeNum = parseFloat(String(change24h));
                  const isPositive = changeNum >= 0;

                  return (
                    <tr
                      key={assetId}
                      onClick={() => handleTokenClick(assetId)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell isDarkTheme={isDarkTheme} data-label="Token">
                        <TokenCell>
                          <TokenIcon
                            src={getTokenIconUrl(assetId)}
                            alt={tokenSymbol}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://asset-verification.nautilus.sh/icons/0.png";
                            }}
                          />
                          <TokenInfo>
                            <TokenName isDarkTheme={isDarkTheme}>
                              {tokenName}
                            </TokenName>
                            <TokenSymbol isDarkTheme={isDarkTheme}>
                              {tokenSymbol}
                            </TokenSymbol>
                          </TokenInfo>
                        </TokenCell>
                      </TableCell>
                      <TableCell isDarkTheme={isDarkTheme} data-label="Price">
                        <PriceCell isDarkTheme={isDarkTheme}>
                          {formatPrice(price)}
                        </PriceCell>
                      </TableCell>
                      <TableCell isDarkTheme={isDarkTheme} data-label="24h Volume">
                        <PriceCell isDarkTheme={isDarkTheme}>
                          {formatCurrency(volume24h)}
                        </PriceCell>
                      </TableCell>
                      <TableCell isDarkTheme={isDarkTheme} data-label="TVL">
                        <PriceCell isDarkTheme={isDarkTheme}>
                          {formatCurrency(tvl)}
                        </PriceCell>
                      </TableCell>
                    </tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TableWrapper>
      </PanelSurface>
    </Container>
  );
};

export default Tokens;

