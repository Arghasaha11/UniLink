const STORAGE_KEY = "unilink_connections";
const ACCOUNTS_KEY = "unilink_accounts";

const VALID_STATUSES = new Set(["pending", "accepted"]);

const normalizeId = (value) => String(value ?? "");

const getPairKey = (a, b) => {
  const ids = [normalizeId(a), normalizeId(b)].sort();

  return `${ids[0]}::${ids[1]}`;
};

const normalizeStatus = (status) => {
  // Older data may have used "connected".
  if (status === "accepted" || status === "connected") {
    return "accepted";
  }

  if (status === "pending") {
    return "pending";
  }

  return null;
};

const getRawConnections = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    );

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Normalize existing localStorage records so every part
// of the application works with the same structure.
//
// If duplicate records already exist for the same pair,
// an accepted connection takes precedence over pending.
const normalizeConnections = (records) => {
  const byPair = new Map();

  records.forEach((item, index) => {
    if (
      !item ||
      item.senderId == null ||
      item.receiverId == null
    ) {
      return;
    }

    const senderId = item.senderId;
    const receiverId = item.receiverId;

    if (
      !normalizeId(senderId) ||
      !normalizeId(receiverId)
    ) {
      return;
    }

    // A user cannot connect with themselves.
    if (
      normalizeId(senderId) ===
      normalizeId(receiverId)
    ) {
      return;
    }

    const status = normalizeStatus(item.status);

    if (!VALID_STATUSES.has(status)) {
      return;
    }

    const normalized = {
      id:
        item.id ??
        `${Date.now()}-${index}`,
      senderId,
      receiverId,
      status,
    };

    const pairKey = getPairKey(
      senderId,
      receiverId
    );

    const existing = byPair.get(pairKey);

    if (!existing) {
      byPair.set(pairKey, normalized);
      return;
    }

    // Accepted always wins over pending if old data
    // contains duplicate records.
    if (
      existing.status !== "accepted" &&
      normalized.status === "accepted"
    ) {
      byPair.set(pairKey, normalized);
    }
  });

  return Array.from(byPair.values());
};

const saveConnections = (connections) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(connections)
  );

  // Native "storage" doesn't fire in the same tab,
  // so use a custom event for immediate UI updates.
  window.dispatchEvent(
    new Event("unilink-connections-updated")
  );
};

// Get all connection records.
export const getConnections = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = getRawConnections();
  const normalized =
    normalizeConnections(raw);

  // Repair old/duplicate records in localStorage.
  if (
    JSON.stringify(raw) !==
    JSON.stringify(normalized)
  ) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalized)
      );
    } catch {
      // Return normalized in-memory data anyway.
    }
  }

  return normalized;
};

const createConnectionNotification = ({
  userId,
  senderId,
  message,
  link,
}) => {
  if (
    typeof window === "undefined" ||
    !userId ||
    !message
  ) {
    return;
  }

  try {
    const notifications =
      JSON.parse(
        localStorage.getItem(
          "unilink_notifications"
        )
      ) || [];

    const notification = {
      id: Date.now() + Math.random(),
      userId,
      senderId,
      type: "connection",
      message,
      link,
      read: false,
      createdAt: Date.now(),
    };

    localStorage.setItem(
      "unilink_notifications",
      JSON.stringify([
        notification,
        ...notifications,
      ])
    );

    window.dispatchEvent(
      new Event(
        "unilink-notifications-updated"
      )
    );
  } catch {
    // Ignore notification storage failures.
  }
};

// Get the connection status between two users.
//
// Direction does not matter:
// A -> B and B -> A are treated as the same connection.
export const getConnectionStatus = (
  currentUserId,
  otherUserId
) => {
  if (
    currentUserId == null ||
    otherUserId == null ||
    normalizeId(currentUserId) ===
      normalizeId(otherUserId)
  ) {
    return "none";
  }

  const pairKey = getPairKey(
    currentUserId,
    otherUserId
  );

  const connection = getConnections().find(
    (item) =>
      getPairKey(
        item.senderId,
        item.receiverId
      ) === pairKey
  );

  return connection?.status || "none";
};

