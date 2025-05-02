import Layout from "@/layouts/Default";
import { RootState } from "@/store/store";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart as RechartsBarChart, Bar } from "recharts";
import styled from "styled-components";
import { formatDistanceToNow } from "date-fns";

const data = [
  { date: "2024-01", value: 4000 },
  { date: "2024-02", value: 3000 },
  { date: "2024-03", value: 2000 },
  { date: "2024-04", value: 2780 },
  { date: "2024-05", value: 1890 },
  { date: "2024-06", value: 2390 },
];

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: string;
  status: string;
}

const sampleData: Transaction[] = [
  {
    id: "1",
    date: "2024-03-20",
    type: "Swap",
    amount: "$1,234.56",
    status: "Completed",
  },
  {
    id: "2",
    date: "2024-03-19",
    type: "Add Liquidity",
    amount: "$2,345.67",
    status: "Completed",
  },
  // Add more sample data as needed
];

interface Trade {
  trade_id: string;
  price: string;
  base_volume: number;
  target_volume: number;
  trade_timestamp: number;
  type: "buy" | "sell";
  pool_id: string;
}

interface TradeWithTicker extends Trade {
  ticker: Ticker;
  value: string;
  voiPrice: string;
}

interface DataGridProps {
  tickers?: Ticker[];
  timeRange: TimeRanges;
  voiPrice: string;
  id: string;
}

const TokenIcon = styled.img`
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  font-size: 0.875rem;
  color: inherit;
  padding: 0.5rem 1rem;
`;

const AssetLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    opacity: 0.8;
  }
`;

const ActionButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
  margin-right: 1rem;

  &:hover {
    opacity: 0.9;
  }
`;

const ViewOnVoiagerButton = styled(ActionButton)<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#374151" : "#F3F4F6")};
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "#374151")};
`;

const ActionButtonsContainer = styled.div`
  margin: 1rem 0 2rem;
