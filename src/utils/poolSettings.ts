/**
 * Utility functions for managing default pool settings for token pairs
 */

/**
 * Generate a unique key for a token pair (normalized to handle VOI as 0 or 390001)
 */
export const getTokenPairKey = (
  tokenAId: number | undefined,
  tokenAContractId: number | undefined,
  tokenBId: number | undefined,
  tokenBContractId: number | undefined
): string => {
  // Normalize VOI tokens (0 or 390001) to 0
  const normalizeTokenId = (id: number | undefined, contractId: number | undefined): number => {
    if (id === 0 || contractId === 390001 || id === 390001) return 0;
    return id ?? contractId ?? 0;
  };

  const normalizedA = normalizeTokenId(tokenAId, tokenAContractId);
  const normalizedB = normalizeTokenId(tokenBId, tokenBContractId);

  // Always use the smaller ID first for consistency
  return normalizedA < normalizedB
    ? `${normalizedA}-${normalizedB}`
    : `${normalizedB}-${normalizedA}`;
};

/**
 * Get the default pool ID for a token pair
 */
export const getDefaultPool = (
  tokenAId: number | undefined,
  tokenAContractId: number | undefined,
  tokenBId: number | undefined,
  tokenBContractId: number | undefined
): number | null => {
  // Try multiple key variations to handle different ways the pool might have been stored
  const keyVariations = [
    // Primary: normalized key
    getTokenPairKey(tokenAId, tokenAContractId, tokenBId, tokenBContractId),
    // Try with contractId as primary if different
    getTokenPairKey(tokenAContractId, tokenAContractId, tokenBContractId, tokenBContractId),
    // Try with swapped order (in case it was stored with tokens in different order)
    getTokenPairKey(tokenBId, tokenBContractId, tokenAId, tokenAContractId),
    getTokenPairKey(tokenBContractId, tokenBContractId, tokenAContractId, tokenAContractId),
  ];
  
  // Remove duplicates
  const uniqueKeys = [...new Set(keyVariations)];
  
  // Try each key variation
  for (const key of uniqueKeys) {
    const stored = localStorage.getItem(`defaultPool_${key}`);
    if (stored) {
      const result = parseInt(stored, 10);
      console.log("getDefaultPool: Found using key variation:", {
        tokenAId,
        tokenAContractId,
        tokenBId,
        tokenBContractId,
        foundKey: key,
        lookupKey: `defaultPool_${key}`,
        result,
      });
      return result;
    }
  }
  
  // Debug: List all default pool keys in localStorage with their values
  const allDefaultPools: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const storageKey = localStorage.key(i);
    if (storageKey && storageKey.startsWith('defaultPool_')) {
      allDefaultPools[storageKey] = localStorage.getItem(storageKey) || '';
    }
  }
  
  console.log("getDefaultPool: Not found, tried keys:", {
    tokenAId,
    tokenAContractId,
    tokenBId,
    tokenBContractId,
    triedKeys: uniqueKeys,
    allDefaultPoolsInStorage: allDefaultPools,
  });
  return null;
};

/**
 * Set the default pool ID for a token pair
 * Also cleans up any duplicate entries for the same token pair
 */
