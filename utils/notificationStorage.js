const STORAGE_KEY = "unilink_notifications";

export const getNotifications = (userId) => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved =
      JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    return saved
      .filter(
        (notification) =>
          String(notification.userId) === String(userId)
      )
      .sort(
        (a, b) =>
          Number(b.createdAt) - Number(a.createdAt)
      );
  } catch {
    return [];
  }
};

export const createNotification = ({
  userId,
  type = "default",
  message,
  link = "",
  senderId = null,
}) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!userId || !message) {
    return;
  }

  try {
    const notifications =
      JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    const notification = {
      id: Date.now() + Math.random(),
      userId,
      senderId,
      type,
      message,
      link,
      read: false,
      createdAt: Date.now(),
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        notification,
        ...notifications,
      ])
    );

    return notification;
  } catch {
    return;
  }
};

export const markNotificationAsRead = (
  notificationId
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const notifications =
      JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    const updated = notifications.map(
      (notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              read: true,
            }
          : notification
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );
  } catch {
    return;
  }
};

export const markAllNotificationsAsRead = (
  userId
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const notifications =
      JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    const updated = notifications.map(
      (notification) =>
        String(notification.userId) ===
        String(userId)
          ? {
              ...notification,
              read: true,
            }
          : notification
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );
  } catch {
    return;
  }
};

export const deleteNotification = (
  notificationId
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const notifications =
      JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    const updated = notifications.filter(
      (notification) =>
        notification.id !== notificationId
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );
  } catch {
    return;
  }
};

// Clear notifications for one user
export const clearNotifications = (userId) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const notifications =
      JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    const updated = notifications.filter(
      (notification) =>
        String(notification.userId) !== String(userId)
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );
  } catch {
    return;
  }
};