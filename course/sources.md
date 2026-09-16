# 维护者的核对来源

核对日期：2026-09-16。不是学习者必读包；课堂由导师抽取当前必要事实。工程建议不是唯一标准，教学指南不是本课程效果保证；动态 API 使用前再核对。

| 来源 | 支撑的范围 | 不应推导的结论 |
|---|---|---|
| [Anthropic：Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | 预定工作流与模型动态选择的架构区分，先比较简单方案 | “有运行时分支就需要 Agent”或所有任务都应自研 |
| [IES/WWC：Organizing Instruction and Study](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) | 工作样例与练习交替、图文结合、具体与抽象连接、间隔复访 | 每步都必须预测，或静态教材自动保证学会 |
| [Node：TypeScript](https://nodejs.org/api/typescript.html) | 原生类型擦除不做类型检查，需可擦除语法 | 程序能跑就通过了 TypeScript 检查 |
| [TypeScript：erasableSyntaxOnly](https://www.typescriptlang.org/tsconfig/erasableSyntaxOnly.html) | 配合原生擦除约束语法 | 任意 TS 特性都可直接交给 Node |
| [OpenAI：Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create) | 当前可选适配器的消息、function tools、finish_reason 与输出上限字段 | 所有第三方兼容接口都完全相同；stop 表示真实任务完成 |
| [SVG 2](https://www.w3.org/TR/SVG2/) | 可维护的文本图形格式 | 有 SVG 文件就已通过视觉质量检查 |

本课程选择 Chat Completions 的小子集用于观察消息与工具；不声称它是所有新应用唯一入口。后续会比较成熟 SDK 与不同接口，而不是把提供商某次返回当通用定律。
