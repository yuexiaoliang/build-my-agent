export type Mode = "scripted" | "live";
export type ToolCall = { id: string; name: string; argumentsText: string };
export type Message = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
};
export type Reply = {
  text: string;
  finishReason: "stop" | "tool_calls" | "length" | "content_filter";
  calls: ToolCall[];
};
export type ToolDefinition = {
  name: string; description: string; parameters: Record<string, unknown>;
};
export type Provider = {
  mode: Mode;
  label: string;
  respond(messages: Message[], tools: ToolDefinition[], signal: AbortSignal): Promise<unknown>;
};
export type RunStatus = "answered" | "blocked" | "exhausted" | "truncated" | "cancelled" | "timed_out" | "failed";
export type RunEvent = { seq: number; turn: number; kind: string; detail: Record<string, unknown> };
export type RunResult = {
  version: 1; id: string; mode: Mode; provider: string; question: string;
  sourceDigest: string; startedAt: string; elapsedMs: number;
  status: RunStatus; reason: string; turns: number; executed: number;
  answer: string; events: RunEvent[];
};
export type Verification = {
  verdict: "matched" | "failed" | "not_checked";
  checks: { name: string; ok: boolean }[];
  scope: string;
};
export type RunOptions = {
  id?: string; question?: string; maxTurns?: number; maxToolCalls?: number;
  toolsEnabled?: boolean; timeoutMs?: number; signal?: AbortSignal;
  onEvent?: (event: RunEvent) => void;
};
