# 列表实验学院（完全重构）

本版本针对你的反馈重新设计：
- 从“什么是列表实验”开始，而不是直接进入多参数调节。
- 每个知识点拆分为独立关卡页面。
- 用可视化条形图/分布图展示结果，减少纯猜测环节。

## 关卡结构

1. `chapters/ch1.html`：列表实验的动机（直接提问 vs 列表实验 vs 真实值）
2. `chapters/ch2.html`：均值差估计量的重复抽样分布
3. `chapters/ch3.html`：关键假设（无设计效应、无谎言）与违背信号
4. `chapters/ch4.html`：多元分析思路（DIM vs 控制协变量后的估计）

> 说明：第4关是教学化近似演示，帮助理解为什么要从单一均值差走向多元模型；正式研究可进一步使用 NLS/ML/EM 等方法。

## 运行

```bash
python3 -m http.server 8000
```

打开：`http://localhost:8000/index.html`

## 文件

- `index.html`：地图与进度
- `app.js`：仿真、估计与进度状态
- `styles.css`：统一样式
- `chapters/ch1.html`~`ch4.html`：四关内容
