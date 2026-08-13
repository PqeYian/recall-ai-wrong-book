/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CloudBase 云托管/云函数部署需要 standalone 输出模式，本地 dev 不受影响
  output: "standalone",
  images: {
    // Serverless 环境没有 Sharp，禁用图片优化避免构建/运行报错
    unoptimized: true
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb"
    }
  }
};

export default nextConfig;
