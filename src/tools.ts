import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string }>;
      required?: string[];
    };
  };
};

export const toolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "列出练习目录 sandbox/ 中的文件。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "读取练习目录 sandbox/ 中某个文本文件的内容。",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "相对 sandbox/ 的文件路径，例如 notes.txt" },
        },
        required: ["path"],
      },
    },
  },
];

const sandboxRoot = fileURLToPath(new URL("../sandbox/", import.meta.url));

export type ToolCheck =
  | { ok: true; name: string; args: Record<string, unknown> }
  | { ok: false; reason: string };

export function checkToolCall(name: string, argumentsText: string): ToolCheck {
  const tool = toolDefinitions.find((definition) => definition.function.name === name);
  if (tool === undefined) return { ok: false, reason: `未知工具：${name}` };

  let parsed: unknown;
  try {
    parsed = JSON.parse(argumentsText);
  } catch {
    return { ok: false, reason: "参数不是合法 JSON" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: "参数必须是 JSON 对象" };
  }
  const args = parsed as Record<string, unknown>;

  const schemaError = checkAgainstSchema(tool, args);
  if (schemaError !== undefined) return { ok: false, reason: schemaError };

  if (name === "read_file") {
    const path = args.path;
    if (typeof path === "string" && resolveInSandbox(path) === undefined) {
      return { ok: false, reason: `路径越界，只允许 sandbox/ 内：${path}` };
    }
  }

  return { ok: true, name, args };
}

export async function executeToolCall(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "list_files": {
      const entries = await readdir(sandboxRoot, { withFileTypes: true });
      return entries.map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name)).join("\n");
    }
    case "read_file": {
      const path = typeof args.path === "string" ? args.path : "";
      return await readFile(join(sandboxRoot, path), "utf8");
    }
    default:
      throw new Error(`执行器收到未知工具：${name}`);
  }
}

function checkAgainstSchema(tool: ToolDefinition, args: Record<string, unknown>): string | undefined {
  const { parameters } = tool.function;
  for (const key of parameters.required ?? []) {
    if (!(key in args)) return `缺少必填参数：${key}`;
  }
  for (const [key, property] of Object.entries(parameters.properties)) {
    const value = args[key];
    if (value !== undefined && property.type === "string" && typeof value !== "string") {
      return `参数 ${key} 应为字符串`;
    }
  }
  return undefined;
}

function resolveInSandbox(path: string): string | undefined {
  const resolved = resolve(sandboxRoot, path);
  const rel = relative(sandboxRoot, resolved);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return resolved;
  return undefined;
}
