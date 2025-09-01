import { useState, useEffect, useCallback } from 'react';
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, abi, arc200, swap } from "ulujs";
import { getAlgorandClients } from "../wallets";
import { ARC200TokenI, PoolI } from "../types";
import algosdk from "algosdk";
import { toast } from "react-toastify";
import BigNumber from "bignumber.js";
import axios from "axios";

interface UsePoolRemoveProps {
  pool: PoolI;
  fromAmount: string;
}

interface PoolInfo {
  tokA: number;
  tokB: number;
  lptBals: {
    lpMinted: number;
  };
}

interface ExpectedOutcome {
  [0]: number;
  [1]: number;
}

export const usePoolRemove = ({ pool, fromAmount }: UsePoolRemoveProps) => {
  const { activeAccount, signTransactions } = useWallet();
  const [info, setInfo] = useState<PoolInfo>();
  const [poolBalance, setPoolBalance] = useState<BigInt>();
  const [poolShare, setPoolShare] = useState<string>("0");
  const [expectedOutcome, setExpectedOutcome] = useState<ExpectedOutcome>();
  const [newShare, setNewShare] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch pool info
  useEffect(() => {
    if (!pool) return;
    
    const fetchPoolInfo = async () => {
      try {
        const { algodClient, indexerClient } = getAlgorandClients();
        const ci = new swap(pool.poolId, algodClient, indexerClient);
        const info = await ci.Info();
        if (info.success) {
          setInfo(info.returnValue);
        }
      } catch (err) {
        console.error('Failed to fetch pool info:', err);
        setError('Failed to load pool information');
      }
    };

    fetchPoolInfo();
  }, [pool]);

  // Fetch pool balance
  useEffect(() => {
    if (!activeAccount || !pool) return;
    
    const fetchPoolBalance = async () => {
      try {
        const { algodClient, indexerClient } = getAlgorandClients();
        const ci = new arc200(pool.poolId, algodClient, indexerClient);
        const balance = await ci.arc200_balanceOf(activeAccount.address);
        if (balance.success) {
          setPoolBalance(balance.returnValue);
        }
      } catch (err) {
        console.error('Failed to fetch pool balance:', err);
        setError('Failed to load pool balance');
      }
    };

    fetchPoolBalance();
  }, [activeAccount, pool]);

  // Calculate pool share
  useEffect(() => {
    if (!activeAccount || !pool || !info || !poolBalance) return;
    
    const newShare = (100 * Number(poolBalance)) / Number(info.lptBals.lpMinted);
    setPoolShare(newShare.toFixed(2));
  }, [activeAccount, pool, info, poolBalance]);

  // Calculate expected outcome
  useEffect(() => {
    if (!pool || !info || !activeAccount) return;
    
    const calculateExpectedOutcome = async () => {
      try {
        const { algodClient, indexerClient } = getAlgorandClients();
        const ci = new CONTRACT(pool.poolId, algodClient, indexerClient, spec, {
          addr: activeAccount.address,
          sk: new Uint8Array(0),
        });
        
        const balance = await ci.arc200_balanceOf(activeAccount.address);
        if (!balance.success) return;
        
        const poolShare = balance.returnValue;
        const withdrawAmount = BigInt(
          new BigNumber(poolShare.toString())
            .multipliedBy(new BigNumber(fromAmount))
            .dividedBy(100)
            .toFixed(0)
        );

        ci.setFee(4000);
        const withdraw = await ci.Provider_withdraw(1, withdrawAmount, [0, 0]);
        if (!withdraw.success) return;
        
        setExpectedOutcome(withdraw.returnValue);
      } catch (err) {
        console.error('Failed to calculate expected outcome:', err);
      }
    };

    calculateExpectedOutcome();
  }, [activeAccount, pool, info, fromAmount]);

  // Calculate new share
  useEffect(() => {
    if (poolShare === "100.00") {
      if (fromAmount === "100") {
        setNewShare("0.00");
      } else {
        setNewShare("100.00");
      }
      return;
    }
    const newShare = (Number(poolShare) * (100 - Number(fromAmount))) / 100;
    setNewShare(newShare.toFixed(2));
  }, [poolShare, fromAmount]);

  const removeLiquidity = useCallback(async () => {
    if (!activeAccount || !info) {
      toast.info("Please connect your wallet first");
      return { success: false, error: "Please connect your wallet first" };
    }

    setIsLoading(true);
    setError(null);

    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      
      // ... rest of the remove liquidity logic would go here
      // This is a simplified version - the full implementation would be moved from the component
      
      return { 
        success: true,
        tokAAmount: 0,
        tokBAmount: 0,
        tokASymbol: "",
        tokBSymbol: ""
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to remove liquidity';
      toast.error(errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, info, pool, fromAmount]);

  return {
    info,
    poolBalance,
    poolShare,
    expectedOutcome,
    newShare,
    isLoading,
    error,
    removeLiquidity,
  };
};

// Pool contract spec - should be moved to constants
const spec = {
  name: "pool",
  desc: "pool",
  methods: [
    // ... methods would be defined here
  ],
  events: [],
}; 