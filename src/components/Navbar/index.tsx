import styled from "@emotion/styled";
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SwapIcon from "static/icon/icon-swap.svg";
import PoolIcon from "static/icon/icon-pool.svg";
import FarmIcon from "static/icon/icon-farm.svg";
import HomeIcon from "static/icon/icon-home.svg";
import TokenIcon from "static/icon/icon-token.svg";

import { RootState } from "../../store/store";
import { useSelector } from "react-redux";

import Box from "@mui/material/Box";
import { useWallet } from "@txnlab/use-wallet-react";

import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "react-toastify";

import { arc200 } from "ulujs";
import { TOKEN_VIA } from "../../constants/tokens";
import { getAlgorandClients } from "../../wallets";
import ConnectWallet from "../ConnectWallet";
import SettingMenu from "../SettingMenu";

const MobileNavRoot = styled(Box)`
  position: fixed;
  bottom: 24px;
  width: 100%;
  display: flex;
  justify-content: center;
`;

const MobileNavList = styled.div`
  /* Layout */
  display: flex;
  max-width: 300px;
  width: 100%;
  padding: 22px 17px 22px 22px;
  justify-content: flex-end;
  align-items: center;
  flex-shrink: 0;
  /* Style */
  border-radius: var(--Radius-800, 24px);
  background: var(--Color-Brand-Primary, #41137e);
  // margin: 0px 16px;
`;

const MobileNavContainer = styled.div`
  display: flex;
  width: 300px;
  justify-content: space-around;
  align-items: flex-end;
  flex-shrink: 0;
`;

const MobileNavItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
`;

const MobileNavItemLabel = styled.div`
  color: var(--Color-Brand-White, #fff);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 14.4px */
`;

const AccountButtonGroup = styled.div`
  display: flex;
  align-items: flex-end;
  gap: var(--Spacing-600, 12px);
`;

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
  color: var(--Color-Brand-White, #fff);
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 15px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 18px */
`;

const SettingDropdown = styled.div`
  /* Layout */
  display: flex;
  padding: 7px 8px;
  justify-content: center;
  align-items: center;
  gap: 4px;
  /* Style */
  border-radius: 12px;
  border: 1px solid var(--Color-Brand-White, #fff);
  /* Extra */
  cursor: pointer;
`;

const StyledLink = styled(Link)`
  text-decoration: none;
`;

const NavButtonGroup = styled(Box)`
  display: flex;
  align-items: center;
  gap: var(--Spacing-600, 12px);
`;

const NavButton = styled.div`
  /* Layout */
  display: flex;
  padding: var(--Spacing-400, 8px) var(--Spacing-700, 16px);
  justify-content: center;
  align-items: center;
  gap: var(--Spacing-200, 4px);
  /* Style */
  border-radius: var(--Radius-700, 16px);
  border: 1px solid var(--Color-Brand-White, #fff);
`;

const NavButtonLabel = styled.span`
  color: var(--Color-Brand-White, #fff);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 19.2px */
`;

const NavRoot = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px;
  @media (min-width: 600px) {
    padding: var(--Spacing-800, 24px) 0px;
  }
`;

const NavContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0px 80px;
  @media screen and (max-width: 600px) {
    padding: 0px;
  }
`;

const NavLogo = styled.img``;

const NavLinks = styled.ul`
  list-style-type: none;
  margin: 0;
  padding: 0;
  display: none;
  align-items: center;
  gap: 24px;
  @media screen and (min-width: 960px) {
    display: inline-flex;
  }
`;

const NavLink = styled.a`
  font-family: Nohemi, sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  letter-spacing: 0.1px;
  text-align: left;
  text-decoration: none;
  color: #161717;
  cursor: pointer;
  &:hover {
    color: #9933ff !important;
  }
  text-align: center;
  padding-left: 6px;
  padding-right: 6px;
`;

const ActiveNavLink = styled(NavLink)`
  color: #9933ff;
  border-bottom: 3px solid #9933ff;
`;

const LgIconLink = styled.a`
  display: none;
  cursor: pointer;
  &:hover {
    color: #9933ff;
  }
  @media screen and (min-width: 600px) {
    display: inline-flex;
  }
`;

const ConnectButton = styled.svg`
  cursor: pointer;
`;

const HPLogo = () => {
  return (
    <svg
      width="146"
      height="36"
      viewBox="0 0 146 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.23297 32.2921C7.70956 32.2921 7.25073 32.1581 6.85648 31.89C6.46223 31.622 6.17673 31.2578 6 30.7974L6.64236 30.4881C6.7987 30.8248 7.01622 31.0929 7.29492 31.2922C7.58041 31.4914 7.89309 31.5911 8.23297 31.5911C8.55924 31.5911 8.83454 31.5121 9.05886 31.354C9.28317 31.1891 9.39533 30.976 9.39533 30.7149C9.39533 30.5225 9.34095 30.3713 9.23219 30.2613C9.12343 30.1445 8.99768 30.0552 8.85493 29.9933C8.71219 29.9315 8.58643 29.8868 8.47767 29.8593L7.69257 29.6325C7.18956 29.4882 6.82589 29.2855 6.60158 29.0243C6.37726 28.7632 6.2651 28.4608 6.2651 28.1172C6.2651 27.7942 6.34667 27.5124 6.50981 27.2719C6.67295 27.0314 6.89387 26.8458 7.17256 26.7153C7.45126 26.5847 7.76054 26.5194 8.10041 26.5194C8.56264 26.5194 8.98069 26.6431 9.35455 26.8905C9.7352 27.131 10.0037 27.4678 10.16 27.9007L9.50749 28.21C9.37154 27.9007 9.17441 27.6602 8.91611 27.4884C8.6646 27.3097 8.38251 27.2204 8.06983 27.2204C7.76394 27.2204 7.51923 27.2994 7.3357 27.4575C7.15217 27.6155 7.0604 27.8148 7.0604 28.0553C7.0604 28.2409 7.10799 28.3886 7.20315 28.4986C7.29831 28.6086 7.40707 28.691 7.52943 28.746C7.65858 28.801 7.77074 28.8422 7.8659 28.8697L8.77336 29.1377C9.2152 29.2683 9.55847 29.471 9.80318 29.7459C10.0547 30.0208 10.1804 30.3438 10.1804 30.7149C10.1804 31.0173 10.0955 31.2887 9.92553 31.5292C9.76239 31.7698 9.53468 31.9588 9.24239 32.0962C8.9501 32.2268 8.61362 32.2921 8.23297 32.2921Z"
        fill="white"
      />
      <path
        d="M12.6278 32.1684L10.7517 26.6431H11.6183L13.1682 31.4777H12.8623L14.3203 26.6431H15.085L16.5431 31.4777H16.2372L17.7972 26.6431H18.6537L16.7776 32.1684H16.0129L14.5956 27.4368H14.8097L13.3925 32.1684H12.6278Z"
        fill="white"
      />
      <path
        d="M20.931 32.2921C20.5843 32.2921 20.275 32.2268 20.0031 32.0962C19.7312 31.9588 19.5171 31.7732 19.3608 31.5396C19.2044 31.3059 19.1262 31.0379 19.1262 30.7355C19.1262 30.4469 19.1874 30.1857 19.3098 29.9521C19.4321 29.7115 19.6225 29.5088 19.8808 29.3439C20.1391 29.179 20.4687 29.0621 20.8698 28.9934L23.011 28.6326V29.3336L21.0533 29.6634C20.6591 29.7322 20.3736 29.8593 20.1968 30.0449C20.0269 30.2304 19.9419 30.4503 19.9419 30.7046C19.9419 30.952 20.0371 31.1616 20.2274 31.3334C20.4246 31.5052 20.6761 31.5911 20.9819 31.5911C21.3558 31.5911 21.6821 31.5121 21.9608 31.354C22.2395 31.1891 22.457 30.9692 22.6133 30.6943C22.7697 30.4194 22.8478 30.1136 22.8478 29.7768V28.3749C22.8478 28.045 22.7289 27.777 22.491 27.5709C22.2531 27.3647 21.9438 27.2616 21.5631 27.2616C21.2301 27.2616 20.9378 27.3475 20.6863 27.5193C20.4347 27.6842 20.2478 27.9007 20.1255 28.1687L19.4321 27.7873C19.5341 27.5537 19.6938 27.3406 19.9113 27.1482C20.1357 26.9558 20.3906 26.8046 20.6761 26.6947C20.9616 26.5778 21.2572 26.5194 21.5631 26.5194C21.9642 26.5194 22.3176 26.5984 22.6235 26.7565C22.9362 26.9146 23.1775 27.1345 23.3475 27.4162C23.5242 27.6911 23.6126 28.0107 23.6126 28.3749V32.1684H22.8478V31.0654L22.96 31.1788C22.8648 31.3849 22.7153 31.5739 22.5114 31.7457C22.3142 31.9107 22.0797 32.0447 21.8078 32.1477C21.5427 32.244 21.2504 32.2921 20.931 32.2921Z"
        fill="white"
      />
      <path
        d="M25.1855 34.23V26.6431H25.9502V27.8801L25.8278 27.6636C26.0454 27.3131 26.3343 27.0348 26.6945 26.8287C27.0616 26.6225 27.4796 26.5194 27.9487 26.5194C28.4653 26.5194 28.9241 26.6465 29.3251 26.9008C29.733 27.1482 30.0525 27.4884 30.2836 27.9213C30.5215 28.3543 30.6404 28.8491 30.6404 29.4057C30.6404 29.9555 30.5215 30.4503 30.2836 30.8901C30.0525 31.3231 29.733 31.6667 29.3251 31.921C28.9241 32.1684 28.4653 32.2921 27.9487 32.2921C27.4796 32.2921 27.0548 32.1855 26.6741 31.9725C26.3003 31.7526 26.0182 31.4433 25.8278 31.0448L25.9502 30.9314V34.23H25.1855ZM27.9079 31.5189C28.2749 31.5189 28.6012 31.4262 28.8867 31.2406C29.179 31.0551 29.4067 30.8042 29.5698 30.4881C29.7398 30.1651 29.8247 29.8043 29.8247 29.4057C29.8247 29.0003 29.7398 28.6395 29.5698 28.3234C29.4067 28.0072 29.179 27.7564 28.8867 27.5709C28.6012 27.3853 28.2749 27.2925 27.9079 27.2925C27.5408 27.2925 27.2077 27.3853 26.9086 27.5709C26.6163 27.7564 26.3818 28.0107 26.2051 28.3337C26.0352 28.6498 25.9502 29.0071 25.9502 29.4057C25.9502 29.8043 26.0352 30.1651 26.2051 30.4881C26.3818 30.8042 26.6163 31.0551 26.9086 31.2406C27.2077 31.4262 27.5408 31.5189 27.9079 31.5189Z"
        fill="white"
      />
      <path
        d="M66.6612 21.1075C65.5493 21.1075 64.5315 20.8595 63.6078 20.3635C62.7012 19.8674 61.9998 19.166 61.5038 18.2594L61.8373 17.8489V20.7996H59.5024V1.3761H61.8887V9.94607L61.5294 9.35592C62.0426 8.53484 62.7439 7.88483 63.6334 7.40587C64.5229 6.9098 65.5407 6.66177 66.6868 6.66177C67.9868 6.66177 69.15 6.97822 70.1764 7.61113C71.2198 8.24405 72.0409 9.10788 72.6396 10.2027C73.2383 11.2803 73.5377 12.5119 73.5377 13.8975C73.5377 15.2488 73.2383 16.4719 72.6396 17.5667C72.0409 18.6614 71.2198 19.5253 70.1764 20.1582C69.15 20.7911 67.9783 21.1075 66.6612 21.1075ZM66.4815 18.7983C67.3539 18.7983 68.1322 18.5845 68.8165 18.1568C69.5007 17.7292 70.031 17.1476 70.4073 16.412C70.8007 15.6594 70.9975 14.8212 70.9975 13.8975C70.9975 12.9396 70.8007 12.1014 70.4073 11.3829C70.031 10.6474 69.5007 10.0658 68.8165 9.63816C68.1322 9.19341 67.3539 8.97104 66.4815 8.97104C65.6092 8.97104 64.8223 9.18486 64.121 9.6125C63.4367 10.0401 62.8893 10.6303 62.4788 11.3829C62.0854 12.1185 61.8887 12.9567 61.8887 13.8975C61.8887 14.8212 62.0854 15.6594 62.4788 16.412C62.8893 17.1476 63.4367 17.7292 64.121 18.1568C64.8223 18.5845 65.6092 18.7983 66.4815 18.7983Z"
        fill="white"
      />
      <path
        d="M36.8437 20.7996V6.96965H39.1786V9.79209L38.845 9.35589C39.1871 8.4835 39.7345 7.81638 40.4872 7.35452C41.2398 6.89267 42.0866 6.66174 43.0274 6.66174C44.105 6.66174 45.0715 6.96109 45.9268 7.55979C46.7992 8.15849 47.3979 8.94536 47.7229 9.92038L47.0558 9.94604C47.415 8.86838 48.0222 8.05586 48.8775 7.50848C49.7328 6.94399 50.6822 6.66174 51.7256 6.66174C52.6836 6.66174 53.5474 6.88412 54.3172 7.32887C55.104 7.77361 55.7284 8.38942 56.1902 9.17628C56.6521 9.96315 56.883 10.8526 56.883 11.8448V20.7996H54.4711V12.6145C54.4711 11.8448 54.3343 11.1948 54.0606 10.6645C53.7869 10.1342 53.4105 9.72367 52.9316 9.43287C52.4697 9.12497 51.9224 8.97101 51.2894 8.97101C50.6736 8.97101 50.1177 9.12497 49.6216 9.43287C49.1427 9.72367 48.7578 10.1428 48.467 10.6901C48.1933 11.2204 48.0565 11.8619 48.0565 12.6145V20.7996H45.6446V12.6145C45.6446 11.8448 45.5077 11.1948 45.234 10.6645C44.9603 10.1342 44.584 9.72367 44.105 9.43287C43.6432 9.12497 43.0958 8.97101 42.4629 8.97101C41.8471 8.97101 41.2911 9.12497 40.7951 9.43287C40.3161 9.72367 39.9312 10.1428 39.6404 10.6901C39.3668 11.2204 39.2299 11.8619 39.2299 12.6145V20.7996H36.8437Z"
        fill="white"
      />
      <path
        d="M27.6302 21.1075C26.6381 21.1075 25.74 20.8766 24.9361 20.4148C24.1492 19.9529 23.5334 19.3114 23.0886 18.4904C22.661 17.6522 22.4472 16.6943 22.4472 15.6166V6.96967H24.8334V15.36C24.8334 16.0443 24.9703 16.643 25.244 17.1561C25.5348 17.6693 25.9282 18.0713 26.4243 18.3621C26.9374 18.6529 27.519 18.7983 28.169 18.7983C28.8191 18.7983 29.3921 18.6529 29.8882 18.3621C30.4013 18.0713 30.7948 17.6522 31.0685 17.1048C31.3593 16.5574 31.5047 15.9074 31.5047 15.1548V6.96967H33.9166V20.7996H31.5816V18.1055L31.9665 18.3364C31.6415 19.2088 31.0856 19.893 30.2987 20.3891C29.5289 20.8681 28.6394 21.1075 27.6302 21.1075Z"
        fill="white"
      />
      <path
        d="M81.2623 16.2443C83.2991 16.2443 84.95 14.5558 84.95 12.4728C84.95 10.39 83.2991 8.70129 81.2623 8.70129C79.2256 8.70129 77.5746 10.39 77.5746 12.4728C77.5746 14.5558 79.2256 16.2443 81.2623 16.2443Z"
        fill="#FFBE1D"
      />
      <path
        d="M13.2078 13.6125C9.15714 13.6125 6 11.4645 6 8.75146H8.59133C8.59133 9.88182 10.4975 11.1536 13.2078 11.1536C15.918 11.1536 17.8242 9.88182 17.8242 8.75146H20.4155C20.4155 11.4645 17.2584 13.6125 13.2078 13.6125Z"
        fill="white"
      />
      <path
        d="M8.68195 1.5437H6V20.8202H8.68195V12.6961V9.55713V1.5437Z"
        fill="white"
      />
      <path
        d="M17.7336 1.5437V9.57254V12.7176V20.8202H20.5831V1.5437H17.7336Z"
        fill="white"
      />
      <path
        d="M138.277 20.9536C136.926 20.9536 135.883 20.5687 135.147 19.7989C134.429 19.0292 134.069 17.9429 134.069 16.5403V9.25324H131.555V6.96963H132.068C132.684 6.96963 133.171 6.78147 133.531 6.40514C133.89 6.02881 134.069 5.53275 134.069 4.91694V3.78796H136.456V6.96963H139.56V9.25324H136.456V16.4633C136.456 16.9252 136.524 17.3271 136.661 17.6693C136.815 18.0114 137.063 18.2851 137.405 18.4903C137.747 18.6785 138.2 18.7726 138.765 18.7726C138.885 18.7726 139.03 18.764 139.201 18.7469C139.389 18.7298 139.56 18.7127 139.714 18.6956V20.7996C139.492 20.8509 139.244 20.8851 138.97 20.9022C138.697 20.9364 138.466 20.9536 138.277 20.9536Z"
        fill="white"
      />
      <path
        d="M124.382 21.1075C123.031 21.1075 121.825 20.7911 120.764 20.1582C119.721 19.5252 118.9 18.6614 118.301 17.5666C117.702 16.4719 117.403 15.2403 117.403 13.8718C117.403 12.4862 117.702 11.2546 118.301 10.177C118.9 9.09931 119.721 8.24402 120.764 7.61111C121.825 6.9782 123.031 6.66174 124.382 6.66174C125.289 6.66174 126.136 6.82425 126.922 7.14926C127.709 7.47426 128.402 7.91046 129.001 8.45784C129.599 9.00523 130.036 9.64669 130.309 10.3822L128.18 11.4086C127.855 10.6901 127.359 10.1085 126.692 9.6638C126.024 9.20194 125.255 8.97101 124.382 8.97101C123.544 8.97101 122.783 9.18484 122.099 9.61248C121.432 10.0401 120.901 10.6217 120.508 11.3573C120.114 12.0928 119.918 12.9395 119.918 13.8975C119.918 14.8212 120.114 15.6594 120.508 16.412C120.901 17.1475 121.432 17.7291 122.099 18.1568C122.783 18.5844 123.544 18.7982 124.382 18.7982C125.255 18.7982 126.024 18.5759 126.692 18.1311C127.359 17.6693 127.855 17.062 128.18 16.3094L130.309 17.387C130.036 18.1055 129.599 18.7469 129.001 19.3114C128.402 19.8588 127.709 20.295 126.922 20.62C126.136 20.945 125.289 21.1075 124.382 21.1075Z"
        fill="white"
      />
      <path
        d="M108.033 21.1075C107.126 21.1075 106.322 20.945 105.621 20.62C104.937 20.2779 104.398 19.816 104.004 19.2344C103.611 18.6357 103.414 17.9515 103.414 17.1818C103.414 16.4462 103.568 15.7876 103.876 15.206C104.201 14.6073 104.697 14.1027 105.364 13.6922C106.048 13.2817 106.904 12.9909 107.93 12.8198L113.062 11.9731V13.9744L108.469 14.7442C107.579 14.8981 106.929 15.1804 106.519 15.5909C106.125 16.0015 105.929 16.5061 105.929 17.1048C105.929 17.6693 106.151 18.1397 106.596 18.516C107.058 18.8923 107.631 19.0805 108.315 19.0805C109.187 19.0805 109.94 18.9009 110.573 18.5417C111.223 18.1653 111.728 17.6607 112.087 17.0278C112.463 16.3949 112.651 15.6936 112.651 14.9238V11.4086C112.651 10.6559 112.369 10.0487 111.805 9.58682C111.257 9.10786 110.53 8.86838 109.624 8.86838C108.837 8.86838 108.135 9.07365 107.52 9.48419C106.921 9.87762 106.476 10.4079 106.185 11.075L104.107 9.99736C104.364 9.36445 104.774 8.79996 105.339 8.30389C105.903 7.79072 106.562 7.38874 107.314 7.09794C108.067 6.80714 108.854 6.66174 109.675 6.66174C110.735 6.66174 111.668 6.86701 112.472 7.27755C113.276 7.67098 113.9 8.22692 114.345 8.94536C114.807 9.64669 115.038 10.4678 115.038 11.4086V20.7996H112.703V18.1824L113.139 18.3364C112.848 18.8838 112.455 19.3627 111.958 19.7733C111.462 20.1838 110.881 20.5088 110.214 20.7483C109.547 20.9878 108.82 21.1075 108.033 21.1075Z"
        fill="white"
      />
      <path
        d="M89.4451 20.7997V1.68402H96.1933C97.4591 1.68402 98.571 1.9235 99.5289 2.40246C100.487 2.88142 101.231 3.56565 101.761 4.45515C102.309 5.34465 102.582 6.38809 102.582 7.58549C102.582 8.7829 102.309 9.82634 101.761 10.7158C101.231 11.5882 100.487 12.2725 99.5289 12.7685C98.5881 13.2475 97.4762 13.487 96.1933 13.487H91.9596V20.7997H89.4451ZM91.9596 11.1777H96.2703C97.04 11.1777 97.7072 11.0323 98.2717 10.7415C98.8361 10.4507 99.2723 10.0316 99.5802 9.48423C99.8881 8.93685 100.042 8.30394 100.042 7.58549C100.042 6.84995 99.8881 6.21704 99.5802 5.68676C99.2723 5.13938 98.8361 4.72029 98.2717 4.42949C97.7072 4.13869 97.04 3.99329 96.2703 3.99329H91.9596V11.1777Z"
        fill="white"
      />
    </svg>
  );
};

const Navbar = () => {
  /* Copy to clipboard */

  const [copiedText, copy] = useCopyToClipboard();

  const handleCopy = (text: string) => () => {
    copy(text)
      .then(() => {
        console.log("Copied!", { text });
        toast.success("Copied to clipboard!");
      })
      .catch((error) => {
        toast.error("Failed to copy to clipboard!");
      });
  };

  /* Wallet */

  const {
    //providers,
    activeAccount,
    //connectedAccounts, getAccountInfo
  } = useWallet();

  const [accInfo, setAccInfo] = React.useState<any>(null);
  const [balance, setBalance] = React.useState<any>(null);

  // EFFECT: get voi balance
  // useEffect(() => {
  //   if (activeAccount && providers && providers.length >= 3) {
  //     getAccountInfo().then(setAccInfo);
  //   }
  // }, [activeAccount, providers]);

  // EFFECT: get voi balance
  // useEffect(() => {
  //   if (activeAccount && providers && providers.length >= 3) {
  //     const { algodClient, indexerClient } = getAlgorandClients();
  //     const ci = new arc200(TOKEN_VIA, algodClient, indexerClient);
  //     ci.arc200_balanceOf(activeAccount.address).then(
  //       (arc200_balanceOfR: any) => {
  //         if (arc200_balanceOfR.success) {
  //           setBalance(Number(arc200_balanceOfR.returnValue));
  //         }
  //       }
  //     );
  //   }
  // }, [activeAccount, providers]);

  /* Theme */

  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* Navigation */

  const navigate = useNavigate();
  const [active, setActive] = React.useState("");

  /* Popper */

  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen((previousOpen) => !previousOpen);
  };

  const canBeOpen = open && Boolean(anchorEl);
  const id = canBeOpen ? "transition-popper" : undefined;

  return (
    <>
      <NavRoot
        id="navbar-root"
        style={{
          backgroundColor: isDarkTheme ? "#20093E" : "#41137E",
          //borderBottom: isDarkTheme ? "none" : undefined,
        }}
      >
        <NavContainer>
          <Link to="/">
            <HPLogo />
            {/*<NavLogo src={HPLogo} alt="HumblePact Logo" />*/}
            {/*<NavLogo
              src={
                "https://app.humble.sh/static/media/logo-black.713382823e568c5c4d594cfd38f180f5.svg"
              }
            />*/}
          </Link>
          <NavButtonGroup sx={{ display: { xs: "none", md: "flex" } }}>
            {[
              {
                label: "Swap",
                href: "/swap",
                icon: SwapIcon,
              },
              {
                label: "Pool",
                href: "/pool",
                icon: PoolIcon,
              },
              {
                label: "Token",
                href: "/token",
                icon: TokenIcon,
              },
              /*
              {
                label: "Farm",
                href: "/farm",
                icon: FarmIcon,
              },
              */
            ].map((item) => (
              <StyledLink to={item.href}>
                <NavButton>
                  <img
                    src={item.icon}
                    alt={item.label}
                    height="24"
                    width="24"
                  />
                  <NavButtonLabel>{item.label}</NavButtonLabel>
                </NavButton>
              </StyledLink>
            ))}
          </NavButtonGroup>
          <AccountButtonGroup>
            <ConnectWallet />
            <SettingMenu />
          </AccountButtonGroup>
        </NavContainer>
      </NavRoot>
      <MobileNavRoot
        sx={{
          display: { xs: "flex", md: "none" },
        }}
      >
        <MobileNavList>
          <MobileNavContainer>
            {[
              {
                icon: HomeIcon,
                label: "Home",
                location: "/",
              },
              {
                icon: SwapIcon,
                label: "Swap",
                location: "/swap",
              },
              {
                icon: PoolIcon,
                label: "Pool",
                location: "/pool",
              },
              /*
              {
                icon: FarmIcon,
                label: "Farm",
                location: "/farm",
              },
              */
            ].map((item) => (
              <MobileNavItem
                onClick={() => {
                  navigate(item.location);
                }}
              >
                <img src={item.icon} alt={item.label} />
                <MobileNavItemLabel>{item.label}</MobileNavItemLabel>
              </MobileNavItem>
            ))}
          </MobileNavContainer>
        </MobileNavList>
      </MobileNavRoot>
    </>
  );
};

export default Navbar;
