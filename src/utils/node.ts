const DEFAULT_NODE = "voi";

export const getGenesisHash = (node: string) => {
  switch (node) {
    default:
    case "voi":
    case "voi-testnet":
      return "IXnoWtviVVJW5LGivNFc0Dq14V3kqaXuK2u5OQrdVZo=";
    case "algorand":
    case "algorand-testnet":
      return "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
  }
};

export const getCurrentNode = () => {
  const [node, customNode, customIndexer] = (
    localStorage.getItem("node") || DEFAULT_NODE
  ).split(":");
  return [node, customNode, customIndexer];
};

export const getCurrentNodeEnv = () => {
  const [node, customNode, customIndexer] = getCurrentNode();
  let ALGO_SERVER;
  let ALGO_INDEXER_SERVER;
  switch (node) {
    default:
      ALGO_SERVER = "https://mainnet-api.voi.nodely.dev";
      ALGO_INDEXER_SERVER = "https://mainnet-idx.voi.nodely.dev";
      break;
    case "voi":
    case "voi-testnet":
      ALGO_SERVER = "https://testnet-api.voi.nodly.dev";
      ALGO_INDEXER_SERVER = "https://testnet-idx.voi.nodly.dev";
      break;
    case "algorand-testnet":
      ALGO_SERVER = "https://testnet-api.algonode.cloud";
      ALGO_INDEXER_SERVER = "https://testnet-idx.algonode.cloud";
      break;
    case "algorand":
      ALGO_SERVER = "https://mainnet-api.algonode.cloud";
      ALGO_INDEXER_SERVER = "https://mainnet-idx.algonode.cloud";
      break;
    case "custom":
      ALGO_SERVER = customNode;
      ALGO_INDEXER_SERVER = customIndexer;
      break;
  }
  return {
    ALGO_SERVER,
    ALGO_INDEXER_SERVER,
  };
};
