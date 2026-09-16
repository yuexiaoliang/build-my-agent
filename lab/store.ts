import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { RunResult, Verification } from "./contracts.ts";

// 在任何外部调用前保留独立目录；不允许覆盖、用户指定路径或重新解释旧证据。
export async function reserveRun(root: string, id: string = randomUUID()): Promise<{ id: string; directory: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) throw new Error("无效的 run id");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const directory = join(root, id);
  await mkdir(directory, { mode: 0o700 });
  await writeFile(join(directory, "reservation.json"), JSON.stringify({ version: 1, id, createdAt: new Date().toISOString(), state: "reserved" }) + "\n", { flag: "wx", mode: 0o600 });
  return { id, directory };
}
export async function saveRun(directory: string, run: RunResult, verification: Verification): Promise<void> {
  // 结果含 run.finished；已保存不等于原始 HTTP 字节录制或可重执行副作用的检查点。
  await writeFile(join(directory, "result.json"), JSON.stringify({ ...run, verification }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
}
