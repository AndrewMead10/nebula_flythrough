
export interface StarBounds {
    minX: number
    minY: number
    maxX: number
    maxY: number
    pixels: number
    centerBrightness: number
}

export const findStarBounds = (
    startX: number,
    startY: number,
    maskData: ImageData,
    threshold: number
): StarBounds => {
    const bounds: StarBounds = {
        minX: startX,
        minY: startY,
        maxX: startX,
        maxY: startY,
        pixels: 0,
        centerBrightness: 0
    }
    const visited = new Set<string>()
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