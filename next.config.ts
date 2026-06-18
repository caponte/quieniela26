import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "avatars.slack-edge.com" },
      { hostname: "miro.medium.com" },
      { hostname: "digitalhub.fifa.com" },
    ],
  },
};

export default nextConfig;
