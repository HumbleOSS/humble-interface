import * as React from "react";
import Menu from "@mui/material/Menu";
import styled from "styled-components";
import {
  //PROVIDER_ID,
  useWallet,
} from "@txnlab/use-wallet-react";
import ArrowDownwardIcon from "static/icon/icon-arrow-downward.svg";
import OnIcon from "static/icon/icon-on.svg";
import { compactAddress } from "../../utils/mp";
import { Box, Divider } from "@mui/material";
import { QUEST_ACTION, getActions, submitAction } from "../../config/quest";
import WalletModal from "../modals/WalletModal";

function WalletMenu() {
  const { wallets, activeWallet, activeAccount, activeWalletAccounts } =
    useWallet();

  return (
    <div>
      <h2>Wallets</h2>
      <ul>
        {wallets.map((wallet) => (
          <li key={wallet.id}>
            <button onClick={() => wallet.connect()}>
              {wallet.metadata.name}
            </button>
          </li>
        ))}
      </ul>

      {activeWallet && (
        <div>
          <h2>Active Wallet</h2>
          <p>{activeWallet.metadata.name}</p>
          <h2>Active Account</h2>
          <p>{activeAccount?.address}</p>
          <button onClick={() => activeWallet.disconnect()}>Disconnect</button>
        </div>
      )}
    </div>
  );
}

const AccountDropdown = styled.div`
  /* Layout */
  display: flex;
  padding: 10px;
  justify-content: center;
  align-items: center;
  gap: 4px;
  /* Style */
  border-radius: 12px;
  border: 1px solid var(--Color-Brand-White, #fff);
  /* Extra */
  cursor: pointer;
`;

const AccountDropdownLabel = styled.span`
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 15px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 18px */
  color: var(--Color-Brand-White, #fff);
  &.dark {
    color: var(--Color-Brand-White, #fff);
  }
  &.light {
    color: var(--Color-Brand-Black, #000);
  }
`;

const AccountMenu = styled(Menu)`
  padding: 24px;
`;

const WalletContainer = styled.div`
  display: flex;
  padding: var(--Main-System-10px, 10px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--Main-System-10px, 10px);
`;

const ProviderContainer = styled.div`
  /* Layout */
  min-width: 333px;
  display: flex;
  padding: 16px 8px;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 16px;
  /* Style */
  border-radius: 8px;
  background: rgba(231, 231, 231, 0.36);
`;

const ProviderIconContainer = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
`;

const ProviderName = styled.div`
  display: flex;
  width: 150px;
  align-items: center;
  gap: var(--Main-System-10px, 10px);
  flex-shrink: 0;
`;

const ConnectedAccountContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
`;

const AccountContainer = styled.div`
  display: flex;
  width: 200px;
  padding: 0px 63px;
  align-items: center;
  justify-content: space-between;
`;

const AccountNameContainer = styled.span`
  display: flex;
  width: 200px;
  align-items: center;
  gap: var(--Main-System-10px, 10px);
  flex-shrink: 0;
`;

const AccountName = styled.span`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  flex: 1 0 0;
  color: #161717;
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 22px; /* 137.5% */
  width: 110px;
`;

const ActiveButtonContainer = styled.div`
  display: flex;
  width: 83px;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  gap: var(--Main-System-10px, 10px);
  flex-shrink: 0;
  margin-right: 24px;
`;

const ActiveButton = styled.div`
  display: flex;
  width: 100px;
  padding: 6px 0px 6px var(--Main-System-20px, 20px);
  justify-content: flex-end;
  align-items: center;
  gap: var(--Main-System-20px, 20px);
  color: #93f;
  text-align: center;
  leading-trim: both;
  text-edge: cap;
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 20px; /* 125% */
  text-decoration-line: underline;
`;

const WalletIcon = styled.div`
  flex-shrink: 0;
  border-radius: 1000px;
  width: 53px;
  height: 53px;
  @media (max-width: 768px) {
    transition: all 0.3s ease;
    width: 40px;
    height: 40px;
  }
`;

const ProviderNameLabel = styled.div`
  align-self: center;
  color: #161717;
  /*font-family: Inter;*/
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 22px; /* 137.5% */
`;

