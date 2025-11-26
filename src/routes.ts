import * as Page from "./pages";
export const routes = [
  {
    path: "/",
    Component: Page.Home,
  },
  {
    path: "/swap",
    Component: Page.Swap,
  },
  {
    path: "/zap",
    Component: Page.Zap,
  },
  {
    path: "/pool",
    Component: Page.Pool,
  },
  {
    path: "/pool/add",
    Component: Page.PoolAdd,
  },
  {
    path: "/pool/remove",
    Component: Page.PoolRemove,
  },
  {
    path: "/pool/create",
    Component: Page.PoolCreate,
  },
  /*
  {
    path: "/farm",
    Component: Page.Farm,
  },
  {
    path: "/farm/create",
    Component: Page.FarmCreate,
  },
  */
  {
    path: "/explore/tokens",
    Component: Page.Tokens,
  },
  {
    path: "/explore/tokens/:id",
    Component: Page.TokenDetail,
  },
  {
    path: "/analytics",
    Component: Page.Analytics,
  },
  {
    path: "/analytics/token/:id",
    Component: Page.AnalyticsToken,
  },
  {
    path: "/analytics/pair/:id",
    Component: Page.AnalyticsPair,
  },
  {
    path: "/rewards",
    Component: Page.Rewards,
  },
  {
    path: "/prices",
    Component: Page.Prices,
  },
  {
    path: "/tickers",
    Component: Page.Tickers,
  },
  {
    path: "/explore/pools",
    Component: Page.PoolStats,
  },
  {
    path: "/tokens/stats",
    Component: Page.Tokens,
  },
  {
    path: "/arbitrage/triangular",
    Component: Page.ArbitrageTriangular,
  },
  {
    path: "/router",
    Component: Page.Router,
  },
];
