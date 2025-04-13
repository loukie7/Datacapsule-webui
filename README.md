# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## 环境配置

本项目使用环境变量来配置API和WebSocket地址。

### 配置步骤

1. 复制`.env.example`文件并重命名为`.env`（或`.env.development`、`.env.production`等）
2. 根据你的环境修改文件中的变量值

### 可用环境变量

- `VITE_API_URL`: 后端API地址
- `VITE_WS_URL`: WebSocket服务地址

### 环境切换

- 开发环境: `npm run dev` (使用`.env.development`或`.env`中的配置)
- 生产构建: `npm run build` (使用`.env.production`中的配置)
