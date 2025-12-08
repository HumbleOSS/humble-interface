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
import PublicIcon from "@mui/icons-material/Public";
import BoltIcon from "@mui/icons-material/Bolt";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
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

const ExploreDropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const ExploreButton = styled.div<{ active: boolean; $isOpen: boolean }>`
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
  cursor: pointer;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean; $isDarkTheme: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: ${(props) => (props.$isDarkTheme ? "#20093E" : "#FFFFFF")};
  border-radius: var(--Radius-700, 16px);
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  z-index: 1000;
  opacity: ${(props) => (props.$isOpen ? 1 : 0)};
  visibility: ${(props) => (props.$isOpen ? "visible" : "hidden")};
  pointer-events: ${(props) => (props.$isOpen ? "auto" : "none")};
  transform: ${(props) =>
    props.$isOpen ? "translateY(0)" : "translateY(-10px)"};
  transition: all 0.2s ease;
  overflow: hidden;
`;

const DropdownMenuItem = styled.div<{
  $active: boolean;
  $isDarkTheme: boolean;
}>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  background: ${(props) =>
    props.$active
      ? props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.1)"
        : "rgba(153, 51, 255, 0.1)"
      : "transparent"};

  &:hover {
    background: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.05)"};
  }

  &:first-of-type {
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
  }

  &:last-of-type {
    border-bottom-left-radius: 16px;
    border-bottom-right-radius: 16px;
  }
`;

const DropdownMenuItemLabel = styled.span<{
  $active: boolean;
  $isDarkTheme: boolean;
}>`
  color: ${(props) => {
    if (props.$active) {
      return props.$isDarkTheme ? "#FFBE1D" : "#9933FF";
    }
    return props.$isDarkTheme ? "#FFFFFF" : "#161717";
  }};
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? "600" : "500")};
  line-height: 20px;
