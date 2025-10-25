import "./polyfills/global-buffer";
import type { NextConfig } from "next";
import webpack from "webpack";
import path from "path";

const processShimPath = path.resolve(__dirname, "polyfills/process.js");
const processShimSpecifier = "./polyfills/process.js";
const zodCoreRelativePath = (() => {
  const resolved = require.resolve("zod/v4/core");
  const relative = path.relative(__dirname, resolved);
  return relative.startsWith(".") ? relative : `./${relative}`;
})();

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      resolveAlias: {
        process: processShimSpecifier,
        "process/browser": processShimSpecifier,
        "zod/v4/core": zodCoreRelativePath,
      },
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      process: processShimPath,
      "process/browser": processShimPath,
      "zod/v4/core": zodCoreRelativePath,
    };
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      process: processShimPath,
      "process/browser": processShimPath,
      "zod/v4/core": zodCoreRelativePath,
    };

    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
        process: processShimPath,
      })
    );

    return config;
  },
};

export default nextConfig;
