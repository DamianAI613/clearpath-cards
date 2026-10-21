/* Photo handling.
 *
 * A card has to be self-contained, so the photo is inlined as a data URL
 * rather than hosted - no external image to 404 two years from now. That only
 * works if the image is small, hence the hard downscale: 320px square, JPEG,
 * centre-cropped. A 4MB phone photo comes out around 20-30kB. */

export const PHOTO_PX = 320

export function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('That file is not an image.')); return }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('That image could not be read.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That image could not be decoded.'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = PHOTO_PX
        canvas.height = PHOTO_PX
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas is unavailable in this browser.')); return }

        /* Centre-crop to a square so faces do not get squashed by an aspect change. */
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, PHOTO_PX, PHOTO_PX)

        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
