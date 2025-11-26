# How to Manually Add a New Token Option

This guide explains different methods to manually add a new token option to the application.

## Token Structure

A token must follow the `ARC200TokenI` interface:

```typescript
interface ARC200TokenI {
  tokenId: number;           // Required: Unique token ID (0 for VOI network token)
  contractId?: number;        // Optional: Contract ID
  name: string;              // Required: Token name (e.g., "Voi")
  symbol: string;            // Required: Token symbol (e.g., "VOI")
  decimals: number;          // Required: Number of decimals (usually 6)
  totalSupply: BigInt | string; // Required: Total supply
  mintRound?: number;        // Optional: Mint round
  price?: number;           // Optional: Current price
  ticker?: TickerI;         // Optional: Ticker information
}
```

## Method 1: Add to Component Token Options (Quickest)

This method adds a token directly to the token options in a specific component. Useful for testing or when you need a token in one specific place.

### Example: Adding to Swap Component

Edit `src/components/Swap/index.tsx` around line 973:

```typescript
const tokenOptions = [
  {
    tokenId: 0,
    name: "Voi",
    symbol: "VOI",
    decimals: 6,
    totalSupply: BigInt(10_000_000_000 * 1e6),
  },
  // Add your custom token here
  {
    tokenId: YOUR_TOKEN_ID,        // e.g., 123456
    name: "Your Token Name",
    symbol: "YOUR",
    decimals: 6,
    totalSupply: BigInt(1000000 * 1e6), // Adjust based on your token
  },
  ...tokens.filter((t: ARC200TokenI) => poolTokens.includes(t.tokenId)),
].filter(
  (t: ARC200TokenI) => t.tokenId !== token2?.tokenId && t.symbol !== "wVOI"
);
```

### Example: Adding to PoolCreate Component

Edit `src/components/PoolCreate/index.tsx` around line 375:

```typescript
useEffect(() => {
  if (!tokens) return;
  const voiToken = {
    tokenId: 0,
    name: "Voi",
    symbol: "VOI",
    decimals: 6,
    totalSupply: "10000000000000000",
  };
  // Add your custom token
  const customToken = {
    tokenId: YOUR_TOKEN_ID,
    name: "Your Token Name",
    symbol: "YOUR",
    decimals: 6,
    totalSupply: "10000000000000000",
  };
  setTokenOptions([voiToken, customToken, ...tokens]);
}, [tokens]);
```

## Method 2: Add to Constants File

This method adds a token to the constants file, making it available throughout the application.

### Step 1: Add Token Constant

Edit `src/constants/tokens.ts`:

```typescript
export const TOKEN_YOUR_TOKEN = 123456; // Replace with your token ID

export const NETWORK_TOKEN = {
  VOI: {
    tokenId: 0,
    name: "Voi",
    symbol: "VOI",
    decimals: 6,
    totalSupply: BigInt(10_000_000_000 * 1e6),
  },
  // Add your custom token
  YOUR_TOKEN: {
    tokenId: TOKEN_YOUR_TOKEN,
    name: "Your Token Name",
    symbol: "YOUR",
    decimals: 6,
    totalSupply: BigInt(1000000 * 1e6),
  },
};
```

### Step 2: Use in Components

Then reference it in your components:

```typescript
import { NETWORK_TOKEN } from "../constants/tokens";

// In your component
const tokenOptions = [
  NETWORK_TOKEN.VOI,
  NETWORK_TOKEN.YOUR_TOKEN,
  ...tokens,
];
```

## Method 3: Fetch Token from Blockchain

This method uses the existing `getToken` function to fetch token data from the blockchain and store it in the database.

### Using getToken Function

```typescript
import { getToken } from "../store/tokenSlice";

// In your component
useEffect(() => {
  const fetchCustomToken = async () => {
    const customToken = await getToken(YOUR_TOKEN_ID);
    if (customToken) {
      // Add to token options
      setTokenOptions(prev => [...(prev || []), customToken]);
    }
  };
  fetchCustomToken();
}, []);
```

### Example: Adding to Token Options After Fetch

```typescript
useEffect(() => {
  const addCustomToken = async () => {
    const customToken = await getToken(123456);
    if (customToken && tokens) {
      // Check if token already exists
      const exists = tokens.find(t => t.tokenId === customToken.tokenId);
      if (!exists) {
        setTokenOptions([...tokens, customToken]);
      } else {
        setTokenOptions(tokens);
      }
    }
  };
  addCustomToken();
}, [tokens]);
```

## Method 4: Add to Token Store (Global)

