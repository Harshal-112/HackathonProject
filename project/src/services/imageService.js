import cv from "@techstark/opencv-js";

function toGrayscale(canvas) {
  const ctx = canvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const gray = new Uint8ClampedArray(data.length / 4)
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  return { gray, imageData }
}

function computeContrastStdDev(gray) {
  const mean = gray.reduce((a, b) => a + b, 0) / gray.length
  const variance = gray.reduce((a, b) => a + (b - mean) ** 2, 0) / gray.length
  return Math.sqrt(variance)
}

function otsuThreshold(gray) {
  const histogram = new Array(256).fill(0)
  for (let i = 0; i < gray.length; i++) histogram[gray[i]]++

  const total = gray.length
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * histogram[t]

  let sumB = 0
  let wB = 0
  let maxVariance = 0
  let threshold = 127

  for (let t = 0; t < 256; t++) {
    wB += histogram[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break

    sumB += t * histogram[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const variance = wB * wF * (mB - mF) ** 2

    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }
  return threshold
}

export function enhanceContrast(sourceCanvasOrImage) {
  const canvas = document.createElement('canvas')
  canvas.width = sourceCanvasOrImage.width
  canvas.height = sourceCanvasOrImage.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(sourceCanvasOrImage, 0, 0)

  const { gray, imageData } = toGrayscale(canvas)
  const contrast = computeContrastStdDev(gray)

  // Skip enhancement entirely for already-clear documents.
  // Typical clean scans have a std dev well above ~45; only touch faint ones.
  const CONTRAST_OK_THRESHOLD = 45
  if (contrast > CONTRAST_OK_THRESHOLD) {
    return sourceCanvasOrImage // untouched, avoids regressing good scans
  }

  const threshold = otsuThreshold(gray)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const value = gray[i / 4] > threshold ? 255 : 0
    data[i] = data[i + 1] = data[i + 2] = value
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

export function sharpen(canvas) {
  const ctx = canvas.getContext("2d");

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const amount = 20;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] + amount);
    data[i + 1] = Math.min(255, data[i + 1] + amount);
    data[i + 2] = Math.min(255, data[i + 2] + amount);
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

export async function fileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {

      const MAX_WIDTH = 2200
      const SCALE = img.width < 1500 ? 2 : 1

      let width = img.width * SCALE
      let height = img.height * SCALE

      if (width > MAX_WIDTH) {
        const ratio = MAX_WIDTH / width
        width *= ratio
        height *= ratio
      }

      const canvas = document.createElement("canvas")

      canvas.width = Math.round(width)
      canvas.height = Math.round(height)

      const ctx = canvas.getContext("2d")

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      ctx.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
      )
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

          if (avg > 240) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
          } else if (avg < 20) {
              data[i] = 0;
              data[i + 1] = 0;
              data[i + 2] = 0;
          }
      }

      ctx.putImageData(imageData, 0, 0);

      resolve(canvas)
    }

    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
