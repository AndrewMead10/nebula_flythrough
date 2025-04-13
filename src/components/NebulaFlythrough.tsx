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

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x000000)
        
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(window.innerWidth, window.innerHeight)
        containerRef.current.appendChild(renderer.domElement)

        const gridHelper = new THREE.GridHelper(10, 10)
        scene.add(gridHelper)

        const initialCameraZ = 15
        const targetCameraZ = 10
        const animationDuration = 10000
        camera.position.set(0, 5, initialCameraZ)
        camera.lookAt(0, 0, 0)

        // Add OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.screenSpacePanning = false
        controls.minDistance = 3
        controls.maxDistance = 20
        controls.maxPolarAngle = Math.PI / 2

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
                    '/depth.png',
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
            
            // Create a simple plane geometry with more segments for better displacement
            const geometry = new THREE.PlaneGeometry(10, 10, 256, 256)
            
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
            
            // Log mesh properties
            console.log('Mesh added to scene:', mesh)
            
            if (sceneRef.current) {
                sceneRef.current.mesh = mesh
            }
            
            console.log('Mesh created and added to scene')
            
            // Add a simple animation to the displacement scale
            const animateDisplacement = () => {
                if (sceneRef.current && sceneRef.current.mesh) {
                    const material = sceneRef.current.mesh.material as THREE.ShaderMaterial;
                    if (material.uniforms) {
                        material.uniforms.displacementScale.value = 1.0 + Math.sin(Date.now() * 0.001) * 0.5;
                    }
                }
                requestAnimationFrame(animateDisplacement);
            };
            
            animateDisplacement();
            
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
            const { scene, camera, renderer, controls, startTime, initialCameraZ, targetCameraZ, animationDuration } = sceneRef.current

            const currentTime = Date.now()
            const elapsedTime = currentTime - startTime
            sceneRef.current.animationProgress = Math.min(elapsedTime / animationDuration, 1)

            // Only update camera position if controls are not being used
            if (controls && !controls.enabled) {
                camera.position.z = THREE.MathUtils.lerp(
                    initialCameraZ,
                    targetCameraZ,
                    sceneRef.current.animationProgress
                )
            }

            // Update controls
            if (controls) {
                controls.update()
            }

            // Rotate the scene slightly for better visualization
            if (sceneRef.current.mesh) {
                sceneRef.current.mesh.rotation.y += 0.001
            }

            renderer.render(scene, camera)
            requestAnimationFrame(animate)
        }

        sceneRef.current = {
            scene,
            camera,
            renderer,
            controls,
            animationProgress: 0,
            startTime: Date.now(),
            initialCameraZ,
            targetCameraZ,
            animationDuration,
            cleanup: () => {
                window.removeEventListener('resize', handleResize)
                if (containerRef.current) {
                    containerRef.current.removeChild(renderer.domElement)
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

    return <div ref={containerRef} className="w-full h-screen" />
}

export default NebulaFlythrough 