import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import { CircularProgress } from "@mui/material";
import { selectTokens } from "../../store/tokenSlice";
import { tokenSymbol, getIconId } from "../../utils/dex";
import { API_BASE_URL } from "../../constants/api";

interface TickerData {
  ticker_id: string;
  base_currency: string;
  target_currency: string;
  last_price: string;
  base_volume: string;
  target_volume: string;
  pool_id: string;
  liquidity_in_usd?: string;
  high?: string;
  low?: string;
  update_datetime?: string;
  // Debug fields (when debug=true)
  poolId?: string;
  tokenA?: any;
  tokenB?: any;
  voiUsdPrice?: any;
  poolRatio?: any;
  calculations?: any;
  method?: string;
  usdcAmount?: string;
  liquidity?: string;
}

interface TickersResponse {
  tickers: TickerData[];
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
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

const TokenInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const TokenSymbol = styled.span<{ isDarkTheme: boolean }>`
  font-weight: 500;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
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

const Tickers: React.FC = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const tokens = useSelector(selectTokens);
  const [tickersData, setTickersData] = useState<TickersResponse | null>(null);
  const [protocolStats, setProtocolStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `${API_BASE_URL}integrations/coingecko/tickers`;
          

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch tickers");
        }
        const data: any = await response.json();
        console.log("API Response:", data);
        
        // Handle different response formats
        let tickersArray: TickerData[] = [];
        
        if (Array.isArray(data)) {
          // If response is directly an array
          tickersArray = data;
        } else if (data && Array.isArray(data.tickers)) {
          // If response has tickers property
          tickersArray = data.tickers;
        } else if (data && data.data && Array.isArray(data.data.tickers)) {
          // If response is nested
          tickersArray = data.data.tickers;
        } else {
          console.error("Invalid API response structure:", data);
          throw new Error("Invalid ticker data format - expected array or object with tickers array");
        }
        
        setTickersData({ tickers: tickersArray });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
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
        const data: any = await response.json();
        console.log("Protocol Stats API Response (full):", JSON.stringify(data, null, 2));
        setProtocolStats(data);
      } catch (err) {
        console.error("Error fetching protocol stats:", err);
        // Don't set error state for protocol stats, just log it
        // This allows tickers to still display even if protocol stats fail
      }
    };

    fetchTickers();
    fetchProtocolStats();
  }, []);

  const getTokenInfo = (currency: string) => {
    // Try to parse as number first
    const tokenIdNum = Number(currency);
    if (!isNaN(tokenIdNum)) {
      const token = tokens.find(
        (t) => t.tokenId === tokenIdNum || t.contractId === tokenIdNum
      );
      return token;
    }
    // If not a number, try to find by symbol
    return tokens.find(
      (t) => t.symbol?.toUpperCase() === currency.toUpperCase()
    );
  };

  const getTokenIconUrl = (currency: string) => {
    // First try to get token info to find the actual token ID
    const token = getTokenInfo(currency);
    
    if (token) {
      // Use contractId if available, otherwise tokenId
      const tokenId = token.contractId ?? token.tokenId ?? 0;
      const iconId = getIconId(tokenId);
      return `https://asset-verification.nautilus.sh/icons/${iconId}.png`;
    }
    
    // If token not found, try to parse currency as a number
    const tokenIdNum = Number(currency);
    if (!isNaN(tokenIdNum)) {
      const iconId = getIconId(tokenIdNum);
      return `https://asset-verification.nautilus.sh/icons/${iconId}.png`;
    }
    
    // Fallback to default VOI icon
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

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
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
        <Title isDarkTheme={isDarkTheme}>Tickers</Title>
        <ErrorMessage isDarkTheme={isDarkTheme}>Error: {error}</ErrorMessage>
      </Container>
    );
  }

  if (!tickersData || !tickersData.tickers || !Array.isArray(tickersData.tickers)) {
    return (
      <Container>
        <Title isDarkTheme={isDarkTheme}>Tickers</Title>
        <EmptyMessage isDarkTheme={isDarkTheme}>
          No ticker data available
        </EmptyMessage>
      </Container>
    );
  }

  const validTickers = tickersData.tickers.filter(
    (t) => t.last_price && t.last_price !== "0"
  );

  // Use protocol stats for total liquidity and total volume
  // API response structure: { tvl: { total: "..." }, volume: { "24h": { total: "..." } } }
  const getTotalLiquidity = (): number => {
    if (!protocolStats) return 0;
    
    // Try nested structure first (tvl.total), then fallback to other formats
    const value = protocolStats.tvl?.total ||
                  protocolStats.totalLiquidity || 
                  protocolStats.total_liquidity || 
                  protocolStats.liquidity ||
                  protocolStats.tvl?.usd ||
                  protocolStats.total_tvl;
    
    if (value) {
      const parsed = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  };

  const getTotalVolume = (): number => {
    if (!protocolStats) return 0;
    
    // Try nested structure first (volume["24h"].total), then fallback to other formats
    const value = protocolStats.volume?.["24h"]?.total ||
                  protocolStats.volume?.["24h"]?.usdVolume ||
                  protocolStats.totalVolume || 
                  protocolStats.total_volume || 
                  protocolStats.volume ||
                  protocolStats.volume24h;
    
    if (value) {
      const parsed = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  };

  const totalLiquidity = getTotalLiquidity();
  const totalVolume = getTotalVolume();

  return (
    <Container>
      <PanelSurface isDarkTheme={isDarkTheme}>
        <PanelHeaderRow>
          <Title isDarkTheme={isDarkTheme}>Tickers</Title>
        </PanelHeaderRow>

        <StatsGrid>
          <StatsCard
            title="Total Tickers"
            value={validTickers.length.toString()}
            isDarkTheme={isDarkTheme}
          />
          <StatsCard
            title="Total Liquidity"
            value={formatCurrency(totalLiquidity)}
            isDarkTheme={isDarkTheme}
          />
          <StatsCard
            title="Total Volume"
            value={formatNumber(totalVolume)}
            isDarkTheme={isDarkTheme}
          />
        </StatsGrid>
      </PanelSurface>

      <PanelSurface isDarkTheme={isDarkTheme}>
        <TableWrapper>
          <Table isDarkTheme={isDarkTheme}>
          <TableHead isDarkTheme={isDarkTheme}>
            <tr>
              <TableHeader isDarkTheme={isDarkTheme}>Pair</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Last Price</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>24h High</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>24h Low</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Base Volume</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Target Volume</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Liquidity (USD)</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Pool ID</TableHeader>
            </tr>
          </TableHead>
          <TableBody isDarkTheme={isDarkTheme}>
            {validTickers.map((ticker) => {
              const baseToken = getTokenInfo(ticker.base_currency);
              const targetToken = getTokenInfo(ticker.target_currency);
              const baseSymbol = baseToken
                ? tokenSymbol(baseToken)
                : ticker.base_currency;
              const targetSymbol = targetToken
                ? tokenSymbol(targetToken)
                : ticker.target_currency;

              return (
                <tr key={ticker.ticker_id}>
                  <TableCell isDarkTheme={isDarkTheme} data-label="Pair">
                    <PairCell>
                      <TokenIcon
                        src={getTokenIconUrl(ticker.base_currency)}
                        alt={baseSymbol}
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://asset-verification.nautilus.sh/icons/0.png";
                        }}
                      />
                      <span style={{ fontWeight: 500 }}>{baseSymbol}</span>
                      <span>/</span>
                      <TokenIcon
                        src={getTokenIconUrl(ticker.target_currency)}
                        alt={targetSymbol}
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://asset-verification.nautilus.sh/icons/0.png";
                        }}
                      />
                      <span style={{ fontWeight: 500 }}>{targetSymbol}</span>
                    </PairCell>
                  </TableCell>
                  <TableCell isDarkTheme={isDarkTheme} data-label="Last Price">
                    <PriceCell isDarkTheme={isDarkTheme}>
                      {formatNumber(ticker.last_price)}
                    </PriceCell>
                  </TableCell>
                  <TableCell isDarkTheme={isDarkTheme} data-label="24h High">
                    <PriceCell isDarkTheme={isDarkTheme}>
                      {ticker.high ? formatNumber(ticker.high) : "N/A"}
                    </PriceCell>
                  </TableCell>
                  <TableCell isDarkTheme={isDarkTheme} data-label="24h Low">
                    <PriceCell isDarkTheme={isDarkTheme}>
                      {ticker.low ? formatNumber(ticker.low) : "N/A"}
                    </PriceCell>
                  </TableCell>
                  <TableCell isDarkTheme={isDarkTheme} data-label="Base Volume">
                    {formatNumber(ticker.base_volume)}
                  </TableCell>
                  <TableCell isDarkTheme={isDarkTheme} data-label="Target Volume">
                    {formatNumber(ticker.target_volume)}
                  </TableCell>
                  <TableCell isDarkTheme={isDarkTheme} data-label="Liquidity (USD)">
                    {ticker.liquidity_in_usd
                      ? formatCurrency(ticker.liquidity_in_usd)
                      : "N/A"}
                  </TableCell>
                  <TableCell isDarkTheme={isDarkTheme} data-label="Pool ID">
                    {ticker.pool_id}
                  </TableCell>
                </tr>
              );
            })}
          </TableBody>
        </Table>
      </TableWrapper>
      </PanelSurface>
    </Container>
  );
};

export default Tickers;

