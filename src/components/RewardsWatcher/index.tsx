import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import { RootState } from "../../store/store";
import {
  fetchRewards,
  getRewardId,
  selectNewRewards,
  selectHasNewRewards,
} from "../../store/rewardsSlice";
import { useNotifications } from "../../contexts/NotificationContext";
import { selectTokens } from "../../store/tokenSlice";
import { tokenSymbol } from "../../utils/dex";
import BigNumber from "bignumber.js";
import RewardsModal from "../modals/RewardsModal";

const REWARDS_FETCH_INTERVAL = 60000; // Fetch every 60 seconds
const INITIAL_FETCH_DELAY = 5000; // Wait 5 seconds after mount before first fetch

const RewardsWatcher: React.FC = () => {
  const dispatch = useDispatch();
  const { activeAccount } = useWallet();
  const newRewards = useSelector(selectNewRewards);
  const hasNewRewards = useSelector(selectHasNewRewards);
  const tokens = useSelector(selectTokens);
  const { addRewardNotification } = useNotifications();
  const [showModal, setShowModal] = useState(false);
  const processedRewardIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    processedRewardIdsRef.current = new Set();
  }, [activeAccount?.address]);

  // Get WAD token info (contractId 47138068)
  //const rewardToken = tokens.find((t) => t.contractId === 47138068);
  const rewardToken = tokens.find((t) => t.contractId === 390001); // VOI
  const rewardTokenSymbol = rewardToken
    ? tokenSymbol(rewardToken, true)
    : "VOI";

  // Add notifications for new rewards (only for active account)
  useEffect(() => {
    if (!activeAccount?.address || !hasNewRewards || newRewards.length === 0) return;

    const decimals = rewardToken?.decimals ?? 6;

    newRewards.forEach((reward) => {
      const dedupeKey = getRewardId(reward);
      if (processedRewardIdsRef.current.has(dedupeKey)) return;

      const raw = reward.allowance || reward.amount || reward.value || "0";
      let formattedAmount: string;
      try {
        const dp = Math.min(6, reward.decimals ?? decimals);
        formattedAmount = new BigNumber(raw)
          .dividedBy(new BigNumber(10).pow(reward.decimals ?? decimals))
          .toFormat(dp);
      } catch {
        formattedAmount = "0";
      }

      addRewardNotification({
        amount: formattedAmount,
        token: rewardTokenSymbol,
        txId: reward.txId || reward.transactionId,
        timestamp: reward.timestamp || reward.time || reward.roundTime,
        dedupeKey,
      });

      processedRewardIdsRef.current.add(dedupeKey);
    });
  }, [
    activeAccount?.address,
    hasNewRewards,
    newRewards,
    addRewardNotification,
    rewardTokenSymbol,
    rewardToken?.decimals,
  ]);

  // Show modal when new rewards are detected (optional - can be disabled if only using notifications)
  useEffect(() => {
    if (hasNewRewards && newRewards.length > 0) {
      // Optionally show modal - you can comment this out if you only want notifications
      // setShowModal(true);
    }
  }, [hasNewRewards, newRewards.length]);

  // Fetch rewards when user is connected
  useEffect(() => {
    if (!activeAccount?.address) {
      return;
    }

    // Initial fetch after delay
    const initialTimer = setTimeout(() => {
      dispatch(
        fetchRewards({ userAddress: activeAccount.address }) as any
      );
    }, INITIAL_FETCH_DELAY);

    // Set up interval for periodic fetching
    const interval = setInterval(() => {
      dispatch(
        fetchRewards({ userAddress: activeAccount.address }) as any
      );
    }, REWARDS_FETCH_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [activeAccount?.address, dispatch]);

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <RewardsModal
      open={showModal}
      handleClose={handleCloseModal}
      rewards={newRewards}
    />
  );
};

export default RewardsWatcher;

