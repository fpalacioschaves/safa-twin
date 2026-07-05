import { Buffer } from 'node:buffer';

export interface DocxDocument {
  title: string;
  paragraphs: string[];
}

interface ZipEntry {
  path: string;
  data: Buffer;
}

const crc32Table = new Uint32Array(256);

for (let index = 0; index < 256; index += 1) {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1
      ? 0xedb88320 ^ (value >>> 1)
      : value >>> 1;
  }

  crc32Table[index] = value >>> 0;
}

function getCrc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildParagraphXml(value: string): string {
  if (value.trim().length === 0) {
    return '<w:p/>';
  }

  return [
    '<w:p>',
    '<w:r>',
    `<w:t xml:space="preserve">${escapeXml(value)}</w:t>`,
    '</w:r>',
    '</w:p>',
  ].join('');
}

function buildDocumentXml(document: DocxDocument): string {
  const paragraphs = [
    document.title,
    '',
    ...document.paragraphs,
  ]
    .map(buildParagraphXml)
    .join('');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    paragraphs,
    '<w:sectPr>',
    '<w:pgSz w:w="11906" w:h="16838"/>',
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>',
    '</w:sectPr>',
    '</w:body>',
    '</w:document>',
  ].join('');
}

function buildContentTypesXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    '</Types>',
  ].join('');
}

function buildRootRelationshipsXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>',
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>',
    '</Relationships>',
  ].join('');
}

function buildDocumentRelationshipsXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '</Relationships>',
  ].join('');
}

function buildStylesXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">',
    '<w:name w:val="Normal"/>',
    '<w:qFormat/>',
    '</w:style>',
    '</w:styles>',
  ].join('');
}

function buildCorePropertiesXml(createdAt: Date): string {
  const isoDate = createdAt.toISOString();

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    '<dc:creator>SAFA Twin</dc:creator>',
    '<cp:lastModifiedBy>SAFA Twin</cp:lastModifiedBy>',
    `<dcterms:created xsi:type="dcterms:W3CDTF">${isoDate}</dcterms:created>`,
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${isoDate}</dcterms:modified>`,
    '</cp:coreProperties>',
  ].join('');
}

function buildAppPropertiesXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">',
    '<Application>SAFA Twin</Application>',
    '</Properties>',
  ].join('');
}

function getDosDateTime(date: Date): {
  dosDate: number;
  dosTime: number;
} {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11)
    | (date.getMinutes() << 5)
    | Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9)
    | ((date.getMonth() + 1) << 5)
    | date.getDate();

  return {
    dosDate,
    dosTime,
  };
}

function createZip(entries: ZipEntry[]): Buffer {
  const {
    dosDate,
    dosTime,
  } = getDosDateTime(new Date());

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBuffer = Buffer.from(entry.path, 'utf8');
    const crc32 = getCrc32(entry.data);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(entry.data.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(
      localHeader,
      nameBuffer,
      entry.data,
    );

    const centralHeader = Buffer.alloc(46);

    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc32, 16);
    centralHeader.writeUInt32LE(entry.data.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(
      centralHeader,
      nameBuffer,
    );

    offset += localHeader.length + nameBuffer.length + entry.data.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([
    ...localParts,
    centralDirectory,
    end,
  ]);
}

export function buildDocxDocument(document: DocxDocument): Buffer {
  const createdAt = new Date();
  const entries: ZipEntry[] = [
    {
      path: '[Content_Types].xml',
      data: Buffer.from(buildContentTypesXml(), 'utf8'),
    },
    {
      path: '_rels/.rels',
      data: Buffer.from(buildRootRelationshipsXml(), 'utf8'),
    },
    {
      path: 'docProps/core.xml',
      data: Buffer.from(buildCorePropertiesXml(createdAt), 'utf8'),
    },
    {
      path: 'docProps/app.xml',
      data: Buffer.from(buildAppPropertiesXml(), 'utf8'),
    },
    {
      path: 'word/document.xml',
      data: Buffer.from(buildDocumentXml(document), 'utf8'),
    },
    {
      path: 'word/_rels/document.xml.rels',
      data: Buffer.from(buildDocumentRelationshipsXml(), 'utf8'),
    },
    {
      path: 'word/styles.xml',
      data: Buffer.from(buildStylesXml(), 'utf8'),
    },
  ];

  return createZip(entries);
}
