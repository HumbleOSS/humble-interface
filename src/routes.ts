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
    path: "/token",
    Component: Page.Token,
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
];
