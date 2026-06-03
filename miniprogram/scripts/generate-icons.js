// 生成简单的 tabBar 图标
const fs = require('fs')
const path = require('path')

const iconDir = path.join(__dirname, '../images/tab')

// 确保目录存在
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true })
}

// 简单的 1x1 透明像素 PNG (最小有效PNG)
const createSimpleIcon = () => {
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x20, // width: 32
    0x00, 0x00, 0x00, 0x20, // height: 32
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x73, 0x7A, 0x7A, 0xF4, // CRC for IHDR
    0x00, 0x00, 0x00, 0x09, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, // compressed data
    0x2D, 0xB4, // CRC for IDAT
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC for IEND
  ])
}

// 创建图标文件
const icons = [
  'home.png',
  'home-active.png',
  'apply.png',
  'apply-active.png',
  'mine.png',
  'mine-active.png'
]

icons.forEach(name => {
  const filePath = path.join(iconDir, name)
  fs.writeFileSync(filePath, createSimpleIcon())
  console.log(`Created: ${filePath}`)
})

console.log('All icons created successfully!')