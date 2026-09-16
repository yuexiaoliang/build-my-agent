# 当前可用路径与证据边界

本仓库已有 `course/assets/flow.png`、`evidence.png` 两张实际图片，保留 SVG 图源和 manifest.json 的源/图哈希。PNG 可直接用于课程和无执行工具的授课模型，不是 Mermaid 代码块。

可选重新生成：

```sh
npm run render:visuals
npm run render:visuals -- --publish
```

第一条只生成独立 `.lesson-preview/visuals-*` 目录；第二条在两张都成功后替换指定课程 PNG 并更新哈希清单。不会上传，也不会遍历历史输出，不会删除非生成文件。图片清单可检测源或产物变动后未同步的情况；哈希一致不能替代视觉检查。

维护环境需要 Python 与 `scripts/requirements-visuals.txt` 中固定的 CairoSVG，以及系统 Cairo/中文字体。它们是可选图片工具，**不是课堂或实验台启动依赖**。可用 PYTHON 指定实际解释器；Windows/macOS 需另核验环境。没有工具时直接复用已有图片，不把安装任务推给学习者。

新增标准关系图也可以由实际可用的 Mermaid 渲染器制作；精确排版选 SVG/HTML；真实截图或生成式图片调用宿主真实工具。仓库没有自动安装浏览器、Mermaid 或图片 API，不能把这些名称当成已接入能力。

本次维护环境的浏览器导航受到策略限制，因此实际图片使用本地 SVG→PNG 转换；没有修改浏览器安全策略。图片成功生成不意味着浏览器端到端测试通过。每次分别记录内容、产物、目视检查与交付路径。

只转换维护过的受信 SVG，不能当不可信上传图的安全服务。真实截图保留原件，标注副本不能改变实际画面；图像生成工具的费用、数据上传与素材授权另行核对。图源、代码和讲义保持同一版本，不用旧图证明新实现。

参考：[SVG 标准](https://www.w3.org/TR/SVG2/)；[CairoSVG 使用说明](https://cairosvg.org/documentation/)；[Mermaid CLI](https://github.com/mermaid-js/mermaid-cli)。
