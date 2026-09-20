# Build My Agent

**从前端出发，系统学习 AI Application Engineering；Agent Harness 是重点技术纵深。**

目标不是只会一个 Agent 框架，而是逐步具备完整 AI 应用的设计、实现、诊断、评测、优化和交付能力。课程覆盖模型 API/Structured Output、AI UX、RAG/Context Engineering、Agent Harness、MCP、安全、多模态/Realtime、Evals/Observability、模型与成本优化、AI Backend 和生产部署等主要技术面。

完整覆盖关系见 [AI 应用工程技术地图](course/technology-map.md)。

## 在本地从零开始

把仓库放到本地工作目录，向授课 AI 说：

> 读取 AGENTS.md，开始第一课。请先准备当前小步，再带我逐步建立项目，不要一次生成完整系统。

本仓库是**课程设计与教学规则的起点**，不是已经写完的教程项目。没有预制 Harness、成品课件或完整参考应用；具体讲义、图片、代码、测试和运行证据在本地学习过程中逐步产生。

本地导师会利用已有前端经验，先检查当前小步所需环境，再准备完整示范与必要图片。AI 可以承担大量编码，但学习者要逐步掌握为什么这样设计、怎样验证、失败在哪里以及何时不该使用某项 AI 技术。

## 八阶段

1. LLM 应用基础与 AI UX
2. RAG 与 Context Engineering
3. Agent Harness 与生态集成
4. 可靠执行与安全边界
5. 多模态与 Realtime
6. Evals 与 Observability
7. 模型选择与成本性能优化
8. 生产交付与独立迁移

共 32 个设计单元，全部初始为 `planned`。这表示路线已经明确，但不会提前把后续实现做完再让学习者阅读。

## 学习结果的边界

学完主线，目标是系统覆盖 **AI 应用工程的主要技术面**，并在 Agent Harness 上形成更深的工程理解。课程不声称覆盖模型预训练、CUDA、分布式训练和大型推理内核等 ML Systems 全部内容；fine-tuning、蒸馏和合成数据会学习到“何时值得做、如何验证”的应用工程层。

具体厂商 API、模型和 SDK 会变化，因此课程强调协议边界、工程问题和验证方法。导师在对应单元开始时核对当时官方文档，不要求死记某个 2026 年接口。

## 资料分工

- [课程路线](course/roadmap.md)：八阶段关系和课程原则。
- [课程索引](course/catalog.json)：32 个单元的目标、依赖、技术域标签和备课状态，是机器可读的课程真源。
- [技术覆盖地图](course/technology-map.md)：检查主要 AI 应用技术是否都有正式学习落点。
- [能力验收](course/assessment.md)：什么样的作品和判断才算会。
- [备课模板](course/templates/lesson.md)：导师只为当前小步准备材料。
- `harness/`：本地作品工作区；`.learning/state.json`：当前个人学习位置。
- [作品表达](portfolio/README.md)：把已经验证的实践整理为专业表达，不反过来决定课程。

不需要预读全部资料。导师只呈现当前必要部分，不用阅读量、手敲代码量或“继续”作为掌握证据。