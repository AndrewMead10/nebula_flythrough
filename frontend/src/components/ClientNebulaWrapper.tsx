'use client'

import dynamic from 'next/dynamic'

const NebulaFlythrough = dynamic(() => import('./NebulaFlythrough'), {
    ssr: false
})

export default function ClientNebulaWrapper() {
    return <NebulaFlythrough />
} 