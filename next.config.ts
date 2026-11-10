import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Человекопонятные URL со слешем: /family/divorce-through-court/
  trailingSlash: true,
  // Пакеты, которые не должны попадать в бандл (нативные/серверные зависимости)
  serverExternalPackages: ["@prisma/client", "prisma", "nodemailer", "sanitize-html"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Отключаем индикатор dev-режима (кружок Next.js) — не нужен ни в скриншотах, ни при разработке
  devIndicators: false,
  // Оптимизация изображений: локальные файлы из /media и загруженные обложки
  images: {
    formats: ["image/webp"],
  },
};

export default nextConfig;
