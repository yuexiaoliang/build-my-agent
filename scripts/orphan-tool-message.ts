// 03.1 失败路径实验：第二轮 messages 故意跳过 assistant，只放 user + tool（孤儿结果）。
// 用法：node scripts/orphan-tool-message.ts
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
  // 注意：没有 assistant 消息，下面这条 tool 结果指向的调用记录不在场
  { role: "tool", toolCallId: "call_orphan_000", content: "练习用笔记（合成文件，不是真实项目）" },
];

console.log("发送 messages：user + tool（无 assistant，孤儿结果）");
const exchange = await sendChatRequest(result.config, messages, { sessionId: crypto.randomUUID() });
await writeChatFixture("fixtures/chat-2026-09-15-orphan-tool.json", exchange);

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
