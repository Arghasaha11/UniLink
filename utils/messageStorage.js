import { getConnectionStatus } from "./connectionStorage";
import { createNotification } from "./notificationStorage";

const STORAGE_KEY = "unilink_messages";

// Get all messages
export const getMessages = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
};

// Get messages between two users
export const getConversation = (
  userId,
  otherUserId
) => {
  const messages = getMessages();

  return messages
    .filter(
      (message) =>
        (
          String(message.senderId) ===
            String(userId) &&
          String(message.receiverId) ===
            String(otherUserId)
        ) ||
        (
          String(message.senderId) ===
            String(otherUserId) &&
          String(message.receiverId) ===
            String(userId)
        )
    )
    .sort(
      (a, b) =>
        Number(a.createdAt) -
        Number(b.createdAt)
    );
};

// Send a message
export const sendMessage = ({
  senderId,
  receiverId,
  text,
}) => {
  if (typeof window === "undefined") {
    return null;
  }

  if (
    senderId == null ||
    receiverId == null ||
    !text?.trim()
  ) {
    return null;
  }

  // Messaging is only allowed between accepted
  // connections.
  if (
    String(senderId) ===
      String(receiverId) ||
    getConnectionStatus(
      senderId,
      receiverId
    ) !== "accepted"
  ) {
    return null;
  }

  const messages = getMessages();

  const newMessage = {
    id: `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`,
    senderId,
    receiverId,
    text: text.trim(),
    read: false,
    createdAt: Date.now(),
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      ...messages,
      newMessage,
    ])
  );

  // Get sender's name
  let accounts = [];

  try {
    accounts =
      JSON.parse(
        localStorage.getItem(
          "unilink_accounts"
        )
      ) || [];
  } catch {
    accounts = [];
  }

  const sender = accounts.find(
    (account) =>
      String(account.id) ===
      String(senderId)
  );

  const senderName =
    sender?.name || "Someone";

  // Create notification for receiver.
  createNotification({
    userId: receiverId,
    type: "message",
    message: `${senderName} sent you a message.`,
    link: `/messages/${senderId}`,
  });

  window.dispatchEvent(
    new Event(
      "unilink-notifications-updated"
    )
  );

  return newMessage;
};

// Mark messages as read
export const markConversationAsRead = (
  userId,
  otherUserId
) => {
  if (typeof window === "undefined") {
    return;
  }

  const messages = getMessages();

  const updatedMessages =
    messages.map((message) => {
      const belongsToConversation =
        String(message.senderId) ===
          String(otherUserId) &&
        String(message.receiverId) ===
          String(userId);

      if (belongsToConversation) {
        return {
          ...message,
          read: true,
        };
      }

      return message;
    });

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedMessages)
  );
};

// Get unread message count
export const getUnreadMessageCount = (
  userId
) => {
  const messages = getMessages();

  return messages.filter(
    (message) =>
      String(message.receiverId) ===
        String(userId) &&
      !message.read
  ).length;
};

// Get unread count from a specific user
export const getUnreadFromUser = (
  userId,
  otherUserId
) => {
  const messages = getMessages();

  return messages.filter(
    (message) =>
      String(message.senderId) ===
        String(otherUserId) &&
      String(message.receiverId) ===
        String(userId) &&
      !message.read
  ).length;
};

// Get the latest message for a conversation
export const getLatestMessage = (
  userId,
  otherUserId
) => {
  const conversation =
    getConversation(
      userId,
      otherUserId
    );

  if (conversation.length === 0) {
    return null;
  }

  return conversation[
    conversation.length - 1
  ];
};

// Get all users that the current user has
// conversations with
export const getConversationUserIds = (
  userId
) => {
  const messages = getMessages();

  const userIds = new Set();

  messages.forEach((message) => {
    if (
      String(message.senderId) ===
      String(userId)
    ) {
      userIds.add(
        String(message.receiverId)
      );
    }

    if (
      String(message.receiverId) ===
      String(userId)
    ) {
      userIds.add(
        String(message.senderId)
      );
    }
  });

  return Array.from(userIds);
};

// Delete an entire conversation
export const deleteConversation = (
  userId,
  otherUserId
) => {
  if (typeof window === "undefined") {
    return;
  }

  const messages = getMessages();

  const updatedMessages =
    messages.filter(
      (message) =>
        !(
          (
            String(message.senderId) ===
              String(userId) &&
            String(message.receiverId) ===
              String(otherUserId)
          ) ||
          (
            String(message.senderId) ===
              String(otherUserId) &&
            String(message.receiverId) ===
              String(userId)
          )
        )
    );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedMessages)
  );
};