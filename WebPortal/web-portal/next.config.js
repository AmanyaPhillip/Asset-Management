/** @type {import('next').NextConfig} */
const nextConfig = {
  
  images: {
    domains: [
      'images.unsplash.com',
      'ulhcqtlntippncrflalk.supabase.co',
      'localhost',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
        port: '',
        pathname: '/photos/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/**',
      },
    ],
  },
}

module.exports = nextConfig