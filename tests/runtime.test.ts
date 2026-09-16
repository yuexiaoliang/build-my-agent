import test from "node:test";
import assert from "node:assert/strict";
import type { Provider } from "../lab/contracts.ts";
import { runReference, TASK } from "../lab/reference.ts";
import { scriptedProvider } from "../lab/providers.ts";
import { checkResult } from "../lab/check-result.ts";
import { invokeTool } from "../lab/tools.ts";

const tool = (id = "a", args = '{"name":"testing"}') => ({ id, name: "read_doc", argumentsText: args });
const request = (calls = [tool()]) => ({ text: "", finishReason: "tool_calls", calls });
const final = { text: "运行命令：npm test\n依据：[testing]", finishReason: "stop", calls: [] };
function sequence(replies: unknown[]): Provider {
  let index = 0;
  return { mode: "scripted", label: "test/sequence", async respond() { return index < replies.length ? replies[index++] : final; } };
}

test("完整离线链包含执行、下一轮回填、终态与独立检查", async () => {
  const run = await runReference(scriptedProvider());
  assert.equal(run.status, "answered"); assert.equal(run.turns, 2); assert.equal(run.executed, 1);
  assert.equal(checkResult(run).verdict, "matched");
  const second = run.events.filter(e => e.kind === "model.requested")[1]!;
  const messages = second.detail.messages as { role: string; toolCallId?: string; content: string }[];
  assert.equal(messages.at(-1)!.role, "tool"); assert.equal(messages.at(-1)!.toolCallId, "call-1");
  assert.match(messages.at(-1)!.content, /npm test/);
  assert.equal(run.events.at(-1)!.kind, "run.finished");
});
test("未启用工具时，即使返回已知工具也不执行", async () => {
  const run = await runReference(sequence([request()]), { toolsEnabled: false });
  assert.equal(run.executed, 0); assert.equal(run.status, "blocked"); assert.equal(run.turns, 1);
});
test("最后一轮普通工具与同批三重复工具均不执行", async () => {
  for (const calls of [[tool()], [tool("a"), tool("b"), tool("c")]]) {
    const run = await runReference(sequence([request(calls)]), { maxTurns: 1 });
    assert.equal(run.status, "exhausted"); assert.equal(run.executed, 0); assert.equal(run.turns, 1);
    assert.equal(run.events.some(e => e.kind === "tool.executed"), false);
  }
});
test("批次超过工具预算时不能先执行一部分", async () => {
  const run = await runReference(sequence([request([tool("a"), tool("b")])]), { maxToolCalls: 1 });
  assert.equal(run.status, "exhausted"); assert.equal(run.executed, 0);
});
test("重复基线先检查整批，不先执行再谎称本轮未执行", async () => {
  const run = await runReference(scriptedProvider("repeat"));
  assert.equal(run.status, "blocked"); assert.equal(run.executed, 0);
});
test("参数 JSON 空白差异不能绕过重复计数", async () => {
  const run = await runReference(sequence([request(), request([tool("b", '{ "name": "testing" }')]), request([tool("c")])]));
  assert.equal(run.status, "blocked"); assert.equal(run.executed, 2); assert.equal(run.turns, 3);
  assert.equal(run.events.at(-1)!.detail.executed, 2);
});
test("截断即使包含合法工具也不执行", async () => {
  const run = await runReference(scriptedProvider("truncated"));
  assert.equal(run.status, "truncated"); assert.equal(run.executed, 0); assert.equal(run.answer, "");
});
test("未知工具产生拒绝证据而不是动作", async () => {
  const run = await runReference(scriptedProvider("unexpected-tool"));
  assert.equal(run.executed, 0); assert.ok(run.events.some(e => e.kind === "tool.rejected"));
});
test("回答和任务核验分别判断，错误答案不能因自然结束而合格", async () => {
  const run = await runReference(scriptedProvider("unsupported"));
  assert.equal(run.status, "answered"); assert.equal(checkResult(run).verdict, "failed");
});
test("没读取过文档，即使猜中答案也缺来源证据", async () => {
  const run = await runReference(sequence([final]));
  assert.equal(checkResult(run).verdict, "failed");
});
test("自定义任务不套用固定答案评分器", async () => {
  const run = await runReference(scriptedProvider(), { question: "如何启动开发服务？" });
  assert.equal(checkResult(run).verdict, "not_checked");
});
test("null/畸形响应有明确失败，不变成正常完成", async () => {
  for (const reply of [null, request([null as never]), { ...final, calls: {} }, { ...final, finishReason: null }]) {
    const run = await runReference(sequence([reply]));
    assert.equal(run.status, "failed"); assert.equal(run.executed, 0);
  }
});
test("重复 id 在执行前被拒绝", async () => {
  const run = await runReference(sequence([request([tool(), tool()])]));
  assert.equal(run.status, "failed"); assert.equal(run.executed, 0);
});
test("预先取消不发模型请求", async () => {
  let count = 0;
  const controller = new AbortController(); controller.abort();
  const run = await runReference({ mode: "scripted", label: "spy", async respond() { count++; return final; } }, { signal: controller.signal });
  assert.equal(count, 0); assert.equal(run.status, "cancelled");
});
test("实际取消会传播给提供商，且不再开始工具", async () => {
  const controller = new AbortController(); let received: AbortSignal | undefined;
  const promise = runReference({ mode: "scripted", label: "pending", async respond(_m, _t, signal) { received = signal; return new Promise(() => {}); } }, { signal: controller.signal, timeoutMs: 2000 });
  setTimeout(() => controller.abort(), 20);
  const run = await promise;
  assert.equal(run.status, "cancelled"); assert.equal(received?.aborted, true); assert.equal(run.executed, 0);
});
test("期限限制等待，不依赖轮数耗尽；不合作的工作不被伪称已物理终止", async () => {
  const run = await runReference({ mode: "scripted", label: "never", async respond() { return new Promise(() => {}); } }, { timeoutMs: 20 });
  assert.equal(run.status, "timed_out"); assert.equal(run.executed, 0);
});
test("工具执行前取消，执行次数为零", async () => {
  const controller = new AbortController();
  const run = await runReference(sequence([request()]), { signal: controller.signal, onEvent(event) { if (event.kind === "tool.requested") controller.abort(); } });
  assert.equal(run.status, "cancelled"); assert.equal(run.executed, 0);
});
test("观察者不能通过修改事件对象污染轨迹", async () => {
  const run = await runReference(scriptedProvider(), { onEvent(event) { event.kind = "tampered"; throw new Error("UI failure"); } });
  assert.equal(run.status, "answered"); assert.equal(run.events.some(e => e.kind === "tampered"), false);
});
test("不把提供商错误原文中的密钥或数据写进结果", async () => {
  const run = await runReference({ mode: "scripted", label: "error", async respond() { throw new Error("secret-api-key"); } });
  assert.equal(run.status, "failed"); assert.equal(JSON.stringify(run).includes("secret-api-key"), false);
});
test("非法预算在提供商调用前被拒绝", async () => {
  for (const maxTurns of [0, -1, 1.2, 9, NaN, Infinity]) await assert.rejects(runReference(scriptedProvider(), { maxTurns }), RangeError);
});
test("工具只允许合成文档，不把 name 当路径", () => {
  for (const name of ["../.env", "/etc/passwd", "__proto__", "constructor", ""]) assert.equal(invokeTool(tool("a", JSON.stringify({ name }))).ok, false);
  for (const value of ["null", "[]", "{", '{"name":"testing","path":"../"}']) assert.equal(invokeTool(tool("a", value)).ok, false);
  assert.equal(invokeTool(tool()).ok, true);
});
test("默认问题稳定可识别", () => assert.equal(TASK, "这个项目怎样运行测试？请给出依据。"));
