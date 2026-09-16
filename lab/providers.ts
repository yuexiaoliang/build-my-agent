import type { Provider, Reply } from "./contracts.ts";
import { fromChatCompletion, toWire } from "./protocol.ts";
import { setTimeout as delay } from "node:timers/promises";

export const SCENARIOS = ["normal", "unsupported", "truncated", "unexpected-tool", "repeat", "malformed", "slow"] as const;
export type Scenario = typeof SCENARIOS[number];
const call = (id = "call-1") => ({ id, name: "read_doc", argumentsText: '{"name":"testing"}' });
export function scriptedProvider(scenario: Scenario = "normal", delayMs = 0): Provider {
  let round = 0;
  return {
    mode: "scripted", label: `scripted/${scenario}`,
    async respond(messages, _tools, signal): Promise<unknown> {
      await delay(scenario === "slow" ? 30000 : delayMs, undefined, { signal });
      round++;
      if (scenario === "malformed") return null;
      if (scenario === "unsupported") return { text: "运行命令：npm start\n依据：[testing]", finishReason: "stop", calls: [] };
      if (scenario === "truncated") return { text: "运行命令：", finishReason: "length", calls: [call()] };
      if (scenario === "repeat") return { text: "", finishReason: "tool_calls", calls: [call("a"), call("b"), call("c")] };
      if (scenario === "unexpected-tool") return { text: "", finishReason: "tool_calls", calls: [{ id: `bad-${round}`, name: "delete_file", argumentsText: '{}' }] };
      if (round === 1) return { text: "先读取测试说明。", finishReason: "tool_calls", calls: [call()] };
      const last = messages.at(-1);
      const content = last?.role === "tool" ? JSON.parse(last.content) as { ok?: boolean; source?: string } : {};
      return { text: content.ok && content.source === "testing" ? "运行命令：npm test\n依据：[testing]" : "无法根据工具结果确认。", finishReason: "stop", calls: [] } satisfies Reply;
    }
  };
}
export type LiveConfig = { baseUrl: string; apiKey: string; model: string; maxCompletionTokens: number };
export function readLiveConfig(env: NodeJS.ProcessEnv = process.env): LiveConfig {
  if (env.ALLOW_LIVE !== "1") throw new Error("真实调用未启用；先核对预算和协议，再设置 ALLOW_LIVE=1");
  const url = new URL(env.MODEL_BASE_URL ?? "https://api.openai.com/v1");
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("MODEL_BASE_URL 必须是无凭证/查询参数的 HTTPS 地址");
  const apiKey = env.MODEL_API_KEY?.trim(), model = env.MODEL_NAME?.trim();
  if (!apiKey || !model) throw new Error("缺少 MODEL_API_KEY 或 MODEL_NAME");
  const maxCompletionTokens = Number(env.MAX_COMPLETION_TOKENS ?? 256);
  if (!Number.isSafeInteger(maxCompletionTokens) || maxCompletionTokens < 16 || maxCompletionTokens > 2048) throw new Error("MAX_COMPLETION_TOKENS 必须为 16–2048");
  return { baseUrl: url.href.replace(/\/$/, ""), apiKey, model, maxCompletionTokens };
}
export async function readLimitedResponse(response: Response, limit = 262144): Promise<string> {
  if (!response.body) throw new Error("empty response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("response too large");
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
}
export function liveProvider(config: LiveConfig, transport: typeof fetch = fetch): Provider {
  return {
    mode: "live", label: config.model,
    async respond(messages, tools, signal) {
      const response = await transport(`${config.baseUrl}/chat/completions`, {
        method: "POST", redirect: "error", signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages: toWire(messages), max_completion_tokens: config.maxCompletionTokens,
          ...(tools.length ? { tools: tools.map(tool => ({ type: "function", function: tool })) } : {}) })
      });
      if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
      return fromChatCompletion(JSON.parse(await readLimitedResponse(response)) as unknown);
    }
  };
}
