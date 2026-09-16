import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLabServer } from "../lab/server.ts";
import { request as httpRequest } from "node:http";

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "harness-http-"));
  const server = createLabServer({ runsRoot: root, delayMs: 0, liveConfig() { throw new Error("disabled"); } });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing port");
  const origin = `http://127.0.0.1:${address.port}`;
  const post = (path: string, data: unknown, override = origin) => fetch(origin + path, { method: "POST", headers: { Origin: override, "Content-Type": "application/json" }, body: JSON.stringify(data) });
  return { root, origin, post, async cleanup() { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await rm(root, { recursive: true, force: true }); } };
}
test("网页/事件流/保存串通，默认无真实能力", async () => {
  const app = await setup();
  try {
    const page = await fetch(app.origin);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<option value="scripted">[^<]+<\/option><option id="live-option" value="live" disabled>/);
    const config = await (await fetch(app.origin + "/api/config")).json() as { liveEnabled: boolean };
    assert.equal(config.liveEnabled, false);
    const response = await app.post("/api/run", { mode: "scripted", scenario: "normal" });
    assert.equal(response.status, 200); assert.match(response.headers.get("content-type")!, /event-stream/);
    const messages = (await response.text()).trim().split("\n\n").map(line => JSON.parse(line.slice(6)));
    const result = messages.at(-1).data;
    assert.equal(result.status, "answered"); assert.equal(result.verification.verdict, "matched"); assert.equal(result.saved, true);
    const disk = JSON.parse(await readFile(join(app.root, result.id, "result.json"), "utf8"));
    assert.equal(disk.status, result.status); assert.equal(disk.events.at(-1).kind, "run.finished");
  } finally { await app.cleanup(); }
});
test("跨站请求、未知参数和未经启用的真实调用被拒绝", async () => {
  const app = await setup();
  try {
    assert.equal((await app.post("/api/run", {}, "https://evil.invalid")).status, 403);
    assert.equal((await app.post("/api/run", { mode: "live" })).status, 400);
    assert.equal((await app.post("/api/run", { maxTurns: 100 })).status, 400);
    assert.equal((await app.post("/api/run", { writePath: "/tmp/unwanted" })).status, 400);
    assert.equal((await fetch(app.origin + "/.env")).status, 404);
    const invalidHostStatus = await new Promise<number | undefined>((resolve, reject) => {
      const req = httpRequest(app.origin, { headers: { Host: "evil.invalid" } }, res => { res.resume(); resolve(res.statusCode); });
      req.on("error", reject); req.end();
    });
    assert.equal(invalidHostStatus, 403);
    assert.equal((await readdir(app.root)).length, 0);
  } finally { await app.cleanup(); }
});
test("独立取消请求后事件流收到真实 cancelled 终态", async () => {
  const app = await setup();
  try {
    const response = await app.post("/api/run", { scenario: "slow" });
    const reader = response.body!.getReader(); const decoder = new TextDecoder();
    let output = "";
    while (!output.includes("\n\n")) { const part = await reader.read(); output += decoder.decode(part.value, { stream: true }); }
    const accepted = JSON.parse(output.split("\n\n")[0]!.slice(6));
    assert.equal((await app.post("/api/cancel", { id: accepted.data.id })).status, 202);
    while (true) { const part = await reader.read(); if (part.done) break; output += decoder.decode(part.value, { stream: true }); }
    const result = output.trim().split("\n\n").map(line => JSON.parse(line.slice(6))).at(-1).data;
    assert.equal(result.status, "cancelled"); assert.equal(result.executed, 0); assert.equal(result.saved, true);
  } finally { await app.cleanup(); }
});
