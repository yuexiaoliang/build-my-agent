# AI 应用工程技术覆盖地图

本课程的总目标是 **AI Application Engineering**；**Agent Harness 是重点技术纵深，不是全部课程本身**。

这张地图回答“主要技术面有没有正式学习落点”。单元标签和依赖以 [catalog.json](catalog.json) 为准；本页用于人类快速检查，不把某个 SDK 或模型名称当长期课程结构。

| 技术域 | 课程中的核心内容 | 主要单元 |
|---|---|---|
| 模型 API 与生成基础 | messages/prompt、上下文窗口、Structured Output、运行时校验 | S1.1、S1.2、S1.3、S1.4、S2.4、S3.2、S5.1、S7.1、S7.4、S8.3、S8.4 |
| AI UX | streaming、partial/error/cancel 状态、审批与多模态交互 | S1.4、S4.4、S5.2、S5.3、S5.4、S8.3 |
| RAG / Context Engineering | keyword/vector/hybrid、embedding、chunking、metadata、rerank、citations、context assembly | S2.1、S2.2、S2.3、S2.4、S4.2、S8.3、S8.4 |
| Agent Harness | tools、loop、state、budget、workflow、planning、subagent、recovery | S3.1、S3.2、S3.3、S3.4、S4.1、S4.3、S4.4、S5.3、S8.3、S8.4 |
| 安全与数据边界 | auth、RBAC、multi-tenancy、prompt injection、approval、sandbox、secret | S1.3、S2.2、S3.1、S3.4、S4.1、S4.2、S4.3、S4.4、S5.4、S6.2、S6.3、S7.2、S8.1、S8.2、S8.3、S8.4 |
| 多模态与 Realtime | vision、document、STT/TTS、WebRTC/WebSocket、interrupt、fallback | S5.1、S5.2、S5.3、S5.4、S8.3、S8.4 |
| Evals | task set、grader、regression、human review、A/B、ablation | S2.3、S2.4、S3.3、S6.1、S6.2、S6.4、S7.1、S7.3、S7.4、S8.3、S8.4 |
| Observability | trace/span、metrics、token、cost、latency、failure diagnosis | S6.3、S6.4、S7.3、S8.2、S8.3、S8.4 |
| 模型与性能优化 | model selection、routing、fallback、caching、batching、fine-tuning 决策基础 | S2.4、S3.2、S6.4、S7.1、S7.2、S7.3、S7.4、S8.3、S8.4 |
| AI Backend / Production | DB、object storage、queue、webhook、background job、deploy、quota、ops | S1.1、S4.1、S4.2、S4.4、S6.3、S7.2、S7.3、S8.1、S8.2、S8.3、S8.4 |
| MCP / 生态 | MCP、provider adapter、外部工具集成与协议边界 | S3.4、S8.3、S8.4 |

## 覆盖口径

“覆盖”不等于把所有厂商产品和框架逐一学完。课程要求掌握稳定的工程问题、协议边界、验证方法和至少一次真实实现；具体 SDK 在本地学习时按当时生态选择。

主线会涉及 fine-tuning、蒸馏、合成数据的**决策基础和小规模实验条件**，但不把 CUDA、分布式训练、模型预训练、推理内核等模型工程/ML Systems 深度作为毕业前置。它们是另一条专业纵深。

毕业时至少要留下：一个完整 AI Web 产品、一条可评测 RAG 链路、一个自己构建的 Harness、一次多模态/Realtime 实践、一套 eval + trace 证据、一次生产部署，以及一个陌生需求迁移说明。