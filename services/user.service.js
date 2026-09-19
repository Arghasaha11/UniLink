import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles, skills, userSkills, users } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { hashPassword } from "@/lib/password";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function toPublicUser(user, { withEmail = false } = {}) {
  if (!user) {
    return null;
  }
  const profile = user.profile ?? null;
  const skillsList = (user.skills ?? []).map((link) => ({
    id: link.skill.id,
    name: link.skill.name,
  }));
  const result = {
    id: user.id,
    fullName: user.fullName,
    profile: profile
      ? { bio: profile.bio, department: profile.department, year: profile.year }
      : null,
    skills: skillsList,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  if (withEmail) {
    result.email = user.email;
  }
  return result;
}

function serializeSearchRow(row) {
  const profile =
    row.bio || row.department || row.year
      ? { bio: row.bio, department: row.department, year: row.year }
      : null;
  return {
    id: row.id,
    fullName: row.fullName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    profile,
  };
}

export async function getUserById(id) {
  return db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, id),
    with: {
      profile: true,
      skills: { with: { skill: true } },
    },
  });
}

export async function getPublicUserById(id, opts) {
  const user = await getUserById(id);
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }
  return toPublicUser(user, opts);
}

export async function getUserByEmail(email) {
  return db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, normalizeEmail(email)),
  });
}

export async function createUser({ email, fullName, password }) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, normalizedEmail),
  });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists", "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email: normalizedEmail, fullName, passwordHash })
    .returning();

  await db.insert(profiles).values({ userId: user.id }).run();
  const created = await getUserById(user.id);
  return created;
}

export async function updateOwnProfile(userId, data) {
  const patch = {
    ...(data.bio !== undefined ? { bio: data.bio } : {}),
    ...(data.department !== undefined ? { department: data.department } : {}),
    ...(data.year !== undefined ? { year: data.year } : {}),
  };

  await db.transaction(async (tx) => {
    if (Object.keys(patch).length > 0) {
      await tx
        .update(profiles)
        .set({ ...patch, updatedAt: Date.now() })
        .where(eq(profiles.userId, userId));
    }

    if (data.skills !== undefined) {
      await tx.delete(userSkills).where(eq(userSkills.userId, userId));
      const normalized = data.skills.map((n) => n.trim()).filter(Boolean);
      const seen = new Map();
      for (const name of normalized) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, name);
        }
      }
      const uniqueNames = [...seen.values()];
      for (const name of uniqueNames) {
        const skillId = await ensureSkill(tx, name);
        await tx.insert(userSkills).values({ userId, skillId }).onConflictDoNothing();
      }
    }
  });

  const updated = await getUserById(userId);
  return toPublicUser(updated, { withEmail: true });
}

async function ensureSkill(client, name) {
  const trimmed = name.trim();
  const lowerName = trimmed.toLowerCase();
  const [existing] = await client
    .select({ id: skills.id, name: skills.name })
    .from(skills)
    .where(sql`lower(${skills.name}) = ${lowerName}`)
    .limit(1);
  if (existing) {
    return existing.id;
  }
  const [created] = await client.insert(skills).values({ name: trimmed }).returning();
  return created.id;
}

export async function searchUsers({ query, page, limit }) {
  const conditions = [];
  if (query) {
    conditions.push(
      or(like(users.fullName, `%${query}%`), like(profiles.department, `%${query}%`))
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      bio: profiles.bio,
      department: profiles.department,
      year: profiles.year,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(where);

  return { users: rows.map(serializeSearchRow), total, page, limit };
}