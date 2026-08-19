const nextConfig = {
  allowedDevOrigins: ['jet-land.onrender.com', 'localhost', '127.0.0.1'],
  async rewrites() {
    const apiOrigin = process.env.JETLAND_API_URL
      || (process.env.JETLAND_API_HOSTPORT && `http://${process.env.JETLAND_API_HOSTPORT}`)
      || 'http://localhost:3400';
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  }
};

export default nextConfig;
