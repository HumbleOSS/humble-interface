import styled from "@emotion/styled";
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SwapLogo from "../../components/SVG/Swap";
import PoolLogo from "../../components/SVG/Pool";
import TokenLogo from "../../components/SVG/Token";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import { Box, Badge, IconButton, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import ConnectWallet from "../ConnectWallet";
import MenuIcon from "@mui/icons-material/Menu";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HomeIcon from "@mui/icons-material/Home";
import BarChartIcon from "@mui/icons-material/BarChart";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { useNotifications } from "../../contexts/NotificationContext";
import NotificationModal from "../NotificationModal";

const Logo = styled.img`
  width: auto;
  height: 32px;
  transition: height 0.3s ease;
  @media (max-width: 600px) {
    height: 24px;
  }
`;

const LogoContainer = styled(Link)`
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  @media (max-width: 600px) {
    width: 32px;
    overflow: hidden;
  }
`;

const AccountButtonGroup = styled.div`
  display: flex;
  align-items: flex-end;
  gap: var(--Spacing-600, 12px);
`;

const StyledLink = styled(Link)`
  text-decoration: none;
`;

const NavButtonGroup = styled(Box)`
  display: flex;
  align-items: center;
  gap: var(--Spacing-600, 12px);
`;

const NavButton = styled.div<{ active: boolean }>`
  /* Layout */
  display: flex;
  padding: var(--Spacing-400, 8px) var(--Spacing-700, 16px);
  justify-content: center;
  align-items: center;
  gap: var(--Spacing-200, 4px);
  /* Style */
  border-radius: var(--Radius-700, 16px);
  border: 1px solid
    ${(props) =>
      !props.active
        ? "var(--Color-Brand-White, #fff)"
        : "var(--Color-Brand-Primary, #FFBE1D)"};
  color: ${(props) =>
    !props.active
      ? "var(--Color-Brand-White, #fff)"
      : "var(--Color-Brand-Primary, #FFBE1D)"};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const NavButtonLabel = styled.span`
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%;
`;

const NavRoot = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px;
  transition: background-color 0.3s ease;
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
  transition: padding 0.3s ease;
  @media screen and (max-width: 600px) {
    padding: 0px;
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #ffffff;
  height: 24px;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
`;

// Add styled components for mobile menu
const MobileMenuDrawer = styled.div<{ $isDarkTheme?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1300;
  display: flex;
  flex-direction: column;
`;

const MobileMenuContent = styled.div<{ $isDarkTheme?: boolean }>`
  background: ${(props) => (props.$isDarkTheme ? "#20093E" : "#FFFFFF")};
  padding: 16px;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
`;

const MenuItem = styled.div<{ $active?: boolean; $isDarkTheme?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;

  background: ${(props) =>
    props.$active
      ? props.$isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.05)"
      : "transparent"};

  &:hover {
    background: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  }
`;

const MenuItemLabel = styled.span<{
  $active?: boolean;
  $isDarkTheme?: boolean;
}>`
  color: ${(props) => {
    if (props.$active) {
      return props.$isDarkTheme ? "#FFBE1D" : "#9933FF";
    }
    return props.$isDarkTheme ? "#FFFFFF" : "#161717";
  }};
  font-size: 16px;
  font-weight: ${(props) => (props.$active ? "600" : "500")};
  line-height: 24px;
`;

const MenuIconWrapper = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
`;

const NotificationIconButton = styled(IconButton)<{ $isDarkTheme: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#FFFFFF")};
  margin-right: 8px;
  
  &:hover {
    background-color: ${(props) => 
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.1)"};
  }
`;

const NotificationBadge = styled(Badge)<{ $isDarkTheme: boolean }>`
  .MuiBadge-badge {
    background-color: ${(props) => (props.$isDarkTheme ? "#FFBE1D" : "#FFBE1D")};
    color: ${(props) => (props.$isDarkTheme ? "#20093E" : "#20093E")};
    font-family: "Plus Jakarta Sans";
    font-weight: 600;
    font-size: 10px;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
  }
`;

const Navbar = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = React.useState(false);
  const { notificationCount, notifications } = useNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const menuItems = [
    { path: "/", label: "Home", Icon: HomeIcon },
    { path: "/swap", label: "Swap", Icon: SwapLogo },
    { path: "/pool", label: "Pool", Icon: PoolLogo },
    //{ path: "/token", label: "Token", Icon: TokenLogo },
    //{ path: "/analytics", label: "Analytics", Icon: BarChartIcon },
    { path: "/rewards", label: "Incentives", Icon: EmojiEventsIcon },
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleNotificationClick = () => {
    setIsNotificationModalOpen(true);
  };

  const handleNotificationModalClose = () => {
    setIsNotificationModalOpen(false);
  };

  return (
    <>
      <NavRoot
        id="navbar-root"
        style={{
          backgroundColor: isDarkTheme ? "#20093E" : "#41137E",
        }}
      >
        <NavContainer>
          <LogoSection>
            <LogoContainer to="/">
              <Logo src="/logo.png" alt="Humble Swap Logo" />
            </LogoContainer>
            <MobileMenuButton onClick={() => setIsMobileMenuOpen(true)}>
              <MenuIcon
                sx={{
                  fontSize: 24,
                  display: "block",
                  height: "24px",
                }}
              />
              <KeyboardArrowDownIcon
                sx={{
                  fontSize: 16,
                  display: "block",
                  height: "24px",
                  transition: "transform 0.3s ease",
                  transform: isMobileMenuOpen ? "rotate(180deg)" : "rotate(0)",
                }}
              />
            </MobileMenuButton>
          </LogoSection>
          <NavButtonGroup sx={{ display: { xs: "none", md: "flex" } }}>
            {[
              {
                label: "Swap",
                href: "/swap",
                icon: SwapLogo,
              },
              {
                label: "Pool",
                href: "/pool",
                icon: PoolLogo,
              },
              //{
              //  label: "Token",
              //  href: "/token",
              //  icon: TokenLogo,
              //},
              // {
              //   label: "Analytics",
              //   href: "/analytics",
              //   icon: BarChartIcon,
              // },
              {
                label: "Incentives",
                href: "/rewards",
                icon: EmojiEventsIcon,
              },
            ].map((item) => {
              const Item = item.icon;
              return (
                <StyledLink key={item.label} to={item.href}>
                  <NavButton active={location.pathname === item.href}>
                    <Box sx={{ height: "25px" }}>
                      <Item />
                    </Box>
                    <NavButtonLabel>{item.label}</NavButtonLabel>
                  </NavButton>
                </StyledLink>
              );
            })}
          </NavButtonGroup>
          <AccountButtonGroup>
            {/* 
              Notification visibility logic:
              - Show in navbar on all screen sizes when there are unread notifications
            */}
            {notificationCount > 0 && (
              <Tooltip title={`${notificationCount} notification${notificationCount !== 1 ? 's' : ''} available`}>
                <NotificationIconButton
                  $isDarkTheme={isDarkTheme}
                  onClick={handleNotificationClick}
                  size="small"
                >
                  <NotificationBadge
                    $isDarkTheme={isDarkTheme}
                    badgeContent={notificationCount}
                    max={99}
                    invisible={notificationCount === 0}
                  >
                    <NotificationsIcon />
                  </NotificationBadge>
                </NotificationIconButton>
              </Tooltip>
            )}
            <ConnectWallet onMobileSidebarClose={() => setIsMobileMenuOpen(false)} />
          </AccountButtonGroup>
        </NavContainer>
      </NavRoot>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <MobileMenuDrawer
          $isDarkTheme={isDarkTheme}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <MobileMenuContent
            $isDarkTheme={isDarkTheme}
            onClick={(e) => e.stopPropagation()}
          >
            {menuItems.map(({ path, label, Icon }) => (
              <MenuItem
                key={path}
                $active={location.pathname === path}
                $isDarkTheme={isDarkTheme}
                onClick={() => handleMenuClick(path)}
              >
                <MenuIconWrapper
                  sx={{
                    svg: {
                      color:
                        location.pathname === path
                          ? isDarkTheme
                            ? "#FFBE1D"
                            : "#9933FF"
                          : isDarkTheme
                          ? "#FFFFFF"
                          : "#161717",
                    },
                  }}
                >
                  <Icon />
                </MenuIconWrapper>
                <MenuItemLabel
                  $active={location.pathname === path}
                  $isDarkTheme={isDarkTheme}
                >
                  {label}
                </MenuItemLabel>
              </MenuItem>
            ))}
            {/* 
              Mobile menu notification logic:
              - When no unread notifications: Show "Notifications" in navigation
              - When has unread notifications: Show "Notifications (X)" with badge in navigation
            */}
            {/* Show notifications in mobile navigation when there are no unread notifications */}
            {isMobile && notificationCount === 0 && (
              <MenuItem
                $isDarkTheme={isDarkTheme}
                onClick={() => {
                  handleNotificationClick();
                  setIsMobileMenuOpen(false);
                }}
              >
                <MenuIconWrapper
                  sx={{
                    svg: {
                      color: isDarkTheme ? "#FFFFFF" : "#161717",
                    },
                  }}
                >
                  <NotificationsIcon />
                </MenuIconWrapper>
                <MenuItemLabel $isDarkTheme={isDarkTheme}>
                  Notifications
                </MenuItemLabel>
              </MenuItem>
            )}
            {/* Show notifications with badge when there are unread notifications on mobile */}
            {isMobile && notificationCount > 0 && (
              <MenuItem
                $isDarkTheme={isDarkTheme}
                onClick={() => {
                  handleNotificationClick();
                  setIsMobileMenuOpen(false);
                }}
              >
                <MenuIconWrapper
                  sx={{
                    svg: {
                      color: isDarkTheme ? "#FFFFFF" : "#161717",
                    },
                  }}
                >
                  <NotificationBadge
                    $isDarkTheme={isDarkTheme}
                    badgeContent={notificationCount}
                    max={99}
                    invisible={notificationCount === 0}
                  >
                    <NotificationsIcon />
                  </NotificationBadge>
                </MenuIconWrapper>
                <MenuItemLabel $isDarkTheme={isDarkTheme}>
                  Notifications {notificationCount > 0 && `(${notificationCount})`}
                </MenuItemLabel>
              </MenuItem>
            )}
          </MobileMenuContent>
        </MobileMenuDrawer>
      )}

      {/* Notification Modal */}
      <NotificationModal
        open={isNotificationModalOpen}
        onClose={handleNotificationModalClose}
      />
    </>
  );
};

export default Navbar;
