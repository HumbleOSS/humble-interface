import { TOKEN_VOI, TOKEN_WVOI1 } from "../constants/tokens";
import { ARC200TokenI } from "../types";
import { prepareString } from "./string";

export const tokenSymbol = (
  token: ARC200TokenI | undefined,
  excludeWrapped = false
) => {
  if (!token) return "";
  
  // Handle VOI (tokenId 0) and wVOI (390001) - both should display as "VOI"
  const tokenId = token.tokenId ?? 0;
  const contractId = token.contractId ?? tokenId;
  
  // Check for VOI: tokenId is 0, or contractId is 390001, or tokenId is 390001
  if (tokenId === 0 || contractId === TOKEN_WVOI1 || tokenId === TOKEN_WVOI1) {
    return "VOI";
  }
  
  const symbol = token.symbol || "";
  if (symbol.match(/^wVOI/i)) {
    if (excludeWrapped) {
      return "VOI";
    }
    return "VOI"; // Always display as VOI, not wVOI
  } else {
    return prepareString(symbol);
  }
};

export const tokenId = (token: ARC200TokenI | undefined) => {
  const id = token?.tokenId || 0;
  switch (id) {
    case TOKEN_VOI:
      return TOKEN_WVOI1;
    default:
      return id;
  }
};

/**
 * Get the icon ID for a token. Maps 390001 (wVOI) to 0 (VOI) for icon display.
 * @param tokenIdOrContractId - The token ID or contract ID
 * @returns The icon ID to use (0 for VOI/wVOI, otherwise the original ID)
 */
export const getIconId = (tokenIdOrContractId: number | string | undefined): number => {
  if (!tokenIdOrContractId) return 0;
  const id = typeof tokenIdOrContractId === 'string' ? Number(tokenIdOrContractId) : tokenIdOrContractId;
  // Map 390001 (wVOI) to 0 (VOI) for icon display
  return id === TOKEN_WVOI1 ? 0 : id;
};
