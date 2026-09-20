# 导师按需查阅的来源入口

不是学习者的预读材料。AI 应用生态变化很快；进入具体单元时优先核对**当前官方文档**并记录日期/版本。下面是课程设计的入口，不代表每个提供商都采用相同接口。

## 模型 API、Structured Output、Retrieval 与 Realtime

- [OpenAI API 文档](https://developers.openai.com/api/docs/)：当前模型、Responses/工具、多模态等官方入口。
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)：JSON Schema 约束的一个具体实现；课堂仍保留本地业务校验。
- [Retrieval](https://developers.openai.com/api/docs/guides/retrieval)：semantic search/vector store 的厂商实现示例，用于与 lexical/hybrid/rerank 等工程概念对照。
- [Embeddings](https://developers.openai.com/api/docs/guides/embeddings)：embedding 的模型与 API 示例。
- [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)：WebRTC/WebSocket、实时会话和音频事件的当前实现示例。
- [Models](https://developers.openai.com/api/docs/models)：做能力/价格/模态/上下文选择前核对实际模型目录。

## Agent、工具与协议

- [Anthropic：Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)：workflows 与 agents、从简单方案开始的工程视角。
- [Anthropic Tool Use 文档](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview)：另一套供应商工具调用实现，用于避免把单一 API 形状当通用协议。
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/)：MCP 正式规范入口；课堂使用时必须确认当前正式版本与迁移说明。
- [MCP 2026-07-28 release](https://blog.modelcontextprotocol.io/posts/2026-07-28/)：当次正式规范的 stateless core、extensions、authorization 等变化，之后有新版本时以新版规范为准。

## Evals、Observability 与工程基础

- [OpenTelemetry Generative AI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)：GenAI trace/metric/event 的标准化语义入口。
- [OpenTelemetry：GenAI Observability](https://opentelemetry.io/blog/2026/genai-observability/)：模型调用、工具、token 与 latency 可观测性的实践示例。
- [Node.js TypeScript 文档](https://nodejs.org/api/typescript.html) 与 [TypeScript 配置](https://www.typescriptlang.org/tsconfig/)：本地工具链需要时核对。
- [IES/WWC 教学指南](https://ies.ed.gov/ncee/wwc/PracticeGuide/1)：工作样例、图文结合与复访等教学设计依据。

## 使用规则

官方文档中的供应商特定字段、模型名称和功能可随时间变化；课程真正要保留的是可迁移的工程问题与验证方法。教学时把“规范事实、当前供应商实现、我们的设计取舍、尚未验证行为”分开说明。