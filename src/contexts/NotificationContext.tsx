import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface Notification {
  id: number;
  title: string;
  link: string;
  date: string;
}

interface NotificationContextType {
  notifications: Notification[];
  dismissedNotifications: Set<number>;
  pastNotifications: Notification[];
  handleDismissNotification: (id: number) => void;
  handleDismissAll: () => void;
  handleRestoreNotification: (id: number) => void;
  handleRestoreAll: () => void;
  notificationCount: number;
  showPastNotifications: boolean;
  setShowPastNotifications: (show: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

// Helper function to check if a notification is within a week of its date
const isNotificationActive = (dateString: string): boolean => {
  try {
    // Parse the date string (format: YYYY-MM-DD)
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If date parsing fails, consider it active
      return true;
    }

    const now = new Date();
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // Check if the notification date is within a week of now (i.e., if it's recent)
    const timeDiff = now.getTime() - date.getTime();
    const isActive = timeDiff >= 0 && timeDiff <= oneWeekInMs;

    return isActive;
  } catch (error) {
    // If date parsing fails, consider it active
    return true;
  }
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<
    Set<number>
  >(new Set());
  const [pastNotifications, setPastNotifications] = useState<Notification[]>(
    []
  );
  const [showPastNotifications, setShowPastNotifications] = useState(false);

  // Load dismissed notifications from localStorage on component mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dismissedNotifications");
      if (stored) {
        const dismissedIds = JSON.parse(stored);
        setDismissedNotifications(new Set(dismissedIds));
      }

      // Load past notifications from localStorage
      const storedPast = localStorage.getItem("pastNotifications");
      if (storedPast) {
        const pastNotifs = JSON.parse(storedPast);
        setPastNotifications(pastNotifs);
      }
    } catch (error) {
      console.warn("Failed to load notifications from localStorage:", error);
    }
  }, []);

  // Save dismissed notifications to localStorage
  const saveDismissedToStorage = (dismissedSet: Set<number>) => {
    try {
      localStorage.setItem(
        "dismissedNotifications",
        JSON.stringify(Array.from(dismissedSet))
      );
    } catch (error) {
      console.warn(
        "Failed to save dismissed notifications to localStorage:",
        error
      );
    }
  };

  // Save past notifications to localStorage
  const savePastToStorage = (pastNotifs: Notification[]) => {
    try {
      localStorage.setItem("pastNotifications", JSON.stringify(pastNotifs));
    } catch (error) {
      console.warn("Failed to save past notifications to localStorage:", error);
    }
  };

  // Handler to dismiss a single notification
  const handleDismissNotification = (id: number) => {
    const notificationToDismiss = notifications.find((n) => n.id === id);
    if (notificationToDismiss) {
      // Add to past notifications and sort by ID descending (newer first)
      const newPastNotifications = [
        ...pastNotifications,
        notificationToDismiss,
      ].sort((a, b) => b.id - a.id);
      setPastNotifications(newPastNotifications);
      savePastToStorage(newPastNotifications);
    }

    const newDismissed = new Set(dismissedNotifications);
    newDismissed.add(id);
    setDismissedNotifications(newDismissed);
    saveDismissedToStorage(newDismissed);
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  // Handler to dismiss all notifications
  const handleDismissAll = () => {
    const allIds = notifications.map((n) => n.id);
    const newDismissed = new Set([...dismissedNotifications, ...allIds]);
    setDismissedNotifications(newDismissed);
    saveDismissedToStorage(newDismissed);

    // Add all current notifications to past notifications and sort by ID descending
    const newPastNotifications = [...pastNotifications, ...notifications].sort(
      (a, b) => b.id - a.id
    );
    setPastNotifications(newPastNotifications);
    savePastToStorage(newPastNotifications);
    setNotifications([]);
  };

  // Handler to restore a single notification
  const handleRestoreNotification = (id: number) => {
    const notificationToRestore = pastNotifications.find((n) => n.id === id);
    if (notificationToRestore) {
      // Only restore if the notification is still active (within a week)
      if (isNotificationActive(notificationToRestore.date)) {
        // Remove from dismissed set
        const newDismissed = new Set(dismissedNotifications);
        newDismissed.delete(id);
        setDismissedNotifications(newDismissed);
        saveDismissedToStorage(newDismissed);

        // Add back to active notifications and sort by ID descending
        setNotifications((prev) =>
          [...prev, notificationToRestore].sort((a, b) => b.id - a.id)
        );

        // Remove from past notifications
        const newPastNotifications = pastNotifications.filter(
          (n) => n.id !== id
        );
        setPastNotifications(newPastNotifications);
        savePastToStorage(newPastNotifications);
      }
    }
  };

  // Handler to restore all past notifications
  const handleRestoreAll = () => {
    if (pastNotifications.length > 0) {
      // Only restore notifications that are still active (within a week)
      const activePastNotifications = pastNotifications.filter((n) =>
        isNotificationActive(n.date)
      );

      if (activePastNotifications.length > 0) {
        // Remove all active ones from dismissed set
        const newDismissed = new Set(dismissedNotifications);
        activePastNotifications.forEach((n) => newDismissed.delete(n.id));
        setDismissedNotifications(newDismissed);
        saveDismissedToStorage(newDismissed);

        // Add all active ones back to active notifications and sort by ID descending
        setNotifications((prev) =>
          [...prev, ...activePastNotifications].sort((a, b) => b.id - a.id)
        );

        // Remove active ones from past notifications
        const newPastNotifications = pastNotifications.filter(
          (n) => !isNotificationActive(n.date)
        );
        setPastNotifications(newPastNotifications);
        savePastToStorage(newPastNotifications);
      }
    }
  };

  // Handle automatic expiration of notifications
  useEffect(() => {
    // Check for expired notifications every hour
    const interval = setInterval(() => {
      const currentNotifications = notifications.filter(
        (notification) => !dismissedNotifications.has(notification.id)
      );

      const expiredNotifications = currentNotifications.filter(
        (notification) => !isNotificationActive(notification.date)
      );

      if (expiredNotifications.length > 0) {
        // Add expired notifications to past notifications
        setPastNotifications((currentPast) => {
          const newPastNotifications = [
            ...currentPast,
            ...expiredNotifications,
          ].sort((a, b) => b.id - a.id);
          savePastToStorage(newPastNotifications);
          return newPastNotifications;
        });

        // Remove expired notifications from current notifications
        const activeNotifications = currentNotifications.filter(
          (notification) => isNotificationActive(notification.date)
        );
        setNotifications(activeNotifications);
      }
    }, 60 * 60 * 1000);

    // Also check immediately
    const currentNotifications = notifications.filter(
      (notification) => !dismissedNotifications.has(notification.id)
    );

    const expiredNotifications = currentNotifications.filter(
      (notification) => !isNotificationActive(notification.date)
    );

    if (expiredNotifications.length > 0) {
      // Add expired notifications to past notifications
      setPastNotifications((currentPast) => {
        const newPastNotifications = [
          ...currentPast,
          ...expiredNotifications,
        ].sort((a, b) => b.id - a.id);
        savePastToStorage(newPastNotifications);
        return newPastNotifications;
      });

      // Remove expired notifications from current notifications
      const activeNotifications = currentNotifications.filter((notification) =>
        isNotificationActive(notification.date)
      );
      setNotifications(activeNotifications);
    }

    return () => clearInterval(interval);
  }, [notifications, dismissedNotifications]);

  // Simulating notifications for demonstration purposes
  useEffect(() => {
    const timer = setTimeout(() => {
      const allNotifications = [
        {
          id: 1,
          title: "Voi DeFi Boost Program Goes Live on October 28th, 2024!",
          link: "https://medium.com/humbledefi/voi-defi-boost-program-goes-live-on-october-28th-2024-7d8b4c99c20a",
          date: "2024-10-26",
        },
        {
          id: 2,
          title: "Power Token $POW Goes Live on June 23rd, 2025!",
          link: "https://medium.com/@pact.fi/all-you-need-to-know-power-token-pow-the-governance-token-of-pact-dab8aa0503de",
          date: "2025-06-01",
        },
        {
          id: 3,
          title:
            "Power Up: $POW Airdrop App is Now Live – Check Your Eligibility!",
          link: "https://powapp.xyz",
          date: "2025-06-16",
        },
        {
          id: 4,
          title: "POW Rewards Update Aug 2025",
          link: "https://x.com/NicholasShella2/status/1953880964469600693",
          date: "2025-08-08",
        },
      ];

      // Filter out already dismissed notifications, only show active notifications (within a week), and sort by ID descending (newer first)
      const activeNotifications = allNotifications
        .filter(
          (notification) =>
            !dismissedNotifications.has(notification.id) &&
            isNotificationActive(notification.date)
        )
        .sort((a, b) => b.id - a.id);

      setNotifications(activeNotifications);
    }, 2000);

    return () => clearTimeout(timer);
  }, [dismissedNotifications]);

  const notificationCount = notifications.length;

  const value: NotificationContextType = {
    notifications,
    dismissedNotifications,
    pastNotifications,
    handleDismissNotification,
    handleDismissAll,
    handleRestoreNotification,
    handleRestoreAll,
    notificationCount,
    showPastNotifications,
    setShowPastNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
