'use client';

import { useState } from 'react';
import NebulaFlythrough from './NebulaFlythrough';
import { API_ENDPOINTS } from '@/constants';

export default function ImageProcessor() {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [starlessImage, setStarlessImage] = useState<string | null>(null);
    const [maskImage, setMaskImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setIsProcessing(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Upload and process the image
            const response = await fetch(API_ENDPOINTS.PROCESS_IMAGE, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to process image');
            }

            const data = await response.json();
            
            // Set the image URLs
            setOriginalImage(API_ENDPOINTS.GET_IMAGE('original', data.image_id));
            setStarlessImage(API_ENDPOINTS.GET_IMAGE('starless', data.image_id));
            setMaskImage(API_ENDPOINTS.GET_IMAGE('mask', data.image_id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            {!originalImage && !starlessImage && !maskImage ? (
                <div className="w-full max-w-md mb-8">
                    <label className="block w-full p-4 text-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500">
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                        />
                        <div className="text-gray-600">
                            {isProcessing ? (
                                <span>Processing image...</span>
                            ) : (
                                <span>Click to upload an image</span>
                            )}
                        </div>
                    </label>
                </div>
            ) : null}

            {error && (
                <div className="text-red-500 mb-4">
                    {error}
                </div>
            )}

            {originalImage && starlessImage && maskImage && (
                <div className="w-full h-full">
                    <NebulaFlythrough
                        starlessImage={starlessImage}
                        starfulImage={originalImage}
                        maskImage={maskImage}
                    />
                </div>
            )}
        </div>
    );
} 