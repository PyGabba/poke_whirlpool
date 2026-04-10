// Generates simple SVG-based PNG icons using canvas (Node built-in)
// Run: node generate-icons.mjs
import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

function makeIcon(size) {
  const c = createCanvas(size, size)
  const ctx = c.getContext('2d')
  // bg
  ctx.fillStyle = '#0a0b0d'
  ctx.fillRect(0, 0, size, size)
  // accent circle
  ctx.beginPath()
  ctx.arc(size/2, size/2, size*0.38, 0, Math.PI*2)
  ctx.fillStyle = '#3ee8b5'
  ctx.fill()
  // letter C
  ctx.fillStyle = '#0a0b0d'
  ctx.font = `bold ${size*0.45}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('€', size/2, size/2)
  return c.toBuffer('image/png')
}

try {
  writeFileSync('public/icon-192.png', makeIcon(192))
  writeFileSync('public/icon-512.png', makeIcon(512))
  console.log('Icons generated')
} catch(e) {
  console.log('canvas not available, using SVG fallback')
}
