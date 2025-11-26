// Example: How the frontend would use enhanced PoolStats API response
// This shows the simplified SparklineChart component that uses API data directly

import React from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface SparklineChartProps {
  // Instead of poolId, we pass the price history data directly
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
  // OR use the simpler sparkline24h format
  sparkline24h?: {
    prices: string[];
    priceChange24h: string;
  };
  isDarkTheme: boolean;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  priceHistory,
  sparkline24h,
  isDarkTheme,
}) => {
  // Convert API data to chart format
  const chartData = React.useMemo(() => {
    // Option 1: Use full priceHistory if available
    if (priceHistory?.["24h"]?.dataPoints) {
      return priceHistory["24h"].dataPoints.map((point) => ({
        time: point.timestamp * 1000, // Convert to milliseconds
        price: parseFloat(point.price),
      }));
    }
    
    // Option 2: Use simple sparkline24h if available
    if (sparkline24h?.prices) {
      const now = Date.now();
      return sparkline24h.prices.map((price, index) => ({
        time: now - (24 - index) * 60 * 60 * 1000, // Calculate timestamps
        price: parseFloat(price),
      }));
    }
    
    return [];
  }, [priceHistory, sparkline24h]);

  const priceChange = priceHistory?.["24h"]?.priceChange24h 
    || sparkline24h?.priceChange24h 
    || "0";
  const isPositive = parseFloat(priceChange) >= 0;

  if (chartData.length === 0) {
    return (
      <div style={{ width: 100, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "0.75rem", color: isDarkTheme ? "#6B7280" : "#9CA3AF" }}>
          N/A
        </span>
      </div>
    );
  }

  const firstPrice = chartData[0]?.price || 0;
  const lastPrice = chartData[chartData.length - 1]?.price || 0;

  return (
    <div style={{ width: 100, height: 40, cursor: "default" }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="price"
            stroke={isPositive ? "#10B981" : "#EF4444"}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
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
            formatter={(value: any) => [
              `$${Number(value).toFixed(6)}`,
              "Price",
            ]}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Usage in PoolStats table:
// 
// <TableCell isDarkTheme={isDarkTheme} data-label="1d Chart">
//   <SparklineChart 
//     priceHistory={stat.priceHistory}
//     sparkline24h={stat.sparkline24h}
//     isDarkTheme={isDarkTheme} 
//   />
// </TableCell>
//
// No useEffect, no loading state, no API calls needed!
// The data is already in the response from the main API call.

export default SparklineChart;

