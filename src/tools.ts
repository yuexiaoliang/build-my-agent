import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
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

export async function executeToolCall(name: string, argumentsText: string): Promise<string> {
  switch (name) {
    case "list_files": {
      const entries = await readdir(sandboxRoot, { withFileTypes: true });
      return entries.map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name)).join("\n");
    }
    case "read_file": {
      const args = JSON.parse(argumentsText) as { path?: unknown };
      const path = typeof args?.path === "string" ? args.path : "";
      return await readFile(join(sandboxRoot, path), "utf8");
    }
    default:
      throw new Error(`未知工具：${name}`);
  }
}
