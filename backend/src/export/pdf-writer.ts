import { Buffer } from 'node:buffer';

export interface PdfDocument {
  title: string;
  lines: string[];
}

function sanitizeText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim();
}

function stringToUtf16Hex(value: string): string {
  const buffer = Buffer.from(`\ufeff${value}`, 'utf16le');
  const bytes: number[] = [];

  for (let index = 0; index < buffer.length; index += 2) {
    bytes.push(buffer[index + 1] ?? 0);
    bytes.push(buffer[index] ?? 0);
  }

  return bytes
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function buildTextCommand(
  text: string,
  y: number,
  fontSize: number,
): string {
  return [
    'BT',
    `/F1 ${fontSize} Tf`,
    `50 ${y} Td`,
    `<${stringToUtf16Hex(text)}> Tj`,
    'ET',
  ].join('\n');
}

function buildContentStream(document: PdfDocument): string {
  const safeLines = [
    document.title,
    '',
    ...document.lines,
  ]
    .map(sanitizeText)
    .slice(0, 45);

  const commands = safeLines.map((line, index) => {
    const fontSize = index === 0 ? 16 : 10;
    const y = index === 0
      ? 792
      : 760 - (index * 16);

    return buildTextCommand(
      line.length > 0 ? line : ' ',
      y,
      fontSize,
    );
  });

  return commands.join('\n');
}

function buildObject(
  id: number,
  content: string,
): string {
  return `${id} 0 obj\n${content}\nendobj\n`;
}

export function buildPdfDocument(document: PdfDocument): Buffer {
  const contentStream = buildContentStream(document);
  const contentLength = Buffer.byteLength(
    contentStream,
    'utf8',
  );

  const objects = [
    buildObject(
      1,
      '<< /Type /Catalog /Pages 2 0 R >>',
    ),
    buildObject(
      2,
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    ),
    buildObject(
      3,
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    ),
    buildObject(
      4,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ),
    buildObject(
      5,
      `<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream`,
    ),
  ];

  const header = '%PDF-1.4\n';
  let offset = Buffer.byteLength(header, 'utf8');
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(offset);
    offset += Buffer.byteLength(object, 'utf8');
  }

  const xrefOffset = offset;
  const xrefRows = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets
      .slice(1)
      .map((objectOffset) => `${objectOffset.toString().padStart(10, '0')} 00000 n `),
  ];

  const trailer = [
    ...xrefRows,
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    xrefOffset.toString(),
    '%%EOF',
  ].join('\n');

  return Buffer.from(
    `${header}${objects.join('')}${trailer}\n`,
    'utf8',
  );
}
