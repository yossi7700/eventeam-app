import type { NextConfig } from "next";

// Supabase Storage public URLs (company logos, hero images, event covers)
// come from NEXT_PUBLIC_SUPABASE_URL's host -- next/image requires every
// remote host serving optimized images to be explicitly allow-listed.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
