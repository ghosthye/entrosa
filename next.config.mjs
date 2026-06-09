const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./data/**/*'],
      '/jogar': ['./data/**/*'],
      '/duelo/**/*': ['./data/**/*'],
      '/*': ['./data/**/*']
    },
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
