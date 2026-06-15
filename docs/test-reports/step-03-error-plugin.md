# Step 03 测试报告：错误采集

## 环境

- Node: v22.13.0
- 浏览器: Chromium (Playwright)

## 验收项

| 用例 | 状态 | 备注 |
|------|------|------|
| window.onerror 捕获 | PASS | E2E monitor-flow.spec.ts |
| unhandledrejection 捕获 | PASS | demo 按钮触发 |
| Vue errorHandler 集成 | PASS | apps/demo main.ts |
| X-App-Key 请求头 | PASS | transport.ts |
| 后端入库 ERROR 类型 | PASS | GET /api/events?type=ERROR |

## 缺陷清单

无

## 结论

**通过**
