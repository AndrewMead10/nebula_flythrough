'use client';

import { API_ENDPOINTS } from '@/constants';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import NebulaFlythrough from './NebulaFlythrough';
import SpaceParticles from './SpaceParticles';

export default function ImageProcessor() {
    const router = useRouter();
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

            const response = await fetch(API_ENDPOINTS.PROCESS_IMAGE, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process image');
            }

            const data = await response.json();
            router.push(`/gallery/${data.image_id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 relative">
            <SpaceParticles />
            
            {!originalImage && !starlessImage && !maskImage ? (
                <div className="w-full max-w-md mb-8 relative z-10">
                    <label className="block w-full p-8 text-center border-2 border-dashed border-purple-500 rounded-lg cursor-pointer hover:border-pink-500 transition-all duration-300 space-gradient relative group">
                        <div className="absolute inset-0 bg-purple-500/10 group-hover:bg-pink-500/10 transition-all duration-300"></div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                        />
                        <div className="relative z-10">
                            {isProcessing ? (
                                <div className="space-y-2">
                                    <div className="text-purple-300 glow-text">Processing nebula data...</div>
                                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-2xl text-purple-300 glow-text">🚀 Upload Nebula Image</div>
                                    <div className="text-purple-200">Click to begin your cosmic journey</div>
                                </div>
                            )}
                        </div>
                    </label>
                </div>
            ) : null}

            {error && (
                <div className="text-red-400 bg-red-900/20 border border-red-500/50 rounded-lg px-6 py-4 mb-4 glow-text flex items-center space-x-2 relative z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {originalImage && starlessImage && maskImage && (
                <div className="w-full h-full relative z-10">
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