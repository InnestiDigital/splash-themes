import qrcode from 'qrcode-generator'

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H'

export interface QrCodeGeometry {
  moduleCount: number
  quietZone: number
  viewBoxSize: number
  path: string
}

/**
 * Encode text into one deterministic SVG path. Adjacent dark modules in each
 * row are coalesced into a single rectangle, keeping exported artifacts small
 * without using canvas, data URLs, randomness or a remote QR service.
 */
export function createQrCodeGeometry(
  value: string,
  errorCorrection: QrErrorCorrection = 'M',
  quietZone = 4,
): QrCodeGeometry {
  if (value.length === 0) {
    throw new TypeError('QR code content must not be empty')
  }

  const safeQuietZone = Math.max(0, Math.min(16, Math.round(quietZone)))
  const code = qrcode(0, errorCorrection)
  code.addData(value, 'Byte')
  code.make()

  const moduleCount = code.getModuleCount()
  const commands: string[] = []

  for (let row = 0; row < moduleCount; row++) {
    let column = 0
    while (column < moduleCount) {
      if (!code.isDark(row, column)) {
        column++
        continue
      }

      const start = column
      while (column < moduleCount && code.isDark(row, column)) column++
      const run = column - start
      const x = start + safeQuietZone
      const y = row + safeQuietZone
      commands.push(`M${x} ${y}h${run}v1h-${run}z`)
    }
  }

  return {
    moduleCount,
    quietZone: safeQuietZone,
    viewBoxSize: moduleCount + safeQuietZone * 2,
    path: commands.join(''),
  }
}
