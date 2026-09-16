import { createHash } from "node:crypto";
import type { ToolCall, ToolDefinition } from "./contracts.ts";
import { object } from "./protocol.ts";

// 合成教学语料，不读取磁盘、网络、日常仓库或真实企业数据。
export const DOCUMENTS: Readonly<Record<string, string>> = Object.freeze({
  overview: "这是合成的 Tiny Import 项目。测试命令在 testing，运行说明在 development。",
  testing: "运行测试使用 npm test。测试覆盖 CSV 导入的空行与重复表头。",
  development: "本地开发使用 npm start。开发服务启动不表示测试通过。"
});
export const SOURCE_DIGEST = createHash("sha256").update(JSON.stringify(DOCUMENTS)).digest("hex");
export const TOOLS: ToolDefinition[] = [{
  name: "read_doc", description: "读取合成项目说明，只接受 overview、testing 或 development。",
  parameters: { type: "object", properties: { name: { type: "string", enum: Object.keys(DOCUMENTS) } }, required: ["name"], additionalProperties: false }
}];
export type ToolResult = { ok: true; source: string; content: string } | { ok: false; error: string };
export function invokeTool(call: ToolCall): ToolResult {
  if (call.name !== "read_doc") return { ok: false, error: "工具未注册" };
  let args: unknown;
  try { args = JSON.parse(call.argumentsText); }
  catch { return { ok: false, error: "工具参数不是合法 JSON" }; }
  if (!object(args) || Object.keys(args).length !== 1 || typeof args.name !== "string") {
    return { ok: false, error: "参数必须只有字符串 name" };
  }
  if (!Object.hasOwn(DOCUMENTS, args.name)) return { ok: false, error: "文档不在允许集合中" };
  return { ok: true, source: args.name, content: DOCUMENTS[args.name]! };
}
export function signature(call: ToolCall): string {
  // 此工具仅接受一个 name 字段；JSON 排版不同不会绕过重复检查。
  try {
    const args: unknown = JSON.parse(call.argumentsText);
    if (object(args) && typeof args.name === "string" && Object.keys(args).length === 1) return `${call.name}:${args.name}`;
  } catch { /* 无效参数仍会被工具闸门拒绝。 */ }
  return `${call.name}:${call.argumentsText}`;
}
