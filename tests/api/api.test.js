import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { cookieValue, expectErr, expectOk, makeApiClient } from "./helpers";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

const PASS = "testpass123";
const IP = {
  alice: "10.0.0.10",
  bob: "10.0.0.11",
  carol: "10.0.0.12",
  edge: "10.1.0.7",
  flood: "203.0.113.99",
};

const state = {
  runId: "",
  req: null,
  alice: {},
  bob: {},
  carol: {},
  login: {},
};

function emailFor(name) {
  return `${name}.${state.runId}@api-test.local`;
}
function skillName(name) {
  return `TA-${state.runId}-${name}`;
}

beforeAll(async () => {
  const meta = JSON.parse(
    readFileSync(path.join(root, "tests", ".tmp", "api-run.json"), "utf8")
  );
  state.runId = meta.runId;
  state.req = makeApiClient(meta.baseUrl);

  for (const name of ["alice", "bob", "carol"]) {
    const res = await state.req("POST", "/api/auth/register", {
      ip: IP[name],
      body: { fullName: name[0].toUpperCase() + name.slice(1), email: emailFor(name), password: PASS },
    });
    const data = expectOk(res, 201);
    state[name].id = data.user.id;
    state[name].email = data.user.email;
    state[name].token = cookieValue(res);
  }
});