This method adds a token to the Redux store, making it available globally.

### Option A: Modify getTokens in tokenSlice.ts

Edit `src/store/tokenSlice.ts` around line 105:

```typescript
const filteredTokens: ARC200TokenI[] = appTokens.filter(
  (t: any) => !["ARC200LT", "LPT", "TEST"].includes(t.symbol)
);

// Manually add your custom token
const customToken: ARC200TokenI = {
  tokenId: YOUR_TOKEN_ID,
  name: "Your Token Name",
  symbol: "YOUR",
  decimals: 6,
  totalSupply: BigInt(1000000 * 1e6),
};

// Ensure VOI is present
const hasVoi = filteredTokens.some((t) => t.tokenId === 0);
if (!hasVoi) {
  filteredTokens.unshift({ ...NETWORK_TOKEN.VOI });
}

// Add your custom token if it doesn't exist
const hasCustomToken = filteredTokens.some((t) => t.tokenId === YOUR_TOKEN_ID);
if (!hasCustomToken) {
  filteredTokens.push(customToken);
}

return filteredTokens;
```

### Option B: Use Redux Action to Add Token

You can also dispatch an action to add a token:

```typescript
import { useDispatch } from "react-redux";
import { updateToken } from "../store/tokenSlice";

// In your component
const dispatch = useDispatch();

const addCustomToken = () => {
  const customToken = {
    tokenId: YOUR_TOKEN_ID,
    name: "Your Token Name",
    symbol: "YOUR",
    decimals: 6,
    totalSupply: BigInt(1000000 * 1e6),
  };
  
  // This updates an existing token, so you'd need to add it to the tokens array first
  // Or use a different approach to add a new token
};
```

## Method 5: Add to Database Directly

If you want to persist the token in the local database:

```typescript
import db from "../db";

const addTokenToDatabase = async () => {
  const customToken = {
    tokenId: YOUR_TOKEN_ID,
    name: "Your Token Name",
    symbol: "YOUR",
    decimals: 6,
    totalSupply: BigInt(1000000 * 1e6),
  };
  
  await db.table("tokens").put(customToken);
};
```

## Complete Example: Adding a Token to Swap Component

Here's a complete example of adding a custom token to the Swap component:

```typescript
// In src/components/Swap/index.tsx

// EFFECT: set token options
useEffect(() => {
  if (!tokens || !pools || pools.length === 0) return;
  const newTokens = new Set<number>();
  for (const pool of pools) {
    newTokens.add(pool.tokA);
    newTokens.add(pool.tokB);
  }
  const poolTokens = Array.from(newTokens);
  
  // Define your custom token
  const customToken: ARC200TokenI = {
    tokenId: 123456, // Replace with your token ID
    name: "My Custom Token",
    symbol: "MCT",
    decimals: 6,
    totalSupply: BigInt(1000000 * 1e6),
  };
  
  const tokenOptions = [
    {
      tokenId: 0,
      name: "Voi",
      symbol: "VOI",
      decimals: 6,
      totalSupply: BigInt(10_000_000_000 * 1e6),
    },
    customToken, // Add your custom token
    ...tokens.filter((t: ARC200TokenI) => poolTokens.includes(t.tokenId)),
  ].filter(
    (t: ARC200TokenI) => t.tokenId !== token2?.tokenId && t.symbol !== "wVOI"
  );
  tokenOptions.sort((a, b) => a.tokenId - b.tokenId);
  setTokenOptions(tokenOptions);
}, [token2, tokens, pools]);
```

## Important Notes

1. **Token ID**: Make sure the `tokenId` is unique and matches the actual token contract ID on the blockchain.

2. **Decimals**: Most tokens use 6 decimals, but verify this for your specific token.

3. **Total Supply**: Use the actual total supply of your token. You can use `BigInt` or a string representation.

4. **Filtering**: Be aware that some components filter out certain tokens (like "wVOI"). Make sure your token isn't accidentally filtered out.

5. **Pools**: In Swap and PoolAdd components, token options are often filtered based on available pools. If your token isn't in any pool, it might not appear in the options.

6. **Persistence**: Method 1 (component-level) is temporary and only affects that component. Methods 2-5 provide more persistent solutions.

## Which Method Should I Use?

- **Method 1**: Quick testing, component-specific tokens
- **Method 2**: Tokens that should be available app-wide and are known at build time
- **Method 3**: Tokens that exist on-chain and you want to fetch dynamically
- **Method 4**: Tokens that should be part of the global token list
- **Method 5**: Tokens that should persist in local storage/database

Choose the method that best fits your use case!

