import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: { '/api/reports/*/pdf': ['./public/fonts/Inter_18pt-Regular.ttf'] },
};

export default nextConfig;
