# fixtures 登记表

录制的真实 HTTP 交互（`kind: chat-http`），供离线回放与课程取证。每个文件都必须在这里登记一行。

## 约定

- 路径：`fixtures/chNN/场景.json`；一次运行的第 k 轮（k≥2）自动录为 `场景-roundK.json`（与 `--record` 的命名一致）。
- 课程文档、脚本与本表引用 fixture 必须写**完整相对路径**（如 `fixtures/ch03/loop-after.json`），禁止 `…-round2.json` 这类省略写法——省略写法无法被机械校验。
- 新增 / 移动 / 删除 fixture 时：更新本表 + 跑 `npm run check:fixtures`（结构合法、引用存在、无孤儿）。
- fixture 是真实 API 的录制，**不可免费再生**；请求形状随 `src/model.ts` 演化后旧 fixture 可能无法回放，此时按本表"来源"列重新录制或标注失效。
- 尚未被课程认领的录制放 `fixtures/_pending/`；认领时移入对应章节目录、更新引用与本表。

## ch01 · 任务与模型

| 文件 | 小节 | 用途 | 来源 |
|---|---|---|---|
| `fixtures/ch01/ask-success.json` | 01.3 | 真实成功调用录制（332 tokens），回放基准 | `node src/cli.ts ask --record fixtures/ch01/ask-success.json "用一句话解释：什么是 Agent 的离线回放？"` |
| `fixtures/ch01/model-not-supported.json` | 01.2、01.3 | 未知模型的 401 原文：错误码是服务端事实；回放失败分类（退出码 3） | `MODEL_NAME=not-a-real-model node src/cli.ts ask --record fixtures/ch01/model-not-supported.json "触发一次真实失败，用于离线回放"` |
| `fixtures/ch01/malformed-response.json` | 01.3 | 损坏响应体（单引号非法 JSON），验证退出码 4 | 手工构造，非真实录制 |

## ch02 · 工具契约

| 文件 | 小节 | 用途 | 来源 |
|---|---|---|---|
| `fixtures/ch02/toolcall.json` | 02.1 | 首个工具调用响应：`content` 为空字符串 + `tool_calls`（read_file notes.txt，416 tokens） | `node src/cli.ts ask --tools --record fixtures/ch02/toolcall.json "sandbox/notes.txt 里写了什么？"` |

## ch03 · Agent Loop

| 文件 | 小节 | 用途 | 来源 |
|---|---|---|---|
| `fixtures/ch03/loop-before.json` | 03.1 | 改造前：工具结果只打印、未回填 | `ask --tools`（回填改造前的代码） |
| `fixtures/ch03/loop-after.json`<br>`fixtures/ch03/loop-after-round2.json` | 03.1 | 回填改造后的两轮请求 | `node src/cli.ts ask --tools --record fixtures/ch03/loop-after.json "sandbox/notes.txt 写了什么？用一句话总结"` |
| `fixtures/ch03/orphan-tool.json` | 03.1 | 孤儿 tool 消息被服务端 400 拒绝 | `node scripts/orphan-tool-message.ts` |
| `fixtures/ch03/loop-multistep.json`<br>`fixtures/ch03/loop-multistep-round2.json`<br>`fixtures/ch03/loop-multistep-round3.json` | 03.2 | 学习者收录的 3 轮运行（一轮一个工具） | `node src/cli.ts ask --tools --record fixtures/ch03/loop-multistep.json "先列出 sandbox/ 里有哪些文件，再读取 todo.md，然后用一句话总结待办内容"` |
| `fixtures/ch03/loop-multistep-alt.json`<br>`fixtures/ch03/loop-multistep-alt-round2.json`<br>`fixtures/ch03/loop-multistep-alt-round3.json` | 03.2 | 同任务另一次收录；用量 369 → 424 → 549 的代价证据 | 同上命令（早一次运行） |
| `fixtures/ch03/loop-maxsteps.json` | 03.2 | 步数耗尽出口：不执行、不续跑、退出码 0 | `node src/cli.ts ask --tools --max-steps 1 --record fixtures/ch03/loop-maxsteps.json "读取 notes.txt 并总结"` |
| `fixtures/ch03/multitool.json`<br>`fixtures/ch03/multitool-round2.json` | 03.3 | 一轮两个 tool_calls（index 0/1）按序回填 | `node src/cli.ts ask --tools --record fixtures/ch03/multitool.json "同时读取 sandbox/notes.txt 和 sandbox/todo.md（一次发起两个 read_file 请求），然后各用一句话总结"` |
| `fixtures/ch03/multitool-reversed.json` | 03.3 | tool 消息颠倒顺序仍被接受（id 关联定界） | `node scripts/reversed-tool-messages.ts` |
| `fixtures/ch03/repeat-thrice.json`<br>`fixtures/ch03/repeat-thrice-round2.json`<br>`fixtures/ch03/repeat-thrice-round3.json` | 03.4 | 连续重复三级处理；用户要求重读被误伤的案例 | `node src/cli.ts ask --tools --record fixtures/ch03/repeat-thrice.json "我需要确认 sandbox/notes.txt 的内容稳定：请连续读取这个文件三次……"` |