export const setDefaultPool = (
  tokenAId: number | undefined,
  tokenAContractId: number | undefined,
  tokenBId: number | undefined,
  tokenBContractId: number | undefined,
  poolId: number
): void => {
  const key = getTokenPairKey(tokenAId, tokenAContractId, tokenBId, tokenBContractId);
  const storageKey = `defaultPool_${key}`;
  
  // Check if this is a VOI pair (starts with 0-)
  const isVOIPair = key.startsWith('0-');
  
  // Clean up any duplicate entries for this token pair (stored with different key formats)
  const keyVariations = [
    getTokenPairKey(tokenAId, tokenAContractId, tokenBId, tokenBContractId),
    getTokenPairKey(tokenAContractId, tokenAContractId, tokenBContractId, tokenBContractId),
    getTokenPairKey(tokenBId, tokenBContractId, tokenAId, tokenAContractId),
    getTokenPairKey(tokenBContractId, tokenBContractId, tokenAContractId, tokenAContractId),
  ];
  
  const uniqueKeys = [...new Set(keyVariations)];
  const cleanedKeys: string[] = [];
  
  // Remove all variations except the canonical one
  for (const variantKey of uniqueKeys) {
    if (variantKey !== key) {
      const variantStorageKey = `defaultPool_${variantKey}`;
      if (localStorage.getItem(variantStorageKey)) {
        localStorage.removeItem(variantStorageKey);
        cleanedKeys.push(variantKey);
      }
    }
  }
  
  // If this is a VOI pair (starts with 0-), remove ALL other defaultPool_0-* keys
  if (isVOIPair) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKeyToCheck = localStorage.key(i);
      if (storageKeyToCheck && storageKeyToCheck.startsWith('defaultPool_0-') && storageKeyToCheck !== storageKey) {
        keysToRemove.push(storageKeyToCheck);
      }
    }
    
    for (const keyToRemove of keysToRemove) {
      localStorage.removeItem(keyToRemove);
      cleanedKeys.push(keyToRemove.replace('defaultPool_', ''));
      console.log(`Removed VOI default pool: ${keyToRemove}`);
    }
  }
  
  // Set the canonical key
  localStorage.setItem(storageKey, poolId.toString());
  
  console.log("setDefaultPool:", {
    tokenAId,
    tokenAContractId,
    tokenBId,
    tokenBContractId,
    generatedKey: key,
    storageKey,
    poolId,
    isVOIPair,
    cleanedDuplicateKeys: cleanedKeys,
    stored: localStorage.getItem(storageKey),
  });
};

/**
 * Clear the default pool for a token pair (use auto negotiation)
 */
export const clearDefaultPool = (
  tokenAId: number | undefined,
  tokenAContractId: number | undefined,
  tokenBId: number | undefined,
  tokenBContractId: number | undefined
): void => {
  const key = getTokenPairKey(tokenAId, tokenAContractId, tokenBId, tokenBContractId);
  localStorage.removeItem(`defaultPool_${key}`);
};

/**
 * Find all default pools that include a specific token
 * Returns array of { key, poolId, otherTokenId } where otherTokenId is the paired token
 */
export const findDefaultPoolsForToken = (
  tokenId: number | undefined,
  contractId: number | undefined
): Array<{ key: string; poolId: number; otherTokenId: number }> => {
  const results: Array<{ key: string; poolId: number; otherTokenId: number }> = [];
  
  // Normalize the input token
  const normalizeTokenId = (id: number | undefined, cId: number | undefined): number => {
    if (id === 0 || cId === 390001 || id === 390001) return 0;
    return id ?? cId ?? 0;
  };
  
  const normalizedToken = normalizeTokenId(tokenId, contractId);
  
  // Check all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const storageKey = localStorage.key(i);
    if (storageKey && storageKey.startsWith('defaultPool_')) {
      const key = storageKey.replace('defaultPool_', '');
      const [tokenA, tokenB] = key.split('-').map(Number);
      const poolId = parseInt(localStorage.getItem(storageKey) || '0', 10);
      
      // Check if this key includes our token
      if (tokenA === normalizedToken || tokenB === normalizedToken) {
        const otherTokenId = tokenA === normalizedToken ? tokenB : tokenA;
        results.push({ key, poolId, otherTokenId });
      }
    }
  }
  
  return results;
};

/**
 * Get all default pools stored in localStorage (for debugging/management)
 */
export const getAllDefaultPools = (): Record<string, { poolId: number; key: string }> => {
  const allDefaultPools: Record<string, { poolId: number; key: string }> = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const storageKey = localStorage.key(i);
    if (storageKey && storageKey.startsWith('defaultPool_')) {
      const key = storageKey.replace('defaultPool_', '');
      const poolId = parseInt(localStorage.getItem(storageKey) || '0', 10);
      allDefaultPools[storageKey] = { poolId, key };
    }
  }
  
  return allDefaultPools;
};

