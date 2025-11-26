import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  useMediaQuery,
  useTheme,
  Slide,
  Fade,
  Tabs,
  Tab,
} from "@mui/material";
import { useSelector } from "react-redux";
import CloseIcon from "@mui/icons-material/Close";
import RestoreIcon from "@mui/icons-material/Restore";
import styled from "styled-components";
import { useNotifications } from "../contexts/NotificationContext";
import { RootState } from "../store/store";
import NotificationsIcon from "@mui/icons-material/Notifications";

// Helper function to format ISO date strings for display
const formatNotificationDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original string if parsing fails
    }
    
    // Format as "Month Day, Year" (e.g., "October 26, 2024")
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    return dateString; // Return original string if formatting fails
  }
};

const StyledDialog = styled(Dialog)<{ $isDarkTheme: boolean }>`
  .MuiDialog-paper {
    background: ${(props) =>
      props.$isDarkTheme 
        ? "linear-gradient(135deg, rgba(32, 9, 62, 0.98) 0%, rgba(82, 61, 136, 0.95) 100%)"
        : "rgba(255, 255, 255, 0.98)"};
    backdrop-filter: blur(25px);
    border-radius: 24px;
    border: 1px solid
      ${(props) =>
        props.$isDarkTheme
          ? "rgba(255, 190, 29, 0.2)"
          : "rgba(0, 0, 0, 0.1)"};
    max-width: 600px;
    width: 90vw;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: ${(props) =>
      props.$isDarkTheme
        ? "0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 190, 29, 0.1)"
        : "0 20px 40px rgba(0, 0, 0, 0.1)"};
  }
  
  .MuiBackdrop-root {
    background: ${(props) =>
      props.$isDarkTheme
        ? "rgba(0, 0, 0, 0.7)"
        : "rgba(0, 0, 0, 0.5)"};
    backdrop-filter: blur(4px);
  }
`;

const ModalHeader = styled(Box)<{ $isDarkTheme: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid
    ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.2)"
        : "rgba(0, 0, 0, 0.1)"};
  background: ${(props) =>
    props.$isDarkTheme
      ? "linear-gradient(135deg, rgba(255, 190, 29, 0.05) 0%, rgba(255, 190, 29, 0.02) 100%)"
      : "rgba(0, 0, 0, 0.02)"};
`;

const ModalTitle = styled(Typography)<{ $isDarkTheme: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#FFBE1D" : "#0C0C10")};
  font-family: "Plus Jakarta Sans";
  font-size: 20px;
  font-weight: 600;
  line-height: 120%;
  text-shadow: ${(props) =>
    props.$isDarkTheme ? "0 0 20px rgba(255, 190, 29, 0.3)" : "none"};
`;

const NotificationCount = styled(Typography)<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 190, 29, 0.8)" : "rgba(0, 0, 0, 0.6)"};
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-weight: 400;
  margin-left: 8px;
`;

const CloseButton = styled(IconButton)<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 190, 29, 0.8)" : "rgba(0, 0, 0, 0.6)"};
  
  &:hover {
    background-color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.15)"
        : "rgba(0, 0, 0, 0.05)"};
    color: ${(props) =>
      props.$isDarkTheme ? "#FFBE1D" : "rgba(0, 0, 0, 0.8)"};
  }
`;

const ModalContent = styled(Box)<{ $isDarkTheme: boolean }>`
  padding: 0;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
  background: ${(props) =>
    props.$isDarkTheme
      ? "linear-gradient(135deg, rgba(32, 9, 62, 0.3) 0%, rgba(82, 61, 136, 0.2) 100%)"
      : "rgba(255, 255, 255, 0.5)"};
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.1)"
        : "rgba(0, 0, 0, 0.05)"};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.4)"
        : "rgba(0, 0, 0, 0.2)"};
    border-radius: 3px;
    
    &:hover {
      background: ${(props) =>
        props.$isDarkTheme
          ? "rgba(255, 190, 29, 0.6)"
          : "rgba(0, 0, 0, 0.3)"};
    }
  }
`;

const NotificationContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
`;

const NotificationBox = styled(Box)<{ $isDarkTheme: boolean }>`
  display: flex;
  padding: 20px;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.2)"
        : "rgba(0, 0, 0, 0.1)"};
  background: ${(props) =>
    props.$isDarkTheme
      ? "linear-gradient(135deg, rgba(255, 190, 29, 0.08) 0%, rgba(255, 190, 29, 0.03) 100%)"
      : "rgba(255, 255, 255, 0.8)"};
  transition: all 0.3s ease;
  position: relative;
  backdrop-filter: blur(10px);
  
  &:hover {
    border-color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.4)"
        : "rgba(0, 0, 0, 0.15)"};
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$isDarkTheme
        ? "0 8px 25px rgba(255, 190, 29, 0.15), 0 0 0 1px rgba(255, 190, 29, 0.1)"
        : "0 8px 25px rgba(0, 0, 0, 0.1)"};
  }
`;

const NotificationBody = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-grow: 1;
  min-width: 0;
`;

const NotificationTitle = styled(Typography)<{ $isDarkTheme: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#FFFFFF" : "#0C0C10")};
  font-family: "Plus Jakarta Sans";
  font-size: 16px;
  font-weight: 500;
  line-height: 120%;
  margin-bottom: 8px;
  word-wrap: break-word;
  text-shadow: ${(props) =>
    props.$isDarkTheme ? "0 1px 2px rgba(0, 0, 0, 0.3)" : "none"};
`;

const NotificationDate = styled(Typography)<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 190, 29, 0.7)" : "rgba(0, 0, 0, 0.5)"};
  font-family: "IBM Plex Sans Condensed";
  font-size: 12px;
  font-weight: 400;
  line-height: 120%;
  margin-bottom: 12px;
`;

const NotificationLink = styled.a<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "#FFBE1D" : "#9933FF"};
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-weight: 500;
  line-height: 120%;
  text-decoration: none;
  word-break: break-all;
  transition: all 0.2s ease;
  
  &:hover {
    text-decoration: underline;
    color: ${(props) =>
      props.$isDarkTheme ? "#FFD54F" : "#7B1FA2"};
    text-shadow: ${(props) =>
      props.$isDarkTheme ? "0 0 8px rgba(255, 190, 29, 0.4)" : "none"};
  }
`;

const DismissButton = styled(IconButton)<{ $isDarkTheme: boolean }>`
  position: absolute;
  top: 12px;
  right: 12px;
  color: ${(props) =>
    props.$isDarkTheme
      ? "rgba(255, 190, 29, 0.6)"
      : "rgba(0, 0, 0, 0.4)"};
  width: 28px;
  height: 28px;
  
  &:hover {
    color: ${(props) =>
      props.$isDarkTheme
        ? "#FFBE1D"
        : "rgba(0, 0, 0, 0.6)"};
    background-color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.15)"
        : "rgba(0, 0, 0, 0.05)"};
  }
`;

const DismissAllButton = styled.button<{ $isDarkTheme: boolean }>`
  background: ${(props) =>
    props.$isDarkTheme
      ? "linear-gradient(135deg, rgba(255, 190, 29, 0.1) 0%, rgba(255, 190, 29, 0.05) 100%)"
      : "rgba(153, 51, 255, 0.1)"};
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.3)"
        : "rgba(153, 51, 255, 0.2)"};
  color: ${(props) =>
    props.$isDarkTheme ? "#FFBE1D" : "#9933FF"};
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${(props) =>
      props.$isDarkTheme
        ? "linear-gradient(135deg, rgba(255, 190, 29, 0.2) 0%, rgba(255, 190, 29, 0.1) 100%)"
        : "rgba(153, 51, 255, 0.15)"};
    border-color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.5)"
        : "rgba(153, 51, 255, 0.3)"};
    transform: translateY(-1px);
    box-shadow: ${(props) =>
      props.$isDarkTheme
        ? "0 4px 12px rgba(255, 190, 29, 0.2)"
        : "0 4px 12px rgba(153, 51, 255, 0.2)"};
  }
