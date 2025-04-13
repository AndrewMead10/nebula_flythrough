import * as THREE from 'three'
import { SceneRef } from '../types/nebula'

export const createNebulaScene = (container: HTMLDivElement): SceneRef => {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    container.appendChild(renderer.domElement)        

    const initialCameraZ = 15
    const targetCameraZ = 10
    const animationDuration = 10000
    camera.position.set(0, 0, 0)
    camera.lookAt(0, 0, 10)

    const ambientLight = new THREE.AmbientLight(0xffffff, 1)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    return {
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
            if (container) {
                while (container.firstChild) {
                    container.removeChild(container.firstChild)
                }
            }
            renderer.dispose()
        }
    }
} 