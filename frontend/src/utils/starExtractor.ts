import * as THREE from 'three'
import { StarData } from '../types/nebula'

export const extractStarData = (maskImage: HTMLImageElement, starfulImage: HTMLImageElement): StarData[] => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return []

    canvas.width = maskImage.width
    canvas.height = maskImage.height

    ctx.drawImage(maskImage, 0, 0)
    const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const stars: StarData[] = []
    const threshold = 100
    const centerThreshold = 200
    const visited = new Set<string>() 
    const centerPoints: [number, number, number][] = []

    for (let y = 0; y < maskData.height; y++) {
        for (let x = 0; x < maskData.width; x++) {
            const i = (y * maskData.width + x) * 4
            const brightness = maskData.data[i]
            
            if (brightness > centerThreshold) {
                let isLocalMax = true
                const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
                
                for (const [dx, dy] of directions) {
                    const newX = x + dx
                    const newY = y + dy
                    
                    if (newX >= 0 && newX < maskData.width && 
                        newY >= 0 && newY < maskData.height) {
                        const neighborI = (newY * maskData.width + newX) * 4
                        const neighborBrightness = maskData.data[neighborI]
                        
                        if (neighborBrightness >= brightness) {
                            isLocalMax = false
                            break
                        }
                    }
                }
                
                if (isLocalMax) {
                    centerPoints.push([x, y, brightness])
                }
            }
        }
    }
    
    centerPoints.sort((a, b) => b[2] - a[2])
    
    const findStarBounds = (startX: number, startY: number): { minX: number, minY: number, maxX: number, maxY: number, pixels: number, centerBrightness: number } => {
        const bounds = { minX: startX, minY: startY, maxX: startX, maxY: startY, pixels: 0, centerBrightness: 0 }
        const queue = [[startX, startY]]
        visited.add(`${startX},${startY}`)
        let lastBrightness = 0
        
        const centerI = (startY * maskData.width + startX) * 4
        bounds.centerBrightness = maskData.data[centerI]

        while (queue.length > 0) {
            const [x, y] = queue.shift()!
            const i = (y * maskData.width + x) * 4
            const brightness = maskData.data[i]

            if (brightness > threshold && brightness >= lastBrightness) {
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
            lastBrightness = brightness
        }
        return bounds
    }

    for (const [x, y, brightness] of centerPoints) {
        const key = `${x},${y}`
        
        if (!visited.has(key)) {
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

    return stars
} 