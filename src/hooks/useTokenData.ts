import React, { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { ARC200TokenI } from '../types';

interface UseTokenDataProps {
  pool: any;
  tokens: ARC200TokenI[];
}

export const useTokenData = ({ pool, tokens }: UseTokenDataProps) => {
  const tokenData = useMemo(() => {
    if (!pool || !tokens || tokens.length === 0) return { token: undefined, token2: undefined };
    
    const token = tokens.find((t: ARC200TokenI) => `${t.tokenId}` === `${pool?.tokA}`);
    const token2 = tokens.find((t: ARC200TokenI) => `${t.tokenId}` === `${pool?.tokB}`);
    
    return { token, token2 };
  }, [pool, tokens]);

  const getTokenIconUrl = useCallback((tokenId?: number) => {
    if (!tokenId) return "";

    // Handle wVOI special case
    if (tokenId === 390001) {
      return "https://asset-verification.nautilus.sh/icons/0.png";
    }

    // Handle regular tokens
    if (tokenId) {
      return `https://asset-verification.nautilus.sh/icons/${tokenId}.png`;
    }

    return "/default-token-icon.png";
  }, []);

  const formatTokenAmount = useCallback((amount: number, decimals: number, symbol: string) => {
    return `${(amount / Math.pow(10, decimals)).toFixed(6)} ${symbol}`;
  }, []);

  return {
    ...tokenData,
    getTokenIconUrl,
    formatTokenAmount,
  };
}; 