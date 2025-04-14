'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function TopNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="text-white text-xl font-bold">
                            Nebula Explorer
                        </Link>
                    </div>
                    <div className="flex space-x-4">
                        <Link
                            href="/"
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                pathname === '/'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            Home
                        </Link>
                        <Link
                            href="/gallery"
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                pathname === '/gallery'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            Gallery
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
} 