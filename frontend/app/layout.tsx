import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
    title: 'AutoCrowd - AI-Powered Crowdfunding',
    description: 'Decentralized crowdfunding with AI milestone verification',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className="bg-gray-50">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
