import { loadDotEnv, readModelConfig } from "./config.ts";
import { readChatFixture, writeChatFixture } from "./fixture.ts";
import { ModelRequestError, ModelResponseError, parseChatResponse, sendChatRequest } from "./model.ts";
import type { ChatMessage, ChatResult, ChatUsage } from "./model.ts";
import { checkToolCall, executeToolCall, toolDefinitions } from "./tools.ts";

const DEFAULT_MAX_STEPS = 8;

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "config": {
    const loaded = loadDotEnv();
    console.log(loaded ? "已加载 .env" : "未找到 .env（只读系统环境变量）");

    const result = readModelConfig();
    if (!result.ok) {
      console.error(`缺少配置：${result.missing.join("、")}`);
      if (result.present.length > 0) {
        console.error(`已设置：${result.present.join("、")}`);
      }
      console.error("提示：cp .env.example .env 后填入接入信息；密钥只放 .env，不进代码、不进 git。");
      process.exit(1);
    }

    console.log("配置就绪：");
    console.log(`  模型：${result.config.model}`);
    console.log(`  地址：${result.config.baseUrl}`);
    console.log(`  密钥：已设置（${result.config.apiKey.length} 字符，内容不打印）`);
    break;
  }

  case "ask": {
    const args = [...rest];
    let recordPath: string | undefined;
    const recordIndex = args.indexOf("--record");
    if (recordIndex !== -1) {
      recordPath = args[recordIndex + 1];
      if (recordPath === undefined) {
        console.error("--record 后面要跟一个文件路径");
        process.exit(2);
      }
      args.splice(recordIndex, 2);
    }

    const useTools = args.includes("--tools");
    if (useTools) {
      args.splice(args.indexOf("--tools"), 1);
    }

    let maxSteps = DEFAULT_MAX_STEPS;
    const maxStepsIndex = args.indexOf("--max-steps");
    if (maxStepsIndex !== -1) {
      const raw = args[maxStepsIndex + 1];
      const parsed = raw === undefined ? Number.NaN : Number(raw);
      if (!Number.isInteger(parsed) || parsed < 1) {
        console.error("--max-steps 后面要跟一个正整数（一次模型请求算一步）");
        process.exit(2);
      }
      maxSteps = parsed;
      args.splice(maxStepsIndex, 2);
    }

    const question = args.join(" ").trim();
    if (question === "") {
      console.error('用法：node src/cli.ts ask [--tools] [--max-steps 8] [--record fixtures/xxx.json] "你的问题"');
      process.exit(2);
    }

    loadDotEnv();
    const result = readModelConfig();
    if (!result.ok) {
      console.error(`缺少配置：${result.missing.join("、")}`);
      console.error("提示：cp .env.example .env 后填入接入信息；密钥只放 .env，不进代码、不进 git。");
      process.exit(1);
    }

    const { config } = result;
    const sessionId = crypto.randomUUID();
    const tools = useTools ? toolDefinitions : undefined;
    console.log(`POST ${config.baseUrl}/chat/completions`);
    console.log(`模型：${config.model}`);
    console.log(`会话：${sessionId}`);
    if (tools !== undefined) {
      console.log(`工具：${tools.map((tool) => tool.function.name).join("、")}（在 sandbox/ 内只读执行）`);
    }
    console.log(`问题：${question}`);
    console.log(`步数上限：${maxSteps}（一次模型请求算一步）`);

    try {
      const messages: ChatMessage[] = [{ role: "user", content: question }];
      const seenCalls = new Map<string, number>();
      const totals = { prompt: 0, completion: 0 };
      let steps = 0;
      let exhausted = false;

      const requestRound = async (step: number): Promise<ChatResult> => {
        try {
          const exchange = await sendChatRequest(config, messages, { sessionId, tools });
          if (recordPath !== undefined) {
            const path = step === 1 ? recordPath : `${recordPath.replace(/\.json$/, "")}-round${step}.json`;
            await writeChatFixture(path, exchange);
            console.log(`已录制到 ${path}（原样保存响应体，可离线回放）`);
          }
          return parseChatResponse(exchange);
        } catch (error) {
          throw withStep(step, error);
        }
      };

      for (let step = 1; step <= maxSteps; step++) {
        steps = step;
        console.log(`\n【第 ${step} 轮请求】messages 共 ${messages.length} 条：${describeMessages(messages)}`);
        const reply = await requestRound(step);

        console.log(`【真实调用·第 ${step} 轮】服务端返回模型 ${reply.model}，耗时 ${reply.elapsedMs} ms`);
        if (reply.text !== "") {
          console.log(`\n${reply.text}`);
        }
        console.log(`本轮用量：${formatUsage(reply.usage)}`);
        totals.prompt += reply.usage.promptTokens ?? 0;
        totals.completion += reply.usage.completionTokens ?? 0;

        if (reply.toolCalls.length === 0) {
          console.log(`\n模型没有再请求工具 —— 循环在第 ${step} 轮自然结束。`);
          break;
        }

        console.log("\n模型请求调用工具：");
        for (const call of reply.toolCalls) {
          const signature = `${call.name}(${call.argumentsText})`;
          const firstSeen = seenCalls.get(signature);
          if (firstSeen === undefined) {
            seenCalls.set(signature, step);
          }
          const repeat = firstSeen === undefined ? "" : `  ← 与第 ${firstSeen} 轮相同（重复调用）`;
          console.log(`  - ${call.name}（id=${call.id}）参数原文：${call.argumentsText}${repeat}`);
        }

        if (step === maxSteps) {
          exhausted = true;
          console.log(`\n步数上限 ${maxSteps} 已用尽：本轮的 ${reply.toolCalls.length} 个工具请求不执行，也不再发起下一轮请求。`);
          break;
        }

        console.log("\n【闸门与执行】（只读，sandbox/ 内）：");
        const toolMessages: ChatMessage[] = [];
        for (const call of reply.toolCalls) {
          const check = checkToolCall(call.name, call.argumentsText);
          let content: string;
          if (!check.ok) {
            content = `已拒绝：${check.reason}`;
            console.log(`--- ${call.name}：拒绝（${check.reason}），拒绝原因也会作为结果回填`);
          } else {
            content = await executeToolCall(check.name, check.args);
            console.log(`--- ${call.name}：执行结果 ---`);
            console.log(content);
          }
          toolMessages.push({ role: "tool", toolCallId: call.id, content });
        }
        messages.push({ role: "assistant", content: reply.text, toolCalls: reply.toolCalls }, ...toolMessages);
      }

      console.log(`\n【结果】跑了 ${steps} 步（上限 ${maxSteps}）；累计输入 ${totals.prompt} + 输出 ${totals.completion} tokens`);
      if (exhausted) {
        console.log("停止原因：步数耗尽——模型仍有未执行的工具请求（上方已列出）。");
      } else {
        console.log("停止原因：模型不再请求工具，循环自然结束。");
      }
    } catch (error) {
      fail(error);
    }
    break;
  }

  case "replay": {
    const path = rest[0];
    if (path === undefined) {
      console.error("用法：node src/cli.ts replay fixtures/xxx.json");
      process.exit(2);
    }

    try {
      const fixture = await readChatFixture(path);
      console.log(`【离线回放】${path}`);
      console.log(`录制于 ${fixture.recordedAt}，录制时耗时 ${fixture.response.elapsedMs} ms`);
      console.log(`原请求：POST ${fixture.request.url}（模型 ${fixture.request.model}，会话 ${fixture.request.sessionId}）`);
      console.log(`原请求 messages 共 ${fixture.request.messages.length} 条：${describeMessages(fixture.request.messages)}`);
      if (fixture.request.tools !== undefined && fixture.request.tools.length > 0) {
        console.log(`原请求带的工具：${fixture.request.tools.map((tool) => tool.function.name).join("、")}`);
      }
      console.log("不联网、不读密钥，只走本程序的解析路径\n");

      const reply = parseChatResponse(fixture);
      if (reply.text !== "") {
        console.log(`回答（来自固定响应，模型 ${reply.model}）：\n`);
        console.log(reply.text);
        console.log();
      }
      if (reply.toolCalls.length > 0) {
        console.log("模型请求调用工具（回放不执行）：");
        for (const call of reply.toolCalls) {
          console.log(`  - ${call.name}（id=${call.id}）参数原文：${call.argumentsText}`);
        }
        console.log();
      }
      console.log(`用量（固定响应中的统计）：${formatUsage(reply.usage)}`);
    } catch (error) {
      fail(error);
    }
    break;
  }

  case "call": {
    const [name, argumentsText] = rest;
    if (name === undefined || argumentsText === undefined) {
      console.error('用法：node src/cli.ts call <工具名> "<参数JSON>"');
      process.exit(2);
    }

    console.log(`【工具直调】${name}（不经过模型） 参数：${argumentsText}`);
    const check = checkToolCall(name, argumentsText);
    if (!check.ok) {
      console.log(`拒绝执行：${check.reason}`);
      process.exit(6);
    }

    try {
      const output = await executeToolCall(check.name, check.args);
      console.log(`--- ${check.name} 的结果 ---`);
      console.log(output);
    } catch (error) {
      fail(error);
    }
    break;
  }

  default: {
    console.error('用法：node src/cli.ts config | ask [--tools] [--max-steps 8] [--record fixtures/xxx.json] "你的问题" | replay fixtures/xxx.json | call <工具名> "<参数JSON>"');
    process.exit(2);
  }
}

