import { findStarBounds } from './starBounds'

describe('findStarBounds', () => {
    it('should find bounds of a simple star shape', () => {
        const width = 5
        const height = 5
        const data = new Uint8ClampedArray(width * height * 4)
        
        const mockImageData = {
            width,
            height,
            data,
            colorSpace: 'srgb'
        } as ImageData

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4
                if (x === 2 && y === 2) {
                    data[i] = 255
                } else if (
                    (x === 1 && y === 2) ||
                    (x === 3 && y === 2) ||
                    (x === 2 && y === 1) ||
                    (x === 2 && y === 3)
                ) {
                    data[i] = 150
                } else {
                    data[i] = 0
                }
                data[i + 1] = data[i]
                data[i + 2] = data[i]
                data[i + 3] = 255
            }
        }

        const bounds = findStarBounds(2, 2, mockImageData, 100)

        expect(bounds).toEqual({
            minX: 1,
            minY: 1,
            maxX: 3,
            maxY: 3,
            pixels: 5,
            centerBrightness: 255
        })
    })

    it('should handle empty or low brightness areas', () => {
        const width = 3
        const height = 3
        const data = new Uint8ClampedArray(width * height * 4)
        
        const mockImageData = {
            width,
            height,
            data,
            colorSpace: 'srgb'
        } as ImageData

        for (let i = 0; i < data.length; i += 4) {
            data[i] = 50
            data[i + 1] = 50
            data[i + 2] = 50
            data[i + 3] = 255
        }

        const bounds = findStarBounds(1, 1, mockImageData, 100)

        expect(bounds).toEqual({
            minX: 1,
            minY: 1,
            maxX: 1,
            maxY: 1,
            pixels: 0,
            centerBrightness: 50
        })
    })
}) 