const DisconnectButton = () => {
  return (
    <div>
      <svg
        width="150"
        height="45"
        viewBox="0 0 150 45"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="0.5"
          y="1"
          width="149"
          height="43"
          rx="21.5"
          stroke="#9933FF"
        />
        <path
          d="M15.8958 16.56H20.0678C20.6438 16.56 21.1851 16.6213 21.6918 16.744C22.2011 16.864 22.6704 17.04 23.0998 17.272C23.5291 17.504 23.9131 17.7867 24.2517 18.12C24.5931 18.4533 24.8824 18.832 25.1198 19.256C25.3571 19.68 25.5384 20.1453 25.6638 20.652C25.7918 21.1587 25.8558 21.7013 25.8558 22.28C25.8558 22.8587 25.7918 23.4013 25.6638 23.908C25.5384 24.4147 25.3571 24.88 25.1198 25.304C24.8824 25.728 24.5931 26.1067 24.2517 26.44C23.9131 26.7733 23.5291 27.056 23.0998 27.288C22.6704 27.52 22.2011 27.6973 21.6918 27.82C21.1824 27.94 20.6411 28 20.0678 28H15.8958V16.56ZM20.0118 25.832C20.5344 25.832 20.9998 25.7547 21.4078 25.6C21.8184 25.4427 22.1638 25.2133 22.4438 24.912C22.7264 24.6107 22.9411 24.24 23.0878 23.8C23.2371 23.3573 23.3118 22.8507 23.3118 22.28C23.3118 21.7093 23.2371 21.204 23.0878 20.764C22.9411 20.3213 22.7264 19.9493 22.4438 19.648C22.1638 19.3467 21.8184 19.1187 21.4078 18.964C20.9998 18.8067 20.5344 18.728 20.0118 18.728H18.3998V25.832H20.0118ZM29.2133 18.256H26.7693V16.16H29.2133V18.256ZM29.1893 28H26.7933V19.18H29.1893V28ZM34.0391 18.94C34.6871 18.94 35.2645 19.0107 35.7711 19.152C36.2805 19.2933 36.7098 19.4973 37.0591 19.764C37.4111 20.028 37.6778 20.3493 37.8591 20.728C38.0431 21.1067 38.1351 21.5347 38.1351 22.012H35.7711C35.7711 21.8067 35.7351 21.6227 35.6631 21.46C35.5911 21.2973 35.4831 21.1587 35.3391 21.044C35.1978 20.9293 35.0218 20.8427 34.8111 20.784C34.6031 20.7227 34.3631 20.692 34.0911 20.692C33.8511 20.692 33.6311 20.7147 33.4311 20.76C33.2311 20.8053 33.0605 20.8693 32.9191 20.952C32.7778 21.0347 32.6671 21.1347 32.5871 21.252C32.5098 21.3693 32.4711 21.4987 32.4711 21.64C32.4711 21.8133 32.5218 21.956 32.6231 22.068C32.7245 22.1773 32.8591 22.268 33.0271 22.34C33.1978 22.412 33.3938 22.4707 33.6151 22.516C33.8365 22.5587 34.0685 22.6 34.3111 22.64L34.8991 22.744C35.1365 22.784 35.3871 22.8307 35.6511 22.884C35.9178 22.9347 36.1805 23.0013 36.4391 23.084C36.6978 23.1667 36.9458 23.2707 37.1831 23.396C37.4205 23.5213 37.6298 23.6773 37.8111 23.864C37.9925 24.0507 38.1365 24.2733 38.2431 24.532C38.3498 24.7907 38.4031 25.096 38.4031 25.448C38.4031 25.8907 38.3111 26.2853 38.1271 26.632C37.9458 26.9787 37.6778 27.272 37.3231 27.512C36.9711 27.7493 36.5365 27.9293 36.0191 28.052C35.5045 28.1773 34.9125 28.24 34.2431 28.24C33.5391 28.24 32.9191 28.1707 32.3831 28.032C31.8498 27.8933 31.4018 27.692 31.0391 27.428C30.6791 27.1613 30.4071 26.8333 30.2231 26.444C30.0391 26.052 29.9471 25.604 29.9471 25.1H32.3111C32.3111 25.5427 32.4685 25.8827 32.7831 26.12C33.0978 26.3547 33.5778 26.472 34.2231 26.472C34.5058 26.472 34.7591 26.4507 34.9831 26.408C35.2098 26.3627 35.4005 26.2973 35.5551 26.212C35.7125 26.1267 35.8325 26.0227 35.9151 25.9C36.0005 25.7773 36.0431 25.6387 36.0431 25.484C36.0431 25.2947 35.9925 25.1413 35.8911 25.024C35.7898 24.904 35.6498 24.8053 35.4711 24.728C35.2951 24.648 35.0858 24.5827 34.8431 24.532C34.6005 24.4813 34.3378 24.4307 34.0551 24.38L33.4671 24.276C33.2511 24.2387 33.0178 24.1947 32.7671 24.144C32.5165 24.0933 32.2671 24.028 32.0191 23.948C31.7711 23.868 31.5311 23.768 31.2991 23.648C31.0698 23.528 30.8671 23.3787 30.6911 23.2C30.5151 23.0187 30.3738 22.8053 30.2671 22.56C30.1631 22.312 30.1111 22.02 30.1111 21.684C30.1111 21.26 30.2005 20.8787 30.3791 20.54C30.5578 20.2013 30.8151 19.9133 31.1511 19.676C31.4898 19.4387 31.9018 19.2573 32.3871 19.132C32.8751 19.004 33.4258 18.94 34.0391 18.94ZM41.365 23.588C41.365 23.996 41.4117 24.36 41.505 24.68C41.5983 24.9973 41.733 25.2653 41.909 25.484C42.085 25.7 42.301 25.8653 42.557 25.98C42.813 26.0947 43.1037 26.152 43.429 26.152C43.701 26.152 43.941 26.112 44.149 26.032C44.3597 25.9493 44.5397 25.836 44.689 25.692C44.841 25.548 44.9637 25.376 45.057 25.176C45.153 24.976 45.2237 24.756 45.269 24.516H47.661C47.5917 25.0627 47.4423 25.564 47.213 26.02C46.9863 26.476 46.6903 26.8693 46.325 27.2C45.9597 27.528 45.5317 27.784 45.041 27.968C44.553 28.1493 44.0143 28.24 43.425 28.24C42.985 28.24 42.569 28.1893 42.177 28.088C41.785 27.9893 41.4237 27.8467 41.093 27.66C40.7623 27.4707 40.465 27.2413 40.201 26.972C39.937 26.7 39.7117 26.392 39.525 26.048C39.341 25.7013 39.1997 25.3227 39.101 24.912C39.0023 24.4987 38.953 24.0573 38.953 23.588C38.953 23.1187 39.0023 22.6787 39.101 22.268C39.1997 21.8547 39.341 21.476 39.525 21.132C39.7117 20.788 39.937 20.48 40.201 20.208C40.465 19.936 40.7623 19.7067 41.093 19.52C41.4237 19.3307 41.785 19.1867 42.177 19.088C42.569 18.9893 42.985 18.94 43.425 18.94C44.0143 18.94 44.553 19.032 45.041 19.216C45.5317 19.3973 45.9597 19.6533 46.325 19.984C46.6903 20.312 46.9863 20.704 47.213 21.16C47.4423 21.616 47.5917 22.1173 47.661 22.664H45.273C45.2277 22.424 45.157 22.204 45.061 22.004C44.965 21.804 44.841 21.632 44.689 21.488C44.5397 21.3413 44.3597 21.228 44.149 21.148C43.941 21.068 43.701 21.028 43.429 21.028C43.1037 21.028 42.813 21.0853 42.557 21.2C42.301 21.312 42.085 21.4773 41.909 21.696C41.733 21.9147 41.5983 22.1827 41.505 22.5C41.4117 22.8173 41.365 23.18 41.365 23.588ZM48.3124 23.588C48.3124 23.1187 48.3617 22.6787 48.4604 22.268C48.559 21.8547 48.7004 21.476 48.8844 21.132C49.071 20.788 49.2964 20.48 49.5604 20.208C49.8244 19.936 50.1217 19.7067 50.4524 19.52C50.783 19.3307 51.1444 19.1867 51.5364 19.088C51.9284 18.9893 52.3444 18.94 52.7844 18.94C53.2244 18.94 53.6404 18.9893 54.0324 19.088C54.4244 19.1867 54.7857 19.3307 55.1164 19.52C55.447 19.7067 55.7444 19.936 56.0084 20.208C56.2724 20.48 56.4964 20.788 56.6804 21.132C56.867 21.476 57.0097 21.8547 57.1084 22.268C57.207 22.6787 57.2564 23.1187 57.2564 23.588C57.2564 24.0573 57.207 24.4987 57.1084 24.912C57.0097 25.3227 56.867 25.7013 56.6804 26.048C56.4964 26.392 56.2724 26.7 56.0084 26.972C55.7444 27.2413 55.447 27.4707 55.1164 27.66C54.7857 27.8467 54.4244 27.9893 54.0324 28.088C53.6404 28.1893 53.2244 28.24 52.7844 28.24C52.3444 28.24 51.9284 28.1893 51.5364 28.088C51.1444 27.9893 50.783 27.8467 50.4524 27.66C50.1217 27.4707 49.8244 27.2413 49.5604 26.972C49.2964 26.7 49.071 26.392 48.8844 26.048C48.7004 25.7013 48.559 25.3227 48.4604 24.912C48.3617 24.4987 48.3124 24.0573 48.3124 23.588ZM50.7244 23.588C50.7244 23.996 50.771 24.36 50.8644 24.68C50.9577 24.9973 51.0924 25.2653 51.2684 25.484C51.4444 25.7 51.6604 25.8653 51.9164 25.98C52.1724 26.0947 52.4617 26.152 52.7844 26.152C53.1097 26.152 53.399 26.096 53.6524 25.984C53.9084 25.8693 54.1244 25.7027 54.3004 25.484C54.4764 25.2653 54.611 24.9973 54.7044 24.68C54.7977 24.36 54.8444 23.996 54.8444 23.588C54.8444 23.18 54.7977 22.8173 54.7044 22.5C54.611 22.18 54.4764 21.912 54.3004 21.696C54.1244 21.4773 53.9084 21.312 53.6524 21.2C53.399 21.0853 53.1097 21.028 52.7844 21.028C52.4617 21.028 52.1724 21.0853 51.9164 21.2C51.6604 21.312 51.4444 21.4773 51.2684 21.696C51.0924 21.9147 50.9577 22.1827 50.8644 22.5C50.771 22.8173 50.7244 23.18 50.7244 23.588ZM60.4861 28H58.0901V19.18H60.4861V21.832C60.5795 21.3653 60.7168 20.952 60.8981 20.592C61.0795 20.232 61.3008 19.9307 61.5621 19.688C61.8235 19.4427 62.1235 19.2573 62.4621 19.132C62.8035 19.004 63.1781 18.94 63.5861 18.94C64.0608 18.94 64.4795 19.0253 64.8421 19.196C65.2075 19.3667 65.5141 19.6187 65.7621 19.952C66.0101 20.2853 66.1968 20.6973 66.3221 21.188C66.4501 21.676 66.5141 22.2387 66.5141 22.876V28H64.1181V23.276C64.1181 21.7773 63.5475 21.028 62.4061 21.028C62.0995 21.028 61.8275 21.08 61.5901 21.184C61.3528 21.2853 61.1515 21.4347 60.9861 21.632C60.8235 21.8293 60.6995 22.0747 60.6141 22.368C60.5288 22.6587 60.4861 22.9933 60.4861 23.372V28ZM69.8924 28H67.4964V19.18H69.8924V21.832C69.9857 21.3653 70.123 20.952 70.3044 20.592C70.4857 20.232 70.707 19.9307 70.9684 19.688C71.2297 19.4427 71.5297 19.2573 71.8684 19.132C72.2097 19.004 72.5844 18.94 72.9924 18.94C73.467 18.94 73.8857 19.0253 74.2484 19.196C74.6137 19.3667 74.9204 19.6187 75.1684 19.952C75.4164 20.2853 75.603 20.6973 75.7284 21.188C75.8564 21.676 75.9204 22.2387 75.9204 22.876V28H73.5244V23.276C73.5244 21.7773 72.9537 21.028 71.8124 21.028C71.5057 21.028 71.2337 21.08 70.9964 21.184C70.759 21.2853 70.5577 21.4347 70.3924 21.632C70.2297 21.8293 70.1057 22.0747 70.0204 22.368C69.935 22.6587 69.8924 22.9933 69.8924 23.372V28ZM85.4066 25.012C85.2866 25.5133 85.0986 25.964 84.8426 26.364C84.5893 26.7613 84.28 27.1 83.9146 27.38C83.5493 27.6573 83.1346 27.8693 82.6706 28.016C82.2093 28.1653 81.7106 28.24 81.1746 28.24C80.732 28.24 80.3133 28.1893 79.9186 28.088C79.5266 27.9867 79.1653 27.8413 78.8346 27.652C78.5066 27.46 78.2106 27.2267 77.9466 26.952C77.6853 26.6773 77.464 26.368 77.2826 26.024C77.1013 25.6773 76.9613 25.3 76.8626 24.892C76.7666 24.4813 76.7186 24.044 76.7186 23.58C76.7186 23.1187 76.7666 22.684 76.8626 22.276C76.9586 21.8653 77.096 21.488 77.2746 21.144C77.456 20.8 77.676 20.492 77.9346 20.22C78.1933 19.948 78.4853 19.7173 78.8106 19.528C79.1386 19.3387 79.4973 19.1933 79.8866 19.092C80.276 18.9907 80.6893 18.94 81.1266 18.94C81.78 18.94 82.372 19.0507 82.9026 19.272C83.4333 19.4907 83.8866 19.8027 84.2626 20.208C84.6413 20.6107 84.9333 21.0973 85.1386 21.668C85.344 22.236 85.4466 22.8693 85.4466 23.568C85.4466 23.6747 85.444 23.7827 85.4386 23.892C85.436 23.9987 85.428 24.108 85.4146 24.22H79.0306C79.0706 24.5507 79.1493 24.8467 79.2666 25.108C79.384 25.3667 79.5373 25.5867 79.7266 25.768C79.916 25.9467 80.1373 26.084 80.3906 26.18C80.6466 26.276 80.9306 26.324 81.2426 26.324C82.168 26.324 82.8053 25.8867 83.1546 25.012H85.4066ZM83.1466 22.74C83.0453 22.1053 82.8253 21.628 82.4866 21.308C82.1506 20.9853 81.7013 20.824 81.1386 20.824C80.8506 20.824 80.5893 20.8667 80.3546 20.952C80.12 21.0373 79.9146 21.1613 79.7386 21.324C79.5626 21.4867 79.4173 21.688 79.3026 21.928C79.188 22.1653 79.1066 22.436 79.0586 22.74H83.1466ZM88.5213 23.588C88.5213 23.996 88.5679 24.36 88.6613 24.68C88.7546 24.9973 88.8893 25.2653 89.0653 25.484C89.2413 25.7 89.4573 25.8653 89.7133 25.98C89.9693 26.0947 90.2599 26.152 90.5853 26.152C90.8573 26.152 91.0973 26.112 91.3053 26.032C91.5159 25.9493 91.6959 25.836 91.8453 25.692C91.9973 25.548 92.1199 25.376 92.2133 25.176C92.3093 24.976 92.3799 24.756 92.4253 24.516H94.8173C94.7479 25.0627 94.5986 25.564 94.3693 26.02C94.1426 26.476 93.8466 26.8693 93.4813 27.2C93.1159 27.528 92.6879 27.784 92.1973 27.968C91.7093 28.1493 91.1706 28.24 90.5813 28.24C90.1413 28.24 89.7253 28.1893 89.3333 28.088C88.9413 27.9893 88.5799 27.8467 88.2493 27.66C87.9186 27.4707 87.6213 27.2413 87.3573 26.972C87.0933 26.7 86.8679 26.392 86.6813 26.048C86.4973 25.7013 86.3559 25.3227 86.2573 24.912C86.1586 24.4987 86.1093 24.0573 86.1093 23.588C86.1093 23.1187 86.1586 22.6787 86.2573 22.268C86.3559 21.8547 86.4973 21.476 86.6813 21.132C86.8679 20.788 87.0933 20.48 87.3573 20.208C87.6213 19.936 87.9186 19.7067 88.2493 19.52C88.5799 19.3307 88.9413 19.1867 89.3333 19.088C89.7253 18.9893 90.1413 18.94 90.5813 18.94C91.1706 18.94 91.7093 19.032 92.1973 19.216C92.6879 19.3973 93.1159 19.6533 93.4813 19.984C93.8466 20.312 94.1426 20.704 94.3693 21.16C94.5986 21.616 94.7479 22.1173 94.8173 22.664H92.4293C92.3839 22.424 92.3133 22.204 92.2173 22.004C92.1213 21.804 91.9973 21.632 91.8453 21.488C91.6959 21.3413 91.5159 21.228 91.3053 21.148C91.0973 21.068 90.8573 21.028 90.5853 21.028C90.2599 21.028 89.9693 21.0853 89.7133 21.2C89.4573 21.312 89.2413 21.4773 89.0653 21.696C88.8893 21.9147 88.7546 22.1827 88.6613 22.5C88.5679 22.8173 88.5213 23.18 88.5213 23.588ZM101.291 27.932C100.552 28.1347 99.8932 28.236 99.3145 28.236C98.3438 28.236 97.6078 27.952 97.1065 27.384C96.6078 26.8133 96.3585 25.9667 96.3585 24.844V21.084H95.2545V19.18H96.3585V17.148H98.7545V19.18H101.291V21.084H98.7545V24.848C98.7545 25.3547 98.8478 25.7253 99.0345 25.96C99.2212 26.192 99.5185 26.308 99.9265 26.308C100.092 26.308 100.285 26.2907 100.507 26.256C100.728 26.2187 100.989 26.1613 101.291 26.084V27.932Z"
          fill="#9933FF"
        />
        <rect x="110" y="4.5" width="36" height="36" rx="18" fill="#9933FF" />
        <path
          d="M131 20L125 26M125 20L131 26M138 23C138 28.5228 133.523 33 128 33C122.477 33 118 28.5228 118 23C118 17.4772 122.477 13 128 13C133.523 13 138 17.4772 138 23Z"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

const ConnectButton = () => {
  return (
    <svg
      width="159"
      height="50"
      viewBox="0 0 159 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#filter0_d_636_11194)">
        <rect x="3" y="2" width="153" height="44" rx="22" fill="#9933FF" />
        <rect x="3" y="2" width="153" height="44" rx="22" stroke="#9933FF" />
        <path
          d="M25.976 22.28C25.976 24.724 27.072 26.072 28.992 26.072C30.524 26.072 31.464 25.172 31.768 23.4H34.28C33.848 26.412 31.856 28.24 28.988 28.24C25.728 28.24 23.432 25.872 23.432 22.28C23.432 18.688 25.728 16.32 28.988 16.32C31.856 16.32 33.848 18.148 34.28 21.16H31.768C31.464 19.384 30.524 18.488 28.992 18.488C27.072 18.488 25.976 19.836 25.976 22.28ZM35.0624 23.588C35.0624 20.772 36.8984 18.94 39.5344 18.94C42.1704 18.94 44.0064 20.772 44.0064 23.588C44.0064 26.404 42.1704 28.24 39.5344 28.24C36.8984 28.24 35.0624 26.404 35.0624 23.588ZM37.4744 23.588C37.4744 25.22 38.2384 26.152 39.5344 26.152C40.8344 26.152 41.5944 25.224 41.5944 23.588C41.5944 21.952 40.8344 21.028 39.5344 21.028C38.2384 21.028 37.4744 21.956 37.4744 23.588ZM47.2361 23.372V28H44.8401V19.18H47.2361V21.832C47.6081 19.964 48.7001 18.94 50.3361 18.94C52.2361 18.94 53.2641 20.328 53.2641 22.876V28H50.8681V23.276C50.8681 21.772 50.3041 21.028 49.1561 21.028C47.9321 21.028 47.2361 21.856 47.2361 23.372ZM56.6424 23.372V28H54.2464V19.18H56.6424V21.832C57.0144 19.964 58.1064 18.94 59.7424 18.94C61.6424 18.94 62.6704 20.328 62.6704 22.876V28H60.2744V23.276C60.2744 21.772 59.7104 21.028 58.5624 21.028C57.3384 21.028 56.6424 21.856 56.6424 23.372ZM69.9046 25.012H72.1566C71.6766 27.02 70.0686 28.24 67.9246 28.24C65.2646 28.24 63.4686 26.36 63.4686 23.58C63.4686 20.808 65.2446 18.94 67.8766 18.94C70.4846 18.94 72.1966 20.772 72.1966 23.568C72.1966 23.78 72.1886 23.996 72.1646 24.22H65.7806C65.9366 25.54 66.7446 26.324 67.9926 26.324C68.9246 26.324 69.5566 25.884 69.9046 25.012ZM65.8086 22.74H69.8966C69.6966 21.48 69.0086 20.824 67.8886 20.824C66.7406 20.824 66.0006 21.52 65.8086 22.74ZM75.2713 23.588C75.2713 25.22 76.0353 26.152 77.3353 26.152C78.4273 26.152 78.9953 25.472 79.1753 24.516H81.5673C81.2913 26.7 79.6913 28.24 77.3313 28.24C74.6953 28.24 72.8593 26.404 72.8593 23.588C72.8593 20.772 74.6953 18.94 77.3313 18.94C79.6913 18.94 81.2913 20.48 81.5673 22.664H79.1793C78.9953 21.704 78.4273 21.028 77.3353 21.028C76.0353 21.028 75.2713 21.956 75.2713 23.588ZM88.0405 27.932C87.2965 28.136 86.6405 28.236 86.0645 28.236C84.1245 28.236 83.1085 27.088 83.1085 24.844V21.084H82.0045V19.18H83.1085V17.148H85.5045V19.18H88.0405V21.084H85.5045V24.848C85.5045 25.86 85.8605 26.308 86.6765 26.308C87.0045 26.308 87.4405 26.236 88.0405 26.084V27.932Z"
          fill="white"
        />
        <rect x="118" y="8" width="32" height="32" rx="16" fill="#99FF33" />
        <path
          d="M137 25.3333H137.007M128 19.3333V28.6667C128 29.403 128.597 30 129.333 30H138.667C139.403 30 140 29.403 140 28.6667V22C140 21.2636 139.403 20.6667 138.667 20.6667L129.333 20.6667C128.597 20.6667 128 20.0697 128 19.3333ZM128 19.3333C128 18.597 128.597 18 129.333 18H137.333M137.333 25.3333C137.333 25.5174 137.184 25.6667 137 25.6667C136.816 25.6667 136.667 25.5174 136.667 25.3333C136.667 25.1492 136.816 25 137 25C137.184 25 137.333 25.1492 137.333 25.3333Z"
          stroke="black"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_636_11194"
          x="0.5"
          y="0.5"
          width="158"
          height="49"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.04 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_636_11194"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_636_11194"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

function BasicMenu() {
  const { activeAccount, wallets, activeWallet, activeWalletAccounts } =
    useWallet();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const [isWalletModalOpen, setIsWalletModalOpen] = React.useState(false);
  const handleClose = () => {
    setAnchorEl(null);
    setIsWalletModalOpen(false);
  };
  React.useEffect(() => {
    if (!activeAccount) return;
    // -----------------------------------------
    // QUEST HERE hmbl_pool_swap
    // -----------------------------------------
    // do {
    //   const address = activeAccount.address;
    //   const actions: string[] = [QUEST_ACTION.CONNECT_WALLET];
    //   (async () => {
    //     const {
    //       data: { results },
    //     } = await getActions(address);
    //     for (const action of actions) {
    //       const address = activeAccount.address;
    //       const key = `${action}:${address}`;
    //       const completedAction = results.find((el: any) => el.key === key);
    //       if (!completedAction) {
    //         await submitAction(action, address);
    //       }
    //       // TODO notify quest completion here
    //     }
    //   })();
    // } while (0);
    // -----------------------------------------
  }, [activeAccount]);
  return (
    <div>
      {!activeAccount ? (
        <AccountDropdown
          onClick={(e: any) => {
            e.preventDefault();
            setIsWalletModalOpen(true);
          }}
        >
          <AccountDropdownLabel>Connect</AccountDropdownLabel>
          <img src={OnIcon} height="20" width="20" />
        </AccountDropdown>
      ) : (
        <AccountDropdown
          id="basic-button"
          aria-controls={open ? "basic-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          onClick={(e: any) => {
            handleClick(e);
          }}
        >
          <AccountDropdownLabel>
            {compactAddress(activeAccount?.address || "")}
          </AccountDropdownLabel>
          <img
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s",
            }}
            src={ArrowDownwardIcon}
          />
        </AccountDropdown>
      )}

      <AccountMenu
        sx={{
          minWidth: { xs: "350px", sm: "" },
          ml: { xs: 3.5, sm: 0 },
        }}
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
        PaperProps={{
          elevation: 0,
          sx: {
            minWidth: "350px",
            display: "inline-flex",
            padding: "18px",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "24px",
            borderRadius: "16px",
            overflow: "visible",
            filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
            mt: 2.25,
            "& .MuiAvatar-root": {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            /*
            "&::before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: 0,
              right: 20,
              width: 20,
              height: 20,
              bgcolor: "background.paper",
              transform: "translateY(-50%) rotate(45deg)",
              zIndex: 0,
            },
            */
          },
        }}
        transformOrigin={{ horizontal: "center", vertical: "top" }}
        anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
      >
        <WalletContainer>
          {wallets?.map((wallet) => {
            return (
              <ProviderContainer>
                <ProviderIconContainer>
                  <ProviderName>
                    <WalletIcon
                      style={{
                        background: `url(${wallet.metadata.icon}) lightgray 50% / cover no-repeat`,
                      }}
                    />
                    <ProviderNameLabel>
                      {wallet.metadata.name}
                    </ProviderNameLabel>
                  </ProviderName>

                  {activeWalletAccounts?.some(
                    (el: any) => wallet.isConnected
                  ) ? (
                    <Box
                      onClick={(e: any) => {
                        wallet.disconnect();
                      }}
                    >
                      <DisconnectButton />
                    </Box>
                  ) : (
                    <Box
                      onClick={(e: any) => {
                        wallet.connect();
                        if (wallet.isActive) {
                          setAnchorEl(null);
                        }
                      }}
                    >
                      <ConnectButton />
                    </Box>
                  )}
                </ProviderIconContainer>
                <ConnectedAccountContainer>
                  {wallet.accounts.map((account) => {
                    return (
                      <AccountContainer>
                        <AccountNameContainer>
                          <AccountName>
                            {compactAddress(account.address)}
                          </AccountName>
                        </AccountNameContainer>
                        <ActiveButtonContainer>
                          {!wallet.isActive ? (
                            <ActiveButton
                              onClick={(e: any) => {
                                wallet.setActive();
                              }}
                            >
                              Set Active
                            </ActiveButton>
                          ) : null}
                        </ActiveButtonContainer>
                      </AccountContainer>
                    );
                  })}

                  {/*connectedAccounts
                    ?.filter((a) => a.providerId === provider.metadata.id)
                    .map((account) => {
                      return (
                        <AccountContainer>
                          <AccountNameContainer>
                            <AccountName>
                              {compactAddress(account.address)}
                            </AccountName>
                          </AccountNameContainer>
                          <ActiveButtonContainer>
                            {account.address !== activeAccount?.address ? (
                              <ActiveButton
                                onClick={(e: any) => {
                                  provider?.setActiveProvider();
                                  provider?.setActiveAccount(account.address);
                                }}
                              >
                                Set Active
                              </ActiveButton>
                            ) : null}
                          </ActiveButtonContainer>
                        </AccountContainer>
                      );
                    })*/}
                </ConnectedAccountContainer>
              </ProviderContainer>
            );
          })}
        </WalletContainer>
        {/*<MenuItem
          onClick={(e) => {
            const provider = providers?.find(
              (p) => p.metadata.id === activeAccount?.providerId
            );
            provider?.disconnect();
          }}
        >
          Disconnect
        </MenuItem>
        */}
      </AccountMenu>
      <WalletModal
        open={isWalletModalOpen}
        loading={false}
        handleClose={() => {
          setIsWalletModalOpen(false);
        }}
        onSave={async () => {}}
      />
    </div>
  );
}

export default BasicMenu;