/**
 * Clean up duplicate default pool entries
 * Removes entries that represent the same token pair but were stored with different key formats
 */
export const cleanupDuplicateDefaultPools = (): number => {
  console.log("cleanupDuplicateDefaultPools: Starting cleanup...");
  const allPools = getAllDefaultPools();
  console.log("cleanupDuplicateDefaultPools: Found pools:", allPools);
  
  if (Object.keys(allPools).length === 0) {
    console.log("cleanupDuplicateDefaultPools: No pools to clean");
    return 0;
  }
  
  const poolsByNormalizedKey = new Map<string, Array<{ storageKey: string; poolId: number; key: string }>>();
  let cleanedCount = 0;
  
  // Group pools by their normalized token pair
  for (const [storageKey, { poolId, key }] of Object.entries(allPools)) {
    const [tokenA, tokenB] = key.split('-').map(Number);
    // Create a normalized key (always smaller ID first)
    const normalizedKey = tokenA < tokenB ? `${tokenA}-${tokenB}` : `${tokenB}-${tokenA}`;
    
    if (!poolsByNormalizedKey.has(normalizedKey)) {
      poolsByNormalizedKey.set(normalizedKey, []);
    }
    poolsByNormalizedKey.get(normalizedKey)!.push({ storageKey, poolId, key });
  }
  
  console.log("cleanupDuplicateDefaultPools: Grouped by normalized key:", 
    Array.from(poolsByNormalizedKey.entries()).map(([key, entries]) => ({
      normalizedKey: key,
      count: entries.length,
      entries: entries.map(e => ({ storageKey: e.storageKey, poolId: e.poolId, key: e.key }))
    }))
  );
  
  // For each normalized pair, normalize to canonical key format (smaller ID first)
  for (const [normalizedKey, poolEntries] of poolsByNormalizedKey.entries()) {
    const canonicalKey = `defaultPool_${normalizedKey}`;
    
    // Use the first pool ID found (or canonical if it exists)
    const canonicalEntry = poolEntries.find(e => e.storageKey === canonicalKey);
    const poolIdToKeep = canonicalEntry?.poolId || poolEntries[0].poolId;
    
    // Remove all existing entries for this normalized key
    for (const entry of poolEntries) {
      if (localStorage.getItem(entry.storageKey) !== null) {
        localStorage.removeItem(entry.storageKey);
        cleanedCount++;
        console.log(`Removed: ${entry.storageKey}`);
      }
    }
    
    // Set the canonical key with the pool ID
    localStorage.setItem(canonicalKey, poolIdToKeep.toString());
    console.log(`Set canonical key: ${canonicalKey} = ${poolIdToKeep}`);
  }
  
  // Verify cleanup by checking again
  const remainingPools = getAllDefaultPools();
  console.log("cleanupDuplicateDefaultPools: Remaining pools after cleanup:", remainingPools);
  
  // Check for any remaining duplicates
  const remainingByNormalizedKey = new Map<string, string[]>();
  for (const [storageKey, { key }] of Object.entries(remainingPools)) {
    const [tokenA, tokenB] = key.split('-').map(Number);
    const normalizedKey = tokenA < tokenB ? `${tokenA}-${tokenB}` : `${tokenB}-${tokenA}`;
    if (!remainingByNormalizedKey.has(normalizedKey)) {
      remainingByNormalizedKey.set(normalizedKey, []);
    }
    remainingByNormalizedKey.get(normalizedKey)!.push(storageKey);
  }
  
  const stillDuplicates = Array.from(remainingByNormalizedKey.entries())
    .filter(([_, keys]) => keys.length > 1);
  
  if (stillDuplicates.length > 0) {
    console.warn("cleanupDuplicateDefaultPools: Still found duplicates after cleanup:", stillDuplicates);
  }
  
  if (cleanedCount > 0) {
    console.log(`✓ cleanupDuplicateDefaultPools: Cleaned up ${cleanedCount} duplicate/migrated default pool entries`);
  } else {
    console.log("cleanupDuplicateDefaultPools: No duplicates found, all entries are already canonical");
  }
  
  return cleanedCount;
};
