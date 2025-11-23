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
export const ARC200_ASSET_ID_MAPPING: Record<number, number> = {
  // Add known mappings here
  // Example: [ARC200ContractId]: ASAAssetId
  // 123456: 789012, // If ARC200 contract 123456 has ASA asset ID 789012
  // aUSDC	395614	302190
  395614: 302190, // aUSDC
  // wVOI	390001	0
  390001: 0, // VOI
  // CORN	412682	40266686 (arc200-exchange)
  412682: 40266686, // CORN
  // aAlgo	413153	302189
  413153: 302189, // aAlgo
  // UNIT	420069	40266690
  420069: 40266690, // UNIT (arc200-exchange)
  // CCV	664258	0
  664258: 0, // CCV
  // FV	770561	0
  770561: 0, // FV
  // AMMO	798968	40266675
  798968: 40266675, // AMMO (arc200-exchange)
  // EV	828295	0
  828295: 0, // EV
  // VOTE	859312	797372
  859312: 797372, // VOTE
  // Finite	859317	797369
  859317: 797369, // Finite
  // WV	888305	0
  888305: 0, // WV
  // NFV	913147	0
  913147: 0, // NFV
  // ARV	917261	0
  917261: 0, // ARV
  // NV	8324600	0
  8324600: 0, // NV
  // LV	8372092	0
  8372092: 0, // LV
  // bVOI	8471125	0
  8471125: 0, // bVOI
  // gVOI	39949746	0
  39949746: 0, // gVOI
  // COFFEE	40077073	0
  40077073: 0, // COFFEE
  // POW	40153155	40152679
  40153155: 40152679, // POW
  // aETH	40153248	302193
  40153248: 302193, // aETH
  // aETH	40153308	302193
  40153308: 302193, // aETH
  // aBTC	40153368	40152643
  40153368: 40152643, // aBTC
  // acbBTC	40153415	40152648
  40153415: 40152648, // acbBTC
  // VBV	40227315	0
  40227315: 0, // VBV
  // NEO	40263820	0
  40263820: 0, // NEO
  // NEO	40263883	0
  40263883: 0, // NEO
  // TURTLE	40279288	40266665
  40279288: 40266665, // TURTLE
  // TURTLE	40279307	40266665
  40279307: 40266665, // TURTLE
  // PANDA	40279312	40266654
  40279312: 40266654, // PANDA
  // MFER	40279426	40266653
  40279426: 40266653, // MFER
  // Jimmy	40279433	40266651
  40279433: 40266651, // Jimmy
  // GPEPE	40279438	40266643
  40279438: 40266643, // GPEPE
  // GEMS	40279442	40266638
  40279442: 40266638, // GEMS
  // COOP	40279455	40266636
  40279455: 40266636, // COOP
  // BLAPU	40279462	40266627
  40279462: 40266627, // BLAPU
  // SACK	40279466	40266605
  40279466: 40266605, // SACK
  // BALLSACK	40279471	40266605
  40279471: 40266605, // BALLSACK
  // DORK	41877720	0
  41877720: 0, // DORK
  // eVOI	46023346	0
  46023346: 0, // eVOI
  // WAD 47138068 47155831
  47138068: 47138068,
};

export const ARC200_ASSET_TYPE_MAPPING: Record<number, string> = {
  // Add known mappings here
  // Example: [ARC200ContractId]: ASAAssetId
  // 123456: 789012, // If ARC200 contract 123456 has ASA asset ID 789012
  // aUSDC	395614	302190
  395614: "asa",
  // wVOI	390001	0
  390001: "network",
  // CORN	412682	40266686 (arc200-exchange)
  412682: "arc200", // override to arc200
  // aAlgo	413153	302189
  413153: "asa",
  // UNIT	420069	40266690 (arc200-exchange)
  420069: "arc200", // override to arc200
  // CCV	664258	0
  664258: "network",
  // FV	770561	0
  770561: "network",
  // AMMO	798968	40266675 (arc200-exchange)
  798968: "arc200", // override to arc200
  // EV	828295	0
  828295: "network",
  // VOTE	859312	797372
  859312: "asa",
  // Finite	859317	797369
  859317: "asa",
  // WV	888305	0
  888305: "network",
  // NFV	913147	0
  913147: "network",
  // ARV	917261	0
  917261: "network",
  // NV	8324600	0
  8324600: "network",
  // LV	8372092	0
  8372092: "network",
  // bVOI	8471125	0
  8471125: "network",
  // gVOI	39949746	0
  39949746: "network",
  // COFFEE	40077073	0
  40077073: "network",
  // POW	40153155	40152679
  40153155: "asa",
  // aETH	40153248	302193
  40153248: "asa",
  // aETH	40153308	302193
  40153308: "asa",
  // aBTC	40153368	40152643
  40153368: "asa",
  // acbBTC	40153415	40152648
  40153415: "asa",
  // VBV	40227315	0
  40227315: "network",
  // NEO	40263820	0
  40263820: "network",
  // NEO	40263883	0
  40263883: "network",
  // TURTLE	40279288	40266665
  40279288: "asa",
  // TURTLE	40279307	40266665
  40279307: "asa",
  // PANDA	40279312	40266654
  40279312: "asa",
  // MFER	40279426	40266653
  40279426: "asa",
  // Jimmy	40279433	40266651
  40279433: "asa",
  // GPEPE	40279438	40266643
  40279438: "asa",
  // GEMS	40279442	40266638
  40279442: "asa",
  // COOP	40279455	40266636
  40279455: "asa",
  // BLAPU	40279462	40266627
  40279462: "asa",
  // SACK	40279466	40266605
  40279466: "asa",
  // BALLSACK	40279471	40266605
  40279471: "asa",
  // DORK	41877720	0
  41877720: "network",
  // eVOI	46023346	0
  46023346: "network",
  // WAD 47138068 47155831
  47138068: "arc200",
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
      ARC200_ASSET_ID_MAPPING[contractId] = asaId;
    }
  });
};

/**
 * Get the ASA asset ID for a given ARC200 contract ID
 * @param contractId - The ARC200 contract ID
 * @returns The corresponding ASA asset ID, or undefined if not found
 */
export const getAsaIdFromArc200Contract = (
  contractId: number
): number | undefined => {
  return ARC200_ASSET_ID_MAPPING[contractId];
};

/**
 * Check if an ARC200 contract has a corresponding ASA asset
 * @param contractId - The ARC200 contract ID
 * @returns true if the contract has an ASA mapping, false otherwise
 */
export const hasAsaMapping = (contractId: number): boolean => {
  return contractId in ARC200_ASSET_ID_MAPPING;
};

export const displayId = (contractId: number): number => {
  return hasAsaMapping(contractId)
    ? getAsaIdFromArc200Contract(contractId) || contractId
    : contractId;
};

/**
 * Get the asset type for a given ARC200 contract ID
 * @param contractId - The ARC200 contract ID
 * @returns The asset type ("asa", "network", "arc200-exchange", or "arc200" as default)
 */
export const getAssetType = (contractId: number): string => {
  // Check if there's a specific mapping for this contract
  if (contractId in ARC200_ASSET_TYPE_MAPPING) {
    return ARC200_ASSET_TYPE_MAPPING[contractId];
  }
  // Default to "arc200" for tokens without a specific type mapping
  return "arc200";
};
