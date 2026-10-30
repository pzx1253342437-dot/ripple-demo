# 波纹配对 Demo

## 读取顺序

- 先读全局 `C:\Users\pc\.codex\AGENTS.md`
- 再读本文件
- 再读 `memory/MEMORY.md`，按任务挑一到两个记忆文件

## 目标

浏览器定位换算成平面坐标，服务端计算波前、距离和相遇，双方在 20 秒内确认配对或继续传播。

## 运行

- `npm install`
- `npm start`，打开 `http://localhost:3000`
- 服务跑着再执行 `npm test`
- `npm run test:ui` 需要本机 Chrome 或 Edge

## 目录

- `server.js` HTTP、WebSocket、波前物理、相遇状态机
- `public/` 页面、样式、Leaflet 地图和客户端动画
- `tests/` 服务端流程和移动端交互测试
- `docs/` README 截图

## 硬约束

- 波前半径、相遇判定、冷却和断线失效都由 `server.js` 计算，前端只按 `simNow` 外推动画
- 小湖半径 5km，速度 5m/s，忽略 1km 内的波
- 中湖半径 20km，前 50 秒以 100m/s 冲出 5km，这段时间不配对，之后 10m/s，忽略 5km 内的波
- 中湖波前 5km 内显示黑色，越过 5km 换成粉色
- 大湖在 Demo 里上限 200km，速度 10m/s，忽略 50km 内的波，允许退出并保留波
- 每个用户在每个湖面同时只能有一圈活跃波
- memory/ 只保留在本地，不提交到公开仓库
- 相遇后两圈波默认停住，双方都选继续才绕开彼此继续传播
- 演示加速只改模拟时间，不改波速、距离和相遇判定
- 演示波友不能伪造距离，也不能伪造远方玩家
- 改玩法、文案或界面，同步更新 `README.md` 和对应测试

## 记忆

- 入口是 `memory/MEMORY.md`
- 先按任务读一到两个文件，不整目录全读
- 改功能、参数、界面或文案，先读 `memory/project_ripple.md`