`;

export const DataGrid: React.FC<DataGridProps> = ({
  tickers,
  timeRange,
  voiPrice,
  id,
}) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const [trades, setTrades] = useState<TradeWithTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!tickers) return;
    const fetchTrades = async () => {
      try {
        // Calculate start_time based on current time
        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        let start_time = 0;
        if (timeRange === TimeRanges["7d"]) {
          start_time = now - 7 * 24 * 60 * 60;
        } else if (timeRange === TimeRanges["24h"]) {
          start_time = now - 24 * 60 * 60;
        } else if (timeRange === TimeRanges["30d"]) {
          start_time = now - 30 * 24 * 60 * 60;
        }
        const start_time_str = start_time.toString();
        const response = await fetch(
          start_time_str === "0"
            ? `https://mainnet-idx.nautilus.sh/integrations/coingecko/historical_trades`
            : `https://mainnet-idx.nautilus.sh/integrations/coingecko/historical_trades?start_time=${start_time}`
        );
        const data = await response.json();
        const trades = [...data.buy, ...data.sell].map((trade: any) => {
          const ticker = tickers.find(
            (ticker) => `${ticker.pool_id}` === `${trade.contract_id}`
          );
          const value = Math.min(
            trade.target_volume *
              parseFloat(ticker?.target_price ?? "0") *
              parseFloat(voiPrice ?? "0"),
            trade.base_volume *
              parseFloat(ticker?.base_price ?? "0") *
              parseFloat(voiPrice ?? "0")
          );
          return {
            ...trade,
            ticker,
            value: value.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          };
        });
        setTrades(
          trades
            .filter(
              (trade) =>
                trade.ticker &&
                [trade.ticker.base_currency, trade.ticker.target_currency].some(
                  (c) => c.match(id)
                )
            )
            .sort((a, b) => b.trade_timestamp - a.trade_timestamp) // Sort newest first
        );
        setLoading(false);
      } catch (error) {
        console.error("Error fetching trades:", error);
        setLoading(false);
      }
    };

    fetchTrades();
  }, [tickers, timeRange, id]);

  if (loading) {
    return <div>Loading trades...</div>;
  }

  if (trades.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "2rem",
          color: isDarkTheme ? "#9CA3AF" : "#6B7280",
        }}
      >
        No trades found for this time period
      </div>
    );
  }

  const totalPages = Math.ceil(trades.length / itemsPerPage);
  const paginatedTrades = trades.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="overflow-x-auto">
      <Table isDarkTheme={isDarkTheme}>
        <TableHead isDarkTheme={isDarkTheme}>
          <tr>
            <TableHeader isDarkTheme={isDarkTheme}>Transaction</TableHeader>
            {/*<TableHeader isDarkTheme={isDarkTheme}>Type</TableHeader>*/}
            {/*<TableHeader isDarkTheme={isDarkTheme}>Price</TableHeader>*/}
            <TableHeader isDarkTheme={isDarkTheme}>Value</TableHeader>
            <TableHeader isDarkTheme={isDarkTheme}>Amount</TableHeader>
            <TableHeader isDarkTheme={isDarkTheme}>Amount</TableHeader>
            <TableHeader isDarkTheme={isDarkTheme}>{/*Time*/}</TableHeader>
          </tr>
        </TableHead>
        <TableBody isDarkTheme={isDarkTheme}>
          {paginatedTrades.map((trade) => {
            const ticker = trade.ticker;
            if (!ticker) return null;

            return (
              <tr key={trade.trade_id}>
                <TableCell isDarkTheme={isDarkTheme} data-label="Time">
                  <StyledLink
                    to={`https://voiager.xyz/transaction/${trade.trade_id}`}
                    target="_blank"
                  >
                    Swap{" "}
                    {trade.type === "buy"
                      ? trade.ticker.target_currency
                      : trade.ticker.base_currency}{" "}
                    for{" "}
                    {trade.type === "buy"
                      ? trade.ticker.base_currency
                      : trade.ticker.target_currency}
                  </StyledLink>
                </TableCell>

                {/*<TableCell isDarkTheme={isDarkTheme} data-label="Type">
                  <span className="capitalize">{trade.type}</span>
                </TableCell>*/}
                {/*<TableCell isDarkTheme={isDarkTheme} data-label="Price">
                  {Number(trade.price).toFixed(6)}
                </TableCell>*/}
                <TableCell isDarkTheme={isDarkTheme} data-label="Value">
                  {trade.value}
                </TableCell>

                <TableCell isDarkTheme={isDarkTheme} data-label="Amount">
                  <AmountCell>
                    <TokenIcon
                      src={`https://asset-verification.nautilus.sh/icons/${
                        trade.type === "buy"
                          ? trade.ticker.target_currency_id
                          : trade.ticker.base_currency_id
                      }.png`}
                      alt={
                        trade.type === "buy"
                          ? trade.ticker.target_currency
                          : trade.ticker.base_currency
                      }
                    />
                    <span>
                      <span>
                        {Number(
                          (trade.type === "buy"
                            ? trade.target_volume
                            : trade.base_volume
                          ).toFixed(6)
                        ).toString()}
                      </span>
                      <span>
                        {trade.type === "buy"
                          ? trade.ticker.target_currency
                          : trade.ticker.base_currency}
                      </span>
                    </span>
                  </AmountCell>
                </TableCell>
                <TableCell isDarkTheme={isDarkTheme} data-label="Amount">
                  <AmountCell>
                    <TokenIcon
                      src={`https://asset-verification.nautilus.sh/icons/${
                        trade.type === "buy"
                          ? trade.ticker.base_currency_id
                          : trade.ticker.target_currency_id
                      }.png`}
                      alt={
                        trade.type === "buy"
                          ? trade.ticker.base_currency
                          : trade.ticker.target_currency
                      }
                    />
                    <span>
                      <span>
                        {Number(
                          (trade.type === "buy"
                            ? trade.base_volume
                            : trade.target_volume
                          ).toFixed(6)
                        ).toString()}
                      </span>
                      <span>
                        {trade.type === "buy"
                          ? trade.ticker.base_currency
                          : trade.ticker.target_currency}
                      </span>
                    </span>
                  </AmountCell>
                </TableCell>
                <TableCell isDarkTheme={isDarkTheme} data-label="Time">
                  {formatDistanceToNow(new Date(trade.trade_timestamp * 1000), {
                    addSuffix: true,
                    includeSeconds: false,
                  }).replace(/about |less than |almost |over /, "")}
                </TableCell>
              </tr>
            );
          })}
        </TableBody>
      </Table>

      <PaginationWrapper>
        <PaginationButton
          isDarkTheme={isDarkTheme}
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </PaginationButton>
        <PageInfo isDarkTheme={isDarkTheme}>
          Page {currentPage} of {totalPages}
        </PageInfo>
        <PaginationButton
          isDarkTheme={isDarkTheme}
          onClick={() =>
            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
          }
          disabled={currentPage === totalPages}
        >
          Next
        </PaginationButton>
      </PaginationWrapper>
    </div>
  );
};

