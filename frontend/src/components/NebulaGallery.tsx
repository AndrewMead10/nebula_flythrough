'use client'

import { API_ENDPOINTS } from '@/constants'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
    created_at: string
}

export default function NebulaGallery() {
    const router = useRouter()
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
            const response = await fetch(API_ENDPOINTS.GET_PAGINATED_IMAGES(page, pagination.per_page), {
                credentials: 'include'
            })
            const data = await response.json()
            
            // Only fetch original images
            const processedImages = await Promise.all(
                data.images.map(async (image: ImageData) => {
                    const originalResponse = await fetch(API_ENDPOINTS.GET_IMAGE('original', image.id))
                    const originalData = await originalResponse.json()

                    return {
                        id: image.id,
                        originalImage: `data:image/${originalData.format};base64,${originalData.image}`,
                        created_at: image.created_at
                    }
                })
            )

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

    const handleImageClick = (id: number) => {
        router.push(`/gallery/${id}`)
    }

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent the click from triggering the image click
        if (window.confirm('Are you sure you want to delete this image?')) {
            try {
                const response = await fetch(API_ENDPOINTS.DELETE_IMAGE(id), {
                    method: 'DELETE',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    // Refresh the current page of images
                    fetchImages(pagination.current_page);
                } else {
                    console.error('Failed to delete image');
                }
            } catch (error) {
                console.error('Error deleting image:', error);
            }
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
                    <div 
                        key={image.id} 
                        className="relative h-96 rounded-lg overflow-hidden shadow-lg cursor-pointer transform transition-transform hover:scale-105"
                        onClick={() => handleImageClick(image.id)}
                    >
                        <img 
                            src={image.originalImage} 
                            alt={`Nebula ${image.id}`}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4">
                            <p className="text-sm text-gray-300">
                                Uploaded: {new Date(image.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-purple-300 mt-1">
                                Click to view interactive 3D version
                            </p>
                            <button
                                onClick={(e) => handleDelete(image.id, e)}
                                className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
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