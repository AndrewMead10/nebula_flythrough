'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { extractStarData } from '../utils/starExtractor'
import { createNebulaScene } from './NebulaScene'
import { createStarSprites } from './StarSprites'

type NebulaFlythroughProps = {
    starlessImage: string
    starfulImage: string
    maskImage: string
}

type NebulaScene = {
    cleanup: () => void
    scene: THREE.Scene
    camera: THREE.Camera
    renderer: THREE.WebGLRenderer
    startTime: number
    animationDuration: number
    animationProgress: number
    starSprites?: THREE.Sprite[]
    mesh?: THREE.Mesh
}

export const NebulaFlythrough = ({ starlessImage, starfulImage, maskImage }: NebulaFlythroughProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<NebulaScene | null>(null)

    useEffect(() => {
        if (!containerRef.current) return

        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild)
        }

        const scene = createNebulaScene(containerRef.current)
        sceneRef.current = scene
        const textureLoader = new THREE.TextureLoader()
        
        Promise.all([
            new Promise<THREE.Texture>((resolve, reject) => {
                textureLoader.load(
                    starlessImage,
                    (texture) => {
                        texture.needsUpdate = true
                        resolve(texture)
                    },
                    undefined,
                    (error) => {
                        console.error('Error in starless image loading:', error)
                        reject(error)
                    }
                )                
            }),
            new Promise<THREE.Texture>((resolve, reject) => {
                textureLoader.load(
                    '/depth-nebula.png',
                    (texture) => {
                        texture.needsUpdate = true
                        resolve(texture)
                    },
                    undefined,
                    (error) => {
                        console.error('Error in depth image loading:', error)
                        reject(error)
                    }
                )
            }),
            new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image()
                img.onload = () => resolve(img)
                img.onerror = (error) => {
                    console.error('Error in starful image loading:', error)
                    reject(error)
                }
                img.src = starfulImage
            }),
            new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image()
                img.onload = () => resolve(img)
                img.onerror = (error) => {
                    console.error('Error in mask image loading:', error)
                    reject(error)
                }
                img.src = maskImage
            })
        ]).then(([colorTexture, depthTexture, starfulImage, maskImage]) => {
            const imageAspectRatio = colorTexture.image.width / colorTexture.image.height
            const planeWidth = 10
            const planeHeight = planeWidth / imageAspectRatio
            
            const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 256, 256)
            
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
            `
            
            const fragmentShader = `
                uniform sampler2D colorMap;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(colorMap, vUv);
                    gl_FragColor = color;
                }
            `
            
            const uniforms = {
                colorMap: { value: colorTexture },
                depthMap: { value: depthTexture },
                displacementScale: { value: 1.0 }
            }
            
            const material = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                side: THREE.DoubleSide
            })
            
            const mesh = new THREE.Mesh(geometry, material)
            mesh.position.set(0, 0, 10)
            mesh.rotation.x = 0
            mesh.rotation.y = Math.PI
            
            scene.scene.add(mesh)
            
            const starData = extractStarData(maskImage, starfulImage)
            const starSprites = createStarSprites(scene.scene, starData, planeWidth, planeHeight)
            scene.starSprites = starSprites
            
            scene.mesh = mesh
            
        }).catch(error => {
            console.error('Error in texture loading:', error)
        })

        const animate = () => {
            if (!sceneRef.current) return
            const { scene, camera, renderer, startTime, animationDuration } = sceneRef.current

            const currentTime = Date.now()
            const elapsedTime = currentTime - startTime
            
            // Calculate a value between 0 and 1 that loops back and forth
            const rawProgress = (elapsedTime / animationDuration) % 2
            const progress = rawProgress <= 1 ? rawProgress : 2 - rawProgress
            
            // Apply easing function for smoother transitions at direction changes
            const easedProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2
            
            sceneRef.current.animationProgress = easedProgress

            // Move camera between z=0 and z=7 with easing
            camera.position.z = THREE.MathUtils.lerp(
                0,
                6,
                easedProgress
            )

            renderer.render(scene, camera)
            requestAnimationFrame(animate)
        }

        animate()

        return () => {
            if (sceneRef.current) {
                sceneRef.current.cleanup()
            }
        }
    }, [starlessImage, starfulImage, maskImage])

    return <div ref={containerRef} className="w-full h-full absolute inset-0" />
}

export default NebulaFlythrough 