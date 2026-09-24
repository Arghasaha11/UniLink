export function generateRunId() {
  return Math.random().toString(36).slice(2, 10);
}

export function makeApiClient(baseUrl) {
  async function req(method, pathname, { token, body, ip } = {}) {
    const headers = {};
    if (body !== undefined) {
      headers["content-type"] = "application/json";
    }
    if (token) {
      headers.cookie = `token=${token}`;
    }
    if (ip) {
      headers["x-forwarded-for"] = ip;
    }
    const res = await fetch(baseUrl + pathname, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, json, headers: res.headers };
  }
  return req;
}

export function cookieValue(res, name = "token") {
  const raw = res.headers.get("set-cookie");
  if (!raw) {
    return null;
  }
  const pattern = new RegExp(`(?:^|[,\\s])${name}=([^;]*)`);
  const match = raw.match(pattern);
  return match ? match[1] : null;
}

export function expectOk(call, status = 200) {
  if (call.status !== status || !call.json || call.json.success !== true) {
    throw new Error(
      `Expected ${status} success envelope, got ${call.status}: ${JSON.stringify(call.json)}`
    );
  }
  return call.json.data;
}

export function expectErr(call, status, code) {
  if (
    call.status !== status ||
    !call.json ||
    call.json.success !== false ||
    call.json.error?.code !== code
  ) {
    throw new Error(
      `Expected ${status} ${code} error envelope, got ${call.status}: ${JSON.stringify(call.json)}`
    );
  }
  return call.json.error;
}