import * as React from "react";
import styled from "styled-components";
import { useWallet, WalletAccount } from "@txnlab/use-wallet-react";
import ArrowDownwardIcon from "static/icon/icon-arrow-downward.svg";
import OnIcon from "static/icon/icon-on.svg";
import { compactAddress } from "../../utils/mp";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import { toggleTheme } from "../../store/themeSlice";
import { useNotifications } from "../../contexts/NotificationContext";
import { useMediaQuery, useTheme, Box, Modal, Avatar, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import {
  ContentCopy as ContentCopyIcon,
  PowerSettingsNew as PowerSettingsNewIcon,
  Settings as SettingsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  SwapHoriz as SwapHorizIcon,
  Close as CloseIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import WalletModal from "../modals/WalletModal";
import { SwapOptionsModal } from "../modals/SwapOptionsModal";
import NotificationModal from "../NotificationModal";
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

// Enhanced Wallet Modal Components
const WalletModalContainer = styled.div<{ $isDarkTheme?: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${(props) => (props.$isDarkTheme ? "#20093E" : "#FFFFFF")};
  border-radius: 16px;
  border: 1px solid ${(props) => 
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div<{ $isDarkTheme?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${(props) => 
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const ModalTitle = styled.h2<{ $isDarkTheme?: boolean }>`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#161717")};
`;

const CloseButton = styled.button<{ $isDarkTheme?: boolean }>`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#161717")};
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
    background: ${(props) => 
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  }
`;

const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const AccountSection = styled.div<{ $isDarkTheme?: boolean }>`
  padding: 20px 24px;
  border-bottom: 1px solid ${(props) => 
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const AccountInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const AvatarWrapper = styled.div`
  position: relative;
  width: 40px;
  height: 40px;
`;

const ProviderIconOverlay = styled.div`
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);

  img {
    width: 14px;
    height: 14px;
    border-radius: 50%;
  }
`;

const AddressSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

const AddressText = styled.span<{ $isDarkTheme?: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#161717")};
  font-size: 14px;
  font-weight: 500;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button<{ $isDarkTheme?: boolean }>`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#161717")};
  opacity: 0.7;
  transition: all 0.2s;

  &:hover {
    opacity: 1;
    background: ${(props) => 
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  }
`;

const SettingsSection = styled.div<{ $isDarkTheme?: boolean }>`
  padding: 16px 24px;
  border-bottom: 1px solid ${(props) => 
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const SettingsTitle = styled.h3<{ $isDarkTheme?: boolean }>`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#161717")};
`;

const SettingsItem = styled.div<{ $isDarkTheme?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background: ${(props) => 
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
  }
`;

const SettingsLabel = styled.span<{ $isDarkTheme?: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#161717")};
  font-size: 14px;
  font-weight: 500;
`;

const WalletsSection = styled.div`
  padding: 16px 24px;
`;

const WalletProvider = styled.div<{ $isDarkTheme?: boolean }>`
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 12px;
  background: ${(props) => 
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
  border: 1px solid ${(props) => 
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const ProviderHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const ProviderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ProviderIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`;

const ProviderName = styled.span<{ $isDarkTheme?: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#161717")};
  font-size: 14px;
  font-weight: 600;
`;

const ConnectButton = styled.button<{ $isDarkTheme?: boolean }>`
  background: ${(props) => (props.$isDarkTheme ? "#FFBE1D" : "#9933FF")};
  color: ${(props) => (props.$isDarkTheme ? "#000000" : "#FFFFFF")};
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;

const DisconnectButton = styled.button<{ $isDarkTheme?: boolean }>`
  background: transparent;
  color: ${(props) => (props.$isDarkTheme ? "#FF6B6B" : "#DC2626")};
  border: 1px solid ${(props) => (props.$isDarkTheme ? "#FF6B6B" : "#DC2626")};
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.$isDarkTheme ? "#FF6B6B" : "#DC2626")};
    color: white;
  }
`;

const AccountList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AccountItem = styled.div<{ $isDarkTheme?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${(props) => 
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)"};
  transition: background-color 0.2s;

  &:hover {
    background: ${(props) => 
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
  }
`;

const AccountAddress = styled.span<{ $isDarkTheme?: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#161717")};
  font-size: 14px;
  font-weight: 500;
`;

const SetActiveButton = styled.button<{ $isDarkTheme?: boolean }>`
  background: transparent;
  color: ${(props) => (props.$isDarkTheme ? "#FFBE1D" : "#9933FF")};
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    opacity: 0.8;
  }
`;

const DisconnectSection = styled.div<{ $isDarkTheme?: boolean }>`
  padding: 20px 24px;
  border-top: 1px solid ${(props) => 
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const DisconnectButtonLarge = styled.button<{ $isDarkTheme?: boolean }>`
  width: 100%;
  background: transparent;
  color: ${(props) => (props.$isDarkTheme ? "#FF6B6B" : "#DC2626")};
  border: 1px solid ${(props) => (props.$isDarkTheme ? "#FF6B6B" : "#DC2626")};
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background: ${(props) => (props.$isDarkTheme ? "#FF6B6B" : "#DC2626")};
    color: white;
  }
`;

const ClearAppDataButton = styled.button<{ $isDarkTheme?: boolean }>`
  width: 100%;
  background: transparent;
  border: none;
  color: ${(props) => (props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)")};
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: underline;
  margin-top: 8px;

  &:hover {
    color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#000000")};
    opacity: 1;
  }
`;

function BasicMenu({ onMobileSidebarClose }: { onMobileSidebarClose?: () => void }) {
  const { activeAccount, activeWallet, wallets, activeWalletAccounts } = useWallet();
  const [isWalletModalOpen, setIsWalletModalOpen] = React.useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = React.useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = React.useState(false);
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = React.useState(false);
  const isDarkTheme = useSelector((state: RootState) => state.theme.isDarkTheme);
  const dispatch = useDispatch();
  const { notificationCount, notifications } = useNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard!");
  };

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const handleDisconnect = () => {
    activeWallet?.disconnect();
    setIsWalletModalOpen(false);
  };

  const handleClearAppDataClick = () => {
    setIsClearDataDialogOpen(true);
  };

  const handleClearAppDataConfirm = async () => {
    try {
      // Clear all localStorage
      localStorage.clear();

      // Clear IndexedDB
      const dbname = "dexDatabase";
      const deleteRequest = indexedDB.deleteDatabase(dbname);
      
      await new Promise<void>((resolve, reject) => {
        deleteRequest.onsuccess = () => {
          console.log("IndexedDB deleted successfully");
          resolve();
        };
        deleteRequest.onerror = () => {
          console.error("Error deleting IndexedDB:", deleteRequest.error);
          // Continue even if IndexedDB deletion fails
          resolve();
        };
        deleteRequest.onblocked = () => {
          console.warn("IndexedDB deletion blocked");
          // Continue anyway
          resolve();
        };
      });

      toast.success("App data cleared successfully!");
      setIsClearDataDialogOpen(false);
      setIsWalletModalOpen(false);
      // Reload the page to apply changes
      window.location.reload();
    } catch (error) {
      console.error("Error clearing app data:", error);
      toast.error("Error clearing app data. Please try again.");
    }
  };

  const handleClearDataDialogClose = () => {
    setIsClearDataDialogOpen(false);
  };

  const handleClose = () => {
    setIsWalletModalOpen(false);
    setIsSwapModalOpen(false);
    setIsNotificationModalOpen(false);
  };

  const handleNotificationClick = () => {
    setIsNotificationModalOpen(true);
  };

  const handleNotificationModalClose = () => {
    setIsNotificationModalOpen(false);
  };

  return (
    <div>
      {!activeAccount ? (
        <AccountDropdown
          onClick={(e: any) => {
            e.preventDefault();
            if (onMobileSidebarClose) {
              onMobileSidebarClose();
            }
            setIsWalletModalOpen(true);
          }}
        >
          <AccountDropdownLabel>Connect</AccountDropdownLabel>
          <img src={OnIcon} height="20" width="20" alt="connect" />
        </AccountDropdown>
      ) : (
        <AccountDropdown onClick={() => setIsWalletModalOpen(true)}>
          <AccountDropdownLabel>
            {compactAddress(activeAccount?.address || "")}
          </AccountDropdownLabel>
          <img
            style={{
              transform: isWalletModalOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s",
            }}
            src={ArrowDownwardIcon}
            alt="arrow"
          />
        </AccountDropdown>
      )}

      {/* Enhanced Wallet Modal */}
      <Modal
        open={isWalletModalOpen}
        onClose={handleClose}
        aria-labelledby="wallet-modal-title"
        aria-describedby="wallet-modal-description"
      >
        <WalletModalContainer $isDarkTheme={isDarkTheme}>
          <ModalHeader $isDarkTheme={isDarkTheme}>
            <ModalTitle $isDarkTheme={isDarkTheme}>
              {activeAccount ? "Wallet" : "Connect Wallet"}
            </ModalTitle>
            <CloseButton $isDarkTheme={isDarkTheme} onClick={handleClose}>
              <CloseIcon />
            </CloseButton>
          </ModalHeader>

          <ModalContent>
            {activeAccount && (
              <>
                <AccountSection $isDarkTheme={isDarkTheme}>
                  <AccountInfo>
                    <AvatarWrapper>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                          color: isDarkTheme ? "#FFFFFF" : "#161717",
                          fontSize: "16px",
                        }}
                      >
                        {activeAccount.address.slice(0, 2)}
                      </Avatar>
                      {activeWallet && (
                        <ProviderIconOverlay>
                          <img
                            src={activeWallet.metadata.icon}
                            alt={activeWallet.metadata.name}
                          />
                        </ProviderIconOverlay>
                      )}
                    </AvatarWrapper>
                    <AddressSection>
                      <AddressText $isDarkTheme={isDarkTheme}>
                        {compactAddress(activeAccount.address)}
                      </AddressText>
                      <IconButton
                        $isDarkTheme={isDarkTheme}
                        onClick={() => handleCopy(activeAccount.address)}
                      >
                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </AddressSection>
                  </AccountInfo>
                </AccountSection>

                <SettingsSection $isDarkTheme={isDarkTheme}>
                  <SettingsTitle $isDarkTheme={isDarkTheme}>Settings</SettingsTitle>
                  
                  <SettingsItem $isDarkTheme={isDarkTheme} onClick={handleThemeToggle}>
                    <SettingsLabel $isDarkTheme={isDarkTheme}>Theme</SettingsLabel>
                    {isDarkTheme ? (
                      <DarkModeIcon sx={{ fontSize: 20, color: "#FFBE1D" }} />
                    ) : (
                      <LightModeIcon sx={{ fontSize: 20, color: "#9933FF" }} />
                    )}
                  </SettingsItem>

                  <SettingsItem 
                    $isDarkTheme={isDarkTheme} 
                    onClick={() => {
                      setIsWalletModalOpen(false);
                      setIsSwapModalOpen(true);
                    }}
                  >
                    <SettingsLabel $isDarkTheme={isDarkTheme}>Swap Settings</SettingsLabel>
                    <SwapHorizIcon
                      sx={{
                        fontSize: 20,
                        color: isDarkTheme ? "#FFBE1D" : "#9933FF",
                      }}
                    />
                  </SettingsItem>
                </SettingsSection>

                {/* Show notifications section for larger screens */}
                {!isMobile && (
                  <SettingsSection $isDarkTheme={isDarkTheme}>
                    <SettingsTitle $isDarkTheme={isDarkTheme}>Notifications</SettingsTitle>
                    
                    <SettingsItem 
                      $isDarkTheme={isDarkTheme} 
                      onClick={handleNotificationClick}
                    >
                      <SettingsLabel $isDarkTheme={isDarkTheme}>
                        {notificationCount > 0 
                          ? `${notificationCount} notification${notificationCount !== 1 ? 's' : ''} available`
                          : "View notifications"
                        }
                      </SettingsLabel>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {notificationCount > 0 && (
                          <Box
                            sx={{
                              backgroundColor: isDarkTheme ? "#FFBE1D" : "#FFBE1D",
                              color: isDarkTheme ? "#20093E" : "#20093E",
                              borderRadius: "8px",
                              minWidth: "16px",
                              height: "16px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: 600,
                              padding: "0 4px",
                            }}
                          >
                            {notificationCount > 99 ? "99+" : notificationCount}
                          </Box>
                        )}
                        <NotificationsIcon
                          sx={{
                            fontSize: 20,
                            color: isDarkTheme ? "#FFBE1D" : "#9933FF",
                          }}
                        />
                      </Box>
                    </SettingsItem>
                  </SettingsSection>
                )}
              </>
            )}

            <WalletsSection>
              {wallets?.map((wallet) => (
                <WalletProvider key={wallet.metadata.name} $isDarkTheme={isDarkTheme}>
                  <ProviderHeader>
                    <ProviderInfo>
                      <ProviderIcon
                        style={{
                          backgroundImage: `url(${wallet.metadata.icon})`,
                        }}
                      />
                      <ProviderName $isDarkTheme={isDarkTheme}>
                        {wallet.metadata.name}
                      </ProviderName>
                    </ProviderInfo>
                    <div>
                      {activeWalletAccounts?.some((el: any) => wallet.isConnected) ? (
                        <DisconnectButton
                          $isDarkTheme={isDarkTheme}
                          onClick={() => wallet.disconnect()}
                        >
                          Disconnect
                        </DisconnectButton>
                      ) : (
                        <ConnectButton
                          $isDarkTheme={isDarkTheme}
                          onClick={() => {
                            wallet.connect();
                            if (wallet.isActive) {
                              handleClose();
                            }
                          }}
                        >
                          Connect
                        </ConnectButton>
                      )}
                    </div>
                  </ProviderHeader>
                  
                  <AccountList>
                    {wallet.accounts.map((account) => (
                      <AccountItem key={account.address} $isDarkTheme={isDarkTheme}>
                        <AccountAddress $isDarkTheme={isDarkTheme}>
                          {compactAddress(account.address)}
                        </AccountAddress>
                        {wallet.activeAccount?.address !== account.address ? (
                          <SetActiveButton
                            $isDarkTheme={isDarkTheme}
                            onClick={() => {
                              wallet.setActiveAccount(account.address);
                              handleClose();
                            }}
                          >
                            Set Active
                          </SetActiveButton>
                        ) : null}
                      </AccountItem>
                    ))}
                  </AccountList>
                </WalletProvider>
              ))}
            </WalletsSection>
          </ModalContent>

          {activeAccount && (
            <DisconnectSection $isDarkTheme={isDarkTheme}>
              <DisconnectButtonLarge $isDarkTheme={isDarkTheme} onClick={handleDisconnect}>
                <PowerSettingsNewIcon />
                Disconnect Wallet
              </DisconnectButtonLarge>
              <ClearAppDataButton $isDarkTheme={isDarkTheme} onClick={handleClearAppDataClick}>
                Clear App Data
              </ClearAppDataButton>
            </DisconnectSection>
          )}
        </WalletModalContainer>
      </Modal>

      {/* Swap Options Modal */}
      {isSwapModalOpen && (
        <SwapOptionsModal
          isDarkTheme={isDarkTheme}
          isOpen={isSwapModalOpen}
          onClose={() => setIsSwapModalOpen(false)}
        />
      )}

      {/* Notification Modal */}
      <NotificationModal
        open={isNotificationModalOpen}
        onClose={handleNotificationModalClose}
      />

      {/* Clear App Data Confirmation Dialog */}
      <Dialog
        open={isClearDataDialogOpen}
        onClose={handleClearDataDialogClose}
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme ? "#20093E" : "#FFFFFF",
            color: isDarkTheme ? "#FFFFFF" : "#161717",
          },
        }}
      >
        <DialogTitle sx={{ color: isDarkTheme ? "#FFFFFF" : "#161717" }}>
          Clear App Data
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }}>
            Are you sure you want to clear all app data? This will reset your settings, slippage preferences, and other stored data. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClearDataDialogClose}
            sx={{
              color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClearAppDataConfirm}
            variant="contained"
            sx={{
              backgroundColor: isDarkTheme ? "#FF6B6B" : "#DC2626",
              color: "#FFFFFF",
              "&:hover": {
                backgroundColor: isDarkTheme ? "#FF5252" : "#B91C1C",
              },
            }}
          >
            Clear Data
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default BasicMenu;
