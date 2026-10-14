import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/discover",
        destination: "/movies",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