`;

const EmptyState = styled(Box)<{ $isDarkTheme: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  background: ${(props) =>
    props.$isDarkTheme
      ? "linear-gradient(135deg, rgba(255, 190, 29, 0.05) 0%, rgba(255, 190, 29, 0.02) 100%)"
      : "rgba(0, 0, 0, 0.02)"};
  border-radius: 16px;
  margin: 24px;
  border: 1px dashed
    ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.3)"
        : "rgba(0, 0, 0, 0.1)"};
`;

const EmptyStateIcon = styled(Box)<{ $isDarkTheme: boolean }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${(props) =>
    props.$isDarkTheme
      ? "linear-gradient(135deg, rgba(255, 190, 29, 0.1) 0%, rgba(255, 190, 29, 0.05) 100%)"
      : "rgba(153, 51, 255, 0.1)"};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: 2px dashed
    ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.4)"
        : "rgba(153, 51, 255, 0.3)"};
  
  svg {
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 190, 29, 0.6)" : "rgba(153, 51, 255, 0.6)"};
    font-size: 32px;
  }
`;

const EmptyStateTitle = styled(Typography)<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 190, 29, 0.9)" : "rgba(0, 0, 0, 0.7)"};
  font-family: "Plus Jakarta Sans";
  font-size: 18px;
  font-weight: 600;
  line-height: 120%;
  margin-bottom: 8px;
`;

const EmptyStateText = styled(Typography)<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 190, 29, 0.7)" : "rgba(0, 0, 0, 0.5)"};
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-weight: 400;
  line-height: 120%;
  margin-bottom: 16px;
`;

const EmptyStateSubtext = styled(Typography)<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 190, 29, 0.5)" : "rgba(0, 0, 0, 0.4)"};
  font-family: "IBM Plex Sans Condensed";
  font-size: 12px;
  font-weight: 400;
  line-height: 120%;
`;

const TabContainer = styled(Box)<{ $isDarkTheme: boolean }>`
  border-bottom: 1px solid
    ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.2)"
        : "rgba(0, 0, 0, 0.1)"};
  margin-bottom: 16px;
`;

const StyledTabs = styled(Tabs)<{ $isDarkTheme: boolean }>`
  .MuiTab-root {
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 190, 29, 0.7)" : "rgba(0, 0, 0, 0.6)"};
    font-family: "Plus Jakarta Sans";
    font-weight: 500;
    text-transform: none;
    min-width: auto;
    padding: 12px 16px;
    
    &.Mui-selected {
      color: ${(props) =>
        props.$isDarkTheme ? "#FFBE1D" : "#9933FF"};
    }
  }
  
  .MuiTabs-indicator {
    background-color: ${(props) =>
      props.$isDarkTheme ? "#FFBE1D" : "#9933FF"};
  }
`;

const RestoreButton = styled(IconButton)<{ $isDarkTheme: boolean }>`
  position: absolute;
  top: 12px;
  right: 12px;
  color: ${(props) =>
    props.$isDarkTheme
      ? "rgba(255, 190, 29, 0.6)"
      : "rgba(0, 0, 0, 0.4)"};
  width: 28px;
  height: 28px;
  
  &:hover {
    color: ${(props) =>
      props.$isDarkTheme
        ? "#FFBE1D"
        : "rgba(0, 0, 0, 0.6)"};
    background-color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.15)"
        : "rgba(0, 0, 0, 0.05)"};
  }
`;

const RestoreAllButton = styled.button<{ $isDarkTheme: boolean }>`
  background: ${(props) =>
    props.$isDarkTheme
      ? "linear-gradient(135deg, rgba(255, 190, 29, 0.1) 0%, rgba(255, 190, 29, 0.05) 100%)"
      : "rgba(153, 51, 255, 0.1)"};
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.3)"
        : "rgba(153, 51, 255, 0.2)"};
  color: ${(props) =>
    props.$isDarkTheme ? "#FFBE1D" : "#9933FF"};
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 12px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    background: ${(props) =>
      props.$isDarkTheme
        ? "linear-gradient(135deg, rgba(255, 190, 29, 0.2) 0%, rgba(255, 190, 29, 0.1) 100%)"
        : "rgba(153, 51, 255, 0.15)"};
    border-color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.5)"
        : "rgba(153, 51, 255, 0.3)"};
    transform: translateY(-1px);
    box-shadow: ${(props) =>
      props.$isDarkTheme
        ? "0 4px 12px rgba(255, 190, 29, 0.2)"
        : "0 4px 12px rgba(153, 51, 255, 0.2)"};
  }
`;

