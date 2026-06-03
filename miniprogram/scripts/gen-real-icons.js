// 生成真正的 81x81 纯色 tabBar 图标
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconDir = path.join(__dirname, '../images/tab');
if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true });

function crc32(buf) {
    let table = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const combined = Buffer.concat([Buffer.from(type), data]);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(combined));
    return Buffer.concat([len, combined, crcBuf]);
}

function createPNG(w, h, r, g, b) {
    // Raw pixel data with filter bytes
    const rowSize = w * 4 + 1;
    const raw = Buffer.alloc(rowSize * h);
    for (let y = 0; y < h; y++) {
        raw[y * rowSize] = 0; // filter none
        for (let x = 0; x < w; x++) {
            const off = y * rowSize + 1 + x * 4;
            raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = 255;
        }
    }
    const compressed = zlib.deflateSync(raw);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; ihdr[9] = 6; // RGBA

    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // signature
        makeChunk('IHDR', ihdr),
        makeChunk('IDAT', compressed),
        makeChunk('IEND', Buffer.alloc(0))
    ]);
}

const icons = [
    ['home.png', 153, 153, 153], ['home-active.png', 22, 119, 255],
    ['apply.png', 153, 153, 153], ['apply-active.png', 22, 119, 255],
    ['mine.png', 153, 153, 153], ['mine-active.png', 22, 119, 255],
];

icons.forEach(([name, r, g, b]) => {
    const buf = createPNG(81, 81, r, g, b);
    fs.writeFileSync(path.join(iconDir, name), buf);
    console.log(`OK ${name} (${buf.length} bytes)`);
});
console.log('Done!');
