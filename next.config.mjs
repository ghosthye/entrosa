const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./data/**/*'],
    },
    serverComponentsExternalPackages: ['better-sqlite3'],
  }
};

export default nextConfig;
