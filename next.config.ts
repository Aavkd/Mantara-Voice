import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Epingle la racine du projet : evite que Next infere un mauvais dossier
  // racine a cause d'un lockfile parent (ex. D:\Documents\package-lock.json).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