function formatUsage(usage: ChatUsage): string {
  return `输入 ${usage.promptTokens ?? "?"} + 输出 ${usage.completionTokens ?? "?"} = ${usage.totalTokens ?? "?"} tokens`;
}

function describeMessages(messages: ChatMessage[]): string {
  return messages
    .map((message) => {
      if (message.role === "assistant" && message.toolCalls !== undefined && message.toolCalls.length > 0) {
        return `assistant(文本 ${message.content.length} 字符 + ${message.toolCalls.length} 个工具请求)`;
      }
      if (message.role === "tool") {
        return `tool(回填 ${message.content.length} 字符，id=${shortId(message.toolCallId)})`;
      }
      return `${message.role}(${message.content.length} 字符)`;
    })
    .join(" + ");
}

function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 12)}…` : id;
}

function withStep(step: number, error: unknown): unknown {
  if (error instanceof ModelRequestError) {
    return new ModelRequestError(error.status, `第 ${step} 轮：${error.detail}`);
  }
  if (error instanceof ModelResponseError) {
    return new ModelResponseError(`第 ${step} 轮：${error.detail}`);
  }
  if (error instanceof Error) {
    return new Error(`第 ${step} 轮请求出错：${error.message}`, { cause: error });
  }
  return error;
}

function fail(error: unknown): never {
  if (error instanceof ModelRequestError) {
    console.error(`\n请求失败：HTTP ${error.status}\n服务端信息：${error.detail}`);
    process.exit(3);
  }
  if (error instanceof ModelResponseError) {
    console.error(`\n响应无法使用：${error.detail}`);
    process.exit(4);
  }
  console.error(`\n出错：${error instanceof Error ? error.message : String(error)}`);
  process.exit(5);
}
