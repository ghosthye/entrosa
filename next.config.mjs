const nextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./data/**/*'],
  },
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
