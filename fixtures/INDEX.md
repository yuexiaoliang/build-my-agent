# fixtures 登记表

录制的真实 HTTP 交互（`kind: chat-http`），供离线回放与课程取证。每个文件都必须在这里登记一行。

## 约定

- 路径：`fixtures/chNN/场景.json`；一次运行的第 k 轮（k≥2）自动录为 `场景-roundK.json`（与 `--record` 的命名一致）。
- 课程文档、脚本与本表引用 fixture 必须写**完整相对路径**（如 `fixtures/ch03/loop-after.json`），禁止 `…-round2.json` 这类省略写法——省略写法无法被机械校验。
- 新增 / 移动 / 删除 fixture 时：更新本表 + 跑 `npm run check:fixtures`（结构合法、引用存在、无孤儿）。
- fixture 是真实 API 的录制，**不可免费再生**；请求形状随 `src/model.ts` 演化后旧 fixture 可能无法回放，此时按本表"来源"列重新录制或标注失效。
- 尚未被课程认领的录制放 `fixtures/_pending/`；认领时移入对应章节目录、更新引用与本表。

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

## _pending · 待认领

| 文件 | 内容 | 可能归属 |
|---|---|---|
| `fixtures/_pending/chat-2026-09-14.json` | 首次真实调用（单轮 user → 200） | 01.2 / 01.3 |
| `fixtures/_pending/chat-2026-09-14-toolcall.json` | 首次带工具的调用 | 02.x |
| `fixtures/_pending/chat-401-model-not-supported.json` | 不支持模型的 401 错误原文 | 01.2（错误码） |
| `fixtures/_pending/chat-malformed.json` | 单引号非法 JSON 响应体（解析失败路径） | 01.3 |

ch01、ch02 讲义落成时确认归属：移入对应章节目录并更新引用与本表；确认无用的直接删除。
