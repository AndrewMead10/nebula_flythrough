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
    animationProgress: number
    startTime: number
    initialCameraZ: number
    targetCameraZ: number
    animationDuration: number
    cleanup: () => void
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
        
        Promise.all([
            new Promise<THREE.Texture>((resolve, reject) => {
                textureLoader.load(
                    '/nebula.jpg',
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
            })
        ]).then(([colorTexture, depthTexture]) => {
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
            
            if (sceneRef.current) {
                sceneRef.current.mesh = mesh
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
            const { scene, camera, renderer, startTime, initialCameraZ, targetCameraZ, animationDuration } = sceneRef.current

            const currentTime = Date.now()
            const elapsedTime = currentTime - startTime
            sceneRef.current.animationProgress = Math.min(elapsedTime / animationDuration, 1)

            camera.position.y = THREE.MathUtils.lerp(
                8,
                5,
                sceneRef.current.animationProgress
            )

            renderer.render(scene, camera)
            requestAnimationFrame(animate)
        }

        sceneRef.current = {
            scene,
            camera,
            renderer,
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