export const BarChart: React.FC = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#8884d8" />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export const LineChart: React.FC = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

interface StatsCardProps {
  title: string;
  value: string;
  //change: string;
}

const StatsCardWrapper = styled.div<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#1F2937" : "white")};
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
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

const StatsChange = styled.div<{ isPositive: boolean | null }>`
  font-size: 0.875rem;
  color: ${(props) => {
    if (props.isPositive === null) return "inherit";
    return props.isPositive ? "#10B981" : "#EF4444";
  }};
`;

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  //change,
}) => {
  //const isPositive = change.startsWith("+")
  //  ? true
  //  : change.startsWith("-")
  //  ? false
  //  : null;
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  return (
    <StatsCardWrapper isDarkTheme={isDarkTheme}>
      <StatsTitle isDarkTheme={isDarkTheme}>{title}</StatsTitle>
      <StatsValue isDarkTheme={isDarkTheme}>{value}</StatsValue>
      {/*<StatsChange isPositive={isPositive}>{change}</StatsChange>*/}
    </StatsCardWrapper>
  );
};

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Container = styled.div`
  margin: 0 auto;
  padding: 1.5rem;
`;

const BreadcrumbContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const BreadcrumbLink = styled(Link)<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  text-decoration: none;
  font-size: 1.875rem;
  font-weight: bold;

  &:hover {
    color: ${(props) => (props.isDarkTheme ? "#D1D5DB" : "#4B5563")};
  }
`;

const BreadcrumbSeparator = styled.span<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#4B5563" : "#9CA3AF")};
  font-size: 1.875rem;
  font-weight: bold;
`;

const BreadcrumbCurrent = styled.span<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  font-size: 1.875rem;
  font-weight: bold;
`;

const TimeRangeContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const TimeRangeButton = styled.button<{
  isActive: boolean;
  isDarkTheme: boolean;
}>`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background-color: ${(props) =>
    props.isActive ? "#6366f1" : props.isDarkTheme ? "#374151" : "#f3f4f6"};
  color: ${(props) =>
    props.isActive ? "white" : props.isDarkTheme ? "#D1D5DB" : "#374151"};

  &:hover {
    background-color: ${(props) =>
      props.isActive ? "#4f46e5" : props.isDarkTheme ? "#4B5563" : "#e5e7eb"};
  }
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const ChartCard = styled.div<{ isDarkTheme: boolean }>`
  margin-top: 2rem;
  background-color: ${(props) => (props.isDarkTheme ? "#1F2937" : "white")};
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const ChartTitle = styled.h2<{ isDarkTheme: boolean }>`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

interface Pool {
  pool_address: string;
  total_liquidity_in_usd: number;
}

enum TimeRanges {
  "24h" = "24h",
  "7d" = "7d",
  "30d" = "30d",
  "all" = "all",
}

interface Ticker {
  ticker_id: string;
  base_currency: string;
  target_currency: string;
  last_price: string;
  liquidity_in_usd: string;
  high: string;
  low: string;
  target_volume: string;
  base_volume: string;
  target_currency_id: string;
  base_currency_id: string;
  // extra fields for 24h, 7d, 30d, all
  target_volume_24h: string;
  base_volume_24h: string;
  target_volume_7d: string;
  base_volume_7d: string;
  target_volume_30d: string;
  base_volume_30d: string;
  target_volume_all: string;
  base_volume_all: string;
  base_price: string;
  target_price: string;
  pool_id: string;
}

