'use client'

import { useEffect, useState } from 'react'
import NebulaFlythrough from './NebulaFlythrough'
import { API_ENDPOINTS } from '@/constants'

type ImageData = {
    id: number
    original_path: string
    starless_path: string
    mask_path: string
    created_at: string
}

type PaginationData = {
    current_page: number
    total_pages: number
    total_images: number
    per_page: number
}

type ProcessedImage = {
    id: number
    originalImage: string
    starlessImage: string
    maskImage: string
    created_at: string
}

export default function NebulaGallery() {
    const [images, setImages] = useState<ProcessedImage[]>([])
    const [pagination, setPagination] = useState<PaginationData>({
        current_page: 1,
        total_pages: 1,
        total_images: 0,
        per_page: 5
    })
    const [loading, setLoading] = useState(true)

    const fetchImages = async (page: number) => {
        try {
            setLoading(true)
            const response = await fetch(API_ENDPOINTS.GET_PAGINATED_IMAGES(page, pagination.per_page))
            const data = await response.json()
            
            // Fetch base64 images for each image
            const processedImages = await Promise.all(
                data.images.map(async (image: ImageData) => {
                    const [originalResponse, starlessResponse, maskResponse] = await Promise.all([
                        fetch(API_ENDPOINTS.GET_IMAGE('original', image.id)),
                        fetch(API_ENDPOINTS.GET_IMAGE('starless', image.id)),
                        fetch(API_ENDPOINTS.GET_IMAGE('mask', image.id))
                    ]);

                    const [originalData, starlessData, maskData] = await Promise.all([
                        originalResponse.json(),
                        starlessResponse.json(),
                        maskResponse.json()
                    ]);

                    return {
                        id: image.id,
                        originalImage: `data:image/${originalData.format};base64,${originalData.image}`,
                        starlessImage: `data:image/${starlessData.format};base64,${starlessData.image}`,
                        maskImage: `data:image/${maskData.format};base64,${maskData.image}`,
                        created_at: image.created_at
                    };
                })
            );

            setImages(processedImages)
            setPagination(data.pagination)
        } catch (error) {
            console.error('Error fetching images:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchImages(1)
    }, [])

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            fetchImages(newPage)
        }
    }

    if (loading) {
        return <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        </div>
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <h1 className="text-4xl font-bold mb-8 text-center">Nebula Gallery</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                {images.map((image) => (
                    <div key={image.id} className="relative h-96 rounded-lg overflow-hidden shadow-lg">
                        <NebulaFlythrough
                            starlessImage={image.starlessImage}
                            starfulImage={image.originalImage}
                            maskImage={image.maskImage}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4">
                            <p className="text-sm text-gray-300">
                                Uploaded: {new Date(image.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Pagination controls */}
            <div className="flex justify-center gap-4">
                <button
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className="px-4 py-2 bg-purple-600 rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <span className="px-4 py-2">
                    Page {pagination.current_page} of {pagination.total_pages}
                </span>
                <button
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.total_pages}
                    className="px-4 py-2 bg-purple-600 rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    )
} 