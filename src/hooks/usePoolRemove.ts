import { useState, useEffect, useCallback } from 'react';
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, abi, arc200, swap } from "ulujs";
import { getAlgorandClients } from "../wallets";
import { ARC200TokenI, PoolI } from "../types";
import algosdk from "algosdk";
import { toast } from "react-toastify";
import BigNumber from "bignumber.js";
import axios from "axios";
import { tokenSymbol } from "../utils/dex";

// Helper function to convert API token to ARC200TokenI
const convertToARC200Token = (token: any): ARC200TokenI => {
  return {
    tokenId: token?.tokenId || 0,
    contractId: token?.contractId || 0,
    name: token?.name || "",
    symbol: token?.symbol || "",
    decimals: token?.decimals || 0,
    totalSupply: token?.totalSupply || "0",
  };
};

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
      const makeCi = (ctcInfo: number) => {
        const acc = {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        };
        return new CONTRACT(ctcInfo, algodClient, indexerClient, spec, acc);
      };
      const makeBuilder = (
        ctcInfoPool: number,
        ctcInfoTokA: number,
        ctcInfoTokB: number
      ) => {
        const acc = {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        };
        return {
          pool: new CONTRACT(
            ctcInfoPool,
            algodClient,
            indexerClient,
            spec,
            acc,
            true,
            false,
            true
          ),
          arc200: {
            tokA: new CONTRACT(
              ctcInfoTokA,
              algodClient,
              indexerClient,
              {
                ...abi.arc200,
                methods: [
                  ...abi.arc200.methods,
                  {
                    name: "withdraw",
                    args: [
                      {
                        name: "amount",
                        type: "uint64",
                        desc: "Amount to withdraw",
                      },
                    ],
                    returns: {
                      type: "uint256",
                      desc: "Amount withdrawn",
                    },
                  },
                ],
              },
              acc,
              true,
              false,
              true
            ),
            tokB: new CONTRACT(
              ctcInfoTokB,
              algodClient,
              indexerClient,
              {
                ...abi.arc200,
                methods: [
                  ...abi.arc200.methods,
                  {
                    name: "withdraw",
                    args: [
                      {
                        name: "amount",
                        type: "uint64",
                        desc: "Amount to withdraw",
                      },
                    ],
                    returns: {
                      type: "uint256",
                      desc: "Amount withdrawn",
                    },
                  },
                ],
              },
              acc,
              true,
              false,
              true
            ),
          },
        };
      };

      const { poolId } = pool;
      const tokA = info.tokA;
      const tokB = info.tokB;
      const ci = makeCi(poolId);
      const ciA = makeCi(tokA);
      const ciB = makeCi(tokB);

      ci.setFee(4000);

      const arc200_balanceOfR = await ci.arc200_balanceOf(
        activeAccount.address
      );
      if (!arc200_balanceOfR.success) return { success: false, error: "Balance failed" };
      const poolShare = arc200_balanceOfR.returnValue;

      const withdrawAmount = BigInt(
        new BigNumber(poolShare.toString())
          .dividedBy(100)
          .multipliedBy(fromAmount)
          .toFixed(0)
      );

      const Provider_withdrawR = await ci.Provider_withdraw(
        1,
        withdrawAmount,
        [0, 0]
      );
      if (!Provider_withdrawR.success)
        return { success: false, error: "Add liquidity simulation failed" };
      const Provider_withdraw = Provider_withdrawR.returnValue;

      const builder = makeBuilder(poolId, tokA, tokB);
      const poolAddr = algosdk.getApplicationAddress(poolId);

      const buildN = [];

      const { data } = await axios.get(
        "https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/tokens"
      );
      const tokens = data.tokens.filter((token: any) =>
        [tokA, tokB].includes(token.contractId)
      );

      const accountAssets = await indexerClient
        .lookupAccountAssets(activeAccount.address)
        .do();

      // Remove liquidity
      {
        const txnO = (
          await builder.pool.Provider_withdraw(
            0,
            withdrawAmount,
            Provider_withdraw
          )
        ).obj;
        const msg = `Remove liquidity ${withdrawAmount} LP`;
        const note = new TextEncoder().encode(msg);
        buildN.push({
          ...txnO,
          note,
        });
      }

      // If Provider_withdraw includes wrapped token withdraw
      do {
        for (const tok of [tokA, tokB]) {
          const token = tokens?.find((t: any) => t.contractId === tok);
          if (!token) continue;
          const symbol = token.symbol;
          const decimals = token.decimals;
          const assetId = Number(token.tokenId);
          const tokenContract =
            tok === tokA ? builder.arc200.tokA : builder.arc200.tokB;
          const withdrawAmount = Provider_withdraw[tok === tokA ? 0 : 1];

          const msg = `Withdraw ${new BigNumber(withdrawAmount.toString())
            .dividedBy(new BigNumber(10).pow(decimals))
            .toFixed(decimals)} ${symbol}`;
          const note = new TextEncoder().encode(msg);
          const condOptin =
            assetId !== 0 &&
            !accountAssets.assets.find((a: any) => a["asset-id"] === assetId)
              ? {
                  xaid: assetId,
                  snd: activeAccount.address,
                  arcv: activeAccount.address,
                }
              : {};
          const txnO = (await tokenContract.withdraw(withdrawAmount)).obj;
          buildN.push({
            ...txnO,
            ...condOptin,
            note,
          });
        }
      } while (0);

      ci.setAccounts([poolAddr]);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      const customR = await ci.custom();
      console.log({ customR });
      if (!customR.success)
        return { success: false, error: "Remove liquidity group simulation failed" };

      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      // After successful transaction, return result
      return {
        success: true,
        tokAAmount: new BigNumber(Provider_withdraw[0].toString())
          .div(
            new BigNumber(10).pow(
              tokens.find((t: any) => t.contractId === info?.tokA)?.decimals ||
                0
            )
          )
          .toNumber(),
        tokBAmount: new BigNumber(Provider_withdraw[1].toString())
          .div(
            new BigNumber(10).pow(
              tokens.find((t: any) => t.contractId === info?.tokB)?.decimals ||
                0
            )
          )
          .toNumber(),
        tokASymbol: tokenSymbol(
          convertToARC200Token(
            tokens.find((t: any) => t.contractId === info?.tokA)
          ),
          true
        ),
        tokBSymbol: tokenSymbol(
          convertToARC200Token(
            tokens.find((t: any) => t.contractId === info?.tokB)
          ),
          true
        ),
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