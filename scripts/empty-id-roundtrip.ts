// 04.1 失败路径实验：模拟"解析层放过空 id"的后续——把 id 为空的工具调用原样回填给服务端。
// 对照 03.1 的孤儿实验（scripts/orphan-tool-message.ts）：那次是 assistant 缺席，这次是 id 缺席。
// 用法：node scripts/empty-id-roundtrip.ts
import { loadDotEnv, readModelConfig } from "../src/config.ts";
import { writeChatFixture } from "../src/fixture.ts";
import { ModelRequestError, parseChatResponse, sendChatRequest } from "../src/model.ts";
import type { ChatMessage } from "../src/model.ts";

loadDotEnv();
const result = readModelConfig();
if (!result.ok) {
  console.error(`缺少配置：${result.missing.join("、")}`);
  process.exit(1);
}

const messages: ChatMessage[] = [
  { role: "user", content: "sandbox 里的 notes.txt 写了什么？" },
  // 模拟 surgery-no-id 进入循环后的形状：assistant 的工具请求 id 是空字符串
  {
    role: "assistant",
    content: "",
    toolCalls: [{ id: "", name: "read_file", argumentsText: '{"path": "notes.txt"}', index: 0 }],
  },
  // 结果回填也只能用空 id 配对
  { role: "tool", toolCallId: "", content: "练习用笔记（合成文件，不是真实项目）" },
];

console.log("发送 messages：user + assistant（tool_calls id=\"\"）+ tool（tool_call_id=\"\"）");
const exchange = await sendChatRequest(result.config, messages, { sessionId: crypto.randomUUID() });
await writeChatFixture("fixtures/ch04/empty-id-roundtrip.json", exchange);

try {
  const reply = parseChatResponse(exchange);
  console.log(`\nHTTP ${exchange.response.status}，被正常处理`);
  console.log(`文本：${reply.text}`);
} catch (error) {
  if (error instanceof ModelRequestError) {
    console.log(`\n请求被服务端拒绝：HTTP ${error.status}`);
    console.log(`服务端信息：${error.detail}`);
  } else {
    throw error;
  }
}
