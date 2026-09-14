import { loadDotEnv, readModelConfig } from "./config.ts";
import { ModelRequestError, ModelResponseError, chat } from "./model.ts";

const [command] = process.argv.slice(2);

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
    const question = process.argv.slice(3).join(" ").trim();
    if (question === "") {
      console.error('用法：node src/cli.ts ask "你的问题"');
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
    console.log(`POST ${config.baseUrl}/chat/completions`);
    console.log(`模型：${config.model}`);
    console.log(`会话：${sessionId}`);
    console.log(`问题：${question}`);

    try {
      const reply = await chat(config, [{ role: "user", content: question }], { sessionId });
      console.log(`\n回答（服务端返回模型 ${reply.model}，耗时 ${reply.elapsedMs} ms）：\n`);
      console.log(reply.text);
      console.log(
        `\n用量：输入 ${reply.usage.promptTokens ?? "?"} + 输出 ${reply.usage.completionTokens ?? "?"} = ${reply.usage.totalTokens ?? "?"} tokens`,
      );
    } catch (error) {
      if (error instanceof ModelRequestError) {
        console.error(`\n请求失败：HTTP ${error.status}\n服务端信息：${error.detail}`);
        process.exit(3);
      }
      if (error instanceof ModelResponseError) {
        console.error(`\n响应无法使用：${error.detail}`);
        process.exit(4);
      }
      console.error(`\n调用出错：${error instanceof Error ? error.message : String(error)}`);
      process.exit(5);
    }
    break;
  }

  default: {
    console.error("用法：node src/cli.ts config | ask \"你的问题\"");
    process.exit(2);
  }
}
