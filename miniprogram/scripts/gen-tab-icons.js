/**
 * 生成 tabBar 图标 — 简洁线条风格 PNG
 * 用法: node scripts/gen-tab-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconDir = path.join(__dirname, '../images/tab');
const S = 48; // 48x48

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

// 画线函数（在 1px 网格上画粗线）
function stroke(drawFn, thickness) {
    const t = thickness || 1;
    return (x, y) => {
        for (let dx = -Math.floor(t/2); dx <= Math.floor(t/2); dx++) {
            for (let dy = -Math.floor(t/2); dy <= Math.floor(t/2); dy++) {
                if (drawFn(Math.round(x + dx), Math.round(y + dy))) return true;
            }
        }
        return false;
    };
}

// 线段检测（粗线用）
function onLine(px, py, x1, y1, x2, y2) {
    const d = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    const dist = Math.abs((y2-y1)*px - (x2-x1)*py + x2*y1 - y2*x1) / d;
    const dot = ((px-x1)*(x2-x1) + (py-y1)*(y2-y1)) / (d*d);
    return dist <= 1.5 && dot >= -0.1 && dot <= 1.1;
}

function createPNG(r, g, b, drawFn) {
    const rowSize = S * 4 + 1;
    const raw = Buffer.alloc(rowSize * S);
    for (let y = 0; y < S; y++) {
        raw[y * rowSize] = 0;
        for (let x = 0; x < S; x++) {
            const off = y * rowSize + 1 + x * 4;
            if (drawFn(x, y)) {
                raw[off] = r; raw[off+1] = g; raw[off+2] = b; raw[off+3] = 255;
            } else {
                raw[off] = 0; raw[off+1] = 0; raw[off+2] = 0; raw[off+3] = 0;
            }
        }
    }
    const compressed = zlib.deflateSync(raw);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
    ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([
        Buffer.from([137,80,78,71,13,10,26,10]),
        makeChunk('IHDR', ihdr),
        makeChunk('IDAT', compressed),
        makeChunk('IEND', Buffer.alloc(0))
    ]);
}

// ====== 绘图函数 ======

// 主页：简洁房子
function drawHome(x, y) {
    const m = 6, w = 30, h = 20, b = S - m, l = (S - w) / 2, r = l + w;
    // 屋顶
    if (onLine(x, y, S/2, m, l, m + 14)) return true;
    if (onLine(x, y, l, m + 14, r, m + 14)) return true;
    if (onLine(x, y, S/2, m, r, m + 14)) return true;
    // 墙壁
    if (onLine(x, y, l, m + 14, l, b)) return true;
    if (onLine(x, y, r, m + 14, r, b)) return true;
    if (onLine(x, y, l, b, r, b)) return true;
    // 门
    if (onLine(x, y, S/2 - 5, b, S/2 - 5, b - 11)) return true;
    if (onLine(x, y, S/2 + 5, b, S/2 + 5, b - 11)) return true;
    // 门把手
    if (Math.sqrt((x - (S/2 + 3))**2 + (y - (b - 6))**2) <= 1) return true;
    return false;
}

// 预约：文档+对勾
function drawApply(x, y) {
    const m = 8, b = S - 8, l = m + 2, r = S - m - 2;
    const docR = m + 12, docB = m + 18;
    // 文档主体
    if (onLine(x, y, l, m, l, b)) return true;
    if (onLine(x, y, l, m, docR, m)) return true;
    if (onLine(x, y, docR, m, docR, docB)) return true;
    if (onLine(x, y, l, docB, docR, docB)) return true;
    if (onLine(x, y, docR, docB, r, docB)) return true;
    if (onLine(x, y, r, docB, r, b)) return true;
    if (onLine(x, y, r, b, l, b)) return true;
    // 对勾
    const cx = (docR + r) / 2 + 2, cy = (docB + b) / 2;
    if (onLine(x, y, cx - 5, cy, cx - 1, cy + 5)) return true;
    if (onLine(x, y, cx - 1, cy + 5, cx + 5, cy - 4)) return true;
    return false;
}

// 我的：简洁人形
function drawMine(x, y) {
    const cx = S / 2, headY = 10, headR = 7;
    // 头
    const d = Math.sqrt((x - cx)**2 + (y - headY)**2);
    if (d >= headR - 1.5 && d <= headR + 1.5) return true;
    // 身体
    const bodyT = headY + headR + 3, bodyB = S - 8;
    if (onLine(x, y, cx, bodyT, cx, bodyB)) return true;
    // 手臂
    if (onLine(x, y, cx - 12, bodyT + 8, cx + 12, bodyT + 8)) return true;
    // 腿
    if (onLine(x, y, cx, bodyB, cx - 8, S - 5)) return true;
    if (onLine(x, y, cx, bodyB, cx + 8, S - 5)) return true;
    return false;
}

// ====== 生成 ======

const icons = [
    { file: 'home.png', r: 153, g: 153, b: 153, draw: drawHome },
    { file: 'home-active.png', r: 22, g: 119, b: 255, draw: drawHome },
    { file: 'apply.png', r: 153, g: 153, b: 153, draw: drawApply },
    { file: 'apply-active.png', r: 22, g: 119, b: 255, draw: drawApply },
    { file: 'mine.png', r: 153, g: 153, b: 153, draw: drawMine },
    { file: 'mine-active.png', r: 22, g: 119, b: 255, draw: drawMine },
];

icons.forEach(({ file, r, g, b, draw }) => {
    const buf = createPNG(r, g, b, draw);
    fs.writeFileSync(path.join(iconDir, file), buf);
    console.log(`OK ${file} (${buf.length} bytes)`);
});
console.log('Done!');
