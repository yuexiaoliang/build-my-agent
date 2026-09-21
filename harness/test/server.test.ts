import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { createAppServer } from "../src/server.ts";

const server = createAppServer();
let baseUrl = "";

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("health endpoint discloses synthetic mode", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, modelMode: "synthetic" });
});

test("summary response labels what the evidence can prove", async () => {
  const response = await fetch(`${baseUrl}/api/summarize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input: "登录后页面一直转圈，我明天要给客户演示，麻烦尽快处理。",
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.match(body.requestId, /^[0-9a-f-]{36}$/);
  assert.match(body.summary, /^\[合成响应\]/);
  assert.equal(body.evidence.mode, "synthetic");
  assert.match(body.evidence.doesNotProve, /真实模型质量/);
});

test("server rejects invalid input before the provider boundary", async () => {
  const response = await fetch(`${baseUrl}/api/summarize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: "   " }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "input 必须是非空字符串" });
});
