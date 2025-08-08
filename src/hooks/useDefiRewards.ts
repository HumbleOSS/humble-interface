import { useState, useEffect } from "react";
//import axios from 'axios';

interface DefiReward {
  poolId: number;
  aprBoost: number;
  blockReward: number;
  additionalAprBoost: number;
}

const useDefiRewards = () => {
  const [rewards, setRewards] = useState<DefiReward[]>([]);
  useEffect(() => {
    const fetchRewards = async () => {
      try {
        // TODO provide endpoint
        // Replace this URL with the actual API endpoint for fetching rewards data
        //const response = await axios.get('https://api.example.com/defi-rewards');
        const response = {
          data: [
            {
              poolId: 395553, // USDC/VOI
              aprBoost: 28.75, // TVL lte 250k USD
              additionalAprBoost: 3.05, // POW Incentives
            },
            {
              poolId: 413161,
              aprBoost: 28.75 / 2, // TVL lte 250k ALGO
              additionalAprBoost: 0,
            },
            {
              poolId: 40171092,
              aprBoost: 28.75 / 2, // TVL lte 250k ETH
              additionalAprBoost: 0,
            },
            {
              poolId: 40171091,
              aprBoost: 28.75 / 2, // TVL lte 250k cbBTC
              additionalAprBoost: 0,
            },
            {
              poolId: 40180060,
              aprBoost: 28.75 / 2, // TVL lte 250k aBTC
              additionalAprBoost: 0,
            },
            {
              poolId: 395554, // GM/VOI GM
              aprBoost: 27,
              additionalAprBoost: 0,
            },
            {
              poolId: 395509, // ROCKET/VOI ROCKET TVL 5%
              aprBoost: 27,
              additionalAprBoost: 0,
            },
            {
              poolId: 441951, // CORN/VOI CORN TVL 5%
              aprBoost: 9,
              additionalAprBoost: 0,
            },
            {
              poolId: 404246, // COOL/VOI COOL TVL
              aprBoost: 5,
              additionalAprBoost: 0,
            },
            {
              poolId: 395510, // F/VOI F TVL
              aprBoost: 8,
              additionalAprBoost: 0,
            },
            {
              poolId: 8357620, // pix/VOI
              aprBoost: 15,
              additionalAprBoost: 0,
            },
            {
              poolId: 40120385, // POW/VOI
              aprBoost: 0,
              additionalAprBoost: 9.167, // POW Incentives
            },
            {
              poolId: 40171090, // POW/USD
              aprBoost: 0,
              additionalAprBoost: 27.5, // POW Incentives
            },
          ],
        };
        // Assuming the API returns an array of objects with poolId and aprBoost
        const rewardsData: DefiReward[] = response.data.map((item: any) => ({
          poolId: item.poolId,
          aprBoost: item.aprBoost,
          blockReward: 0,
          additionalAprBoost: item.additionalAprBoost,
        }));

        setRewards(rewardsData);
      } catch (error) {
        console.error("Error fetching DeFi rewards:", error);
        setRewards([]);
      }
    };
    fetchRewards();
  }, []);

  return rewards;
};

export default useDefiRewards;
