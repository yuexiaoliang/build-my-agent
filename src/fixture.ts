import { readFile, writeFile } from "node:fs/promises";
import type { RawExchange } from "./model.ts";

export type ChatFixture = RawExchange & {
  kind: "chat-http";
  version: 1;
  recordedAt: string;
};

export async function writeChatFixture(path: string, exchange: RawExchange): Promise<ChatFixture> {
  const fixture: ChatFixture = {
    kind: "chat-http",
    version: 1,
    recordedAt: new Date().toISOString(),
    ...exchange,
  };
  await writeFile(path, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

export async function readChatFixture(path: string): Promise<ChatFixture> {
  const text = await readFile(path, "utf8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`fixture 不是合法 JSON：${path}`);
  }
  if (!isChatFixture(parsed)) {
    throw new Error(`fixture 结构不符合约定（需要 kind=chat-http、version=1、request、response）：${path}`);
  }
  return parsed;
}

function isChatFixture(value: unknown): value is ChatFixture {
  if (typeof value !== "object" || value === null) return false;
  const fixture = value as Partial<ChatFixture>;
  return (
    fixture.kind === "chat-http" &&
    fixture.version === 1 &&
    typeof fixture.recordedAt === "string" &&
    typeof fixture.request?.url === "string" &&
    typeof fixture.request.model === "string" &&
    typeof fixture.request.sessionId === "string" &&
    Array.isArray(fixture.request.messages) &&
    typeof fixture.response?.status === "number" &&
    typeof fixture.response.elapsedMs === "number" &&
    typeof fixture.response.bodyText === "string"
  );
}
