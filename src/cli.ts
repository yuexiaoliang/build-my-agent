import { loadDotEnv, readModelConfig } from "./config.ts";
import { readChatFixture, writeChatFixture } from "./fixture.ts";
import { ModelRequestError, ModelResponseError, parseChatResponse, sendChatRequest } from "./model.ts";
import type { ChatUsage } from "./model.ts";
import { checkToolCall, executeToolCall, toolDefinitions } from "./tools.ts";

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

    const question = args.join(" ").trim();
    if (question === "") {
      console.error('用法：node src/cli.ts ask [--tools] [--record fixtures/xxx.json] "你的问题"');
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

    try {
      const exchange = await sendChatRequest(config, [{ role: "user", content: question }], { sessionId, tools });
      if (recordPath !== undefined) {
        await writeChatFixture(recordPath, exchange);
      }

      const reply = parseChatResponse(exchange);
      console.log(`\n【真实调用】服务端返回模型 ${reply.model}，耗时 ${reply.elapsedMs} ms`);
      if (reply.text !== "") {
        console.log(`\n${reply.text}`);
      }
      if (reply.toolCalls.length > 0) {
        console.log("\n模型请求调用工具：");
        for (const call of reply.toolCalls) {
          console.log(`  - ${call.name}（id=${call.id}）参数原文：${call.argumentsText}`);
        }
        console.log("\n【闸门与执行】（只读，sandbox/ 内）：");
        for (const call of reply.toolCalls) {
          const check = checkToolCall(call.name, call.argumentsText);
          if (!check.ok) {
            console.log(`--- ${call.name}：拒绝（${check.reason}）`);
            continue;
          }
          const output = await executeToolCall(check.name, check.args);
          console.log(`--- ${call.name}：执行结果 ---`);
          console.log(output);
        }
      }
      console.log(`\n用量：${formatUsage(reply.usage)}`);
      if (recordPath !== undefined) {
        console.log(`已录制到 ${recordPath}（原样保存响应体，可离线回放）`);
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
    console.error('用法：node src/cli.ts config | ask [--tools] [--record fixtures/xxx.json] "你的问题" | replay fixtures/xxx.json | call <工具名> "<参数JSON>"');
    process.exit(2);
  }
}

function formatUsage(usage: ChatUsage): string {
  return `输入 ${usage.promptTokens ?? "?"} + 输出 ${usage.completionTokens ?? "?"} = ${usage.totalTokens ?? "?"} tokens`;
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
