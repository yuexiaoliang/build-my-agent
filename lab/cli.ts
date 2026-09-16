import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runReference, boundedInteger } from "./reference.ts";
import { scriptedProvider, SCENARIOS, liveProvider, readLiveConfig } from "./providers.ts";
import type { Scenario } from "./providers.ts";
import { checkResult } from "./check-result.ts";
import { reserveRun, saveRun } from "./store.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
try {
  let scenario: Scenario = "normal", mode = "scripted", toolsEnabled = true, maxTurns = 4;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--no-tools") toolsEnabled = false;
    else if (arg === "--scenario") {
      const next = args[++i];
      if (!SCENARIOS.includes(next as Scenario)) throw new Error(`场景必须是 ${SCENARIOS.join(" / ")}`);
      scenario = next as Scenario;
    } else if (arg === "--mode") {
      mode = args[++i] ?? "";
      if (!["scripted", "live"].includes(mode)) throw new Error("mode 必须是 scripted 或 live");
    } else if (arg === "--max-turns") maxTurns = boundedInteger(Number(args[++i]), "maxTurns", 1, 8);
    else throw new Error(`未知参数：${arg}`);
  }
  if (existsSync(resolve(root, ".env"))) process.loadEnvFile(resolve(root, ".env"));
  if (mode === "live" && scenario !== "normal") throw new Error("故障场景仅用于 scripted，不发送到提供商");
  const provider = mode === "live" ? liveProvider(readLiveConfig()) : scriptedProvider(scenario);
  const reserved = await reserveRun(resolve(root, ".runs"));
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  console.log(mode === "live" ? "【真实调用：可能产生费用】" : "【合成离线演示：没有调用模型】");
  const run = await runReference(provider, { id: reserved.id, maxTurns, toolsEnabled, signal: controller.signal,
    onEvent: event => console.log(`${event.seq}. ${event.kind} ${JSON.stringify(event.detail)}`) });
  process.removeListener("SIGINT", stop);
  const verification = checkResult(run);
  await saveRun(reserved.directory, run, verification);
  console.log(`状态：${run.status}；执行 ${run.executed} 个工具；样例检查：${verification.verdict}`);
  console.log(`已保存：${reserved.directory}/result.json`);
  process.exitCode = run.status === "answered" && verification.verdict === "matched" ? 0 : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "运行失败");
  process.exitCode = 2;
}
