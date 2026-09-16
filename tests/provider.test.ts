import test from "node:test";
import assert from "node:assert/strict";
import { liveProvider, readLiveConfig, readLimitedResponse } from "../lab/providers.ts";
import { fromChatCompletion, ProtocolError, toWire } from "../lab/protocol.ts";
import { TOOLS } from "../lab/tools.ts";

const raw = (content: unknown = "hello", calls?: unknown) => ({ choices: [{ message: { content, ...(calls !== undefined ? { tool_calls: calls } : {}) }, finish_reason: calls ? "tool_calls" : "stop" }] });
test("原始协议与内部字段之间明确转换", () => {
  assert.equal(fromChatCompletion(raw()).text, "hello");
  const reply = fromChatCompletion(raw(null, [{ id: "a", type: "function", function: { name: "read_doc", arguments: '{"name":"testing"}' } }]));
  assert.equal(reply.calls[0]!.argumentsText, '{"name":"testing"}');
  const messages = toWire([{ role: "assistant", content: "", toolCalls: reply.calls }, { role: "tool", content: "result", toolCallId: "a" }]);
  assert.equal(messages[1]!.tool_call_id, "a");
});
test("根/choice/message/calls 错误都归为协议错误", () => {
  for (const value of [null, [], {}, { choices: [] }, { choices: [null] }, { choices: [{ message: null }] }, raw("", {}), raw("", [null])]) assert.throws(() => fromChatCompletion(value), ProtocolError);
});
test("真实模式需要明确授权及有效配置", () => {
  assert.throws(() => readLiveConfig({}), /未启用/);
  for (const url of ["http://example.com", "https://user:pass@example.com", "https://example.com?q=x"]) {
    assert.throws(() => readLiveConfig({ ALLOW_LIVE: "1", MODEL_BASE_URL: url, MODEL_API_KEY: "test", MODEL_NAME: "test" }));
  }
  assert.throws(() => readLiveConfig({ ALLOW_LIVE: "1", MODEL_API_KEY: "test", MODEL_NAME: "test", MAX_COMPLETION_TOKENS: "9999" }));
});
test("请求映射/上限/取消 signal 正确，不把密钥放进正文", async () => {
  let calls = 0;
  const config = { baseUrl: "https://example.invalid/v1", apiKey: "not-a-real-key", model: "test-model", maxCompletionTokens: 64 };
  const signal = new AbortController().signal;
  const provider = liveProvider(config, (async (url, init) => {
    calls++;
    assert.equal(url, "https://example.invalid/v1/chat/completions"); assert.equal(init?.signal, signal); assert.equal(init?.redirect, "error");
    const request = JSON.parse(init!.body as string);
    assert.equal(request.max_completion_tokens, 64); assert.equal(request.tools[0].function.name, "read_doc");
    assert.equal((init!.body as string).includes(config.apiKey), false);
    return new Response(JSON.stringify(raw()), { status: 200 });
  }) as typeof fetch);
  assert.equal((await provider.respond([{ role: "user", content: "hello" }], TOOLS, signal) as { text: string }).text, "hello");
  assert.equal(calls, 1);
});
test("HTTP 失败不自动重试", async () => {
  let calls = 0;
  const p = liveProvider({ baseUrl: "https://example.invalid/v1", apiKey: "test", model: "test", maxCompletionTokens: 32 }, (async () => { calls++; return new Response("sensitive detail", { status: 401 }); }) as typeof fetch);
  await assert.rejects(p.respond([], [], new AbortController().signal), /HTTP 401/); assert.equal(calls, 1);
});
test("响应大小有界", async () => {
  await assert.rejects(readLimitedResponse(new Response("abcdef"), 3), /too large/);
  assert.equal(await readLimitedResponse(new Response("中文"), 20), "中文");
});