const PastNotificationBox = styled(NotificationBox)<{ $isDarkTheme: boolean }>`
  opacity: 0.8;
  background: ${(props) =>
    props.$isDarkTheme
      ? "linear-gradient(135deg, rgba(255, 190, 29, 0.05) 0%, rgba(255, 190, 29, 0.02) 100%)"
      : "rgba(255, 255, 255, 0.6)"};
  border-color: ${(props) =>
    props.$isDarkTheme
      ? "rgba(255, 190, 29, 0.15)"
      : "rgba(0, 0, 0, 0.08)"};
  
  &:hover {
    opacity: 1;
    border-color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 190, 29, 0.3)"
        : "rgba(0, 0, 0, 0.12)"};
  }
`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notification-tabpanel-${index}`}
      aria-labelledby={`notification-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

interface NotificationModalProps {
  open: boolean;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  open,
  onClose,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  
  const {
    notifications,
    pastNotifications,
    handleDismissNotification,
    handleDismissAll,
    handleRestoreNotification,
    handleRestoreAll,
    notificationCount,
    showPastNotifications,
    setShowPastNotifications,
  } = useNotifications();

  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setShowPastNotifications(newValue === 1);
  };

  const handleClose = () => {
    onClose();
    setTabValue(0);
    setShowPastNotifications(false);
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={Slide}
      transitionDuration={300}
      $isDarkTheme={isDarkTheme}
    >
      <ModalHeader $isDarkTheme={isDarkTheme}>
        <Box display="flex" alignItems="center">
          <ModalTitle $isDarkTheme={isDarkTheme}>
            Notifications
          </ModalTitle>
          <NotificationCount $isDarkTheme={isDarkTheme}>
            ({notificationCount})
          </NotificationCount>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {tabValue === 0 && notificationCount > 1 && (
            <DismissAllButton
              $isDarkTheme={isDarkTheme}
              onClick={handleDismissAll}
            >
              Dismiss All
            </DismissAllButton>
          )}
          {tabValue === 1 && pastNotifications.length > 0 && (
            <RestoreAllButton
              $isDarkTheme={isDarkTheme}
              onClick={handleRestoreAll}
            >
              <RestoreIcon fontSize="small" />
              Restore All
            </RestoreAllButton>
          )}
          <CloseButton
            $isDarkTheme={isDarkTheme}
            onClick={handleClose}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </CloseButton>
        </Box>
      </ModalHeader>
      
      <ModalContent $isDarkTheme={isDarkTheme}>
        <TabContainer $isDarkTheme={isDarkTheme}>
          <StyledTabs
            $isDarkTheme={isDarkTheme}
            value={tabValue}
            onChange={handleTabChange}
            aria-label="notification tabs"
          >
            <Tab label={`Current (${notificationCount})`} />
            <Tab label={`Past (${pastNotifications.length})`} />
          </StyledTabs>
        </TabContainer>

        <TabPanel value={tabValue} index={0}>
          {notificationCount > 0 ? (
            <NotificationContainer>
              {notifications.map((notification, index) => (
                <Fade
                  key={notification.id}
                  in={true}
                  timeout={300 + index * 100}
                >
                  <NotificationBox $isDarkTheme={isDarkTheme}>
                    <NotificationBody>
                      <NotificationTitle $isDarkTheme={isDarkTheme}>
                        {notification.title}
                      </NotificationTitle>
                      {notification.type === "reward" && notification.rewardAmount && (
                        <div style={{ 
                          marginTop: "8px", 
                          fontSize: "16px", 
                          fontWeight: 600,
                          color: isDarkTheme ? "#FFBE1D" : "#4F46E5"
                        }}>
                          Amount: {notification.rewardAmount} {notification.rewardToken}
                        </div>
                      )}
                      <NotificationDate $isDarkTheme={isDarkTheme}>
                        {formatNotificationDate(notification.date)}
                      </NotificationDate>
                      <NotificationLink
                        $isDarkTheme={isDarkTheme}
                        href={notification.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={handleClose}
                      >
                        {notification.type === "reward" ? "View Transaction →" : "Learn more →"}
                      </NotificationLink>
                    </NotificationBody>
                    <DismissButton
                      $isDarkTheme={isDarkTheme}
                      onClick={() => handleDismissNotification(notification.id)}
                      size="small"
                    >
                      <CloseIcon fontSize="small" />
                    </DismissButton>
                  </NotificationBox>
                </Fade>
              ))}
            </NotificationContainer>
          ) : (
            <EmptyState $isDarkTheme={isDarkTheme}>
              <EmptyStateIcon $isDarkTheme={isDarkTheme}>
                <NotificationsIcon />
              </EmptyStateIcon>
              <EmptyStateTitle $isDarkTheme={isDarkTheme}>
                All caught up!
              </EmptyStateTitle>
              <EmptyStateText $isDarkTheme={isDarkTheme}>
                You have no new notifications at the moment.
              </EmptyStateText>
              <EmptyStateSubtext $isDarkTheme={isDarkTheme}>
                Check back later for updates on new features, announcements, and important information.
              </EmptyStateSubtext>
            </EmptyState>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {pastNotifications.length > 0 ? (
            <NotificationContainer>
              {pastNotifications.map((notification, index) => (
                <Fade
                  key={notification.id}
                  in={true}
                  timeout={300 + index * 100}
                >
                  <PastNotificationBox $isDarkTheme={isDarkTheme}>
                    <NotificationBody>
                      <NotificationTitle $isDarkTheme={isDarkTheme}>
                        {notification.title}
                      </NotificationTitle>
                      {notification.type === "reward" && notification.rewardAmount && (
                        <div style={{ 
                          marginTop: "8px", 
                          fontSize: "16px", 
                          fontWeight: 600,
                          color: isDarkTheme ? "#FFBE1D" : "#4F46E5"
                        }}>
                          Amount: {notification.rewardAmount} {notification.rewardToken}
                        </div>
                      )}
                      <NotificationDate $isDarkTheme={isDarkTheme}>
                        {formatNotificationDate(notification.date)}
                      </NotificationDate>
                      <NotificationLink
                        $isDarkTheme={isDarkTheme}
                        href={notification.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={handleClose}
                      >
                        {notification.type === "reward" ? "View Transaction →" : "Learn more →"}
                      </NotificationLink>
                    </NotificationBody>
                    <RestoreButton
                      $isDarkTheme={isDarkTheme}
                      onClick={() => handleRestoreNotification(notification.id)}
                      size="small"
                    >
                      <RestoreIcon fontSize="small" />
                    </RestoreButton>
                  </PastNotificationBox>
                </Fade>
              ))}
            </NotificationContainer>
          ) : (
            <EmptyState $isDarkTheme={isDarkTheme}>
              <EmptyStateIcon $isDarkTheme={isDarkTheme}>
                <RestoreIcon />
              </EmptyStateIcon>
              <EmptyStateTitle $isDarkTheme={isDarkTheme}>
                No past notifications
              </EmptyStateTitle>
              <EmptyStateText $isDarkTheme={isDarkTheme}>
                You haven't dismissed any notifications yet.
              </EmptyStateText>
              <EmptyStateSubtext $isDarkTheme={isDarkTheme}>
                Dismissed notifications will appear here and can be restored.
              </EmptyStateSubtext>
            </EmptyState>
          )}
        </TabPanel>
      </ModalContent>
    </StyledDialog>
  );
};

export default NotificationModal; 