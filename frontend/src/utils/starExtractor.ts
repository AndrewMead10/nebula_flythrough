import * as THREE from 'three'
import { StarData } from '../types/nebula'
import { findStarBounds } from './starBounds'

const useActualSprites = true

const generateStarShape = (size: number, brightness: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return canvas

    canvas.width = size
    canvas.height = size

    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2

    ctx.save()
    ctx.translate(centerX, centerY)

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`)
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = gradient

    const crossWidth = radius * 0.2
    const crossLength = radius * 0.8

    if (Math.random() > 0.5) {
    ctx.beginPath()
    ctx.rect(-crossWidth/2, -crossLength/2, crossWidth, crossLength)
        ctx.rect(-crossLength/2, -crossWidth/2, crossLength, crossWidth)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2)
        ctx.fill()
    } else {
        ctx.beginPath()
        ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2)
        ctx.fill()
    }

    ctx.restore()
    return canvas
}

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

    console.log('found center points', centerPoints)        

    const coveredRegions = new Set<string>()
    const minDistanceBetweenStars = 10

    for (const [x, y, brightness] of centerPoints) {
        const key = `${x},${y}`
        
        if (!visited.has(key)) {
            const bounds = findStarBounds(x, y, maskData, threshold)
            
            const width = bounds.maxX - bounds.minX + 1
            const height = bounds.maxY - bounds.minY + 1
            const size = Math.max(width, height)
            const padding = Math.ceil(size * 0.2)
            const finalSize = size + padding * 2
            if (finalSize < 2) {
                continue
            }

            const normalizedBrightness = brightness / 255
            if (normalizedBrightness < 0.3) {
                continue
            }

            const starRadius = finalSize / 2
            const minX = Math.max(0, x - starRadius)
            const maxX = Math.min(maskData.width - 1, x + starRadius)
            const minY = Math.max(0, y - starRadius)
            const maxY = Math.min(maskData.height - 1, y + starRadius)

            let isOverlapping = false
            for (let checkY = minY; checkY <= maxY; checkY++) {
                for (let checkX = minX; checkX <= maxX; checkX++) {
                    const regionKey = `${checkX},${checkY}`
                    if (coveredRegions.has(regionKey)) {
                        const dx = checkX - x
                        const dy = checkY - y
                        const distance = Math.sqrt(dx * dx + dy * dy)
                        
                        if (distance < starRadius) {
                            isOverlapping = true
                            break
                        }
                    }
                }
                if (isOverlapping) break
            }

            if (isOverlapping) {
                continue
            }

            let starCanvas = document.createElement('canvas')
            const starCtx = starCanvas.getContext('2d')
            if (!starCtx) continue

            starCanvas.width = finalSize
            starCanvas.height = finalSize

            if (useActualSprites) {
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
            } else {
                starCanvas = generateStarShape(finalSize, normalizedBrightness)
            }
            
            const starTexture = new THREE.CanvasTexture(starCanvas)
            starTexture.needsUpdate = true
            
            const star = {
                x: (x / maskData.width) * 2 - 1,
                y: -(y / maskData.height) * 2 + 1,
                brightness: normalizedBrightness,
                texture: starTexture
            }

            stars.push(star)
            
            for (let markY = minY; markY <= maxY; markY++) {
                for (let markX = minX; markX <= maxX; markX++) {
                    const dx = markX - x
                    const dy = markY - y
                    const distance = Math.sqrt(dx * dx + dy * dy)
                    
                    if (distance < starRadius) {
                        coveredRegions.add(`${markX},${markY}`)
                    }
                }
            }
        }
    }

    console.log('stars', stars)

    return stars
} 
