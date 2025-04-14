import ImageProcessor from '@/components/ImageProcessor'

export default function Home() {
    return (
        <main className="w-full min-h-screen overflow-hidden bg-gradient-to-b from-black via-purple-900 to-black text-white">
            <div className="container mx-auto px-4 py-8">
                <div className="text-center mb-8 space-y-4">
                    <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 animate-pulse">
                        Nebula Flythrough
                    </h1>
                    <p className="text-xl md:text-2xl text-purple-200 font-mono">
                        Welcome aboard the Nebula Explorer! 
                    </p>
                    <p className="text-lg text-purple-300 max-w-2xl mx-auto">
                        Choose any nebula image and watch as we bring the stars closer in our virtual spaceship. 
                        Experience the cosmos like never before!
                    </p>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl"></div>
                    <ImageProcessor />
                </div>
            </div>
        </main>
    )
}
