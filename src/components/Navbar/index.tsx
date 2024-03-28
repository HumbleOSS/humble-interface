import styled from "@emotion/styled";
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import LightLogo from "static/logo-light.svg";
import DarkLogo from "static/logo-dark.svg";
import HPLogo from "static/hp-logo.svg";
import SwapIcon from "static/icon/icon-swap.svg";
import PoolIcon from "static/icon/icon-pool.svg";
import FarmIcon from "static/icon/icon-farm.svg";
import HomeIcon from "static/icon/icon-home.svg";
import ArrowDownwardIcon from "static/icon/icon-arrow-downward.svg";
import CogIcon from "static/icon/icon-cog.svg";
import ArrowDownwardIcon2 from "static/icon/icon-arrow-downward-color.svg";
import WalletIcon from "static/icon/icon-wallet.svg";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import ThemeSelector from "../ThemeSelector";

import Box from "@mui/material/Box";
import Popper from "@mui/material/Popper";
import Fade from "@mui/material/Fade";
import { useWallet } from "@txnlab/use-wallet";
import { Chip, Divider, Stack } from "@mui/material";

import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "react-toastify";

import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import { arc200 } from "ulujs";
import { TOKEN_VIA } from "../../contants/tokens";
import { getAlgorandClients } from "../../wallets";
import { arc200_balanceOf } from "ulujs/types/arc200";
import VOIIcon from "static/crypto-icons/voi/0.svg";
import VIAIcon from "static/crypto-icons/voi/6779767.svg";
import { Wallet } from "@mui/icons-material";
import { compactAddress } from "../../utils/mp";
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
  justify-content: space-between;
  align-items: flex-end;
  flex-shrink: 0;
`;

const MobileNavItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
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

  const { providers, activeAccount, connectedAccounts, getAccountInfo } =
    useWallet();

  const [accInfo, setAccInfo] = React.useState<any>(null);
  const [balance, setBalance] = React.useState<any>(null);

  // EFFECT: get voi balance
  useEffect(() => {
    if (activeAccount && providers && providers.length >= 3) {
      getAccountInfo().then(setAccInfo);
    }
  }, [activeAccount, providers]);

  // EFFECT: get voi balance
  useEffect(() => {
    if (activeAccount && providers && providers.length >= 3) {
      const { algodClient, indexerClient } = getAlgorandClients();
      const ci = new arc200(TOKEN_VIA, algodClient, indexerClient);
      ci.arc200_balanceOf(activeAccount.address).then(
        (arc200_balanceOfR: any) => {
          if (arc200_balanceOfR.success) {
            setBalance(Number(arc200_balanceOfR.returnValue));
          }
        }
      );
    }
  }, [activeAccount, providers]);

  console.log({ accInfo, balance });

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
        style={{
          backgroundColor: isDarkTheme ? "#20093E" : "#41137E",
          //borderBottom: isDarkTheme ? "none" : undefined,
        }}
      >
        <NavContainer>
          <Link to="/">
            {/*<NavLogo src={HPLogo} alt="HumblePact Logo" />*/}
            <NavLogo
              src={
                "https://app.humble.sh/static/media/logo-black.713382823e568c5c4d594cfd38f180f5.svg"
              }
            />
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
                label: "Farm",
                href: "/farm",
                icon: FarmIcon,
              },
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
              },
              {
                icon: SwapIcon,
                label: "Swap",
              },
              {
                icon: PoolIcon,
                label: "Pool",
              },
              {
                icon: FarmIcon,
                label: "Farm",
              },
            ].map((item) => (
              <MobileNavItem>
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
