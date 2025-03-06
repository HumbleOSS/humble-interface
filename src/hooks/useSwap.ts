import { useCallback } from 'react';
import { useSettings } from '../state/settings';
import { Token } from '../types/token';

export function useSwap() {
  const { settings } = useSettings();
  
  const swap = useCallback(async (fromToken: Token, toToken: Token, amount: string) => {
    try {
      // ... existing code ...
      
      const swapParams = {
        // ... existing code ...
        slippageTolerance: settings.slippageTolerance / 100, // Convert percentage to decimal
        // ... existing code ...
      };
      
      // ... rest of swap function ...
    } catch (error) {
      // ... error handling ...
    }
  }, [settings.slippageTolerance]); // Add settings.slippageTolerance to dependencies

  return { swap };
} 