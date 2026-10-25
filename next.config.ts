import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { webpack }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: {
        request: string;
      }) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      module: false,
      url: false,
    };
    return config;
  },
};

export default nextConfig;
