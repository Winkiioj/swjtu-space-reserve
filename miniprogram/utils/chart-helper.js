/**
 * chart-helper.js — 微信小程序 Canvas 2D 轻量图表绘制工具
 *
 * 不依赖任何第三方库，使用小程序原生 Canvas 2D API 绘制折线图。
 */

/**
 * 绘制折线图
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} canvas - canvas 节点
 * @param {Object} data - { labels: string[], series: {name,color,values[]}[] }
 * @param {Object} opts - { width, height, padding, smooth, fill, yLabelCount, showLegend }
 */
function drawLineChart(ctx, canvas, data, opts = {}) {
  if (!data || !data.series || data.series.length === 0) return

  // 使用 canvas 实际显示尺寸
  const sys = wx.getSystemInfoSync()
  const dpr = sys.pixelRatio || 2
  const canvasWidth = sys.windowWidth * 0.9
  const width = opts.width || canvasWidth
  const height = opts.height || 350

  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.scale(dpr, dpr)

  const pad = Object.assign({ top: 40, right: 20, bottom: 50, left: 55 }, opts.padding)
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom

  const labels = data.labels || []
  const seriesList = data.series || []
  let allValues = []
  seriesList.forEach(s => allValues = allValues.concat(s.values))
  const maxVal = Math.max(...allValues, 1)
  const minVal = 0
  const valRange = maxVal - minVal || 1

  ctx.clearRect(0, 0, width, height)

  // 字体大小用 px（Canvas 2D 不支持 rpx）
  const labelFontSize = Math.max(9, Math.round(width / 35))
  const legendFontSize = Math.max(10, Math.round(width / 30))

  // ----- 网格和 Y 轴刻度 -----
  const yCount = opts.yLabelCount || 4
  ctx.strokeStyle = '#f0f0f0'
  ctx.lineWidth = 1
  ctx.fillStyle = '#94a3b8'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.font = labelFontSize + 'px sans-serif'

  for (let i = 0; i <= yCount; i++) {
    const val = minVal + (valRange / yCount) * i
    const y = pad.top + chartH - (chartH / yCount) * i
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(width - pad.right, y)
    ctx.stroke()
    ctx.fillText(Math.round(val).toString(), pad.left - 10, y)
  }

  // ----- X 轴标签 -----
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const xStep = labels.length > 1 ? chartW / (labels.length - 1) : chartW
  const labelStep = Math.max(1, Math.floor(labels.length / 10))
  labels.forEach((label, i) => {
    if (i % labelStep !== 0 && i !== labels.length - 1) return
    ctx.fillText(label, pad.left + xStep * i, pad.top + chartH + 10)
  })

  // ----- 绘制折线 -----
  seriesList.forEach((series) => {
    const values = series.values
    const color = series.color || '#4a6cf7'
    const points = values.map((v, i) => ({
      x: pad.left + (labels.length > 1 ? (chartW / (labels.length - 1)) * i : chartW / 2),
      y: pad.top + chartH - ((v - minVal) / valRange) * chartH
    }))

    // 渐变填充
    if (opts.fill !== false) {
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH)
      grad.addColorStop(0, color + '40')
      grad.addColorStop(1, color + '05')
      ctx.beginPath()
      ctx.moveTo(points[0].x, pad.top + chartH)
      for (let i = 0; i < points.length; i++) {
        if (opts.smooth && i > 0) {
          const cp1x = (points[i - 1].x + points[i].x) / 2
          const cp1y = points[i - 1].y
          const cp2x = (points[i - 1].x + points[i].x) / 2
          const cp2y = points[i].y
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i].x, points[i].y)
        } else {
          ctx.lineTo(points[i].x, points[i].y)
        }
      }
      ctx.lineTo(points[points.length - 1].x, pad.top + chartH)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
    }

    // 折线
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        ctx.moveTo(points[i].x, points[i].y)
      } else if (opts.smooth) {
        ctx.bezierCurveTo(
          (points[i-1].x + points[i].x) / 2, points[i-1].y,
          (points[i-1].x + points[i].x) / 2, points[i].y,
          points[i].x, points[i].y)
      } else {
        ctx.lineTo(points[i].x, points[i].y)
      }
    }
    ctx.stroke()

    // 数据点圆点
    points.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    })
  })

  // ----- 图例 -----
  if (opts.showLegend !== false) {
    ctx.font = legendFontSize + 'px sans-serif'
    let legendX = pad.left
    const legendY = 15
    seriesList.forEach((series) => {
      const color = series.color || '#4a6cf7'
      ctx.beginPath()
      ctx.arc(legendX, legendY, 5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(series.name, legendX + 14, legendY)
      legendX += series.name.length * legendFontSize * 1.3 + 50
    })
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

module.exports = { drawLineChart }
