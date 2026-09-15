# Build My Agent：从零构建 Agent Harness

面向有开发经验、初次学习 Agent 的中文开发者。通过 TypeScript 与 AI 增量编码，理解并构建可复用的 Agent Harness，再用实验持续改进它。

主线是受控工作区内的开发者 Agent：阅读项目、搜索信息、修改文件、执行命令、验证结果，并在中断后继续任务。浏览器、资料研究与数据分析、企业业务操作用于检验迁移能力。

## 当前进度

课程设计 v0.2；学习进行中：第 01–02 章完成，第 03 章进行中。历史项目调研仅包含静态源码阅读，尚未完成运行验证。

1. [课程蓝图](docs/course-blueprint.md)：五个阶段、32 章规格、毕业项目与教学方式。
2. [能力与验收矩阵](docs/competency-matrix.md)：能力目标、章节、任务与证据。
3. [学习计划](docs/learning-plan.md)：每周 10–15 小时，按阶段验收调整预算。
4. [教学环境约定](docs/teaching-environment.md)：练习仓库、执行隔离、故障与迁移环境。
5. [学习与操作方法](docs/learning-method.md)：每一步怎么学、怎么操作；[教学与学习原理](docs/teaching-principles.md)：教学设计的原则清单。
6. [参考项目调研](docs/research/agent-landscape.md)：历史源码快照及新主线下的参考定位。

每章讲义在开课前预写于 `docs/lessons/chNN/`（含 Mermaid 图，GitHub 直接渲染），实测结果课后回填。

## 学习方式

代码与测试由 AI 按当前课程小步编写。每步遵循“说明目标 → AI 增量实现 → 讲解差异与执行过程 → 运行观察 → 理解检查 → 复盘”。不要求手敲代码或填 TODO，不提前实现后续功能；有疑问先在当前步骤讲清。

前期理解和预测执行过程；中期提出故障假设与验证方法；后期主导需求、设计取舍和实验，指导 AI 实现并判断结果。逐渐减少的是导师代替学习者作判断的程度，AI 编码支持始终保留。

目标是形成 Harness 研发工程能力，并提供研究进阶入口。课程验收依据可复现作品、诊断与实验能力，不将章节完成等同于通过某家企业招聘。

## 随仓库提供的教学支持

仓库内置 [agent-harness-tutor 教学 Skill](.agents/skills/agent-harness-tutor/SKILL.md) 和 [项目教学规则](AGENTS.md)。在支持仓库 Skills 的 Codex 环境中可直接说“开始第一课”，或显式使用 `$agent-harness-tutor`。若尚未被发现，可要求 AI 读取上述 Skill 文件；其他客户端是否自动加载取决于其支持情况。

公开仓库提供[个人学习记录模板](.agents/skills/agent-harness-tutor/assets/learning-state-template.md)与[教学审阅案例](.agents/skills/agent-harness-tutor/references/teaching-review.md)。个人进度保存在 Git 忽略的 `.learning/`，跨机器需自行转移或提供摘要。教学质量将通过实际试教迭代，不能由安装 Skill 推定效果。

## 开源准备

中文教材配英文术语，主线使用 TypeScript；研究进阶按需补充 Python。计划支持 Windows、macOS、Linux，实际验证平台逐项记录。每步提供独立起点、代码差异、运行说明与证据，基础练习支持离线回放，真实模型调用单独说明配置与费用。

当前未添加项目许可证；正式发布前完成代码与教材的许可证选择、署名及贡献指南。参考源码固定提交，依赖在实现阶段锁定。
