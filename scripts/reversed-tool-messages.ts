// 03.3 边界实验：把两条 tool 消息颠倒顺序发出去（id 不变、只换位置），看服务端是否接受、模型是否对应正确。
// 用法：node scripts/reversed-tool-messages.ts [fixtures/来源.json] [fixtures/录制到.json]
import { loadDotEnv, readModelConfig } from "../src/config.ts";
import { readChatFixture, writeChatFixture } from "../src/fixture.ts";
import { ModelRequestError, parseChatResponse, sendChatRequest } from "../src/model.ts";
import type { ChatMessage } from "../src/model.ts";
import { checkToolCall, executeToolCall } from "../src/tools.ts";

const sourcePath = process.argv[2] ?? "fixtures/ch03/multitool.json";
const recordPath = process.argv[3] ?? "fixtures/ch03/multitool-reversed.json";

loadDotEnv();
const loaded = readModelConfig();
if (!loaded.ok) {
  console.error(`缺少配置：${loaded.missing.join("、")}`);
  process.exit(1);
}

const fixture = await readChatFixture(sourcePath);
const round1 = parseChatResponse(fixture);
if (round1.toolCalls.length < 2) {
  console.error(`这个 fixture 的响应里只有 ${round1.toolCalls.length} 个工具请求，颠倒顺序至少需要两个`);
  process.exit(2);
}

console.log(`读入 ${sourcePath}：第 1 轮响应，${round1.toolCalls.length} 个工具请求`);
console.log("本地重新执行这些调用（结果与首轮运行时一致，文件是确定性的）：");
const toolMessages: ChatMessage[] = [];
for (const call of round1.toolCalls) {
  const check = checkToolCall(call.name, call.argumentsText);
  if (!check.ok) {
    console.error(`无法执行 ${call.name}：${check.reason}`);
    process.exit(3);
  }
  const content = await executeToolCall(check.name, check.args);
  toolMessages.push({ role: "tool", toolCallId: call.id, content });
  console.log(`  执行 [index=${call.index}] ${call.name} ${call.argumentsText} → ${content.length} 字符`);
}

const reversed = [...toolMessages].reverse();
const messages: ChatMessage[] = [
  ...fixture.request.messages,
  { role: "assistant", content: round1.text, toolCalls: round1.toolCalls },
  ...reversed,
];

console.log("\n发送的 tool 消息顺序（已颠倒，id 未变）：");
for (const message of reversed) {
  if (message.role === "tool") console.log(`  tool → ${message.toolCallId}（${message.content.length} 字符）`);
}

const exchange = await sendChatRequest(loaded.config, messages, {
  sessionId: crypto.randomUUID(),
  tools: fixture.request.tools,
});
await writeChatFixture(recordPath, exchange);

try {
  const reply = parseChatResponse(exchange);
  console.log(`\nHTTP ${exchange.response.status}：服务端接受了颠倒顺序`);
  console.log(`\n模型回答：\n${reply.text}`);
} catch (error) {
  if (error instanceof ModelRequestError) {
    console.log(`\n请求被服务端拒绝：HTTP ${error.status}`);
    console.log(`服务端信息：${error.detail}`);
  } else {
    throw error;
  }
}
console.log(`\n已录制到 ${recordPath}`);
