// 04.1 归因实验（empty-id-roundtrip 的单变量对照）：消息形状与空 content 完全一致，仅 id 为正常值。
// 用法：node scripts/valid-id-roundtrip.ts
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
  {
    role: "assistant",
    content: "",
    toolCalls: [{ id: "call_valid_control_001", name: "read_file", argumentsText: '{"path": "notes.txt"}', index: 0 }],
  },
  { role: "tool", toolCallId: "call_valid_control_001", content: "练习用笔记（合成文件，不是真实项目）" },
];

console.log('发送 messages：user + assistant（tool_calls id="call_valid_control_001"）+ tool（tool_call_id 同前）');
const exchange = await sendChatRequest(result.config, messages, { sessionId: crypto.randomUUID() });
await writeChatFixture("fixtures/ch04/valid-id-roundtrip.json", exchange);

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
