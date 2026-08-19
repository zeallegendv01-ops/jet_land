const nextConfig = {
  async rewrites() {
    const apiOrigin = process.env.JETLAND_API_URL || 'http://localhost:3400';
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  }
};

export default nextConfig;
