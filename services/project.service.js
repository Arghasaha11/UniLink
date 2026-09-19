import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projectJoinRequests, projectMembers, projects } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { toPublicUser } from "./user.service";

function getProjectById(id) {
  return db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.id, id),
    with: {
      owner: { with: { profile: true, skills: { with: { skill: true } } } },
      members: {
        with: {
          user: { with: { profile: true, skills: { with: { skill: true } } } },
        },
      },
      joinRequests: {
        where: (jr, { eq }) => eq(jr.status, "pending"),
        with: {
          user: { with: { profile: true, skills: { with: { skill: true } } } },
        },
      },
    },
  });
}

function serializeMember(member) {
  return {
    role: member.role,
    joinedAt: member.createdAt,
    user: toPublicUser({ ...member.user }),
  };
}

export function toPublicProject(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    owner: toPublicUser({ ...project.owner }),
    memberCount: project.members.length,
    members: (project.members ?? []).map(serializeMember),
    joinRequests: (project.joinRequests ?? []).map((jr) => ({
      id: jr.id,
      status: jr.status,
      createdAt: jr.createdAt,
      user: toPublicUser({ ...jr.user }),
    })),
  };
}

function toPublicJoinRequest(row) {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getPublicProject(id) {
  const project = await getProjectById(id);
  if (!project) {
    throw new ApiError(404, "Project not found", "NOT_FOUND");
  }
  return toPublicProject(project);
}

export async function createProject(ownerId, { name, description }) {
  const created = await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({ ownerId, name, description })
      .returning();
    await tx
      .insert(projectMembers)
      .values({ projectId: project.id, userId: ownerId, role: "owner" })
      .run();
    return project;
  });
  return getPublicProject(created.id);
}

export async function listProjects({ page, limit }) {
  const rows = await db.query.projects.findMany({
    orderBy: (p, { desc }) => [desc(p.createdAt), desc(p.id)],
    limit,
    offset: (page - 1) * limit,
    with: {
      owner: { with: { profile: true, skills: { with: { skill: true } } } },
      members: true,
    },
  });

  const total = await db.$count(projects);

  return {
    projects: rows.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      owner: toPublicUser({ ...project.owner }),
      memberCount: project.members.length,
    })),
    total,
    page,
    limit,
  };
}

async function requireOwner(projectId, ownerId) {
  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.id, projectId),
  });
  if (!project) {
    throw new ApiError(404, "Project not found", "NOT_FOUND");
  }
  if (project.ownerId !== ownerId) {
    throw new ApiError(403, "Only the project owner can perform this action", "FORBIDDEN");
  }
  return project;
}

export async function updateProject(projectId, ownerId, data) {
  await requireOwner(projectId, ownerId);

  const patch = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
  };

  await db
    .update(projects)
    .set({ ...patch, updatedAt: Date.now() })
    .where(eq(projects.id, projectId))
    .run();

  return getPublicProject(projectId);
}

export async function deleteProject(projectId, ownerId) {
  await requireOwner(projectId, ownerId);
  await db.transaction(async (tx) => {
    await tx
      .delete(projectJoinRequests)
      .where(eq(projectJoinRequests.projectId, projectId))
      .run();
    await tx
      .delete(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
      .run();
    await tx.delete(projects).where(eq(projects.id, projectId)).run();
  });
}

export async function addProjectMember(projectId, ownerId, userId) {
  const project = await requireOwner(projectId, ownerId);
  if (project.ownerId === userId) {
    throw new ApiError(400, "The owner is already a member", "ALREADY_MEMBER");
  }

  const existing = await db.query.projectMembers.findFirst({
    where: (m, { and, eq }) =>
      and(eq(m.projectId, projectId), eq(m.userId, userId)),
  });
  if (existing) {
    throw new ApiError(409, "This user is already a project member", "ALREADY_MEMBER");
  }

  await db.insert(projectMembers).values({ projectId, userId, role: "member" }).run();
  return getPublicProject(projectId);
}

export async function removeProjectMember(projectId, ownerId, userId) {
  const project = await requireOwner(projectId, ownerId);
  if (project.ownerId === userId) {
    throw new ApiError(400, "The owner cannot be removed", "CANNOT_REMOVE_OWNER");
  }

  const deleted = await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .returning();

  if (deleted.length === 0) {
    throw new ApiError(404, "This user is not a project member", "NOT_FOUND");
  }

  return getPublicProject(projectId);
}

export async function createJoinRequest(projectId, userId) {
  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.id, projectId),
  });
  if (!project) {
    throw new ApiError(404, "Project not found", "NOT_FOUND");
  }
  if (project.ownerId === userId) {
    throw new ApiError(400, "You own this project", "OWN_PROJECT");
  }

  const isMember = await db.query.projectMembers.findFirst({
    where: (m, { and, eq }) =>
      and(eq(m.projectId, projectId), eq(m.userId, userId)),
  });
  if (isMember) {
    throw new ApiError(409, "You are already a project member", "ALREADY_MEMBER");
  }

  const existing = await db.query.projectJoinRequests.findFirst({
    where: (j, { and, eq }) =>
      and(eq(j.projectId, projectId), eq(j.userId, userId)),
  });

  if (existing) {
    if (existing.status !== "rejected") {
      throw new ApiError(409, "A join request already exists", "DUPLICATE_REQUEST");
    }
    const [updated] = await db
      .update(projectJoinRequests)
      .set({ status: "pending", updatedAt: Date.now() })
      .where(eq(projectJoinRequests.id, existing.id))
      .returning();
    return toPublicJoinRequest(updated);
  }

  const [created] = await db
    .insert(projectJoinRequests)
    .values({ projectId, userId, status: "pending" })
    .returning();
  return toPublicJoinRequest(created);
}

export async function listJoinRequests(projectId, ownerId) {
  await requireOwner(projectId, ownerId);
  const rows = await db.query.projectJoinRequests.findMany({
    where: (j, { eq }) => eq(j.projectId, projectId),
    orderBy: (j, { desc }) => desc(j.createdAt),
    with: { user: { with: { profile: true, skills: { with: { skill: true } } } } },
  });
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: row.createdAt,
    user: toPublicUser({ ...row.user }),
  }));
}

export async function decideJoinRequest(projectId, ownerId, requestId, action) {
  await requireOwner(projectId, ownerId);

  const request = await db.query.projectJoinRequests.findFirst({
    where: (j, { and, eq }) =>
      and(eq(j.id, requestId), eq(j.projectId, projectId)),
  });
  if (!request) {
    throw new ApiError(404, "Join request not found", "NOT_FOUND");
  }
  if (request.status !== "pending") {
    throw new ApiError(400, "This join request was already handled", "NOT_PENDING");
  }

  if (action === "reject") {
    await db
      .update(projectJoinRequests)
      .set({ status: "rejected", updatedAt: Date.now() })
      .where(eq(projectJoinRequests.id, requestId))
      .run();
    return getPublicProject(projectId);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(projectJoinRequests)
      .set({ status: "accepted", updatedAt: Date.now() })
      .where(eq(projectJoinRequests.id, requestId))
      .run();
    await tx
      .insert(projectMembers)
      .values({ projectId, userId: request.userId, role: "member" })
      .onConflictDoNothing()
      .run();
  });

  return getPublicProject(projectId);
}