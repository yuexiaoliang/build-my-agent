# Agent 项目调研与参考选型

调研日期：2026-09-11。目标：为 TypeScript 企业 Agent 课程选择 2–3 个核心参考，控制框架和源码阅读负担。

## 1. 方法与证据边界

先搜索候选，再读取官方 GitHub 元数据和固定提交的源码。选择依据是机制可解释性、TypeScript 适配、企业工程学习价值、复现成本与许可边界。以下评分与教学定位是课程设计判断，不是项目性能排名。

Stars 仅为调研时的关注度快照；单次快照不能证明近期增长速度。`pushed_at` 表示仓库推送时间，不等于稳定版发布时间，也不能证明质量。本轮没有安装、执行或基准测试任何上游项目，没有进行全仓安全审计。

数据通过 `https://api.github.com/repos/{owner}/{repo}` 和 `/commits/{default_branch}` 获取。全部候选当时均未归档。分支后续会变化，因此阅读入口固定到下面的提交。

| 项目 | Stars 快照 | 最近推送日期 UTC | 源码快照 SHA | 第一轮定位 |
|---|---:|---|---|---|
| [Pi](https://github.com/badlogic/pi-mono) | 104,018 | 2026-09-11 | `62129190d81067ec86ae5a5fc907c96bfe435a78` | 核心：运行循环 |
| [Mastra](https://github.com/mastra-ai/mastra) | 27,931 | 2026-09-11 | `10e408d534390266ea04964c64e29a8bef9a8115` | 核心：业务工作流 |
| [Deep Agents JS](https://github.com/langchain-ai/deepagentsjs) | 1,551 | 2026-09-11 | `eb288dd53a2a8cf921e25ad93688212ffc1aca72` | 核心：进阶任务编排 |
| [mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) | 7,383 | 2026-09-07 | `04d809ceab9df28f9adaed044884180159172930` | 选修：极简循环与编程任务 |
| [nanobot](https://github.com/HKUDS/nanobot) | 48,013 | 2026-09-11 | `90b889394fb7f71510b0a63ed6124eed5c77f628` | 选修：个人助手运行时 |
| [OpenClaw](https://github.com/openclaw/openclaw) | 389,421 | 2026-09-11 | `8ac24c73da8756f3dccfc2d614c52efc383394b1` | 候选专题：产品集成 |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | 244,362 | 2026-09-11 | `a6ee31f55aad08cc51ba348db2febacd541eec01` | 候选专题：记忆与技能 |

先前初筛的 [smolagents](https://github.com/huggingface/smolagents) 与 [OpenHands](https://github.com/OpenHands/OpenHands) 保留为拓展资源。本轮不继续展开，以免主线被 Python 和完整产品工程分散；未给它们做本轮固定源码快照或运行验证。

## 2. 核心参考及阅读问题

### Pi：理解运行时，而不是从命令行产品开始读

已检查 [agent-loop.ts](https://github.com/badlogic/pi-mono/blob/62129190d81067ec86ae5a5fc907c96bfe435a78/packages/agent/src/agent-loop.ts) 的循环主体和工具执行片段，以及 [agent.ts](https://github.com/badlogic/pi-mono/blob/62129190d81067ec86ae5a5fc907c96bfe435a78/packages/agent/src/agent.ts) 的状态和生命周期接口。

- 观察：模型响应、工具执行、结果回填与事件通知有明确分工；调用边界转换消息；工具参数先校验；存在取消及停止钩子；对因输出长度截断的工具调用单独处理。
- 学习问题：为什么模型输出不能直接执行？工具结果如何关联调用？取消与失败如何传播？为什么要区分应用消息和模型消息？
- 课程映射：第 02–05、09、13 章。先实现简化版本，再阅读相关函数；不整仓移植，不从 TUI 入手。
- 取舍：实际运行时已经包含大量边界处理，不能把整个项目当成“几十行就能读完”的入门练习。

### Mastra：对照显式工作流与 Agent 的职责

已检查 [Agent 入口](https://github.com/mastra-ai/mastra/blob/10e408d534390266ea04964c64e29a8bef9a8115/packages/core/src/agent/agent.ts) 的依赖与工具/记忆集成入口，以及 [工作流实现](https://github.com/mastra-ai/mastra/blob/10e408d534390266ea04964c64e29a8bef9a8115/packages/core/src/workflows/workflow.ts) 的暂停/恢复类型和恢复接口。未完整验证执行引擎及持久化语义。

- 学习问题：哪些步骤适合模型选择，哪些应固定执行？人工审批跨进程后如何继续？框架恢复是否等于外部操作不会重复？
- 课程映射：第 10–12、15 章。用同一条订单异常流程对比 AI 从基础代码构建的实现和框架版本，共用业务 API 与验收集。
- 取舍：后期只重做一条流程，不把整门课改成框架 API 教程。审批身份和业务权限仍由业务服务验证。

### Deep Agents JS：在掌握单 Agent 后分析组合机制

已检查 [agent.ts](https://github.com/langchain-ai/deepagentsjs/blob/eb288dd53a2a8cf921e25ad93688212ffc1aca72/libs/deepagents/src/agent.ts) 的组装入口：文件系统、记忆、技能、子 Agent 等中间件，以及 `checkpointer`、`interruptOn` 的传递。

- 学习问题：子任务获得哪些工具与上下文？持久化、长期记忆和文件存储有何区别？中间件顺序会怎样影响行为？
- 课程映射：第 08、14、15 章。先定位组装关系，相关专题再下钻具体中间件。
- 取舍：建立在 LangChain/LangGraph 抽象之上，适合进阶。必须比较单 Agent 基线，不能把增加子 Agent 默认视为改进。

## 3. 专题参考边界

- **mini-swe-agent**：已检查 [default.py](https://github.com/SWE-agent/mini-swe-agent/blob/04d809ceab9df28f9adaed044884180159172930/src/minisweagent/agents/default.py) 的 `run → step → query → execute_actions`，以及调用次数、费用、时间限制。适合用伪代码跨语言对照，再迁移到隔离的编程练习。标题中的“100 行”不作为当前完整项目规模或企业可靠性的证据。
- **nanobot**：已抽查 [loop.py](https://github.com/HKUDS/nanobot/blob/90b889394fb7f71510b0a63ed6124eed5c77f628/nanobot/agent/loop.py) 的记忆、工具注册、会话和 runner 依赖入口；尚未追踪完整调用链。保留为长期运行、会话与定时任务专题，不纳入企业必修。
- **OpenClaw、Hermes**：本轮核对官方仓库及元数据，未完成核心调用链分析。保留候选专题，不据热度承诺其架构适合初学者。

## 4. 许可记录

这部分记录上游文件与元数据，不代表对整个依赖树的许可审计。直接复用前仍需检查具体文件及其第三方声明。

- Pi、Deep Agents JS、mini-swe-agent、nanobot、Hermes：GitHub 本轮返回 MIT 标识；逐文件复用尚未进行。
- Mastra：GitHub 返回 `NOASSERTION`。读取 [LICENSE.md](https://github.com/mastra-ai/mastra/blob/10e408d534390266ea04964c64e29a8bef9a8115/LICENSE.md) 后确认，常规部分为 Apache-2.0，名为 `ee/` 的目录适用另行定义的许可，第三方组件保留原许可。课程不依赖 `ee/` 功能。
- OpenClaw：GitHub 返回 `NOASSERTION`，但所读 [LICENSE](https://github.com/openclaw/openclaw/blob/8ac24c73da8756f3dccfc2d614c52efc383394b1/LICENSE) 为 MIT，并指向第三方声明。不能把 API 的识别失败当作没有许可证。
- 教材以原创解释、固定链接和独立实现为主；如引入上游代码，保留相应署名与许可。项目自身许可证尚待发布准备阶段确定。

## 5. 选型决定与下一步

核心参考为 **Pi + Mastra + Deep Agents JS**；前半程的运行时由 AI 随课程从基础代码增量实现，学习者跟随理解与验证，三者都不是此刻新增的依赖。mini-swe-agent 是最小循环和编程专题的补充。

课程使用某个框架前，需要完成一条最小运行验证：模型调用、工具调用、错误传播，以及该章涉及的暂停/恢复或子任务；记录包版本、模型配置、操作系统和结果。目前尚未完成这些验证，不能把源码快照当作推荐安装版本。

下一交付：编写第一阶段详细教材和练习脚手架；同步准备稳定的模拟企业系统及其契约测试，在第 06 章前就绪。源代码阅读只布置与当章问题有关的少数函数。
