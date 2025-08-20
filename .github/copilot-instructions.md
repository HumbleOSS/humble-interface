# HumbleSwap Front End Interface

HumbleSwap is a React/TypeScript-based Decentralized Exchange (DEX) front end interface for the Voi Network built with Vite, Material-UI, Redux Toolkit, and Algorand SDK integration.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Build
Run these commands in sequence to set up the development environment:

```bash
npm install --legacy-peer-deps
npm install --save-dev @types/node --legacy-peer-deps
npm run build
```

**CRITICAL**: If you encounter TypeScript errors about `isDarkTheme` property missing from `DefaultTheme`, create this file:

`src/types/styled.d.ts`:
```typescript
import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    isDarkTheme: boolean;
  }
}
```

**CRITICAL BUILD TIMING**: 
- **NEVER CANCEL**: Build takes 37+ seconds total. NEVER CANCEL. Set timeout to 90+ minutes.
- Prebuild script: ~2 seconds (updates version file)
- TypeScript compilation + Vite build: ~35 seconds
- **Total time**: 37 seconds average, up to 60 seconds possible

### Development Server
```bash
npm run dev
```
- Starts Vite dev server on http://localhost:5173/
- Uses `--host` flag to expose on network (http://10.x.x.x:5173/)
- Hot reload enabled
- **Start time**: ~2 seconds

### Preview Production Build
```bash
npm run preview
```
- Serves built application on http://localhost:4173/
- Use after `npm run build` to test production build locally

### Tests
**NO TESTS CONFIGURED**: The `npm test` command only echoes an error message and exits with code 1. Do not attempt to run tests.

## Dependency Management

### Required Flags
**ALWAYS use `--legacy-peer-deps`** when installing packages due to Algorand SDK version conflicts:
```bash
npm install --legacy-peer-deps
```

### Known Dependency Issues
- `@blockshake/defly-connect` requires `algosdk@^3.0.0` but project uses `algosdk@^2.7.0`
- Additional packages may need to be installed manually (buffer, @mui/system, @blockshake/defly-connect, @perawallet/connect)
- `@types/node` is required for TypeScript compilation but not in package.json

### Vulnerability Warnings
- 14+ npm audit vulnerabilities exist (moderate/high/critical)
- These are acceptable for development; focus on functionality over security warnings

## Application Architecture

### Key Technologies
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5.4.9 
- **State Management**: Redux Toolkit
- **UI Framework**: Material-UI v6
- **Styling**: Styled Components + Material-UI
- **Blockchain**: Algorand SDK v2.7.0 + ulujs for smart contracts
- **Wallet Integration**: @txnlab/use-wallet-react (Pera, Defly, Lute wallets)

### Main Pages & Routes
- `/` - Home/Swap interface (default)
- `/swap` - Token swap functionality  
- `/pool` - Liquidity pool management
- `/pool/add` - Add liquidity
- `/pool/remove` - Remove liquidity
- `/pool/create` - Create new pool
- `/token` - Token management
- `/analytics` - DEX analytics and charts
- `/analytics/token/:id` - Individual token analytics
- `/analytics/pair/:id` - Trading pair analytics

### Project Structure
```
src/
├── components/        # Reusable UI components (Swap, Pool, NFT, etc.)
├── pages/            # Route components
├── store/            # Redux slices (tokens, pools, collections, etc.)
├── wallets.ts        # Wallet connection configuration
├── constants/        # Contract addresses, DEX settings
├── hooks/            # React hooks (useTokenRefresh, etc.)
├── utils/            # Helper functions
└── types/            # TypeScript type definitions
```

## Validation Scenarios

### ALWAYS Test These Scenarios After Making Changes:

1. **Build Validation**:
   ```bash
   rm -rf dist && npm run build
   ```
   - Must complete in <60 seconds
   - Should produce dist/ folder with optimized bundles
   - Watch for large chunk warnings (>500kb) - this is expected

2. **Application Startup**:
   ```bash
   npm run dev
   ```
   - Navigate to http://localhost:5173/
   - **VERIFY**: Swap interface loads with token selectors
   - **VERIFY**: Navigation works (Swap, Pool, Analytics)
   - **VERIFY**: No critical console errors (API fetch errors are expected)

3. **Core Interface Testing**:
   - **Swap Page**: Token selectors show "ID: 0", input fields accept numbers
   - **Pool Page**: Shows "Popular Pools" header with search functionality  
   - **Analytics Page**: Shows "Loading..." (API calls will fail in sandbox)
   - **Navigation**: All main nav links (Swap, Pool, Analytics) work

4. **Network Request Handling**:
   - **Expected Behavior**: API calls to mainnet-idx.nautilus.xyz will fail with ERR_BLOCKED_BY_CLIENT
   - **Expected Behavior**: Console shows "AxiosError" and "Failed to fetch" - this is normal
   - **Application Should**: Still render UI components and remain functional

## Common Development Tasks

### Version Updates
The `prebuild` script automatically updates version from package.json:
```bash
node scripts/update-version.js
```
- Reads version from package.json
- Updates src/constants/version.ts
- Format: "1.10017" (major.concatenated-numbers)

### Adding New Components
- Create in `src/components/ComponentName/index.tsx`
- Export from `src/components/index.ts` if needed
- Use Material-UI components and styled-components for styling
- Follow existing patterns for wallet integration

### State Management
- Redux slices in `src/store/` for global state
- Use `@reduxjs/toolkit` patterns (createAsyncThunk, createSlice)
- Common slices: tokens, pools, collections, sales, theme, dex prices

### Wallet Integration
- Configuration in `src/wallets.ts`
- Supports Voi testnet by default (network: "voi-testnet")
- Current providers mostly commented out due to dependency conflicts
- Uses @txnlab/use-wallet-react for wallet management

## Troubleshooting

### Build Failures
1. **"Cannot find name 'Buffer'"**: Install `@types/node`
2. **"Cannot find module 'path'"**: Install `@types/node`  
3. **ERESOLVE dependency conflicts**: Use `--legacy-peer-deps`
4. **"Property 'isDarkTheme' does not exist on type 'DefaultTheme'"**: Create `src/types/styled.d.ts` with styled-components theme declaration
5. **Process memory**: Build uses ~500MB+ RAM, ensure adequate resources

### Runtime Issues
1. **External API failures**: Expected in sandbox environment
2. **Wallet connection errors**: Normal without browser wallet extensions
3. **Large bundle warnings**: Expected due to comprehensive DEX functionality
4. **React warnings**: Styling and prop warnings exist, focus on functionality

### Development Server Issues
1. **Port conflicts**: Vite uses 5173, preview uses 4173
2. **Hot reload**: Works correctly with TypeScript and styled-components
3. **Network access**: `--host` flag enables external access

## File Locations Reference

### Frequently Modified Files
- `src/components/Swap/index.tsx` - Main swap interface
- `src/store/*.ts` - Redux state management
- `src/wallets.ts` - Wallet configuration
- `src/constants/` - Contract addresses and configuration
- `package.json` - Dependencies and scripts

### Build Configuration
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript configuration  
- `scripts/update-version.js` - Version management

### Static Assets
- `public/` - Static files (fonts, images, manifests)
- `src/static/` - In-app static resources
- `index.html` - HTML template

## Performance Notes
- **Bundle size**: 2.1MB+ main bundle (expected for full DEX)
- **Chunk warnings**: Expected due to comprehensive functionality
- **Build optimization**: Production builds are optimized and compressed
- **Development performance**: Hot reload typically <1 second

## Network Configuration
- **Default network**: Voi testnet
- **Node server**: https://mainnet-api.voi.nodly.dev
- **Indexer**: https://mainnet-idx.nautilus.xyz (will fail in sandbox)
- **API endpoints**: https://api.humble.sh (will fail in sandbox)