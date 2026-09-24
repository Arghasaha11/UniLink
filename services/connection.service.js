import { and, count, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { connections, profiles, users } from "@/db/schema";
import { ApiError } from "@/lib/api-error";

function pairKey(a, b) {
  return [a, b].sort((x, y) => x - y).join(":");
}

function serializePeerRow(row, connectionIdColumn) {
  return {
    id: row[connectionIdColumn],
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: {
      id: row.peerId,
      fullName: row.peerFullName,
      profile:
        row.peerBio || row.peerDepartment || row.peerYear
          ? {
              bio: row.peerBio,
              department: row.peerDepartment,
              year: row.peerYear,
            }
          : null,
    },
  };
}

function toPublicConnection(row) {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    requesterId: row.requesterId,
    addresseeId: row.addresseeId,
  };
}

const peerSelect = {
  connectionId: connections.id,
  status: connections.status,
  createdAt: connections.createdAt,
  updatedAt: connections.updatedAt,
  peerId: users.id,
  peerFullName: users.fullName,
  peerBio: profiles.bio,
  peerDepartment: profiles.department,
  peerYear: profiles.year,
};

function peerJoinClause(match) {
  return and(
    eq(users.id, match.peerColumn),
    or(
      eq(connections.requesterId, match.userId),
      eq(connections.addresseeId, match.userId)
    )
  );
}

async function getConnectionById(id) {
  const row = await db.query.connections.findFirst({
    where: (c, { eq }) => eq(c.id, id),
  });
  return row;
}

export async function sendConnectionRequest(requesterId, addresseeId) {
  if (requesterId === addresseeId) {
    throw new ApiError(400, "You cannot connect with yourself", "SELF_CONNECTION");
  }

  const existing = await db.query.connections.findFirst({
    where: (c, { eq }) => eq(c.pairKey, pairKey(requesterId, addresseeId)),
  });

  if (!existing) {
    const [row] = await db
      .insert(connections)
      .values({
        requesterId,
        addresseeId,
        pairKey: pairKey(requesterId, addresseeId),
        status: "pending",
      })
      .returning();
    return toPublicConnection(row);
  }

  if (existing.status === "accepted") {
    throw new ApiError(409, "You are already connected with this user", "ALREADY_CONNECTED");
  }

  if (existing.status === "pending") {
    if (existing.requesterId === requesterId) {
      throw new ApiError(409, "A connection request has already been sent", "DUPLICATE_REQUEST");
    }
    throw new ApiError(409, "This user has already sent you a connection request", "REQUEST_DUPLICATE");
  }

  const [updated] = await db
    .update(connections)
    .set({ requesterId, addresseeId, status: "pending", updatedAt: Date.now() })
    .where(eq(connections.id, existing.id))
    .returning();
  return toPublicConnection(updated);
}

export async function acceptConnectionRequest(userId, connectionId) {
  const row = await getConnectionById(connectionId);
  if (!row) {
    throw new ApiError(404, "Connection request not found", "NOT_FOUND");
  }
  if (row.addresseeId !== userId) {
    throw new ApiError(403, "You cannot accept this connection request", "FORBIDDEN");
  }
  if (row.status !== "pending") {
    throw new ApiError(400, "This request is no longer pending", "NOT_PENDING");
  }
  const [updated] = await db
    .update(connections)
    .set({ status: "accepted", updatedAt: Date.now() })
    .where(eq(connections.id, connectionId))
    .returning();
  return toPublicConnection(updated);
}

export async function rejectConnectionRequest(userId, connectionId) {
  const row = await getConnectionById(connectionId);
  if (!row) {
    throw new ApiError(404, "Connection request not found", "NOT_FOUND");
  }
  if (row.addresseeId !== userId) {
    throw new ApiError(403, "You cannot reject this connection request", "FORBIDDEN");
  }
  if (row.status !== "pending") {
    throw new ApiError(400, "This request is no longer pending", "NOT_PENDING");
  }
  const [updated] = await db
    .update(connections)
    .set({ status: "rejected", updatedAt: Date.now() })
    .where(eq(connections.id, connectionId))
    .returning();
  return toPublicConnection(updated);
}

export async function removeConnection(userId, connectionId) {
  const row = await getConnectionById(connectionId);
  if (!row) {
    throw new ApiError(404, "Connection not found", "NOT_FOUND");
  }
  if (row.requesterId !== userId && row.addresseeId !== userId) {
    throw new ApiError(403, "You cannot remove this connection", "FORBIDDEN");
  }
  await db.delete(connections).where(eq(connections.id, connectionId)).run();
}

export async function listConnections(userId, { page, limit }) {
  const isParticipant = or(
    eq(connections.requesterId, userId),
    eq(connections.addresseeId, userId)
  );

  const peerMatch = or(
    and(
      eq(connections.requesterId, userId),
      eq(users.id, connections.addresseeId)
    ),
    and(eq(connections.addresseeId, userId), eq(users.id, connections.requesterId))
  );

  const rows = await db
    .select(peerSelect)
    .from(connections)
    .innerJoin(users, peerMatch)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(isParticipant, eq(connections.status, "accepted")))
    .orderBy(desc(connections.updatedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(connections)
    .where(and(isParticipant, eq(connections.status, "accepted")));

  return {
    connections: rows.map((row) => serializePeerRow(row, "connectionId")),
    total,
    page,
    limit,
  };
}

export async function listIncomingRequests(userId, { page, limit }) {
  const rows = await db
    .select(peerSelect)
    .from(connections)
    .innerJoin(users, peerJoinClause({ userId, peerColumn: connections.requesterId }))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(connections.addresseeId, userId), eq(connections.status, "pending")))
    .orderBy(desc(connections.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(connections)
    .where(and(eq(connections.addresseeId, userId), eq(connections.status, "pending")));

  return {
    connections: rows.map((row) => serializePeerRow(row, "connectionId")),
    total,
    page,
    limit,
  };
}

export async function listOutgoingRequests(userId, { page, limit }) {
  const rows = await db
    .select(peerSelect)
    .from(connections)
    .innerJoin(users, peerJoinClause({ userId, peerColumn: connections.addresseeId }))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(connections.requesterId, userId), eq(connections.status, "pending")))
    .orderBy(desc(connections.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(connections)
    .where(and(eq(connections.requesterId, userId), eq(connections.status, "pending")));

  return {
    connections: rows.map((row) => serializePeerRow(row, "connectionId")),
    total,
    page,
    limit,
  };
}