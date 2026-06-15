# 多 Agent 协作规范

本文档定义 **frontend-observability** 项目中三类 Agent 的职责边界与协作流程。

## 角色定义

### 主 Agent（架构师）

**职责：**

- 系统架构设计与接口契约制定
- 分支规划与 Task Brief 下发
- 代码审查与合并决策
- 协调编码/测试子 Agent 的迭代闭环

**产出物：**

- `docs/architecture.md` — 架构文档
- `docs/api.md` — API 契约
- `docs/task-briefs/step-XX.md` — 每步任务单
- 合并 `main` 分支的决策记录

### 编码子 Agent

**职责：**

- 在指定 `feat/*` 分支实现功能
- 编写中文 JSDoc / 行内注释
- 补充必要的单元测试
- 根据测试报告修复缺陷

**约束：**

- 不得擅自修改 API 契约（需主 Agent 批准）
- 每步仅改动 Task Brief 列出的文件范围
- 提交前确保 `build` 通过

### 测试子 Agent

**职责：**

- 执行单元测试、集成测试、E2E 测试
- 编写/维护 Playwright 用例
- 输出结构化测试报告
- 将缺陷清单交回主 Agent 协调修复

**产出物：**

- `docs/test-reports/step-XX.md` — 测试报告

## 协作流程

```
用户 → 主Agent（确认需求/下发Brief）
         ↓
      编码子Agent（feat分支开发）
         ↓
      测试子Agent（验收）
         ↓
    ┌─ 失败 → 主Agent → 编码子Agent（修复）→ 回归
    └─ 通过 → 主Agent merge main → push
```

## Task Brief 模板

每步开发前，主 Agent 在 `docs/task-briefs/` 创建任务单：

```markdown
# Step XX: 标题

## 分支
feat/XX-xxx

## 目标
（本步交付物描述）

## 涉及文件
- packages/sdk/src/...

## 接口契约
（不可偏离的类型/API定义）

## 验收标准
- [ ] 标准1
- [ ] 标准2

## 禁止改动
- 不在范围内的模块
```

## 测试报告模板

```markdown
# Step XX 测试报告

## 环境
- Node: x.x
- 数据库: PostgreSQL x

## 结果
| 用例 | 状态 | 备注 |
|------|------|------|
| ... | PASS/FAIL | ... |

## 缺陷清单
1. [P1] 描述 → 建议修复方案

## 结论
通过 / 不通过
```

## 分支合并规则

1. 仅在测试子 Agent 报告 **通过** 后合并
2. 合并使用 `--no-ff` 保留分支历史
3. 每步合并后立即 `push origin main`
4. 不直接在 `main` 上开发新功能

## 沟通原则

- 子 Agent 之间不直接合并代码，统一由主 Agent 调度
- 所有接口变更必须同步更新 `docs/api.md`
- 上下文通过文档留痕，避免口头传递丢失
