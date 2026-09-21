import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import {
  SyntheticSummaryProvider,
  type ModelProvider,
} from "./model-provider.ts";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const publicDirectory = join(currentDirectory, "..", "public");

class RequestError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let receivedBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.length;

    if (receivedBytes > 16_384) {
      throw new RequestError("请求体不能超过 16 KB", 413);
    }

    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError("请求体必须是有效 JSON", 400);
  }
}

function validateInput(body: unknown): string {
  if (typeof body !== "object" || body === null || !("input" in body)) {
    throw new RequestError("缺少 input 字段", 400);
  }

  const input = (body as { input?: unknown }).input;
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new RequestError("input 必须是非空字符串", 400);
  }

  if (input.length > 2_000) {
    throw new RequestError("input 不能超过 2000 个字符", 400);
  }

  return input.trim();
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

export function createAppServer(
  provider: ModelProvider = new SyntheticSummaryProvider(),
) {
  return createHttpServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");

      if (request.method === "GET" && url.pathname === "/api/health") {
        sendJson(response, 200, { ok: true, modelMode: provider.mode });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/summarize") {
        const body = await readJsonBody(request);
        const input = validateInput(body);
        const requestId = randomUUID();
        const startedAt = performance.now();
        const result = await provider.summarize({ input });
        const durationMs = Math.round(performance.now() - startedAt);

        // Deliberately log metadata, not the user's feedback or generated text.
        console.info(JSON.stringify({
          event: "summary.completed",
          requestId,
          mode: result.mode,
          inputChars: input.length,
          outputChars: result.text.length,
          durationMs,
        }));

        sendJson(response, 200, {
          requestId,
          summary: result.text,
          evidence: {
            mode: result.mode,
            proves: "本地请求、校验和响应链路可运行",
            doesNotProve: "真实模型质量、延迟、费用或供应商行为",
          },
        });
        return;
      }

      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        const html = await readFile(join(publicDirectory, "index.html"));
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(html);
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      const message = error instanceof RequestError ? error.message : "服务端发生未知错误";
      sendJson(response, status, { error: message });
    }
  });
}

const executedDirectly = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (executedDirectly) {
  const port = Number(process.env.PORT ?? 3000);
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`AI feedback demo: http://localhost:${port}`);
    console.log("Model mode: synthetic (no remote model call is made)");
  });
}
