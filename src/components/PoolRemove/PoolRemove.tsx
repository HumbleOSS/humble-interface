import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { RootState } from "../../store/store";
import { getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { PoolI } from "../../types";
import { toast } from "react-toastify";

// Custom hooks
import { usePoolRemove } from "../../hooks/usePoolRemove";
import { useTokenData } from "../../hooks/useTokenData";
import { usePercentageInput } from "../../hooks/usePercentageInput";

// Components
import ErrorBoundary from "../ErrorBoundary";
import PoolRemoveForm from "./PoolRemoveForm";
import PoolRemoveDialog from "./PoolRemoveDialog";
import LoadingSpinner from "../LoadingSpinner";

// Styled components
import { SwapRoot } from "./styles";

const PoolRemove: React.FC = () => {
  const dispatch = useDispatch();
  const isDarkTheme = useSelector((state: RootState) => state.theme.isDarkTheme);
  const tokens = useSelector((state: RootState) => state.tokens.tokens);
  const pools: PoolI[] = useSelector((state: RootState) => state.pools.pools);

  // URL params
  const [sp] = useSearchParams();
  const paramPoolId = sp.get("poolId");

  // Local state
  const [pool, setPool] = useState<PoolI>({ poolId: Number(paramPoolId) } as PoolI);
  const [openDialog, setOpenDialog] = useState(false);
  const [txnResult, setTxnResult] = useState<{
    tokAAmount: number;
    tokBAmount: number;
    tokASymbol: string;
    tokBSymbol: string;
  }>();

  // Custom hooks
  const percentageInput = usePercentageInput();
  const { token, token2, getTokenIconUrl, formatTokenAmount } = useTokenData({ pool, tokens });
  const poolRemoveHook = usePoolRemove({ 
    pool, 
    fromAmount: percentageInput.value 
  });

  // Load tokens on mount
  useEffect(() => {
    dispatch(getTokens() as unknown as UnknownAction);
  }, [dispatch]);

  // Set pool and tokens based on URL params
  useEffect(() => {
    if (!pools || pools.length === 0 || !tokens || tokens.length === 0) return;
    
    let targetPool: PoolI;
    
    if (paramPoolId) {
      targetPool = pools.find((p: PoolI) => `${p.poolId}` === `${paramPoolId}`) || pools[0];
    } else {
      targetPool = pools[0];
    }
    
    setPool(targetPool);
  }, [pools, tokens, paramPoolId]);

  const handleRemoveLiquidity = async () => {
    if (!percentageInput.isValid) {
      toast.error("Please enter a valid percentage");
      return;
    }

    const result = await poolRemoveHook.removeLiquidity();
    
    if (result?.success) {
      // Set transaction result and open dialog
      setTxnResult({
        tokAAmount: result.tokAAmount,
        tokBAmount: result.tokBAmount,
        tokASymbol: result.tokASymbol,
        tokBSymbol: result.tokBSymbol,
      });
      setOpenDialog(true);
      percentageInput.setPercentage(0); // Reset input
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setTxnResult(undefined);
  };

  const isLoading = !pools || !tokens || !pool || !token || !token2;

  if (isLoading) {
    return (
      <SwapRoot className={isDarkTheme ? "dark" : "light"}>
        <LoadingSpinner />
      </SwapRoot>
    );
  }

  return (
    <ErrorBoundary>
      <SwapRoot className={isDarkTheme ? "dark" : "light"}>
        <PoolRemoveForm
          pool={pool}
          token={token}
          token2={token2}
          percentageInput={percentageInput}
          poolRemoveHook={poolRemoveHook}
          getTokenIconUrl={getTokenIconUrl}
          formatTokenAmount={formatTokenAmount}
          onRemoveLiquidity={handleRemoveLiquidity}
          isDarkTheme={isDarkTheme}
        />
      </SwapRoot>

      <PoolRemoveDialog
        open={openDialog}
        onClose={handleCloseDialog}
        txnResult={txnResult}
        isDarkTheme={isDarkTheme}
      />
    </ErrorBoundary>
  );
};

export default PoolRemove; 