const getTargetVolume = (ticker: Ticker, timeRange: TimeRanges) => {
  return ticker[`target_volume_${timeRange}` as keyof Ticker];
};

const getBaseVolume = (ticker: Ticker, timeRange: TimeRanges) => {
  return ticker[`base_volume_${timeRange}` as keyof Ticker];
};

interface Asset {
  symbol: string;
  price: string;
  volume24h: string;
  liquidity: string;
}

const TableWrapper = styled.div`
  overflow-x: auto;

  @media (max-width: 768px) {
    /* Remove horizontal scroll on mobile */
    overflow-x: visible;
  }
`;

const Table = styled.table<{ isDarkTheme: boolean }>`
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;

  @media (max-width: 768px) {
    /* Stack cells vertically on mobile */
    display: block;

    & thead {
      display: none; /* Hide header on mobile */
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

const TableHeader = styled.th<{ isDarkTheme: boolean; hideOnMobile?: boolean }>`
  padding: 0.75rem 1.5rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};

  @media (max-width: 768px) {
    ${(props) =>
      props.hideOnMobile &&
      `
      display: none;
    `}
  }
`;

const TableBody = styled.tbody<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#1F2937" : "white")};
  & > tr {
    border-bottom: 1px solid
      ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};
  }
`;

const TableCell = styled.td<{ isDarkTheme: boolean; hideOnMobile?: boolean }>`
  padding: 1rem 1.5rem;
  white-space: nowrap;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  font-size: 0.875rem;

  @media (max-width: 768px) {
    ${(props) =>
      props.hideOnMobile &&
      `
      display: none;
    `}
  }
`;

const CurrencyPairCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CurrencyIcon = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

const CurrencyPair = styled.span<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const PriceCell = styled.div<{ isDarkTheme: boolean; isPositive?: boolean }>`
  display: flex;
  flex-direction: column;
  color: ${(props) => {
    if (props.isPositive === undefined)
      return props.isDarkTheme ? "#F3F4F6" : "inherit";
    return props.isPositive ? "#10B981" : "#EF4444";
  }};
`;

const InverseRate = styled.span<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  margin-top: 0.25rem;
`;

const PriceChange = styled.span`
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

const VolumeCell = styled.div`
  cursor: help;
  position: relative;
`;

const VolumeTooltip = styled.div<{ isDarkTheme: boolean }>`
  display: none;
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem;
  background-color: ${(props) => (props.isDarkTheme ? "#374151" : "#F9FAFB")};
  border: 1px solid ${(props) => (props.isDarkTheme ? "#4B5563" : "#E5E7EB")};
  border-radius: 0.375rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  font-size: 0.875rem;
  white-space: nowrap;
  z-index: 10;

  ${VolumeCell}:hover & {
    display: block;
  }
`;

const AmountCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-family: monospace;
  }
`;

const TableRow = styled.tr<{ isDarkTheme: boolean }>`
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => (props.isDarkTheme ? "#374151" : "#F3F4F6")};
  }