describe("auth", () => {
  test("POST /api/auth/login returns a session cookie", async () => {
    const res = await state.req("POST", "/api/auth/login", {
      ip: IP.alice,
      body: { email: emailFor("alice"), password: PASS },
    });
    const data = expectOk(res);
    expect(data.user.email).toBe(emailFor("alice"));
    state.login.token = cookieValue(res);
  });

  test("GET /api/auth/me returns the authenticated user with email", async () => {
    const res = await state.req("GET", "/api/auth/me", { token: state.login.token });
    const data = expectOk(res);
    expect(data.user.email).toBe(emailFor("alice"));
  });

  test("GET /api/auth/me without a cookie returns 401", async () => {
    expectErr(await state.req("GET", "/api/auth/me"), 401, "UNAUTHENTICATED");
  });

  test("POST /api/auth/login with a wrong password returns 401", async () => {
    expectErr(
      await state.req("POST", "/api/auth/login", {
        ip: IP.edge,
        body: { email: emailFor("alice"), password: "wrong-password" },
      }),
      401,
      "INVALID_CREDENTIALS"
    );
  });

  test("POST /api/auth/logout clears the token cookie", async () => {
    const res = await state.req("POST", "/api/auth/logout", { token: state.login.token });
    const data = expectOk(res);
    expect(data.loggedOut).toBe(true);
    expect(cookieValue(res)).toBe("");
  });

  test("register with a duplicate email returns 409 EMAIL_TAKEN", async () => {
    expectErr(
      await state.req("POST", "/api/auth/register", {
        ip: IP.edge,
        body: { fullName: "Dup", email: emailFor("alice"), password: PASS },
      }),
      409,
      "EMAIL_TAKEN"
    );
  });

  test("register with a short password returns 422", async () => {
    const err = expectErr(
      await state.req("POST", "/api/auth/register", {
        ip: IP.edge,
        body: { fullName: "Short", email: emailFor("short"), password: "short" },
      }),
      422,
      "VALIDATION_ERROR"
    );
    expect(err.details.some((d) => d.message.includes("at least 8"))).toBe(true);
  });

  test("register rejects a password over 72 bytes (M1 regression)", async () => {
    const err = expectErr(
      await state.req("POST", "/api/auth/register", {
        ip: IP.edge,
        body: { fullName: "Big", email: emailFor("big"), password: "x".repeat(73) },
      }),
      422,
      "VALIDATION_ERROR"
    );
    expect(err.details.some((d) => d.message.includes("72 bytes"))).toBe(true);
  });

  test("register with an unknown key returns 422", async () => {
    expectErr(
      await state.req("POST", "/api/auth/register", {
        ip: IP.edge,
        body: { fullName: "Sneaky", email: emailFor("sneaky"), password: PASS, role: "admin" },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("register with malformed JSON returns 400 INVALID_JSON", async () => {
    const res = await fetch(baseUrl() + "/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": IP.edge },
      body: "{not-json",
    });
    const json = await res.json().catch(() => null);
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("INVALID_JSON");
  });

  test("auth endpoints are rate limited (429 after 10 attempts)", async () => {
    for (let i = 0; i < 10; i++) {
      expectOk(
        await state.req("POST", "/api/auth/register", {
          ip: IP.flood,
          body: { fullName: `Flood ${i}`, email: `flood-${i}.${state.runId}@api-test.local`, password: PASS },
        }),
        201
      );
    }
    const limited = await state.req("POST", "/api/auth/register", {
      ip: IP.flood,
      body: { fullName: "Flood 11", email: `flood-11.${state.runId}@api-test.local`, password: PASS },
    });
    expectErr(limited, 429, "RATE_LIMITED");
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });
});

describe("users", () => {
  test("GET /api/users lists users", async () => {
    const data = expectOk(
      await state.req("GET", "/api/users?limit=50", { token: state.alice.token })
    );
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(3);
    expect(data.users.some((u) => u.fullName === "Alice")).toBe(true);
  });

  test("GET /api/users?query= filters by full name", async () => {
    const data = expectOk(
      await state.req("GET", "/api/users?query=Bob", { token: state.alice.token })
    );
    expect(data.users.every((u) => u.fullName === "Bob")).toBe(true);
  });

  test("GET /api/users?query=%% matches literally (L2 regression)", async () => {
    const data = expectOk(
      await state.req(`GET`, `/api/users?query=${encodeURIComponent("%")}`, {
        token: state.alice.token,
      })
    );
    expect(data.users).toEqual([]);
  });

  test("GET /api/users supports pagination", async () => {
    const data = expectOk(
      await state.req("GET", "/api/users?page=2&limit=2", { token: state.alice.token })
    );
    expect(data.page).toBe(2);
    expect(data.limit).toBe(2);
    expect(data.users.length).toBeLessThanOrEqual(2);
  });

  test("GET /api/users without auth returns 401", async () => {
    expectErr(await state.req("GET", "/api/users"), 401, "UNAUTHENTICATED");
  });

  test("GET /api/users with an invalid query returns 422", async () => {
    expectErr(await state.req("GET", "/api/users?page=0", { token: state.alice.token }), 422, "VALIDATION_ERROR");
  });

  test("GET /api/users/me returns email", async () => {
    const data = expectOk(await state.req("GET", "/api/users/me", { token: state.alice.token }));
    expect(data.user.email).toBe(emailFor("alice"));
  });

  test("PATCH /api/users/me replaces skills and dedupes them", async () => {
    const data = expectOk(
      await state.req("PATCH", "/api/users/me", {
        token: state.alice.token,
        body: { skills: [skillName("node"), skillName("node"), skillName("react")] },
      })
    );
    expect(data.user.skills.map((s) => s.name)).toEqual([skillName("node"), skillName("react")]);
  });

  test("PATCH /api/users/me with skills:null clears skills (L1 regression)", async () => {
    const data = expectOk(
      await state.req("PATCH", "/api/users/me", {
        token: state.alice.token,
        body: { skills: null },
      })
    );
    expect(data.user.skills).toEqual([]);
  });

  test("PATCH /api/users/me updates profile fields", async () => {
    const data = expectOk(
      await state.req("PATCH", "/api/users/me", {
        token: state.alice.token,
        body: { bio: "Hello", department: "CS", year: "2026" },
      })
    );
    expect(data.user.profile).toEqual({ bio: "Hello", department: "CS", year: "2026" });
  });

  test("PATCH /api/users/me with oversize bio returns 422", async () => {
    expectErr(
      await state.req("PATCH", "/api/users/me", {
        token: state.alice.token,
        body: { bio: "x".repeat(1001) },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("GET /api/users/:id reports isMe correctly", async () => {
    const self = expectOk(
      await state.req("GET", `/api/users/${state.alice.id}`, { token: state.alice.token })
    );
    expect(self.isMe).toBe(true);
    expect(self.user.fullName).toBe("Alice");

    const other = expectOk(
      await state.req("GET", `/api/users/${state.alice.id}`, { token: state.bob.token })
    );
    expect(other.isMe).toBe(false);
  });

  test("GET /api/users/:id with unknown id returns 404", async () => {
    expectErr(
      await state.req("GET", "/api/users/999999999", { token: state.alice.token }),
      404,
      "NOT_FOUND"
    );
  });

  test("GET /api/users/:id with a non-numeric id returns 422", async () => {
    expectErr(
      await state.req("GET", "/api/users/abc", { token: state.alice.token }),
      422,
      "VALIDATION_ERROR"
    );
  });
});

describe("connections", () => {
  let connAB;
  let connAC;

  test("POST /api/connections sends a pending request", async () => {
    const data = expectOk(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: state.bob.id },
      }),
      201
    );
    connAB = data.connection;
    expect(connAB.requesterId).toBe(state.alice.id);
    expect(connAB.addresseeId).toBe(state.bob.id);
    expect(connAB.status).toBe("pending");
  });

  test("POST /api/connections to yourself returns 400", async () => {
    expectErr(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: state.alice.id },
      }),
      400,
      "SELF_CONNECTION"
    );
  });

  test("duplicate request in the same direction returns 409", async () => {
    expectErr(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: state.bob.id },
      }),
      409,
      "DUPLICATE_REQUEST"
    );
  });

  test("reverse pending request returns 409 REQUEST_DUPLICATE", async () => {
    expectErr(
      await state.req("POST", "/api/connections", {
        token: state.bob.token,
        body: { userId: state.alice.id },
      }),
      409,
      "REQUEST_DUPLICATE"
    );
  });

  test("request to a nonexistent user returns 404 (FK regression)", async () => {
    expectErr(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: 999999999 },
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("GET /api/connections lists outgoing requests", async () => {
    const data = expectOk(
      await state.req("GET", "/api/connections?status=outgoing", { token: state.alice.token })
    );
    expect(data.total).toBe(1);
    expect(data.connections[0].id).toBe(connAB.id);
  });

  test("GET /api/connections lists incoming requests with peer user", async () => {
    const data = expectOk(
      await state.req("GET", "/api/connections?status=incoming", { token: state.bob.token })
    );
    expect(data.total).toBe(1);
    expect(data.connections[0].user.fullName).toBe("Alice");
  });

  test("GET /api/connections lists no connected users yet", async () => {
    const data = expectOk(
      await state.req("GET", "/api/connections?status=connected", { token: state.alice.token })
    );
    expect(data.total).toBe(0);
  });

  test("PATCH accept by the addressee connects the pair", async () => {
    const data = expectOk(
      await state.req("PATCH", `/api/connections/${connAB.id}`, {
        token: state.bob.token,
        body: { action: "accept" },
      })
    );
    expect(data.connection.status).toBe("accepted");
  });

  test("PATCH accept by the requester returns 403", async () => {
    expectErr(
      await state.req("PATCH", `/api/connections/${connAB.id}`, {
        token: state.alice.token,
        body: { action: "accept" },
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("PATCH accept again returns 400 NOT_PENDING", async () => {
    expectErr(
      await state.req("PATCH", `/api/connections/${connAB.id}`, {
        token: state.bob.token,
        body: { action: "accept" },
      }),
      400,
      "NOT_PENDING"
    );
  });

  test("accepted pair now shows as connected", async () => {
    const data = expectOk(
      await state.req("GET", "/api/connections?status=connected", { token: state.alice.token })
    );
    expect(data.total).toBe(1);
    expect(data.connections[0].user.fullName).toBe("Bob");
  });

  test("reject then re-request re-activates a pending request", async () => {
    const sent = expectOk(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: state.carol.id },
      }),
      201
    );
    connAC = sent.connection;

    const rejected = expectOk(
      await state.req("PATCH", `/api/connections/${connAC.id}`, {
        token: state.carol.token,
        body: { action: "reject" },
      })
    );
    expect(rejected.connection.status).toBe("rejected");

    const resent = expectOk(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: state.carol.id },
      }),
      201
    );
    expect(resent.connection.id).toBe(connAC.id);
    expect(resent.connection.status).toBe("pending");
  });

  test("DELETE removes the connection", async () => {
    expectOk(
      await state.req("DELETE", `/api/connections/${connAC.id}`, { token: state.alice.token })
    );
  });

  test("DELETE on a removed connection returns 404", async () => {
    expectErr(
      await state.req("DELETE", `/api/connections/${connAC.id}`, { token: state.alice.token }),
      404,
      "NOT_FOUND"
    );
  });

  test("DELETE by a stranger returns 403", async () => {
    expectErr(
      await state.req("DELETE", `/api/connections/${connAB.id}`, { token: state.carol.token }),
      403,
      "FORBIDDEN"
    );
  });

  test("GET /api/connections without auth returns 401", async () => {
    expectErr(await state.req("GET", "/api/connections"), 401, "UNAUTHENTICATED");
  });

  test("GET /api/connections with an invalid status returns 422", async () => {
    expectErr(
      await state.req("GET", "/api/connections?status=banana", { token: state.alice.token }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("PATCH with a nonexistent id returns 404", async () => {
    expectErr(
      await state.req("PATCH", "/api/connections/999999999", {
        token: state.bob.token,
        body: { action: "accept" },
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("PATCH with a non-numeric id returns 422", async () => {
    expectErr(
      await state.req("PATCH", "/api/connections/abc", {
        token: state.bob.token,
        body: { action: "accept" },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("PATCH with an invalid action returns 422", async () => {
    expectErr(
      await state.req("PATCH", `/api/connections/${connAB.id}`, {
        token: state.bob.token,
        body: { action: "maybe" },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });
});

describe("posts", () => {
  let postId;

  test("POST /api/posts creates a post", async () => {
    const data = expectOk(
      await state.req("POST", "/api/posts", {
        token: state.alice.token,
        body: { content: "Hello UniLink" },
      }),
      201
    );
    postId = data.post.id;
    expect(data.post.author.fullName).toBe("Alice");
    expect(data.post.content).toBe("Hello UniLink");
  });

  test("POST /api/posts with empty content returns 422", async () => {
    expectErr(
      await state.req("POST", "/api/posts", { token: state.alice.token, body: { content: "   " } }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("GET /api/posts lists posts with author", async () => {
    const data = expectOk(await state.req("GET", "/api/posts", { token: state.alice.token }));
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.posts[0].author.fullName).toBe("Alice");
  });

  test("GET /api/posts/:id returns the post", async () => {
    const data = expectOk(
      await state.req("GET", `/api/posts/${postId}`, { token: state.bob.token })
    );
    expect(data.post.content).toBe("Hello UniLink");
  });

  test("GET /api/posts/:id with an unknown id returns 404", async () => {
    expectErr(
      await state.req("GET", "/api/posts/999999999", { token: state.alice.token }),
      404,
      "NOT_FOUND"
    );
  });

  test("PATCH /api/posts/:id by a non-owner returns 403", async () => {
    expectErr(
      await state.req("PATCH", `/api/posts/${postId}`, {
        token: state.bob.token,
        body: { content: "hijacked" },
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("PATCH /api/posts/:id by the owner updates content", async () => {
    const data = expectOk(
      await state.req("PATCH", `/api/posts/${postId}`, {
        token: state.alice.token,
        body: { content: "Edited content" },
      })
    );
    expect(data.post.content).toBe("Edited content");
  });

  test("DELETE /api/posts/:id by a non-owner returns 403", async () => {
    expectErr(
      await state.req("DELETE", `/api/posts/${postId}`, { token: state.bob.token }),
      403,
      "FORBIDDEN"
    );
  });

  test("DELETE /api/posts/:id by the owner deletes it", async () => {
    expectOk(await state.req("DELETE", `/api/posts/${postId}`, { token: state.alice.token }));
    expectErr(
      await state.req("GET", `/api/posts/${postId}`, { token: state.alice.token }),
      404,
      "NOT_FOUND"
    );
  });

  test("POST /api/posts with an unknown key returns 422", async () => {
    expectErr(
      await state.req("POST", "/api/posts", {
        token: state.alice.token,
        body: { content: "Fine", tags: ["x"] },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });
});

describe("projects", () => {
  let projectId;
  let joinReqId;

  test("POST /api/projects creates a project with the owner as member", async () => {
    const data = expectOk(
      await state.req("POST", "/api/projects", {
        token: state.alice.token,
        body: { name: "UniLink Mobile", description: "A mobile app" },
      }),
      201
    );
    projectId = data.project.id;
    expect(data.project.memberCount).toBe(1);
    expect(data.project.members[0].role).toBe("owner");
    expect(data.project.owner.fullName).toBe("Alice");
    expect("joinRequests" in data.project).toBe(false);
  });

  test("POST /api/projects with an empty name returns 422", async () => {
    expectErr(
      await state.req("POST", "/api/projects", {
        token: state.alice.token,
        body: { name: "   " },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("GET /api/projects lists projects", async () => {
    const data = expectOk(await state.req("GET", "/api/projects", { token: state.alice.token }));
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.projects.some((p) => p.id === projectId)).toBe(true);
  });

  test("GET /api/projects/:id by a non-owner omits joinRequests (H1 regression)", async () => {
    const data = expectOk(
      await state.req("GET", `/api/projects/${projectId}`, { token: state.bob.token })
    );
    expect(data.project.memberCount).toBeGreaterThanOrEqual(1);
    expect("joinRequests" in data.project).toBe(false);
  });

  test("GET /api/projects/:id by the owner also omits joinRequests", async () => {
    const data = expectOk(
      await state.req("GET", `/api/projects/${projectId}`, { token: state.alice.token })
    );
    expect("joinRequests" in data.project).toBe(false);
  });

  test("PATCH /api/projects/:id by a non-owner returns 403", async () => {
    expectErr(
      await state.req("PATCH", `/api/projects/${projectId}`, {
        token: state.bob.token,
        body: { name: "hijacked" },
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("PATCH /api/projects/:id by the owner updates and includes pending join requests", async () => {
    const data = expectOk(
      await state.req("PATCH", `/api/projects/${projectId}`, {
        token: state.alice.token,
        body: { name: "UniLink Mobile 2.0" },
      })
    );
    expect(data.project.name).toBe("UniLink Mobile 2.0");
    expect(Array.isArray(data.project.joinRequests)).toBe(true);
    expect(data.project.joinRequests).toEqual([]);
  });

  test("POST members adds a member (owner view includes joinRequests)", async () => {
    const data = expectOk(
      await state.req("POST", `/api/projects/${projectId}/members`, {
        token: state.alice.token,
        body: { userId: state.carol.id },
      })
    );
    expect(data.project.memberCount).toBe(2);
    expect(Array.isArray(data.project.joinRequests)).toBe(true);
  });

  test("owner cannot be added again via members endpoint", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/members`, {
        token: state.alice.token,
        body: { userId: state.alice.id },
      }),
      400,
      "ALREADY_MEMBER"
    );
  });

  test("adding an existing member returns 409", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/members`, {
        token: state.alice.token,
        body: { userId: state.carol.id },
      }),
      409,
      "ALREADY_MEMBER"
    );
  });

  test("adding a nonexistent user returns 404 (FK regression)", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/members`, {
        token: state.alice.token,
        body: { userId: 999999999 },
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("adding a member by a non-owner returns 403", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/members`, {
        token: state.bob.token,
        body: { userId: state.alice.id },
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("POST join-requests creates a pending request", async () => {
    const data = expectOk(
      await state.req("POST", `/api/projects/${projectId}/join-requests`, {
        token: state.bob.token,
      }),
      201
    );
    joinReqId = data.joinRequest.id;
    expect(data.joinRequest.status).toBe("pending");
  });

  test("duplicate join request returns 409", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/join-requests`, {
        token: state.bob.token,
      }),
      409,
      "DUPLICATE_REQUEST"
    );
  });

  test("owner cannot request to join their own project", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/join-requests`, {
        token: state.alice.token,
      }),
      400,
      "OWN_PROJECT"
    );
  });

  test("GET join-requests by a non-owner returns 403", async () => {
    expectErr(
      await state.req("GET", `/api/projects/${projectId}/join-requests`, {
        token: state.bob.token,
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("GET join-requests by the owner lists the pending request", async () => {
    const data = expectOk(
      await state.req("GET", `/api/projects/${projectId}/join-requests`, {
        token: state.alice.token,
      })
    );
    const req = data.joinRequests.find((j) => j.id === joinReqId);
    expect(req.status).toBe("pending");
    expect(req.user.fullName).toBe("Bob");
  });

  test("reject marks the request handled and removes it from the pending view", async () => {
    const data = expectOk(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/${joinReqId}`, {
        token: state.alice.token,
        body: { action: "reject" },
      })
    );
    expect(data.project.joinRequests).toEqual([]);

    const listed = expectOk(
      await state.req("GET", `/api/projects/${projectId}/join-requests`, {
        token: state.alice.token,
      })
    );
    expect(listed.joinRequests.find((j) => j.id === joinReqId).status).toBe("rejected");
  });

  test("re-requesting after reject re-activates the pending request", async () => {
    const data = expectOk(
      await state.req("POST", `/api/projects/${projectId}/join-requests`, {
        token: state.bob.token,
      }),
      201
    );
    expect(data.joinRequest.id).toBe(joinReqId);
    expect(data.joinRequest.status).toBe("pending");
  });

  test("approve adds the requester as a member", async () => {
    const data = expectOk(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/${joinReqId}`, {
        token: state.alice.token,
        body: { action: "approve" },
      })
    );
    expect(data.project.memberCount).toBe(3);
    expect(data.project.members.some((m) => m.user.fullName === "Bob")).toBe(true);
    expect(data.project.joinRequests).toEqual([]);
  });

  test("approving the same request again returns 400", async () => {
    expectErr(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/${joinReqId}`, {
        token: state.alice.token,
        body: { action: "approve" },
      }),
      400,
      "NOT_PENDING"
    );
  });

  test("deciding a request by a non-owner returns 403", async () => {
    expectErr(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/${joinReqId}`, {
        token: state.bob.token,
        body: { action: "approve" },
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("deciding a nonexistent request returns 404", async () => {
    expectErr(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/999999999`, {
        token: state.alice.token,
        body: { action: "approve" },
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("deciding with an invalid action returns 422", async () => {
    expectErr(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/${joinReqId}`, {
        token: state.alice.token,
        body: { action: "maybe" },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("DELETE members removes a member", async () => {
    const data = expectOk(
      await state.req("DELETE", `/api/projects/${projectId}/members/${state.carol.id}`, {
        token: state.alice.token,
      })
    );
    expect(data.project.memberCount).toBe(2);
  });

  test("owner cannot be removed", async () => {
    expectErr(
      await state.req("DELETE", `/api/projects/${projectId}/members/${state.alice.id}`, {
        token: state.alice.token,
      }),
      400,
      "CANNOT_REMOVE_OWNER"
    );
  });

  test("removing a non-member returns 404", async () => {
    expectErr(
      await state.req("DELETE", `/api/projects/${projectId}/members/${state.carol.id}`, {
        token: state.alice.token,
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("removing a member by a non-owner returns 403", async () => {
    expectErr(
      await state.req("DELETE", `/api/projects/${projectId}/members/${state.alice.id}`, {
        token: state.bob.token,
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("DELETE /api/projects/:id by a non-owner returns 403", async () => {
    expectErr(
      await state.req("DELETE", `/api/projects/${projectId}`, { token: state.bob.token }),
      403,
      "FORBIDDEN"
    );
  });

  test("DELETE /api/projects/:id by the owner deletes the project", async () => {
    expectOk(await state.req("DELETE", `/api/projects/${projectId}`, { token: state.alice.token }));
    expectErr(
      await state.req("GET", `/api/projects/${projectId}`, { token: state.alice.token }),
      404,
      "NOT_FOUND"
    );
  });
});

function baseUrl() {
  const meta = JSON.parse(
    readFileSync(path.join(root, "tests", ".tmp", "api-run.json"), "utf8")
  );
  return meta.baseUrl;
}