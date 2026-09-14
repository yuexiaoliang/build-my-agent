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
