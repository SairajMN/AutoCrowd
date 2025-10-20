import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
    chains: [sepolia],
    connectors: [
        injected(),
    ],
    transports: {
        // Use explicit RPC to avoid browser-blocked default endpoints
        [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.drpc.org'),
    },
    ssr: true,
})

declare module 'wagmi' {
    interface Register {
        config: typeof config
    }
}
