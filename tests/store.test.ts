import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reserveRun, saveRun } from "../lab/store.ts";
import { runReference } from "../lab/reference.ts";
import { scriptedProvider } from "../lab/providers.ts";
import { checkResult } from "../lab/check-result.ts";

test("先保留唯一运行目录，重复 id 与覆写证据被拒绝", async () => {
  const root = await mkdtemp(join(tmpdir(), "harness-store-"));
  try {
    const first = await reserveRun(root);
    await assert.rejects(reserveRun(root, first.id), { code: "EEXIST" });
    await assert.rejects(reserveRun(root, "../../escape"));
    const run = await runReference(scriptedProvider(), { id: first.id });
    await saveRun(first.directory, run, checkResult(run));
    const before = await readFile(join(first.directory, "result.json"), "utf8");
    await assert.rejects(saveRun(first.directory, run, checkResult(run)), { code: "EEXIST" });
    assert.equal(await readFile(join(first.directory, "result.json"), "utf8"), before);
    assert.equal(JSON.parse(before).events.at(-1).kind, "run.finished");
    assert.notEqual((await reserveRun(root)).id, first.id);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("停止说明真正写入结果文件", async () => {
  const root = await mkdtemp(join(tmpdir(), "harness-stop-"));
  try {
    const entry = await reserveRun(root);
    const run = await runReference(scriptedProvider("repeat"), { id: entry.id });
    await saveRun(entry.directory, run, checkResult(run));
    const result = JSON.parse(await readFile(join(entry.directory, "result.json"), "utf8"));
    assert.equal(result.status, "blocked"); assert.equal(result.executed, 0); assert.match(result.reason, /全部未执行/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
