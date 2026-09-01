/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Demo property photos come from Unsplash (see pisos.csv "enlace" column).
    // ⚠️ LIKELY-ADJUST: if you swap demo image hosts, update this allowlist.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};
export default nextConfig;
