import type { ModelConfig } from "./config.ts";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type ChatOptions = {
  sessionId?: string;
  signal?: AbortSignal;
};

export type ChatResult = {
  text: string;
  model: string;
  usage: ChatUsage;
  elapsedMs: number;
  sessionId: string;
};

type ChatCompletionBody = {
  model?: string;
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string };
};

export class ModelRequestError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`模型请求失败：HTTP ${status} — ${detail}`);
    this.name = "ModelRequestError";
    this.status = status;
    this.detail = detail;
  }
}

export class ModelResponseError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(`模型响应无法使用：${detail}`);
    this.name = "ModelResponseError";
    this.detail = detail;
  }
}

export async function chat(
  config: ModelConfig,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResult> {
  const url = `${config.baseUrl}/chat/completions`;
  const startedAt = Date.now();
  const sessionId = options.sessionId ?? crypto.randomUUID();

  const response = await fetch(url, {
    method: "POST",
    signal: options.signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
      "user-agent": "build-my-agent/0.1",
      "x-opencode-session": sessionId,
    },
    body: JSON.stringify({ model: config.model, messages }),
  });

  const bodyText = await response.text();
  const body = toJson(bodyText);

  if (!response.ok) {
    throw new ModelRequestError(response.status, describeError(body, bodyText));
  }

  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new ModelResponseError("缺少 choices[0].message.content");
  }

  return {
    text,
    model: typeof body?.model === "string" ? body.model : config.model,
    usage: {
      promptTokens: body?.usage?.prompt_tokens,
      completionTokens: body?.usage?.completion_tokens,
      totalTokens: body?.usage?.total_tokens,
    },
    elapsedMs: Date.now() - startedAt,
    sessionId,
  };
}

function toJson(text: string): ChatCompletionBody | undefined {
  try {
    return JSON.parse(text) as ChatCompletionBody;
  } catch {
    return undefined;
  }
}

function describeError(body: ChatCompletionBody | undefined, raw: string): string {
  const message = body?.error?.message;
  if (typeof message === "string" && message.length > 0) return message;
  const trimmed = raw.trim();
  if (trimmed === "") return "（空响应体）";
  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
}
