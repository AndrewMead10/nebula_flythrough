import * as THREE from 'three'
import { StarData } from '../types/nebula'

export const createStarSprites = (scene: THREE.Scene, starData: StarData[], planeWidth: number, planeHeight: number): THREE.Sprite[] => {
    const starSprites: THREE.Sprite[] = []
    
    starData.forEach(star => {
        const spriteMaterial = new THREE.SpriteMaterial({
            map: star.texture,
            transparent: true,
            blending: THREE.AdditiveBlending
        })
        
        const sprite = new THREE.Sprite(spriteMaterial)
        const distance = Math.random() * 5 + 5
        const scaleFactor = distance / 10
        sprite.position.set(
            star.x * planeWidth / 2 * scaleFactor,
            star.y * planeHeight / 2 * scaleFactor,
            distance
        )
        sprite.scale.set(0.1, 0.1, 1)
        sprite.material.opacity = star.brightness
        scene.add(sprite)
        starSprites.push(sprite)
    })
    
    return starSprites
} 