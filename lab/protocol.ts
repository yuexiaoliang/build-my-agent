import type { Message, Reply, ToolCall } from "./contracts.ts";

export class ProtocolError extends Error {
  constructor(message: string) { super(message); this.name = "ProtocolError"; }
}
export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown, field: string, limit = 16000): string {
  if (typeof value !== "string" || value.length > limit) throw new ProtocolError(`字段无效：${field}`);
  return value;
}
export function validateReply(value: unknown): Reply {
  if (!object(value)) throw new ProtocolError("响应必须是对象");
  const body = text(value.text, "text");
  const reason = value.finishReason;
  if (reason !== "stop" && reason !== "tool_calls" && reason !== "length" && reason !== "content_filter") {
    throw new ProtocolError("未知或缺少 finishReason，不能静默当成功");
  }
  if (!Array.isArray(value.calls) || value.calls.length > 8) throw new ProtocolError("calls 必须是至多 8 项的数组");
  const ids = new Set<string>();
  const calls: ToolCall[] = value.calls.map((call: unknown) => {
    if (!object(call)) throw new ProtocolError("工具请求必须是对象");
    const id = text(call.id, "call.id", 128);
    const name = text(call.name, "call.name", 128);
    const argumentsText = text(call.argumentsText, "call.argumentsText", 4000);
    if (!id.trim() || !name.trim() || ids.has(id)) throw new ProtocolError("工具 id/name 为空或 id 重复");
    ids.add(id);
    return { id, name, argumentsText };
  });
  if (reason === "stop" && (calls.length > 0 || !body.trim())) throw new ProtocolError("stop 必须含正文且无工具请求");
  if (reason === "tool_calls" && calls.length === 0) throw new ProtocolError("tool_calls 必须含请求");
  return { text: body, finishReason: reason, calls };
}

// 明确的协议子集，不猜测其他提供商或其他 API 的形状。
export function fromChatCompletion(value: unknown): Reply {
  if (!object(value) || !Array.isArray(value.choices) || !object(value.choices[0])) {
    throw new ProtocolError("缺少 choices[0]");
  }
  const choice = value.choices[0];
  if (!object(choice.message)) throw new ProtocolError("缺少 message");
  const message = choice.message;
  const rawCalls = message.tool_calls === undefined ? [] : message.tool_calls;
  if (!Array.isArray(rawCalls)) throw new ProtocolError("tool_calls 不是数组");
  const calls = rawCalls.map((call: unknown) => {
    if (!object(call) || call.type !== "function" || !object(call.function)) {
      throw new ProtocolError("只支持 function 工具请求");
    }
    return { id: call.id, name: call.function.name, argumentsText: call.function.arguments };
  });
  return validateReply({ text: message.content === null ? "" : message.content, finishReason: choice.finish_reason, calls });
}
export function toWire(messages: Message[]): Record<string, unknown>[] {
  return messages.map(message => {
    if (message.role === "tool") return { role: "tool", content: message.content, tool_call_id: message.toolCallId };
    if (message.role === "assistant" && message.toolCalls?.length) {
      return { role: "assistant", content: message.content, tool_calls: message.toolCalls.map(call => ({
        id: call.id, type: "function", function: { name: call.name, arguments: call.argumentsText }
      })) };
    }
    return { role: message.role, content: message.content };
  });
}