`;

const Navbar = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = React.useState(false);
  const [isExploreDropdownOpen, setIsExploreDropdownOpen] = React.useState(false);
  const [isTradeDropdownOpen, setIsTradeDropdownOpen] = React.useState(false);
  const { notificationCount, notifications } = useNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is on a dropdown item - if so, don't close
      if (target.closest('[data-dropdown-item]')) {
        return;
      }
      
      if (!target.closest('[data-explore-dropdown]')) {
        setIsExploreDropdownOpen(false);
      }
      if (!target.closest('[data-trade-dropdown]')) {
        setIsTradeDropdownOpen(false);
      }
    };
    
    if (isExploreDropdownOpen || isTradeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExploreDropdownOpen, isTradeDropdownOpen]);

  const menuItems = [
    { path: "/", label: "Home", Icon: HomeIcon },
    { path: "/swap", label: "Swap", Icon: SwapLogo },
    { path: "/tokens/stats", label: "Tokens", Icon: TokenLogo },
    { path: "/pool", label: "Pools", Icon: PoolLogo },
    //{ path: "/analytics", label: "Analytics", Icon: BarChartIcon },
    { path: "/rewards", label: "Incentives", Icon: EmojiEventsIcon },
  ];
  
  const exploreMenuItems = [
    { path: "/explore/tokens", label: "Tokens", icon: TokenLogo },
    { path: "/explore/pools", label: "Pools", icon: PoolLogo },
  ];
  
  const tradeMenuItems = [
    { path: "/swap", label: "Swap", icon: SwapLogo },
    { path: "/zap", label: "Zap", icon: BoltIcon },
  ];
  
  const isExploreActive = location.pathname === "/explore/tokens" || location.pathname === "/explore/pools" || location.pathname.startsWith("/explore/");
  const isTradeActive = location.pathname === "/swap" || location.pathname === "/zap" || location.pathname.startsWith("/swap/") || location.pathname.startsWith("/zap/");

  const handleMenuClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
    setIsExploreDropdownOpen(false);
    setIsTradeDropdownOpen(false);
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
            <ExploreDropdownContainer data-trade-dropdown>
              <ExploreButton
                active={isTradeActive}
                $isOpen={isTradeDropdownOpen}
                onClick={() => setIsTradeDropdownOpen(!isTradeDropdownOpen)}
              >
                <Box sx={{ height: "25px" }}>
                  <SwapHorizIcon />
                </Box>
                <NavButtonLabel>Trade</NavButtonLabel>
                <KeyboardArrowDownIcon
                  sx={{
                    fontSize: 16,
                    transition: "transform 0.3s ease",
                    transform: isTradeDropdownOpen ? "rotate(180deg)" : "rotate(0)",
                  }}
                />
              </ExploreButton>
              <DropdownMenu
                $isOpen={isTradeDropdownOpen}
                $isDarkTheme={isDarkTheme}
              >
                {tradeMenuItems.map((item) => {
                  const Item = item.icon;
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                  return (
                    <DropdownMenuItem
                      key={item.path}
                      data-dropdown-item
                      $active={isActive}
                      $isDarkTheme={isDarkTheme}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuClick(item.path);
                      }}
                    >
                      <Box sx={{ height: "20px", width: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Item />
                      </Box>
                      <DropdownMenuItemLabel
                        $active={isActive}
                        $isDarkTheme={isDarkTheme}
                      >
                        {item.label}
                      </DropdownMenuItemLabel>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenu>
            </ExploreDropdownContainer>
            <ExploreDropdownContainer data-explore-dropdown>
              <ExploreButton
                active={isExploreActive}
                $isOpen={isExploreDropdownOpen}
                onClick={() => setIsExploreDropdownOpen(!isExploreDropdownOpen)}
              >
                <Box sx={{ height: "25px" }}>
                  <PublicIcon />
                </Box>
                <NavButtonLabel>Explore</NavButtonLabel>
                <KeyboardArrowDownIcon
                  sx={{
                    fontSize: 16,
                    transition: "transform 0.3s ease",
                    transform: isExploreDropdownOpen ? "rotate(180deg)" : "rotate(0)",
                  }}
                />
              </ExploreButton>
              <DropdownMenu
                $isOpen={isExploreDropdownOpen}
                $isDarkTheme={isDarkTheme}
              >
                {exploreMenuItems.map((item) => {
                  const Item = item.icon;
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                  return (
                    <DropdownMenuItem
                      key={item.path}
                      data-dropdown-item
                      $active={isActive}
                      $isDarkTheme={isDarkTheme}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuClick(item.path);
                      }}
                    >
                      <Box sx={{ height: "20px", width: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Item />
                      </Box>
                      <DropdownMenuItemLabel
                        $active={isActive}
                        $isDarkTheme={isDarkTheme}
                      >
                        {item.label}
                      </DropdownMenuItemLabel>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenu>
            </ExploreDropdownContainer>
            {[
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
            {[
              { path: "/", label: "Home", Icon: HomeIcon },
              { path: "/rewards", label: "Incentives", Icon: EmojiEventsIcon },
            ].map(({ path, label, Icon }) => (
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
            <MenuItem
              $isDarkTheme={isDarkTheme}
              onClick={() => setIsTradeDropdownOpen(!isTradeDropdownOpen)}
            >
              <MenuIconWrapper
                sx={{
                  svg: {
                    color: isDarkTheme ? "#FFFFFF" : "#161717",
                  },
                }}
              >
                <SwapHorizIcon />
              </MenuIconWrapper>
              <MenuItemLabel $isDarkTheme={isDarkTheme}>
                Trade
              </MenuItemLabel>
              <KeyboardArrowDownIcon
                sx={{
                  fontSize: 16,
                  marginLeft: "auto",
                  transition: "transform 0.3s ease",
                  transform: isTradeDropdownOpen ? "rotate(180deg)" : "rotate(0)",
                  color: isDarkTheme ? "#FFFFFF" : "#161717",
                }}
              />
            </MenuItem>
            {isTradeDropdownOpen && tradeMenuItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path || location.pathname.startsWith(path + "/");
              return (
                <MenuItem
                  key={path}
                  data-dropdown-item
                  $active={isActive}
                  $isDarkTheme={isDarkTheme}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMenuClick(path);
                  }}
                  style={{ paddingLeft: "48px", pointerEvents: "auto" }}
                >
                  <MenuIconWrapper
                    sx={{
                      svg: {
                        color:
                          isActive
                            ? isDarkTheme
                              ? "#FFBE1D"
                              : "#9933FF"
                            : isDarkTheme
                            ? "#FFFFFF"
                            : "#161717",
                      },
                      pointerEvents: "none",
                    }}
                  >
                    <Icon />
                  </MenuIconWrapper>
                  <MenuItemLabel
                    $active={isActive}
                    $isDarkTheme={isDarkTheme}
                    style={{ pointerEvents: "none" }}
                  >
                    {label}
                  </MenuItemLabel>
                </MenuItem>
              );
            })}
            <MenuItem
              $isDarkTheme={isDarkTheme}
              onClick={() => setIsExploreDropdownOpen(!isExploreDropdownOpen)}
            >
              <MenuIconWrapper
                sx={{
                  svg: {
                    color: isDarkTheme ? "#FFFFFF" : "#161717",
                  },
                }}
              >
                <PublicIcon />
              </MenuIconWrapper>
              <MenuItemLabel $isDarkTheme={isDarkTheme}>
                Explore
              </MenuItemLabel>
              <KeyboardArrowDownIcon
                sx={{
                  fontSize: 16,
                  marginLeft: "auto",
                  transition: "transform 0.3s ease",
                  transform: isExploreDropdownOpen ? "rotate(180deg)" : "rotate(0)",
                  color: isDarkTheme ? "#FFFFFF" : "#161717",
                }}
              />
            </MenuItem>
            {isExploreDropdownOpen && exploreMenuItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path || location.pathname.startsWith(path + "/");
              return (
                <MenuItem
                  key={path}
                  data-dropdown-item
                  $active={isActive}
                  $isDarkTheme={isDarkTheme}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMenuClick(path);
                  }}
                  style={{ paddingLeft: "48px", pointerEvents: "auto" }}
                >
                  <MenuIconWrapper
                    sx={{
                      svg: {
                        color:
                          isActive
                            ? isDarkTheme
                              ? "#FFBE1D"
                              : "#9933FF"
                            : isDarkTheme
                            ? "#FFFFFF"
                            : "#161717",
                      },
                      pointerEvents: "none",
                    }}
                  >
                    <Icon />
                  </MenuIconWrapper>
                  <MenuItemLabel
                    $active={isActive}
                    $isDarkTheme={isDarkTheme}
                    style={{ pointerEvents: "none" }}
                  >
                    {label}
                  </MenuItemLabel>
                </MenuItem>
              );
            })}
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
