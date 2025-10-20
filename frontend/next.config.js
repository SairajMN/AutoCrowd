/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: false,
    },
    eslint: {
        ignoreDuringBuilds: false,
    },
    images: {
        domains: ['blockscout.com'],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:3001/api/:path*', // Proxy to backend in development
            },
        ]
    },
    webpack: (config, { isServer }) => {
        // Ensure problematic native/react-native modules are never bundled
        config.resolve.alias = {
            ...config.resolve.alias,
            '@react-native-async-storage/async-storage': false,
            ...(isServer
                ? { '@metamask/sdk': false } // avoid SSR importing MetaMask SDK
                : { '@metamask/sdk$': '@metamask/sdk/dist/browser/es/metamask-sdk.js' } // use browser build on client
            ),
        };

        // Core Node polyfills disabled
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            path: false,
        };

        return config;
    },
}

module.exports = nextConfig
