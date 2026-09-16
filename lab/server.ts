import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runReference, boundedInteger } from "./reference.ts";
import { scriptedProvider, liveProvider, readLiveConfig, SCENARIOS } from "./providers.ts";
import type { LiveConfig, Scenario } from "./providers.ts";
import { object } from "./protocol.ts";
import { reserveRun, saveRun } from "./store.ts";
import { checkResult } from "./check-result.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const assets = new Map([
  ["/", ["lab/web/index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["lab/web/app.js", "text/javascript; charset=utf-8"]],
  ["/style.css", ["lab/web/style.css", "text/css; charset=utf-8"]],
  ["/visuals/flow.svg", ["course/assets/flow.svg", "image/svg+xml"]],
  ["/visuals/evidence.svg", ["course/assets/evidence.svg", "image/svg+xml"]]
]);
function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}
async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (!request.headers["content-type"]?.startsWith("application/json")) throw new Error("请求必须是 JSON");
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > 8192) throw new Error("请求体过大");
    chunks.push(buffer);
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!object(parsed)) throw new Error("请求体必须是对象");
  return parsed;
}
export function createLabServer(options: { runsRoot?: string; liveConfig?: () => LiveConfig; delayMs?: number } = {}) {
  const active = new Map<string, AbortController>();
  const liveConfig = options.liveConfig ?? readLiveConfig;
  const server = createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const address = server.address();
    if (!address || typeof address === "string") return json(response, 503, { error: "服务未就绪" });
    const hosts = [`127.0.0.1:${address.port}`, `localhost:${address.port}`];
    const host = request.headers.host ?? "";
    // 只用于单用户本地实验；拒绝跨来源调用和 DNS rebinding 的 Host。
    if (!hosts.includes(host)) return json(response, 403, { error: "Host 不被允许" });
    const origin = request.headers.origin;
    if ((origin && origin !== `http://${host}`) || (request.method === "POST" && origin !== `http://${host}`)) {
      return json(response, 403, { error: "拒绝跨来源请求" });
    }
    const path = new URL(request.url ?? "/", `http://${host}`).pathname;
    try {
      if (request.method === "GET" && assets.has(path)) {
        const [file, contentType] = assets.get(path)!;
        const content = await readFile(resolve(root, file!));
        response.writeHead(200, { "Content-Type": contentType! }); response.end(content); return;
      }
      if (request.method === "GET" && path === "/api/config") {
        let liveEnabled = false;
        try { liveConfig(); liveEnabled = true; } catch { /* 未配置时只开放离线演示。 */ }
        return json(response, 200, { liveEnabled, scenarios: SCENARIOS, protocol: "run-events-v1" });
      }
      if (request.method === "POST" && path === "/api/cancel") {
        const input = await body(request);
        const controller = typeof input.id === "string" ? active.get(input.id) : undefined;
        if (!controller) return json(response, 404, { error: "运行不存在或已经结束" });
        controller.abort();
        return json(response, 202, { requested: true });
      }
      if (request.method === "POST" && path === "/api/run") {
        const input = await body(request);
        if (Object.keys(input).some(key => !["mode", "scenario", "maxTurns", "toolsEnabled", "question"].includes(key))) throw new Error("含未知参数");
        const mode = input.mode ?? "scripted";
        if (mode !== "scripted" && mode !== "live") throw new Error("未知模式");
        const scenario = input.scenario ?? "normal";
        if (!SCENARIOS.includes(scenario as Scenario)) throw new Error("未知场景");
        if (mode === "live" && scenario !== "normal") throw new Error("故障场景只用于离线模式");
        const maxTurns = boundedInteger(input.maxTurns ?? 4, "maxTurns", 1, 8);
        if (input.toolsEnabled !== undefined && typeof input.toolsEnabled !== "boolean") throw new Error("toolsEnabled 必须是布尔值");
        if (input.question !== undefined && (typeof input.question !== "string" || !input.question.trim() || input.question.length > 1000)) throw new Error("问题应为 1–1000 字符");
        if (active.size >= 2) return json(response, 429, { error: "已有两个运行，请先停止或等待结束" });
        const provider = mode === "live" ? liveProvider(liveConfig()) : scriptedProvider(scenario as Scenario, options.delayMs ?? 220);
        // reserveRun 在模型请求之前；冲突/磁盘错误时绝不先产生费用。
        const controller = new AbortController();
        const id = randomUUID();
        active.set(id, controller); // 先占槽位，避免 await 建目录时并发越过上限。
        let reserved;
        try { reserved = await reserveRun(options.runsRoot ?? resolve(root, ".runs"), id); }
        catch (error) { active.delete(id); throw error; }
        if (response.destroyed) controller.abort();
        const disconnected = () => controller.abort();
        response.once("close", disconnected);
        response.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Connection": "keep-alive" });
        const send = (type: string, data: unknown) => {
          if (!response.destroyed) response.write(`data: ${JSON.stringify({ type, data })}\n\n`);
        };
        send("accepted", { id: reserved.id, mode });
        try {
          const run = await runReference(provider, {
            id: reserved.id, question: input.question as string | undefined, maxTurns,
            toolsEnabled: input.toolsEnabled as boolean | undefined, signal: controller.signal,
            onEvent: event => send("event", event)
          });
          const verification = checkResult(run);
          let saved = false;
          try { await saveRun(reserved.directory, run, verification); saved = true; } catch { /* 明确报告未保存，不谎称成功。 */ }
          send("result", { ...run, verification, saved });
        } finally {
          active.delete(reserved.id);
          response.removeListener("close", disconnected);
          response.end();
        }
        return;
      }
      json(response, 404, { error: "接口不存在" });
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      // 仅公开经过控制的输入错误；不暴露文件路径或网络错误正文。
      const message = error instanceof RangeError ? error.message : "请求无效、真实模式未配置或运行目录不可写";
      json(response, 400, { error: message });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (existsSync(resolve(root, ".env"))) process.loadEnvFile(resolve(root, ".env"));
  const port = boundedInteger(Number(process.env.PORT ?? 4317), "PORT", 1, 65535);
  const server = createLabServer();
  server.on("error", error => { console.error(`本地服务启动失败：${error.message}`); process.exitCode = 1; });
  server.listen(port, "127.0.0.1", () => console.log(`实验台：http://127.0.0.1:${port}（默认合成离线，不调用模型）`));
}
