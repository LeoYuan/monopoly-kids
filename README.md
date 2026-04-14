# 糖果大富翁

一款为小朋友设计的轻松愉快的大富翁游戏，支持 2-4 人本地对战。

![版本](https://img.shields.io/github/v/release/LeoYuan/monopoly-kids)

## 功能特点

- **2-4 人对战**：和家人朋友一起成为小小富翁
- **自定义头像**：支持上传本地图片作为玩家头像
- **常见玩家**：保存常用的玩家姓名和头像，快速开始游戏
- **空格键操作**：按空格摇骰子、购买地产，简单方便
- **地产详情**：点击棋盘格子查看价格、租金和当前地主
- **排行榜**：自动记录冠军战绩

## 技术栈

- [Tauri v2](https://tauri.app/) — 桌面应用框架
- [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Playwright](https://playwright.dev/) — E2E 测试

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 以 Tauri 桌面应用形式启动
npm run tauri:dev

# 运行 E2E 测试
npx playwright test

# 构建前端
npm run build

# 构建 Tauri 桌面应用
npm run tauri:build
```

## 下载安装

在 [Releases](https://github.com/LeoYuan/monopoly-kids/releases) 页面下载最新版本的 `.dmg` 安装包。

## 游戏规则

1. 点击「掷骰子」移动棋子
2. 走到空地产时，可以用零花钱购买
3. 走到别人的地产时，要交租金
4. 经过起点可以获得 200 元奖励
5. 拥有同颜色 2 间房子 → 租金升级；4 间 → 租金满级
6. 在 20 个回合内，成为最富有的小小富翁！

## 许可证

MIT
