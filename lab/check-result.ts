import type { RunResult, Verification } from "./contracts.ts";
import { TASK } from "./reference.ts";
import { DOCUMENTS, SOURCE_DIGEST } from "./tools.ts";

export function checkResult(run: RunResult): Verification {
  const scope = "仅检查固定合成任务的命令文本与读取依据；不评价任意回答、模型整体能力或学习者掌握。";
  if (run.question !== TASK) return { verdict: "not_checked", checks: [], scope };
  const checks = [
    { name: "本次运行正常产出回答", ok: run.status === "answered" },
    { name: "答案符合本样例约定的命令与引用格式", ok: run.answer.trim() === "运行命令：npm test\n依据：[testing]" },
    { name: "同版本的 testing 文档确实通过工具返回", ok: run.sourceDigest === SOURCE_DIGEST && run.events.some(event => {
      const result = event.detail.result as { source?: string; content?: string } | undefined;
      return event.kind === "tool.executed" && result?.source === "testing" && result.content === DOCUMENTS.testing;
    }) }
  ];
  return { verdict: checks.every(check => check.ok) ? "matched" : "failed", checks, scope };
}
