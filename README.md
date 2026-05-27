# 并肩小屋

一个给情侣异地陪伴用的小网站。两个人打开同一个网址，输入同一个小屋口令，分别选择"我"和"TA"，就能同步今天的任务、鼓励纸条、今日小天气和晚安小结。

现在的版本使用：

- 前端：React + Vite
- 云端页面：Cloudflare Pages
- 云端接口：Cloudflare Pages Functions
- 云端数据库：Cloudflare D1

不需要自己买云服务器。

## 这个小屋有什么

- **今日任务**：分计划、冲刺、保底三种类型，各自管理，也可以给对方提小建议
- **今日小天气**：7 种心情状态（很开心 / 有点累 / 烦烦的 / 想被抱抱 / 想安静一下 / 今天还不错 / 不想说话但想被陪着）
- **小信箱**：给对方写鼓励纸条，有信箱开启动画
- **60 秒安定**：呼吸引导小工具，帮彼此放松
- **心情月历**：按月回看两个人的心情记录
- **睡前小夜灯**：记录今天做到了什么、小烦恼、明天至少要做的一件事
- **小屋回忆**：累计守住的日子、最近的小纸条、小屋口令管理

## 这个方案是什么意思

你和女朋友不是连接彼此的电脑，而是都访问 Cloudflare 上同一个网站、同一个数据库。

```text
你 / 女朋友的浏览器
  -> Cloudflare Pages 前端页面
  -> /api/... Pages Functions
  -> Cloudflare D1 数据库
```

打开小屋时，网站会从 D1 拉取最新数据；新增任务、鼓励、晚安总结时，网站会写入 D1。页面进入小屋后每 15 秒自动同步一次，所以另一方稍等一下或手动刷新就能看到。

## 重要说明：中国大陆访问

Cloudflare 免费版可以部署这个网站，但它不等于"中国大陆加速线路"。`*.pages.dev` 在中国大陆不同运营商、不同地区可能有时快、有时慢，甚至打不开。

真正覆盖 Cloudflare 中国大陆网络的是 Cloudflare China Network，通常需要企业级方案，并且域名需要 ICP 备案 / 许可证。官方说明：

- Cloudflare China Network: https://developers.cloudflare.com/china-network/
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Cloudflare Pages: https://developers.cloudflare.com/pages/

建议你先用免费 Cloudflare 部署测试。如果你和女朋友所在网络都能正常访问，就继续用；如果不稳定，国内稳定访问更适合腾讯 CloudBase、腾讯云、阿里云这类国内平台。

## 本地准备

先安装依赖：

```bash
npm install
```

复制环境变量文件：

```bash
copy .env.example .env.local
```

`.env.local` 里可以改你们的小屋信息：

```env
VITE_API_BASE_URL=
VITE_CABIN_ROOM_CODE=hanyue-2026
VITE_CABIN_ME_NAME=小涵涵
VITE_CABIN_TA_NAME=小越越
```

部署到 Cloudflare Pages 时，`VITE_API_BASE_URL` 保持空就行，因为前端和 `/api` 在同一个域名下。

## 本地用 Cloudflare 模式预览

第一次需要先初始化本地 D1 数据库：

```bash
npm run db:migrate:local
```

然后启动 Cloudflare Pages 本地预览：

```bash
npm run dev:cloudflare
```

打开：

```text
http://localhost:8788
```

如果你只是想看前端页面，不连 Cloudflare Functions，也可以：

```bash
npm run dev
```

但完整同步功能请用 `npm run dev:cloudflare`。

## 部署

构建并部署到 Cloudflare Pages（main 分支）：

```bash
npm run build
npx wrangler pages deploy dist --project-name side-by-side-cabin --branch main
```

部署完成后，你和女朋友打开小屋网址，输入同一个小屋口令就能看到同一份数据。

## 常用命令

```bash
npm test                # 运行测试
npm run dev             # 仅前端开发
npm run dev:cloudflare  # 完整 Cloudflare 本地预览（含 API + D1）
npm run build           # 构建前端
npx wrangler pages deploy dist --project-name side-by-side-cabin --branch main  # 部署到生产环境
```

## 数据表

`schema.sql` 会创建这些表：

- `rooms`：小屋口令和两个人的显示名
- `tasks`：每日任务（计划 / 冲刺 / 保底）
- `encouragements`：鼓励纸条
- `daily_summaries`：晚安小结
- `daily_statuses`：今日心情

## 排错

如果页面提示 `Cloudflare D1 binding DB is missing`：

- Pages 项目没有绑定 D1
- binding 名字不是 `DB`
- 绑定只加在 Preview，没加在 Production

如果页面能打开但保存失败：

- 确认运行过 `npm run db:migrate:remote`
- 确认 `wrangler.toml` 里的 `database_id` 已经替换
- 确认 Pages 项目重新部署过

如果中国大陆访问慢或打不开：

- 先让你和女朋友分别用手机流量、校园网、家宽测试
- 可以绑定自己的域名，但免费 Cloudflare 仍不保证大陆线路稳定
- 真要稳定，建议改用国内云平台部署