## ch04 · 消息与协议

| 文件 | 小节 | 用途 | 来源 |
|---|---|---|---|
| `fixtures/ch04/surgery-content-null.json` | 04.1 | 手术：`message.content` 改为 `null`（`tool_calls` 保留），验证规范化 | 手工改造自 `fixtures/ch03/multitool.json`，非真实录制 |
| `fixtures/ch04/surgery-no-id.json` | 04.1 | 手术：第一个 `tool_call` 删掉 `id`，验证缺失字段的填充与连锁影响 | 手工改造自 `fixtures/ch03/multitool.json`，非真实录制 |
| `fixtures/ch04/surgery-extra-field.json` | 04.1 | 手术：`message` 下加协议外字段，验证丢弃行为 | 手工改造自 `fixtures/ch03/multitool.json`，非真实录制 |
| `fixtures/ch04/surgery-finish-length.json` | 04.2 | 手术：`finish_reason` 改为 `length`，对照截断标注行为 | 手工改造自 `fixtures/ch01/ask-success.json`，非真实录制 |
| `fixtures/ch04/surgery-toolcall-no-name.json` | 04.3 | 手术：工具名缺失，校验分级用例 | 手工改造自 `fixtures/ch03/multitool.json`，非真实录制 |
| `fixtures/ch04/surgery-arguments-object.json` | 04.3 | 手术：`arguments` 是对象而非字符串（提供商协议真实差异），校验分级用例 | 手工改造自 `fixtures/ch03/multitool.json`，非真实录制 |
| `fixtures/ch04/surgery-empty-choices.json` | 04.3 | 手术：`choices` 为空数组，校验分级用例 | 手工改造自 `fixtures/ch01/ask-success.json`，非真实录制 |
| `fixtures/ch04/anthropic-shaped.json` | 04.4 | Anthropic Messages 形状合成响应，观察协议相异时的失败等级 | 手工合成（外壳沿用 `kind: chat-http`），非真实录制 |
| `fixtures/ch04/empty-id-roundtrip.json` | 04.1 | 空 id 回填实验：HTTP 400（服务端报错为须回传 `reasoning_content`） | `node scripts/empty-id-roundtrip.ts` |
| `fixtures/ch04/valid-id-roundtrip.json` | 04.1 | 单变量对照：正常 id 同样 400、同报错 → id 不是两次结果的差异变量 | `node scripts/valid-id-roundtrip.ts` |

## _pending · 待认领

当前为空。今后录了暂时不属于任何小步的实验性 fixture 放这里并登记；认领时移入对应章节目录、更新引用与本表。
