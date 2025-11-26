# PoolStats API Response Enhancements for Frontend Chart Rendering

## Current Issue
The frontend currently makes separate API calls for each pool to fetch 24h historical trade data for sparkline charts. This is inefficient and causes:
- Multiple API requests (one per pool)
- Slower page load times
- Higher server load
- Poor user experience with loading spinners

## Recommended API Response Enhancements

### 1. Pre-aggregated Price Data Points (24h Sparkline)

Add a `priceHistory` field to each pool stat with hourly price data:

```typescript
interface PoolStatData {
  // ... existing fields ...
  
  priceHistory?: {
    "24h": {
      dataPoints: Array<{
        timestamp: number;        // Unix timestamp in seconds
        price: string;            // Average price for this hour
        volume: string;            // Volume in USD for this hour (optional)
      }>;
      priceChange24h: string;     // Percentage change (e.g., "5.23" for +5.23%)
      priceChange24hAbs: string;  // Absolute price change
    };
    // Optional: Add 7d, 30d for future expansion
    "7d"?: {
      dataPoints: Array<{
        timestamp: number;
        price: string;
        volume: string;
      }>;
      priceChange7d: string;
    };
  };
}
```

**Benefits:**
- Single API call instead of N calls (one per pool)
- Pre-aggregated data (no client-side processing needed)
- Consistent data format across all pools
- Can include price change percentage for quick visual indicators

**Example Response:**
```json
{
  "poolId": "12345",
  "priceHistory": {
    "24h": {
      "dataPoints": [
        { "timestamp": 1704067200, "price": "0.001234", "volume": "1234.56" },
        { "timestamp": 1704070800, "price": "0.001256", "volume": "1456.78" },
        // ... 24 data points (one per hour)
      ],
      "priceChange24h": "5.23",
      "priceChange24hAbs": "0.000064"
    }
  }
}
```

### 2. Volume History (Optional)

If you want to show volume charts instead of/in addition to price:

```typescript
volumeHistory?: {
  "24h": {
    dataPoints: Array<{
      timestamp: number;
      volume: string;  // USD volume
      trades: number;  // Number of trades (optional)
    }>;
  };
}
```

### 3. TVL History (Optional)

For TVL trend charts:

```typescript
tvlHistory?: {
  "24h": {
    dataPoints: Array<{
      timestamp: number;
      tvl: string;  // USD TVL
    }>;
    tvlChange24h: string;  // Percentage change
  };
}
```

### 4. Price Metrics (Quick Stats)

Add calculated metrics that are commonly displayed:

```typescript
priceMetrics?: {
  currentPrice: string;           // Current price
  price24hAgo: string;            // Price 24h ago
  priceChange24h: string;         // Percentage change
  high24h: string;                 // 24h high
  low24h: string;                  // 24h low
  priceDirection: "up" | "down" | "neutral";  // For quick color coding
}
```

### 5. Chart Data Format Options

#### Option A: Minimal (Recommended for Sparklines)
```typescript
chartData24h: number[];  // Just price values, frontend handles timestamps
// Frontend assumes hourly intervals starting from 24h ago
```

#### Option B: Full (More Flexible)
```typescript
chartData24h: Array<{
  t: number;  // timestamp
  p: string;  // price
  v?: string; // volume (optional)
}>;
```

#### Option C: Compressed (For Large Datasets)
```typescript
chartData24h: {
  timestamps: number[];  // Shared timestamp array
  prices: string[];      // Price array
  volumes?: string[];    // Volume array (optional)
}
```

### 6. Performance Considerations

**Caching Strategy:**
- Cache price history data (updates hourly)
- Return `lastUpdated` timestamp for cache validation
- Consider ETags or conditional requests

**Data Granularity:**
- For sparklines: 24 hourly data points is sufficient
- For detailed charts: Could provide 5-minute intervals (288 points) but that's heavier
- Consider making detailed data a separate endpoint

**Optional Query Parameters:**
```
GET /pools/stats?includeChartData=true&chartInterval=1h
GET /pools/stats?includeChartData=true&chartInterval=5m  // More detailed
```

### 7. Recommended Implementation (Minimal Viable)

Start with this minimal addition to get immediate benefits:

```typescript
interface PoolStatData {
  // ... existing fields ...
  
  // Simple 24h price history for sparklines
  sparkline24h?: {
    prices: string[];  // 24 price values (one per hour, oldest to newest)
    priceChange24h: string;  // Percentage change
  };
}
```

**Frontend Usage:**
```typescript
// No API call needed - data is already in the response!
const chartData = stat.sparkline24h?.prices.map((price, index) => ({
  time: Date.now() - (24 - index) * 60 * 60 * 1000,
  price: parseFloat(price)
}));
```

### 8. Migration Path

1. **Phase 1:** Add `sparkline24h` field (minimal, easy to implement)
2. **Phase 2:** Add full `priceHistory` with timestamps (more flexible)
3. **Phase 3:** Add volume/TVL history (if needed)
4. **Phase 4:** Add multiple timeframes (7d, 30d)

### 9. Example Complete Enhanced Response

```json
{
  "stats": [
    {
      "poolId": "12345",
      "pool": { ... },
      "poolInfo": { ... },
      "tokens": { ... },
      "tvl": {
        "usd": "1000000.50",
        ...
      },
      "volume": {
        "24h": {
          "usdVolume": "50000.25",
          ...
        }
      },
      "fees": { ... },
      
      // NEW: Chart data
      "sparkline24h": {
        "prices": [
          "0.001200",
          "0.001210",
          "0.001205",
          // ... 24 values total
        ],
        "priceChange24h": "5.23"
      },
      
      // OR more detailed:
      "priceHistory": {
        "24h": {
          "dataPoints": [
            {
              "timestamp": 1704067200,
              "price": "0.001200",
              "volume": "1234.56"
            },
            // ... 24 data points
          ],
          "priceChange24h": "5.23",
          "priceChange24hAbs": "0.000064"
        }
      },
      
      "priceMetrics": {
        "currentPrice": "0.001264",
        "price24hAgo": "0.001200",
        "priceChange24h": "5.23",
        "high24h": "0.001280",
        "low24h": "0.001195",
        "priceDirection": "up"
      }
    }
  ],
  "count": 150
}
```

## Benefits Summary

1. **Performance:** Single API call instead of N+1 calls
2. **User Experience:** Instant chart rendering, no loading spinners
3. **Server Load:** Reduced API requests
4. **Consistency:** All pools use same data source and calculation method
5. **Flexibility:** Can easily add more timeframes or metrics later
6. **Caching:** Easier to cache aggregated data server-side

## Frontend Code Changes Required

With the enhanced API, the frontend would change from:

```typescript
// Current: Makes separate API call per pool
const SparklineChart = ({ poolId }) => {
  useEffect(() => {
    fetch(`/historical_trades?poolId=${poolId}`)...
  }, [poolId]);
}
```

To:

```typescript
// New: Uses data from main API response
const SparklineChart = ({ priceHistory }) => {
  const chartData = priceHistory?.dataPoints || [];
  // Render immediately, no loading state needed
}
```

This eliminates the need for the separate `SparklineChart` component's data fetching logic entirely.

