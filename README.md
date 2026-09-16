# Build My Agent：从零构建 Agent Harness

面向有开发经验、初次学习 Agent 的中文开发者。通过 TypeScript 与 AI 增量编码，理解、设计、诊断和改进 Agent Harness。AI 写代码；学习者逐渐接手判断，不以手敲代码或背术语验收。

## 从这里开始

**不需要先读完一组文档。** 在课程仓库中对 AI 说“继续学习”即可。导师读取当前检查点，说明这一步为什么值得学，先带你看懂一个完整例子，再邀请你做一个有依据的小判断。讲义提前备好，但只是本步的参照和课后的回查材料，不是整章课前作业。

首次使用时说“开始第一课”；需要显式加载时使用 `$agent-harness-tutor`，或让 AI 读取 [教学 Skill](.agents/skills/agent-harness-tutor/SKILL.md) 和 [项目约定](AGENTS.md)。客户端是否自动发现 Skill 取决于其支持情况。

**当前记录**：01–03 章完成，04.1 已有学习记录，下一步为 04.2。位置不等于全部掌握；恢复以 [.learning/state.md](.learning/state.md) 为准。需要串起前几章时，由导师带读[桥接课](docs/lessons/bridge-01-04.md)中的相关一段，不重新从第一章考试。

## 你将逐步建成什么

贯穿任务是：理解练习仓库，修复导入缺陷，补充验证并说明改动。先得到只读小助手，再加入受控编辑与执行、恢复、上下文管理和实验评测；最后用浏览器、资料研究与数据分析、企业操作检验核心能否复用。

教学方式 v0.3 是待真实试教校准的改造，不是效果保证。没有在课程维护中提前实现后续 Agent 功能。历史参考项目调研仍以静态源码阅读为主，未验证项不能当作已运行。

<details>
<summary>需要查资料时再展开：地图、教材与维护资料</summary>

- [学习与操作方法](docs/learning-method.md)：课堂如何进行、卡住时怎么办。
- [课程蓝图](docs/course-blueprint.md)：32 章范围、依赖、毕业要求；[能力矩阵](docs/competency-matrix.md)：验收证据。
- [学习计划](docs/learning-plan.md)：进度与掌握分开、如何复习和恢复。
- [教学环境](docs/teaching-environment.md)、[教学原理](docs/teaching-principles.md)、[参考项目调研](docs/research/agent-landscape.md)：导师按需查阅，不是开课必读包。
- [.learning/lessons/INDEX.md](.learning/lessons/INDEX.md)：已有复习卡。

</details>

## 仓库与证据

讲义在 `docs/lessons/`；个人进度和复习卡在 `.learning/`，随本仓库公开管理，跨机器克隆即可。不要提交密钥、完整聊天记录或无依据的能力评分。一次讲义和一张短复习卡足够，运行细节引用已有记录，不另生成多篇重复总结。

基础练习支持离线回放；真实调用另行核对模型、配置与费用。计划支持 Windows、macOS、Linux，实际验证平台逐项记录。依赖在实现阶段锁定，源码对照固定提交。课程以可复现作品及解释、诊断、迁移证据验收，不承诺招聘结果。

当前未添加许可证；正式发布前完成代码与教材的许可证选择、署名及贡献指南。
