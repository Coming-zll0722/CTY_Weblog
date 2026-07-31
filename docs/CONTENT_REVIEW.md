# 内容发布复核

## 当前内容矩阵

内容库包含 5 个分类、15 个标签、12 篇文章、4 个项目和 6 条时间线。

可以公开的文章：

- `tcp-message-boundaries`：通用 TCP 字节流与模拟帧示例；
- `fastapi-react-data-boundaries`：只引用 CTY Log 公开仓库；
- `markdown-publishing-security`：只引用公开实现与通用安全边界；
- `compose-release-backup-rollback`：只描述公开发布结构，不包含服务器秘密。

默认草稿文章：

- `udp-test-assertions`
- `connection-state-machine`
- `configurable-frame-parser`
- `test-evidence-traceability`
- `pytest-protocol-matrix`
- `script-to-test-platform-boundaries`
- `fpga-clock-constraints-notes`
- `ai-test-case-traceability`

四个项目均可公开，但公开性质不同：

- 通信协议测试平台：脱敏工程方法案例；
- CTY Log：有公开仓库佐证的真实项目；
- 协议帧工具：完全模拟的个人原型；
- FPGA 实验集：持续学习项目，不表达商业交付。

## 需要作者确认的事实

在把草稿发布前，逐项确认：

1. UDP、连接状态机、解析器和 pytest 内容是否与实际使用方式一致；
2. 通信测试平台的个人职责表述是否准确，是否需要删减；
3. 项目开始时间是否准确；
4. FPGA 实验中哪些项目已经实际完成，哪些仍属于计划；
5. AI 辅助测试是否只使用获准的公开或脱敏输入；
6. 是否有可以公开的测试截图、模拟报告或重新绘制架构图；
7. 备案完成后补充备案号，并重新确认生产域名的公开链接。

不能确认的内容继续保留为草稿或学习计划，不用模糊措辞包装成已交付成果。

## 建议优先完善

1. `test-evidence-traceability`：补一份完整的模拟运行记录和报告截图；
2. `pytest-protocol-matrix`：补可运行的最小示例仓库或代码目录；
3. `fpga-clock-constraints-notes`：补实际 RTL、约束、波形和工具报告摘要。
