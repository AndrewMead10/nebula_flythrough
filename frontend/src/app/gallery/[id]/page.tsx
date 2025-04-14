'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import NebulaFlythrough from '@/components/NebulaFlythrough'
import { API_ENDPOINTS } from '@/constants'

type ProcessedImage = {
    originalImage: string
    starlessImage: string
    maskImage: string
    created_at: string
}

export default function NebulaPage() {
    const params = useParams()
    const [imageData, setImageData] = useState<ProcessedImage | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchImageData = async () => {
            try {
                setLoading(true)
                const [originalResponse, starlessResponse, maskResponse] = await Promise.all([
                    fetch(API_ENDPOINTS.GET_IMAGE('original', Number(params.id))),
                    fetch(API_ENDPOINTS.GET_IMAGE('starless', Number(params.id))),
                    fetch(API_ENDPOINTS.GET_IMAGE('mask', Number(params.id)))
                ])

                const [originalData, starlessData, maskData] = await Promise.all([
                    originalResponse.json(),
                    starlessResponse.json(),
                    maskResponse.json()
                ])

                setImageData({
                    originalImage: `data:image/${originalData.format};base64,${originalData.image}`,
                    starlessImage: `data:image/${starlessData.format};base64,${starlessData.image}`,
                    maskImage: `data:image/${maskData.format};base64,${maskData.image}`,
                    created_at: new Date().toISOString() // We'll get this from the API later if needed
                })
            } catch (error) {
                console.error('Error fetching image data:', error)
            } finally {
                setLoading(false)
            }
        }

        if (params.id) {
            fetchImageData()
        }
    }, [params.id])

    if (loading) {
        return <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        </div>
    }

    if (!imageData) {
        return <div className="flex justify-center items-center h-screen text-white">
            <h1 className="text-2xl">Image not found</h1>
        </div>
    }

    return (
        <div className="min-h-screen bg-black">
            <div className="relative h-screen">
                <NebulaFlythrough
                    starlessImage={imageData.starlessImage}
                    starfulImage={imageData.originalImage}
                    maskImage={imageData.maskImage}
                />
            </div>
        </div>
    )
} 