import * as THREE from 'three'

export type SceneRef = {
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    mesh?: THREE.Mesh
    starSprites: THREE.Sprite[]
    animationProgress: number
    startTime: number
    initialCameraZ: number
    targetCameraZ: number
    animationDuration: number
    cleanup: () => void
}

export type StarData = {
    x: number
    y: number
    brightness: number
    texture: THREE.Texture
} 