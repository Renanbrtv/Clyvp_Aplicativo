import { AppError } from '../../utils/app-error';
/** Only bounded raster images. Strip JPEG APP/COM and PNG ancillary metadata (including GPS). */
export function cleanImage(data: string): string {
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) throw AppError.badRequest('Use uma imagem PNG ou JPEG.');
  const b = Buffer.from(match[2], 'base64');
  if (b.length > 250000) throw AppError.badRequest('Cada imagem deve ter no maximo 250 KB.');
  if (match[1] === 'png') {
    if (b.length < 33 || b.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
      throw AppError.badRequest('PNG invalido.');
    const width = b.readUInt32BE(16),
      height = b.readUInt32BE(20);
    if (!width || !height || width > 4096 || height > 4096)
      throw AppError.badRequest('Imagem deve ter ate 4096 pixels por lado.');
    const chunks = [b.subarray(0, 8)];
    let i = 8,
      end = false;
    while (i + 12 <= b.length) {
      const n = b.readUInt32BE(i),
        type = b.toString('ascii', i + 4, i + 8);
      if (i + 12 + n > b.length) throw AppError.badRequest('PNG incompleto.');
      if (['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS'].includes(type)) chunks.push(b.subarray(i, i + 12 + n));
      i += 12 + n;
      if (type === 'IEND') {
        end = true;
        break;
      }
    }
    if (!end) throw AppError.badRequest('PNG incompleto.');
    return 'data:image/png;base64,' + Buffer.concat(chunks).toString('base64');
  }
  if (b.length < 4 || b[0] !== 255 || b[1] !== 216) throw AppError.badRequest('JPEG invalido.');
  const chunks = [b.subarray(0, 2)];
  let i = 2,
    size = false,
    scan = false;
  while (i + 4 <= b.length) {
    if (b[i] !== 255) throw AppError.badRequest('JPEG invalido.');
    const marker = b[i + 1];
    if (marker === 218) {
      chunks.push(b.subarray(i));
      scan = true;
      break;
    }
    const n = b.readUInt16BE(i + 2);
    if (n < 2 || i + 2 + n > b.length) throw AppError.badRequest('JPEG incompleto.');
    if ([192, 193, 194].includes(marker)) {
      if (n < 8) throw AppError.badRequest('JPEG incompleto.');
      const h = b.readUInt16BE(i + 5),
        w = b.readUInt16BE(i + 7);
      if (!h || !w || h > 4096 || w > 4096)
        throw AppError.badRequest('Imagem deve ter ate 4096 pixels por lado.');
      size = true;
    }
    if (!(marker >= 224 && marker <= 239) && marker !== 254) chunks.push(b.subarray(i, i + 2 + n));
    i += 2 + n;
  }
  if (!size || !scan || b[b.length - 2] !== 255 || b[b.length - 1] !== 217)
    throw AppError.badRequest('JPEG incompleto.');
  return 'data:image/jpeg;base64,' + Buffer.concat(chunks).toString('base64');
}