// Send a connection request.
//
// If a connection already exists, return that existing
// record instead of creating another one.
export const sendConnectionRequest = (
  senderId,
  receiverId
) => {
  if (
    typeof window === "undefined" ||
    senderId == null ||
    receiverId == null ||
    normalizeId(senderId) ===
      normalizeId(receiverId)
  ) {
    return null;
  }

  const connections = getConnections();

  const pairKey = getPairKey(
    senderId,
    receiverId
  );

  const existing = connections.find(
    (item) =>
      getPairKey(
        item.senderId,
        item.receiverId
      ) === pairKey
  );

  if (existing) {
    return existing;
  }

  const newConnection = {
    id: `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`,
    senderId,
    receiverId,
    status: "pending",
  };

  saveConnections([
    ...connections,
    newConnection,
  ]);

  let senderName = "Someone";

  try {
    const accounts =
      JSON.parse(
        localStorage.getItem(
          ACCOUNTS_KEY
        )
      ) || [];

    const sender = accounts.find(
      (account) =>
        normalizeId(account.id) ===
        normalizeId(senderId)
    );

    senderName =
      sender?.name || "Someone";
  } catch {
    // Keep default name.
  }

  // Exactly one notification for a newly-created
  // connection request.
  createConnectionNotification({
    userId: receiverId,
    senderId,
    message: `${senderName} sent you a connection request.`,
    link: "/connections",
  });

  return newConnection;
};

// Get incoming pending requests for a user.
export const getIncomingRequests = (
  userId
) => {
  if (userId == null) {
    return [];
  }

  return getConnections().filter(
    (item) =>
      normalizeId(item.receiverId) ===
        normalizeId(userId) &&
      item.status === "pending"
  );
};

// Accept a connection request.
//
// userId is optional for backwards compatibility,
// but callers should provide it so the function can
// verify that the request belongs to the current user.
export const acceptConnectionRequest = (
  connectionId,
  userId = null
) => {
  if (typeof window === "undefined") {
    return null;
  }

  const connections = getConnections();

  const connection = connections.find(
    (item) =>
      String(item.id) ===
      String(connectionId)
  );

  if (!connection) {
    return null;
  }

  if (
    userId != null &&
    normalizeId(connection.receiverId) !==
      normalizeId(userId)
  ) {
    return null;
  }

  // Important:
  // Only pending -> accepted creates the notification.
  //
  // If this function is accidentally called again,
  // no second notification is created.
  if (connection.status !== "pending") {
    return connection;
  }

  const updatedConnection = {
    ...connection,
    status: "accepted",
  };

  const updatedConnections =
    connections.map((item) =>
      String(item.id) ===
      String(connectionId)
        ? updatedConnection
        : item
    );

  saveConnections(updatedConnections);

  let receiverName = "Someone";

  try {
    const accounts =
      JSON.parse(
        localStorage.getItem(
          ACCOUNTS_KEY
        )
      ) || [];

    const receiver = accounts.find(
      (account) =>
        normalizeId(account.id) ===
        normalizeId(
          connection.receiverId
        )
    );

    receiverName =
      receiver?.name || "Someone";
  } catch {
    // Keep default name.
  }

  // SINGLE SOURCE OF ACCEPTANCE NOTIFICATIONS.
  createConnectionNotification({
    userId: connection.senderId,
    senderId: connection.receiverId,
    message: `${receiverName} accepted your connection request.`,
    link: `/profile/${connection.receiverId}`,
  });

  return updatedConnection;
};

// Reject/remove a connection request.
export const rejectConnectionRequest = (
  connectionId,
  userId = null
) => {
  if (typeof window === "undefined") {
    return null;
  }

  const connections = getConnections();

  const connection = connections.find(
    (item) =>
      String(item.id) ===
      String(connectionId)
  );

  if (!connection) {
    return null;
  }

  if (
    userId != null &&
    normalizeId(connection.receiverId) !==
      normalizeId(userId)
  ) {
    return null;
  }

  const updatedConnections =
    connections.filter(
      (item) =>
        String(item.id) !==
        String(connectionId)
    );

  saveConnections(updatedConnections);

  return connection;
};

// Get all accepted connections involving the user.
export const getAcceptedConnections = (
  userId
) => {
  if (userId == null) {
    return [];
  }

  return getConnections().filter(
    (item) =>
      item.status === "accepted" &&
      (
        normalizeId(item.senderId) ===
          normalizeId(userId) ||
        normalizeId(item.receiverId) ===
          normalizeId(userId)
      )
  );
};