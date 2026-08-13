# Recall AI 错题本：腾讯云 CloudBase 部署指南（备用方案）

> 主方案请看 [部署指南](./部署指南.md)（EdgeOne Makers，免费版永久提供）。
> 本指南作为**备用方案**：如果 EdgeOne Makers 部署遇到问题，可用 CloudBase 云托管（同为腾讯云、国内免费额度）。

## CloudBase 免费说明（重要）

CloudBase 免费体验版**不是永久免费**，使用前务必了解：

- 每月 **3,000 资源点**，每个账号限 **1 个免费环境**；
- 免费环境单次有效期 **6 个月，需每半年手动续费一次**（不支持自动续费）；
- **忘记续费**：环境隔离 7 天后被**释放、数据丢失**；
- 免费环境**不能加购资源包、不能开启按量付费**，超出 3,000 资源点需升级付费（个人版 ¥19.9/月起）。

课程演示（短期、低频访问）够用；想长期省心建议用主方案的 EdgeOne Makers（免费版永久提供）。

## CloudBase 云托管说明

本项目登录、注册、错题、AI 对话等全靠 `/api/*` 接口，必须跑在能真正运行 Node 服务的平台上。**腾讯云 CloudBase 云托管**完整支持 Next.js 的 SSR 和 API 接口，免费额度内即可完成课程演示。

## 整体架构

```
用户浏览器 ──▶ CloudBase 云托管（跑 Next.js 全栈，含 /api 接口）
                    │
                    └──▶ Supabase 云数据库（存错题/账号，区域选 Singapore/Tokyo）
```

代码已按 CloudBase 要求改好，新增/改动文件：
- `next.config.mjs`：加了 `output: "standalone"`（云托管运行模式，本地 `npm run dev` 不受影响）
- `Dockerfile`：云托管的多阶段构建镜像（处理了端口、静态资源复制等坑）
- `scf_bootstrap` + `.gitattributes`：备选的 HTTP 云函数启动脚本

## 准备清单

- 腾讯云账号（已实名）
- GitHub 仓库已推送最新代码（**先把下面的代码改动提交并 push**）
- Supabase 账号（免费）

---

## 第一步：Supabase 云数据库

> 不配 Supabase，CloudBase 的临时磁盘不持久，重启数据就丢。这一步必做。

1. 打开 [supabase.com](https://supabase.com) 注册登录，**New project**，区域选 **Singapore** 或 **Tokyo**。
2. 左侧 **SQL Editor** → 粘贴 `supabase/schema.sql` 全文 → **Run**（建一张 `app_state` 表存所有数据）。
3. **Authentication → Sign In / Providers → Email** → 取消勾选 **Confirm email**（注册免邮件确认）。
4. **Authentication → Users → Add user**：邮箱 `demo@recall.app`，密码 `recall123`，开启 **Auto Confirm User**。
5. **Project Settings → API** 记下三个值：**Project URL**、**anon public**、**service_role**。

## 第二步：把代码改动推到 GitHub

本地项目里新增了 Dockerfile 等部署文件、改了 next.config.mjs，**部署前先提交推送**：

```bash
git add next.config.mjs Dockerfile .dockerignore scf_bootstrap .gitattributes
git commit -m "chore: 支持 CloudBase 云托管部署"
git push
```

## 第三步：CloudBase 部署（主方案：云托管）

1. 打开 [CloudBase 控制台](https://cloud.tencent.com/product/tcb) → 开通 CloudBase（有免费额度/新用户礼包）。
2. 创建环境（按提示，环境名称随意，如 `recall-app`）。
3. 进入 **云托管（CloudBase Run）** → 创建服务。
4. **镜像来源选"从代码构建/上传代码"**，关联你的 GitHub 仓库，根目录选 `recall-app`（如果在仓库子目录）。
5. **构建参数（--build-arg）必须填**（NEXT_PUBLIC 变量在构建时打包进前端，缺了登录页会连不上 Supabase）：

   | 构建参数 | 值 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public |

6. **服务环境变量**（运行时注入，也建议把 NEXT_PUBLIC 两个再填一遍做双保险，服务端密钥放这里）：

   | 变量名 | 值 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role（敏感，只填服务端） |
   | `DEEPSEEK_API_KEY` | 本地 `.env.local` 里的 |
   | `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
   | `DEEPSEEK_MODEL` | `deepseek-chat` |
   | `OCR_SPACE_API_KEY` | 本地 `.env.local` 里的（不填则用内置演示识别） |

   > 说明：`hasSupabaseEnv()` 要求 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 都非空才使用云数据库，否则会退回本地临时文件、数据不持久。上面两项务必都填。

7. **端口填 `3000`**（Dockerfile 里 `EXPOSE 3000`）。
8. 点 **部署**，等构建完成。

### 备选：HTTP 云函数（没有 Docker 时）

如果云托管构建太慢/受限，可用 HTTP 云函数：

1. 本地跑 `npm run build`。
2. 准备 standalone 产物：
   ```bash
   cp -r .next/static .next/standalone/.next/static
   ```
3. 用 CloudBase CLI 部署（`scf_bootstrap` 已就绪，端口 9000 已配好）：
   ```bash
   npm i -g @cloudbase/cli
   tcb login
   tcb fn deploy recall-app
   ```
   云函数环境变量同上（加 `NEXT_PUBLIC_*` 两个 + 服务端密钥）。

## 第四步：验收

打开 CloudBase 分配的访问域名：
1. **有颜色、有居中布局** —— 样式正常。
2. 点"使用演示账号进入" → 能进首页 —— 登录接口正常。
3. 录一道错题，刷新页面数据还在 —— Supabase 生效。
4. 换一个浏览器注册新账号 → 能登录。

## 常见问题

- **免费额度**：CloudBase 有免费额度和新用户礼包，演示访问量小，通常不会超。用量可在控制台查看。
- **冷启动慢**：云函数首次访问可能等几秒，云托管无此问题。
- **登录报错/页面打不开**：先查环境变量是否都填对，尤其 `NEXT_PUBLIC_SUPABASE_URL` 两个构建参数。
- **刷新数据丢失**：确认 `SUPABASE_SERVICE_ROLE_KEY` 已配置（服务端环境变量）。
- **Supabase 免费项目 7 天不活跃会暂停**：演示前一天登录一下 Supabase 控制台即可恢复。

## 参考

- CloudBase 官方文档：部署 Next.js 到云托管 <https://docs.cloudbase.net/recipes/deploy-nextjs-to-cloudbase-run>
