import type { NextConfig } from "next";

const config: NextConfig = { output: "export", trailingSlash: true, images: { unoptimized: true }, transpilePackages: ["@nimbus-ui-studio/application-shell", "@nimbus-ui-studio/testing"] };
export default config;
