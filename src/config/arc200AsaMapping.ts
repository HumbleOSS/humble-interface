/**
 * Mapping of ARC200 contract IDs to their corresponding ASA (Algorand Standard Asset) IDs
 * 
 * This mapping is used to fetch asset balances for tokens that have both
 * an ARC200 contract and an ASA representation.
 * 
 * Format: { [arc200ContractId]: asaAssetId }
 * 
 * This can be populated statically for known tokens, or dynamically from API data.
 */
export const ARC200_ASA_MAPPING: Record<number, number> = {
  // Add known mappings here
  // Example: [ARC200ContractId]: ASAAssetId
  // 123456: 789012, // If ARC200 contract 123456 has ASA asset ID 789012
  395614: 302190 // aUSDC
};

/**
 * Populate the mapping from tokens2 API data
 * @param tokens2 - Array of tokens from the API with contractId and tokenId properties
 * 
 * The mapping is created where:
 * - contractId is the ARC200 contract ID
 * - tokenId is the ASA asset ID
 * 
 * Only tokens where contractId !== tokenId are added to the mapping
 * (tokens where they're the same don't have a separate ASA representation)
 */
export const populateMappingFromTokens = (tokens2: any[]): void => {
  tokens2.forEach((token) => {
    const contractId = Number(token.contractId);
    const asaId = Number(token.tokenId);
    
    // Only add if:
    // 1. Both are valid numbers
    // 2. contractId !== tokenId (they have separate representations)
    // 3. asaId !== 0 (0 is VOI, handled separately)
    // 4. contractId !== 0 (0 is VOI, handled separately)
    if (
      !isNaN(contractId) &&
      !isNaN(asaId) &&
      contractId !== asaId &&
      asaId !== 0 &&
      contractId !== 0
    ) {
      ARC200_ASA_MAPPING[contractId] = asaId;
    }
  });
};

/**
 * Get the ASA asset ID for a given ARC200 contract ID
 * @param contractId - The ARC200 contract ID
 * @returns The corresponding ASA asset ID, or undefined if not found
 */
export const getAsaIdFromArc200Contract = (contractId: number): number | undefined => {
  return ARC200_ASA_MAPPING[contractId];
};

/**
 * Check if an ARC200 contract has a corresponding ASA asset
 * @param contractId - The ARC200 contract ID
 * @returns true if the contract has an ASA mapping, false otherwise
 */
export const hasAsaMapping = (contractId: number): boolean => {
  return contractId in ARC200_ASA_MAPPING;
};

