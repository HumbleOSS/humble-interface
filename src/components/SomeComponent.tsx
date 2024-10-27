import React from 'react';
import useDefiRewards from '../hooks/useDefiRewards';

const SomeComponent: React.FC = () => {
  const rewards = useDefiRewards();

  return (
    <div>
      <h2>DeFi Rewards</h2>
      <ul>
        {rewards.map((reward) => (
          <li key={reward.poolId}>
            Pool ID: {reward.poolId}, APR Boost: {reward.aprBoost}%
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SomeComponent;
