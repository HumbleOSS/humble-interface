import { useState, useEffect } from "react";
//import axios from 'axios';

interface DefiReward {
  poolId: number;
  aprBoost: number;
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
              poolId: 395553,
              aprBoost: 28.75, // TVL lte 250k USD
            },
          ],
        };
        // Assuming the API returns an array of objects with poolId and aprBoost
        const rewardsData: DefiReward[] = response.data.map((item: any) => ({
          poolId: item.poolId,
          aprBoost: item.aprBoost,
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
