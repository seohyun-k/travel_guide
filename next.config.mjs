/** @type {import('next').NextConfig} */
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = isStatic
  ? {
      // 정적 배포 (GitHub Pages) — app/api 를 제외하고 빌드해야 함 (scripts/build-static.sh)
      output: "export",
      basePath: basePath || undefined,
      trailingSlash: true,
      images: { unoptimized: true },
      reactStrictMode: true,
    }
  : {
      reactStrictMode: true,
      async headers() {
        return [
          {
            source: "/sw.js",
            headers: [
              { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
              { key: "Service-Worker-Allowed", value: "/" },
            ],
          },
        ];
      },
    };
export default nextConfig;