`;

export const AssetsTable: React.FC<{
  tickers: Ticker[];
  timeRange: TimeRanges;
  voiPrice: string;
  id: string;
}> = ({ tickers, timeRange, voiPrice, id }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reduce tickers to unique assets with combined volumes and liquidity
  const assets = tickers.reduce((acc: Record<string, any>, ticker) => {
    // Process base currency
    if (!acc[ticker.base_currency]) {
      acc[ticker.base_currency] = {
        symbol: ticker.base_currency,
        currencyId: ticker.base_currency_id,
        volume: 0,
        liquidity: 0,
        price: parseFloat(ticker.base_price) * parseFloat(voiPrice),
      };
    }

    // Process target currency
    if (!acc[ticker.target_currency]) {
      acc[ticker.target_currency] = {
        symbol: ticker.target_currency,
        currencyId: ticker.target_currency_id,
        volume: 0,
        liquidity: 0,
        price: parseFloat(ticker.target_price) * parseFloat(voiPrice),
      };
    }

    // Add volumes
    const baseVolume =
      parseFloat(getBaseVolume(ticker, timeRange)) *
      parseFloat(ticker.base_price) *
      parseFloat(voiPrice);
    const targetVolume =
      parseFloat(getTargetVolume(ticker, timeRange)) *
      parseFloat(ticker.target_price) *
      parseFloat(voiPrice);
    acc[ticker.base_currency].volume += baseVolume;
    acc[ticker.target_currency].volume += targetVolume;

    // Add liquidity
    const liquidity = parseFloat(ticker.liquidity_in_usd);
    acc[ticker.base_currency].liquidity += liquidity / 2;
    acc[ticker.target_currency].liquidity += liquidity / 2;

    return acc;
  }, {});

  const assetsList = Object.values(assets).sort(
    (a: any, b: any) => b.volume - a.volume
  );
  const totalPages = Math.ceil(assetsList.length / itemsPerPage);
  const paginatedAssets = assetsList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <TableWrapper>
        <Table isDarkTheme={isDarkTheme}>
          <TableHead isDarkTheme={isDarkTheme}>
            <tr>
              <TableHeader isDarkTheme={isDarkTheme}>Asset</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Price</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>
                Volume ({timeRange})
              </TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Liquidity</TableHeader>
            </tr>
          </TableHead>
          <TableBody isDarkTheme={isDarkTheme}>
            {paginatedAssets.map((asset: any) => (
              <TableRow
                key={asset.symbol}
                isDarkTheme={isDarkTheme}
                onClick={() => {
                  navigate(`/analytics/token/${asset.symbol}`, {
                    replace: true,
                  });
                }}
              >
                <TableCell isDarkTheme={isDarkTheme} data-label="Asset">
                  <CurrencyPairCell>
                    <CurrencyIcon
                      src={`https://asset-verification.nautilus.sh/icons/${asset.currencyId}.png`}
                      alt={asset.symbol}
                    />
                    <CurrencyPair isDarkTheme={isDarkTheme}>
                      {asset.symbol}
                    </CurrencyPair>
                  </CurrencyPairCell>
                </TableCell>
                <TableCell isDarkTheme={isDarkTheme} data-label="Price">
                  ${asset.price.toFixed(6)}
                </TableCell>
                <TableCell isDarkTheme={isDarkTheme} data-label="Volume">
                  $
                  {asset.volume.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </TableCell>
                <TableCell isDarkTheme={isDarkTheme} data-label="Liquidity">
                  $
                  {asset.liquidity.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>

      <PaginationWrapper>
        <PaginationButton
          isDarkTheme={isDarkTheme}
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </PaginationButton>
        <PageInfo isDarkTheme={isDarkTheme}>
          Page {currentPage} of {totalPages}
        </PageInfo>
        <PaginationButton
          isDarkTheme={isDarkTheme}
          onClick={() =>
            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
          }
          disabled={currentPage === totalPages}
        >
          Next
        </PaginationButton>
      </PaginationWrapper>
    </>
  );
};

