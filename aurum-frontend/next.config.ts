import "./polyfills/global-buffer";
import type { NextConfig } from "next";
import webpack from "webpack";
import path from "path";

const processShimPath = path.resolve(__dirname, "polyfills/process.js");
const processShimSpecifier = "./polyfills/process.js";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      resolveAlias: {
        process: processShimSpecifier,
        "process/browser": processShimSpecifier,
      },
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      process: processShimPath,
      "process/browser": processShimPath,
    };
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      process: processShimPath,
      "process/browser": processShimPath,
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
