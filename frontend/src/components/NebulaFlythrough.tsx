'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

type SceneRef = {
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls?: OrbitControls
    mesh?: THREE.Mesh
    starSprites: THREE.Sprite[]
    animationProgress: number
    startTime: number
    initialCameraZ: number
    targetCameraZ: number
    animationDuration: number
    cleanup: () => void
}

type StarData = {
    x: number
    y: number
    brightness: number
    texture: THREE.Texture
}

export const NebulaFlythrough = () => {
    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<SceneRef | null>(null)

    useEffect(() => {
        if (!containerRef.current) return

        // Clean up any existing canvas
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild)
        }

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x000000)
        
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(window.innerWidth, window.innerHeight)
        containerRef.current.appendChild(renderer.domElement)        

        const initialCameraZ = 15
        const targetCameraZ = 10
        const animationDuration = 10000
        camera.position.set(0, 8, 0)
        camera.lookAt(0, 0, 0)

        const ambientLight = new THREE.AmbientLight(0xffffff, 1)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(5, 5, 5)
        scene.add(directionalLight)

        const textureLoader = new THREE.TextureLoader()
        
        console.log('Starting to load textures...')
        
        const extractStarData = (maskImage: HTMLImageElement, starfulImage: HTMLImageElement): StarData[] => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) return []

            canvas.width = maskImage.width
            canvas.height = maskImage.height

            ctx.drawImage(maskImage, 0, 0)
            const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height)

            const stars: StarData[] = []
            const threshold = 100
            const visited = new Set<string>()

            const findStarBounds = (startX: number, startY: number): { minX: number, minY: number, maxX: number, maxY: number, pixels: number } => {
                const bounds = { minX: startX, minY: startY, maxX: startX, maxY: startY, pixels: 0 }
                const queue = [[startX, startY]]
                visited.add(`${startX},${startY}`)

                while (queue.length > 0) {
                    const [x, y] = queue.shift()!
                    const i = (y * maskData.width + x) * 4
                    const brightness = maskData.data[i]

                    if (brightness > threshold) {
                        bounds.minX = Math.min(bounds.minX, x)
                        bounds.minY = Math.min(bounds.minY, y)
                        bounds.maxX = Math.max(bounds.maxX, x)
                        bounds.maxY = Math.max(bounds.maxY, y)
                        bounds.pixels++

                        const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
                        for (const [dx, dy] of directions) {
                            const newX = x + dx
                            const newY = y + dy
                            const key = `${newX},${newY}`
                            
                            if (newX >= 0 && newX < maskData.width && 
                                newY >= 0 && newY < maskData.height && 
                                !visited.has(key)) {
                                visited.add(key)
                                queue.push([newX, newY])
                            }
                        }
                    }
                }
                return bounds
            }

            for (let y = 0; y < maskData.height; y++) {
                for (let x = 0; x < maskData.width; x++) {
                    const i = (y * maskData.width + x) * 4
                    const brightness = maskData.data[i]
                    const key = `${x},${y}`
                    
                    if (brightness > threshold && !visited.has(key)) {
                        const bounds = findStarBounds(x, y)
                        
                        const width = bounds.maxX - bounds.minX + 1
                        const height = bounds.maxY - bounds.minY + 1
                        const size = Math.max(width, height)
                        const padding = Math.ceil(size * 0.2)
                        const finalSize = size + padding * 2

                        const starCanvas = document.createElement('canvas')
                        const starCtx = starCanvas.getContext('2d')
                        if (!starCtx) continue

                        starCanvas.width = finalSize
                        starCanvas.height = finalSize

                        const sourceX = Math.max(0, bounds.minX - padding)
                        const sourceY = Math.max(0, bounds.minY - padding)
                        const sourceWidth = Math.min(finalSize, maskImage.width - sourceX)
                        const sourceHeight = Math.min(finalSize, maskImage.height - sourceY)

                        starCtx.drawImage(
                            starfulImage,
                            sourceX,
                            sourceY,
                            sourceWidth,
                            sourceHeight,
                            0,
                            0,
                            sourceWidth,
                            sourceHeight
                        )

                        const starImageData = starCtx.getImageData(0, 0, finalSize, finalSize)
                        const maskImageData = ctx.getImageData(sourceX, sourceY, sourceWidth, sourceHeight)

                        for (let py = 0; py < sourceHeight; py++) {
                            for (let px = 0; px < sourceWidth; px++) {
                                const maskIndex = (py * sourceWidth + px) * 4
                                const starIndex = (py * finalSize + px) * 4
                                
                                let maskValue = maskImageData.data[maskIndex] / 255
                                if (maskValue < 0.6) {
                                    maskValue = 0
                                }
                                starImageData.data[starIndex + 3] = Math.floor(maskValue * 255)
                            }
                        }

                        starCtx.putImageData(starImageData, 0, 0)

                        const starTexture = new THREE.CanvasTexture(starCanvas)
                        starTexture.needsUpdate = true

                        stars.push({
                            x: (x / maskData.width) * 2 - 1,
                            y: -(y / maskData.height) * 2 + 1,
                            brightness: brightness / 255,
                            texture: starTexture
                        })
                    }
                }
            }

            console.log('Found', stars.length, 'stars')
            return stars
        }

        Promise.all([
            new Promise<THREE.Texture>((resolve, reject) => {
                textureLoader.load(
                    '/starless.png',
                    (texture) => {
                        console.log('Nebula texture loaded successfully', texture)
                        texture.needsUpdate = true
                        resolve(texture)
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading nebula texture:', error)
                        reject(error)
                    }
                )
            }),
            new Promise<THREE.Texture>((resolve, reject) => {
                textureLoader.load(
                    '/depth-nebula.png',
                    (texture) => {
                        console.log('Depth texture loaded successfully', texture)
                        texture.needsUpdate = true
                        resolve(texture)
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading depth texture:', error)
                        reject(error)
                    }
                )
            }),
            new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image()
                img.onload = () => resolve(img)
                img.onerror = reject
                img.src = '/starful.jpg'
            }),
            new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image()
                img.onload = () => resolve(img)
                img.onerror = reject
                img.src = '/starless_mask.png'
            })
        ]).then(([colorTexture, depthTexture, starfulImage, maskImage]) => {
            console.log('Both textures loaded, creating mesh...')
            
            // Calculate aspect ratio from the loaded texture
            const imageAspectRatio = colorTexture.image.width / colorTexture.image.height;
            const planeWidth = 10;
            const planeHeight = planeWidth / imageAspectRatio;
            
            // Create a plane geometry with the correct aspect ratio
            const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 256, 256)
            
            // Create a custom shader material
            const vertexShader = `
                uniform sampler2D depthMap;
                uniform float displacementScale;
                varying vec2 vUv;
                
                void main() {
                    vUv = uv;
                    vec4 depthColor = texture2D(depthMap, uv);
                    float displacement = depthColor.r * displacementScale;
                    vec3 newPosition = position + normal * displacement;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `;
            
            const fragmentShader = `
                uniform sampler2D colorMap;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(colorMap, vUv);
                    gl_FragColor = color;
                }
            `;
            
            // Create uniforms for the shader
            const uniforms = {
                colorMap: { value: colorTexture },
                depthMap: { value: depthTexture },
                displacementScale: { value: 1.0 }
            };
            
            // Create the shader material
            const material = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                side: THREE.DoubleSide
            });
            
            // Log material properties
            console.log('Material created with shader')
            
            const mesh = new THREE.Mesh(geometry, material)
            
            mesh.position.set(0, 0, 0)
            mesh.rotation.x = -Math.PI / 2
            
            scene.add(mesh)
            
            const starSprites: THREE.Sprite[] = []
            const starData = extractStarData(maskImage, starfulImage)
            
            starData.forEach(star => {
                const spriteMaterial = new THREE.SpriteMaterial({
                    map: star.texture,
                    transparent: true,
                    blending: THREE.AdditiveBlending
                })
                
                const sprite = new THREE.Sprite(spriteMaterial)
                const distance = 7 - Math.random() * 2 + 0.5
                const reverseDistance = 8 - distance
                sprite.position.set(
                    star.x * planeWidth / 2,
                    reverseDistance ,
                    star.y * planeHeight / 2 
                )
                sprite.scale.set(0.1, 0.1, 1)
                sprite.material.opacity = star.brightness
                scene.add(sprite)
                starSprites.push(sprite)
            })
            
            if (sceneRef.current) {
                sceneRef.current.mesh = mesh
                sceneRef.current.starSprites = starSprites
            }
            
            console.log('Mesh created and added to scene')
            
        }).catch(error => {
            console.error('Error in texture loading:', error)
        })

        const handleResize = () => {
            if (!sceneRef.current) return
            const { camera, renderer, controls } = sceneRef.current
            camera.aspect = window.innerWidth / window.innerHeight
            camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
        }

        window.addEventListener('resize', handleResize)

        const animate = () => {
            if (!sceneRef.current) return
            const { scene, camera, renderer, startTime, animationDuration, starSprites } = sceneRef.current

            const currentTime = Date.now()
            const elapsedTime = currentTime - startTime
            sceneRef.current.animationProgress = Math.min(elapsedTime / animationDuration, 1)

            camera.position.y = THREE.MathUtils.lerp(
                5,
                2,
                sceneRef.current.animationProgress
            )

            renderer.render(scene, camera)
            requestAnimationFrame(animate)
        }

        sceneRef.current = {
            scene,
            camera,
            renderer,
            starSprites: [],
            animationProgress: 0,
            startTime: Date.now(),
            initialCameraZ,
            targetCameraZ,
            animationDuration,
            cleanup: () => {
                window.removeEventListener('resize', handleResize)
                if (containerRef.current) {
                    while (containerRef.current.firstChild) {
                        containerRef.current.removeChild(containerRef.current.firstChild)
                    }
                }
                renderer.dispose()
            }
        }

        animate()

        return () => {
            if (sceneRef.current) {
                sceneRef.current.cleanup()
            }
        }
    }, [])

    return <div ref={containerRef} className="w-full h-full absolute inset-0" />
}

export default NebulaFlythrough 