export const PairsTable: React.FC<{
  tickers: Ticker[];
  timeRange: TimeRanges;
  voiPrice: string;
}> = ({ tickers, timeRange, voiPrice }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(tickers.length / itemsPerPage);

  const paginatedTickers = tickers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const calculateTotalVolume = (ticker: Ticker) => {
    const targetVolumeInBase =
      parseFloat(getTargetVolume(ticker, timeRange)) /
      parseFloat(ticker.last_price);
    const baseVolume = parseFloat(getBaseVolume(ticker, timeRange));
    // total volume in VOI
    const totalVolumeVoi =
      (targetVolumeInBase + baseVolume) * parseFloat(ticker.base_price);
    const totalVolumeUsd = totalVolumeVoi * parseFloat(voiPrice);

    if (totalVolumeVoi === 0) return { usd: "-", voi: "-" };

    return {
      usd: `$${totalVolumeUsd.toLocaleString()}`,
      voi: `${totalVolumeVoi.toLocaleString()}`,
    };
  };

  const getNormalizedPairUrl = (ticker: Ticker) => {
    // Compare currency IDs to determine order
    if (ticker.base_currency_id.localeCompare(ticker.target_currency_id) <= 0) {
      return `${ticker.base_currency}_${ticker.target_currency}`;
    } else {
      return `${ticker.target_currency}_${ticker.base_currency}`;
    }
  };

  return (
    <>
      <TableWrapper>
        <Table isDarkTheme={isDarkTheme}>
          <TableHead isDarkTheme={isDarkTheme}>
            <tr>
              <TableHeader isDarkTheme={isDarkTheme}>Trading Pair</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme} hideOnMobile>
                Rate
              </TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>
                {`Volume (${timeRange})`}
              </TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Liquidity</TableHeader>
            </tr>
          </TableHead>
          <TableBody isDarkTheme={isDarkTheme}>
            {paginatedTickers.map((ticker) => (
              <TableRow
                key={ticker.ticker_id}
                isDarkTheme={isDarkTheme}
                onClick={() => {
                  navigate(`/analytics/pair/${getNormalizedPairUrl(ticker)}`, {
                    replace: true,
                  });
                }}
              >
                <TableCell isDarkTheme={isDarkTheme} data-label="Trading Pair">
                  <CurrencyPairCell>
                    <CurrencyIcon
                      src={`https://asset-verification.nautilus.sh/icons/${ticker.base_currency_id}.png`}
                      alt={ticker.base_currency}
                    />
                    <CurrencyIcon
                      src={`https://asset-verification.nautilus.sh/icons/${ticker.target_currency_id}.png`}
                      alt={ticker.target_currency}
                    />

                    <CurrencyPair isDarkTheme={isDarkTheme}>
                      {ticker.base_currency}/{ticker.target_currency}
                    </CurrencyPair>
                  </CurrencyPairCell>
                </TableCell>
                <TableCell isDarkTheme={isDarkTheme} data-label="Rate">
                  <PriceCell isDarkTheme={isDarkTheme}>
                    {(1 / parseFloat(ticker.last_price)).toFixed(6)}
                    <InverseRate isDarkTheme={isDarkTheme}>
                      {parseFloat(ticker.last_price).toFixed(6)}
                    </InverseRate>
                  </PriceCell>
                </TableCell>
                <TableCell
                  isDarkTheme={isDarkTheme}
                  data-label={`Volume (${timeRange})`}
                >
                  <VolumeCell>
                    {ticker.target_currency}:{" "}
                    {parseFloat(
                      getTargetVolume(ticker, timeRange)
                    ).toLocaleString()}
                    <br />
                    {ticker.base_currency}:{" "}
                    {parseFloat(
                      getBaseVolume(ticker, timeRange)
                    ).toLocaleString()}
                    <VolumeTooltip isDarkTheme={isDarkTheme}>
                      {calculateTotalVolume(ticker).usd}
                      <br />
                      <InverseRate isDarkTheme={isDarkTheme}>
                        <span style={{ fontSize: "1.4em" }}>&#120167;</span>{" "}
                        {calculateTotalVolume(ticker).voi}
                      </InverseRate>
                    </VolumeTooltip>
                  </VolumeCell>
                </TableCell>
                <TableCell isDarkTheme={isDarkTheme} data-label="Liquidity">
                  ${parseFloat(ticker.liquidity_in_usd).toLocaleString()}
                  <br />
                  <InverseRate isDarkTheme={isDarkTheme}>
                    <span style={{ fontSize: "1.4em" }}>&#120167;</span>{" "}
                    {(
                      parseFloat(ticker.liquidity_in_usd) / parseFloat(voiPrice)
                    ).toLocaleString()}
                  </InverseRate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>

      <PaginationWrapper>
        <PaginationButton
          isDarkTheme={isDarkTheme}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </PaginationButton>
        <PageInfo isDarkTheme={isDarkTheme}>
          Page {currentPage} of {totalPages}
        </PageInfo>
        <PaginationButton
          isDarkTheme={isDarkTheme}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </PaginationButton>
      </PaginationWrapper>
    </>
  );
};

const PaginationWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
`;

const PaginationButton = styled.button<{ isDarkTheme: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  background-color: ${(props) => (props.isDarkTheme ? "#374151" : "#F3F4F6")};
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "#374151")};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    background-color: ${(props) => (props.isDarkTheme ? "#4B5563" : "#E5E7EB")};
  }
`;

const PageInfo = styled.span<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "#374151")};
`;

interface DexPrice {
  poolId: string;
  symbolA: string;
  symbolB: string;
  price: number;
}

interface DexPricesResponse {
  "current-round": number;
  prices: DexPrice[];
}

export const AnalyticsToken: React.FC = () => {
  const { id } = useParams();
  const [timeRange, setTimeRange] = useState<TimeRanges>(TimeRanges["24h"]);
  const [totalLiquidity, setTotalLiquidity] = useState("0");
  const [totalVolume, setTotalVolume] = useState("0");
  const [voiPrice, setVoiPrice] = useState("0");
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [tickersData, setTickersData] = useState<Ticker[]>([]);
  const [dexPricesData, setDexPricesData] = useState<DexPrice[]>([]);
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  // Add new state for currency ID
  const [currencyId, setCurrencyId] = useState<string>("");

  // Add this effect to reset states when id changes
  useEffect(() => {
    setTimeRange(TimeRanges["24h"]);
    setTotalLiquidity("0");
    setTotalVolume("0");
    setVoiPrice("0");
    setTickers([]);
    setTickersData([]);
    setDexPricesData([]);
  }, [id]); // Reset when id changes

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // Fetch both tickers and DEX prices in parallel
        const [tickersResponse, dexPricesResponse] = await Promise.all([
          fetch(
            "https://mainnet-idx.nautilus.sh/integrations/coingecko/tickers"
          ),
          fetch("https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/prices"),
        ]);

        const tickersData: Ticker[] = await tickersResponse.json();
        const dexPricesData: DexPricesResponse = await dexPricesResponse.json();

        setTickersData(tickersData);
        setDexPricesData(dexPricesData.prices);
      } catch (error) {
        console.error("Error fetching market data:", error);
      }
    };

    fetchMarketData();
  }, [timeRange, id]);

  useEffect(() => {
    // Find VOI price from DEX prices (aUSDC/VOI pair)
    const voiUsdcPool = dexPricesData.find(
      (p) => p.symbolA === "aUSDC" && p.symbolB === "VOI"
    );

    let price: number;
    if (voiUsdcPool) {
      price = voiUsdcPool.price;
      setVoiPrice(
        price.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 4,
          maximumFractionDigits: 6,
        })
      );
    }

    // Filter and sort tickers as before
    const filteredTickers = tickersData.filter(
      (ticker) =>
        ticker.liquidity_in_usd !== "0" &&
        [ticker.base_currency, ticker.target_currency].some((c: string) =>
          c.match(id || "")
        )
    );
    console.log(filteredTickers);
    filteredTickers.sort((a, b) => {
      const aVolume =
        parseFloat(getTargetVolume(a, timeRange)) * parseFloat(a.target_price) +
        parseFloat(getBaseVolume(a, timeRange)) * parseFloat(a.base_price);
      const bVolume =
        parseFloat(getTargetVolume(b, timeRange)) * parseFloat(b.target_price) +
        parseFloat(getBaseVolume(b, timeRange)) * parseFloat(b.base_price);
      const aLiquidity = parseFloat(a.liquidity_in_usd);
      const bLiquidity = parseFloat(b.liquidity_in_usd);

      // If one has volume and the other doesn't, prioritize the one with volume
      if ((aVolume > 0 && bVolume === 0) || (aVolume === 0 && bVolume > 0)) {
        return bVolume - aVolume;
      }

      // If both have volume or both don't have volume, sort by liquidity
      return bLiquidity - aLiquidity;
    });
    setTickers(filteredTickers);

    // Calculate total liquidity
    const totalLiq = filteredTickers.reduce(
      (sum, ticker) => sum + (parseFloat(ticker.liquidity_in_usd) || 0),
      0
    );
    setTotalLiquidity(
      totalLiq.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    );

    // Calculate total volume
    const totalVol = filteredTickers.reduce((sum, ticker) => {
      const targetVolumeInVoi =
        parseFloat(getTargetVolume(ticker, timeRange)) *
        parseFloat(ticker.target_price);
      const baseVolumeInVoi =
        parseFloat(getBaseVolume(ticker, timeRange)) *
        parseFloat(ticker.base_price);
      const totalVolumeInUSD = (targetVolumeInVoi + baseVolumeInVoi) * price;
      return sum + totalVolumeInUSD;
    }, 0);
    setTotalVolume(
      totalVol.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    );
  }, [tickersData, dexPricesData, timeRange, id]);

  useEffect(() => {
    // Find currency ID from tickers
    const ticker = tickersData.find(
      (t) => t.base_currency === id || t.target_currency === id
    );
    if (ticker) {
      const newCurrencyId =
        ticker.base_currency === id
          ? ticker.base_currency_id
          : ticker.target_currency_id;
      setCurrencyId(newCurrencyId);
    }
  }, [tickersData, id]);

  if (
    voiPrice === "0" ||
    totalLiquidity === "0" ||
    totalVolume === "0" ||
    !id
  ) {
    return <div>Loading...</div>;
  }

  return (
    <Container>
      <div>
        <BreadcrumbContainer>
          <BreadcrumbLink to="/analytics" isDarkTheme={isDarkTheme}>
            Analytics
          </BreadcrumbLink>
          <BreadcrumbSeparator isDarkTheme={isDarkTheme}>/</BreadcrumbSeparator>
          <BreadcrumbCurrent isDarkTheme={isDarkTheme}>{id}</BreadcrumbCurrent>
        </BreadcrumbContainer>

        {id !== "VOI" && (
          <ActionButtonsContainer>
            <ViewOnVoiagerButton
              href={`https://voiager.xyz/token/${currencyId}`}
              target="_blank"
              rel="noopener noreferrer"
              isDarkTheme={isDarkTheme}
            >
              View on Voiager
            </ViewOnVoiagerButton>
          </ActionButtonsContainer>
        )}

        <TimeRangeContainer>
          {["24h", "7d", "30d", "all"].map((range) => (
            <TimeRangeButton
              key={range}
              isActive={timeRange === range}
              isDarkTheme={isDarkTheme}
              onClick={() => setTimeRange(range as TimeRanges)}
            >
              {range}
            </TimeRangeButton>
          ))}
        </TimeRangeContainer>

        <StatsGrid>
          <StatsCard
            title="Total Liquidity"
            value={totalLiquidity}
            //change="+2.3%"
          />
          <StatsCard
            title={`Volume (${timeRange})`}
            value={totalVolume}
            //change="+5.4%"
          />
          <StatsCard
            title="Voi Price"
            value={voiPrice}
            //change="+3.2%"
          />
        </StatsGrid>

        {/*<ChartGrid>
          <ChartCard isDarkTheme={isDarkTheme}>
            <ChartTitle isDarkTheme={isDarkTheme}>Volume Over Time</ChartTitle>
            <LineChart />
          </ChartCard>
          <ChartCard isDarkTheme={isDarkTheme}>
            <ChartTitle isDarkTheme={isDarkTheme}>
              Daily Transactions
            </ChartTitle>
            <BarChart />
          </ChartCard>
        </ChartGrid>*/}

        <ChartCard isDarkTheme={isDarkTheme}>
          <ChartTitle isDarkTheme={isDarkTheme}>Assets</ChartTitle>
          <AssetsTable
            id={id}
            tickers={tickers}
            timeRange={timeRange}
            voiPrice={voiPrice.slice(1)} // HACK: Remove $ sign
          />
        </ChartCard>

        <ChartCard isDarkTheme={isDarkTheme}>
          <ChartTitle isDarkTheme={isDarkTheme}>Trading Pairs</ChartTitle>
          <PairsTable
            tickers={tickers}
            timeRange={timeRange}
            voiPrice={voiPrice.slice(1)} // HACK: Remove $ sign
          />
        </ChartCard>

        <ChartCard isDarkTheme={isDarkTheme}>
          <ChartTitle isDarkTheme={isDarkTheme}>Recent Transactions</ChartTitle>
          <DataGrid
            id={id}
            tickers={tickers}
            timeRange={timeRange}
            voiPrice={voiPrice.slice(1)} // HACK: Remove $ sign
          />
        </ChartCard>
      </div>
    </Container>
  );
};

export default AnalyticsToken;
