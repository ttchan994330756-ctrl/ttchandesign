# Industrial Designer Portfolio

基于 React + Vite 构建的陈麒聪工业设计作品集。页面采用深色背景、高饱和紫色点缀与磨砂玻璃质感，包含 4K 视频首屏、交互式作品画廊、设计历程、精选项目、能力优势与整屏联系页。

当前版本的作品画廊使用 OGL WebGL 渲染，设计历程卡片使用鼠标跟随的 BorderGlow 效果。真实简历文件和联系方式仍可在后续接入。

## 本地运行

```bash
npm install
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`。

## 生产构建

```bash
npm run build
npm run preview
```

## 主要文件

- `src/main.tsx`：页面内容、数据与交互结构
- `src/styles.css`：视觉系统、布局和响应式规则
- `public/`：作品展示图片
