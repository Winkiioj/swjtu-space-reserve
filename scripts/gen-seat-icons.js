// Generate seat tab bar icons as simple PNGs
// Proper icons should be designed by a designer — these are functional placeholders
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(data) {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      if (crc & 1) crc = (crc >>> 1) ^ 0xedb88320
      else crc >>>= 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createChunk(type, data) {
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function generatePNG(size, r, g, b, chairColor) {
  // Create pixel data
  const raw = Buffer.alloc(size * size * 4)
  const half = Math.floor(size / 2)
  const margin = Math.floor(size * 0.18)
  const seatW = Math.floor(size * 0.44)
  const seatH = Math.floor(size * 0.3)
  const legH = Math.floor(size * 0.2)
  const legW = Math.floor(size * 0.06)
  const backH = Math.floor(size * 0.24)
  const backW = Math.floor(size * 0.09)

  const cx = Math.floor(size / 2)
  const seatTop = Math.floor(size * 0.38)
  const backTop = seatTop - backH
  const legTop = seatTop + seatH

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      let isChair = false

      // Seat (horizontal bar)
      if (y >= seatTop && y < seatTop + seatH && x >= cx - seatW && x < cx + seatW) {
        isChair = true
      }
      // Backrest (vertical bar above seat center)
      if (y >= backTop && y < seatTop && x >= cx - backW && x < cx + backW) {
        isChair = true
      }
      // Left leg
      if (y >= legTop && y < legTop + legH && x >= cx - seatW + Math.floor(seatW * 0.15) && x < cx - seatW + Math.floor(seatW * 0.15) + legW) {
        isChair = true
      }
      // Right leg
      if (y >= legTop && y < legTop + legH && x >= cx + seatW - Math.floor(seatW * 0.15) - legW && x < cx + seatW - Math.floor(seatW * 0.15)) {
        isChair = true
      }

      if (isChair) {
        raw[i] = chairColor[0]
        raw[i + 1] = chairColor[1]
        raw[i + 2] = chairColor[2]
        raw[i + 3] = 255
      } else {
        raw[i] = r
        raw[i + 1] = g
        raw[i + 2] = b
        raw[i + 3] = 0 // transparent background
      }
    }
  }

  // Filter + compress
  const filtered = Buffer.alloc(size + size * size * 4)
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    filtered[rowStart] = 0 // filter none
    raw.copy(filtered, rowStart + 1, y * size * 4, (y + 1) * size * 4)
  }

  const compressed = zlib.deflateSync(filtered)

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0))
  ])
}

const SIZE = 81
const outDir = path.resolve(__dirname, '../miniprogram/images/tab')

// seat.png — inactive: transparent bg, gray chair
fs.writeFileSync(path.join(outDir, 'seat.png'), generatePNG(SIZE, 255, 255, 255, [0x99, 0x99, 0x99]))

// seat-active.png — active: transparent bg, green chair (matching seat UI theme #07c160)
fs.writeFileSync(path.join(outDir, 'seat-active.png'), generatePNG(SIZE, 255, 255, 255, [0x07, 0xc1, 0x60]))

console.log('✅ seat.png & seat-active.png generated in', outDir)
