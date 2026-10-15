import type { jsPDF } from 'jspdf';
import { Criminal, Evidence } from '@/types';
import { criminalsAPI } from '@/services/api';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_COLOR: [number, number, number] = [31, 41, 55];
const MUTED_COLOR: [number, number, number] = [91, 103, 120];
const ACCENT_COLOR: [number, number, number] = [22, 76, 92];
const FIELD_GAP = 4;
const LABEL_SIZE = 8;
const VALUE_SIZE = 9;
const LABEL_LINE_HEIGHT = 3.2;
const VALUE_LINE_HEIGHT = 3.8;

interface PdfField {
  label: string;
  value?: string | null;
  span?: number;
}

interface PdfImageData {
  dataUrl: string;
  width: number;
  height: number;
}

interface PdfThumbnail {
  data: PdfImageData;
  fileName: string;
}

const displayValue = (value?: string | null) => value?.trim() || 'Non renseigne';

const formatDate = (value?: string | null) => {
  if (!value) return 'Non renseignee';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Non renseignee' : parsed.toLocaleDateString('fr-FR');
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Non renseignee';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Non renseignee' : parsed.toLocaleString('fr-FR');
};

const filenameFromUrl = (value: string) => {
  const segment = value.split('?')[0].split('/').pop() || 'fichier';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Image invalide'));
  reader.onerror = () => reject(new Error('Lecture de l’image impossible'));
  reader.readAsDataURL(blob);
});

const imageFormat = (dataUrl: string): 'PNG' | 'JPEG' => dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';

const loadPdfImage = async (blob: Blob): Promise<PdfImageData> => {
  const dataUrl = await blobToDataUrl(blob);
  const image = new Image();
  image.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Image invalide'));
  });
  return { dataUrl, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
};

const fitImage = (image: PdfImageData, maxWidth: number, maxHeight: number) => {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * scale, height: image.height * scale };
};

const truncateText = (pdf: jsPDF, text: string, maxWidth: number) => {
  if (pdf.getTextWidth(text) <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 1 && pdf.getTextWidth(`${shortened}…`) > maxWidth) shortened = shortened.slice(0, -1);
  return `${shortened}…`;
};

export async function createCriminalPdf(criminal: Criminal, evidences: Evidence[]) {
  const { jsPDF: JsPdfConstructor } = await import('jspdf');
  const pdf = new JsPdfConstructor({ unit: 'mm', format: 'a4', compress: true });
  let cursorY = MARGIN;

  const ensureSpace = (height: number) => {
    if (cursorY + height > PAGE_HEIGHT - MARGIN) {
      pdf.addPage();
      cursorY = MARGIN;
    }
  };

  const addSection = (title: string) => {
    ensureSpace(12);
    cursorY += 1;
    pdf.setFillColor(...ACCENT_COLOR);
    pdf.roundedRect(MARGIN, cursorY - 3.5, CONTENT_WIDTH, 8, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, MARGIN + 3, cursorY + 1.8);
    cursorY += 9;
    pdf.setTextColor(...BODY_COLOR);
  };

  const addFieldRow = (fields: PdfField[], columns = 3, rowWidth = CONTENT_WIDTH, startX = MARGIN) => {
    if (fields.length === 0) return;
    const safeColumns = Math.max(1, columns);
    const columnWidth = (rowWidth - FIELD_GAP * (safeColumns - 1)) / safeColumns;
    const measured = fields.map((field) => {
      const span = Math.min(safeColumns, Math.max(1, field.span ?? 1));
      const width = columnWidth * span + FIELD_GAP * (span - 1);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(LABEL_SIZE);
      const labelLines = pdf.splitTextToSize(field.label, width);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(VALUE_SIZE);
      const valueLines = pdf.splitTextToSize(displayValue(field.value), width);
      const height = labelLines.length * LABEL_LINE_HEIGHT + 0.8 + valueLines.length * VALUE_LINE_HEIGHT + 1.5;
      return { field, span, width, labelLines, valueLines, height };
    });
    const rowHeight = Math.max(...measured.map((field) => field.height));
    ensureSpace(rowHeight);

    let columnIndex = 0;
    for (const field of measured) {
      const x = startX + columnIndex * (columnWidth + FIELD_GAP);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(LABEL_SIZE);
      pdf.setTextColor(...MUTED_COLOR);
      pdf.text(field.labelLines, x, cursorY);
      const valueY = cursorY + field.labelLines.length * LABEL_LINE_HEIGHT + 0.8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(VALUE_SIZE);
      pdf.setTextColor(...BODY_COLOR);
      pdf.text(field.valueLines, x, valueY);
      columnIndex += field.span;
    }
    cursorY += rowHeight + 1;
  };

  const addField = (label: string, value?: string | null) => {
    const lines = pdf.splitTextToSize(displayValue(value), CONTENT_WIDTH - 2);
    const height = LABEL_LINE_HEIGHT + 0.8 + lines.length * VALUE_LINE_HEIGHT + 1.5;
    ensureSpace(height);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(LABEL_SIZE);
    pdf.setTextColor(...MUTED_COLOR);
    pdf.text(label, MARGIN + 1, cursorY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(VALUE_SIZE);
    pdf.setTextColor(...BODY_COLOR);
    pdf.text(lines, MARGIN + 1, cursorY + LABEL_LINE_HEIGHT + 0.8);
    cursorY += height + 1;
  };

  const addParagraph = (text: string) => {
    const lines = pdf.splitTextToSize(text, CONTENT_WIDTH - 2);
    const height = lines.length * VALUE_LINE_HEIGHT + 2;
    ensureSpace(height);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(VALUE_SIZE);
    pdf.setTextColor(...BODY_COLOR);
    pdf.text(lines, MARGIN + 1, cursorY);
    cursorY += height;
  };

  const addImage = (image: PdfImageData, x: number, y: number, maxWidth: number, maxHeight: number) => {
    const dimensions = fitImage(image, maxWidth, maxHeight);
    pdf.addImage(image.dataUrl, imageFormat(image.dataUrl), x, y, dimensions.width, dimensions.height, undefined, 'FAST');
    return dimensions;
  };

  const addMetaLine = (text: string) => {
    ensureSpace(5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...MUTED_COLOR);
    pdf.text(truncateText(pdf, text, CONTENT_WIDTH - 2), MARGIN + 1, cursorY);
    cursorY += 5;
  };

  const fullName = `${criminal.lastName} ${criminal.firstName}`.trim();
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...ACCENT_COLOR);
  pdf.text('DOSSIER CRIMINEL', MARGIN, cursorY + 4);
  cursorY += 9;
  pdf.setFontSize(12);
  pdf.setTextColor(...BODY_COLOR);
  pdf.text(pdf.splitTextToSize(fullName, CONTENT_WIDTH), MARGIN, cursorY + 3);
  cursorY += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED_COLOR);
  pdf.text(`Numero de dossier : ${displayValue(criminal.caseNumber || criminal.fileNumber)}`, MARGIN, cursorY + 2);
  cursorY += 7;
  pdf.setDrawColor(210, 218, 225);
  pdf.line(MARGIN, cursorY, PAGE_WIDTH - MARGIN, cursorY);
  cursorY += 4;

  addFieldRow([
    { label: 'Rapport genere le', value: new Date().toLocaleString('fr-FR') },
    { label: 'Statut du dossier', value: criminal.status },
  ], 2);

  let portrait: PdfImageData | undefined;
  let portraitUnavailable = false;
  if (criminal.photo) {
    try {
      const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;
      const apiBase = configuredApiUrl?.trim()
        ? configuredApiUrl.replace(/\/api\/?$/, '')
        : `http://${window.location.hostname || '127.0.0.1'}:5000`;
      const photoUrl = criminal.photo.startsWith('http')
        ? criminal.photo
        : `${apiBase}${criminal.photo.startsWith('/') ? '' : '/'}${criminal.photo}`;
      const response = await fetch(photoUrl);
      if (response.ok) portrait = await loadPdfImage(await response.blob());
      else portraitUnavailable = true;
    } catch {
      portraitUnavailable = true;
    }
  }

  addSection('Identite et renseignements personnels');
  if (portrait) {
    const photoWidth = 35;
    const photoHeight = 45;
    const photoGap = 5;
    const leftWidth = CONTENT_WIDTH - photoWidth - photoGap;
    ensureSpace(66);
    const identityStartY = cursorY;
    addFieldRow([
      { label: 'Nom', value: criminal.lastName },
      { label: 'Prenom', value: criminal.firstName },
      { label: 'Alias / surnom', value: criminal.alias },
    ], 3, leftWidth);
    addFieldRow([
      { label: 'Date de naissance', value: formatDate(criminal.birthDate || criminal.dateOfBirth) },
      { label: 'Lieu de naissance', value: criminal.placeOfBirth },
      { label: 'Nationalite', value: criminal.nationality },
    ], 3, leftWidth);
    addFieldRow([
      { label: 'Genre', value: criminal.gender },
      { label: 'Telephone', value: criminal.phoneNumber, span: 2 },
    ], 3, leftWidth);
    addFieldRow([{ label: 'Derniere adresse connue', value: criminal.lastKnownAddress, span: 3 }], 3, leftWidth);
    addFieldRow([{ label: 'Empreinte / reference biometrique', value: criminal.fingerprint, span: 3 }], 3, leftWidth);
    const imageSize = fitImage(portrait, photoWidth, photoHeight);
    const photoX = MARGIN + leftWidth + photoGap + (photoWidth - imageSize.width) / 2;
    addImage(portrait, photoX, identityStartY, photoWidth, photoHeight);
  } else {
    addFieldRow([
      { label: 'Nom', value: criminal.lastName },
      { label: 'Prenom', value: criminal.firstName },
      { label: 'Alias / surnom', value: criminal.alias },
    ]);
    addFieldRow([
      { label: 'Date de naissance', value: formatDate(criminal.birthDate || criminal.dateOfBirth) },
      { label: 'Lieu de naissance', value: criminal.placeOfBirth },
      { label: 'Nationalite', value: criminal.nationality },
    ]);
    addFieldRow([
      { label: 'Genre', value: criminal.gender },
      { label: 'Telephone', value: criminal.phoneNumber },
    ]);
    addFieldRow([{ label: 'Derniere adresse connue', value: criminal.lastKnownAddress, span: 3 }]);
    addFieldRow([{ label: 'Empreinte / reference biometrique', value: criminal.fingerprint, span: 3 }]);
  }
  if (portraitUnavailable) addField('Photo associee au dossier', 'Image non disponible');

  addSection('Dossier et faits principaux');
  addFieldRow([
    { label: 'Numero de dossier', value: criminal.caseNumber || criminal.fileNumber },
    { label: 'Type de crime', value: criminal.crimeType?.name },
    { label: 'Statut', value: criminal.status },
  ]);
  addFieldRow([
    { label: 'Date des faits', value: formatDate(criminal.crimeDate) },
    { label: 'Lieu des faits', value: criminal.crimeLocation },
    { label: 'Niveau de danger', value: criminal.dangerLevel },
  ]);
  addField('Description principale', criminal.description || criminal.notes);

  addSection('Arrestation');
  addFieldRow([
    { label: "Date d'arrestation", value: formatDate(criminal.arrestation?.arrestDate || criminal.arrestDate) },
    { label: "Lieu d'arrestation", value: criminal.arrestation?.arrestLocation || criminal.arrestLocation },
    { label: "Unite d'intervention", value: criminal.arrestation?.arrestingUnit },
  ]);
  addFieldRow([
    { label: 'Agent responsable', value: criminal.arrestation?.arrestingOfficer },
    { label: 'Numero de mandat', value: criminal.arrestation?.warrantNumber },
  ], 3);
  addField("Observations d'arrestation", criminal.arrestation?.notes);

  addSection(`Crimes associes (${criminal.crimes?.length || 0})`);
  if (criminal.crimes?.length) {
    for (const [index, crime] of criminal.crimes.entries()) {
      ensureSpace(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(...ACCENT_COLOR);
      pdf.text(truncateText(pdf, `Crime ${index + 1} : ${displayValue(crime.crimeType?.name)}`, CONTENT_WIDTH - 2), MARGIN + 1, cursorY);
      cursorY += 4.5;
      addFieldRow([
        { label: 'Date', value: formatDate(crime.crimeDate) },
        { label: 'Lieu', value: crime.crimeLocation },
        { label: 'Statut', value: crime.status },
        { label: 'Niveau de danger', value: crime.dangerLevel },
      ], 4);
      addField('Description', crime.description);
      const creator = crime.createdBy?.username ? ` par ${crime.createdBy.username}` : '';
      addMetaLine(`Enregistre le ${formatDateTime(crime.createdAt)}${creator}`);
      if (index < criminal.crimes.length - 1) {
        ensureSpace(3);
        pdf.setDrawColor(215, 222, 228);
        pdf.line(MARGIN + 1, cursorY, PAGE_WIDTH - MARGIN - 1, cursorY);
        cursorY += 3;
      }
    }
  } else {
    addParagraph("Aucun crime associe distinct n'est enregistre dans l'historique.");
  }

  addSection(`Pieces a conviction (${evidences.length})`);
  if (evidences.length) {
    for (const [index, evidence] of evidences.entries()) {
      ensureSpace(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(...ACCENT_COLOR);
      pdf.text(truncateText(pdf, `Piece ${index + 1} : ${displayValue(evidence.title)}`, CONTENT_WIDTH - 2), MARGIN + 1, cursorY);
      cursorY += 4.5;
      addFieldRow([
        { label: 'Categorie', value: evidence.category },
        { label: 'Date de collecte', value: formatDate(evidence.collectedAt) },
        { label: 'Lieu de collecte', value: evidence.collectedAtLocation },
      ]);
      addField('Description', evidence.description);
      const creator = evidence.createdBy?.username ? ` par ${evidence.createdBy.username}` : '';
      addMetaLine(`Enregistre le ${formatDateTime(evidence.createdAt)}${creator}`);

      const thumbnails: PdfThumbnail[] = [];
      for (const [fileIndex, fileUrl] of evidence.fileUrls.entries()) {
        const fileName = filenameFromUrl(fileUrl);
        if (/\.(jpe?g|png|gif|webp|bmp)$/i.test(fileName)) {
          try {
            const blob = await criminalsAPI.getEvidenceFile(criminal.id, evidence.id, fileIndex);
            thumbnails.push({ data: await loadPdfImage(blob), fileName });
          } catch {
            addField('Fichier associe', `${fileName} (image indisponible)`);
          }
        } else {
          addField('Fichier associe', fileName);
        }
      }

      const columns = 3;
      const gap = 4;
      const cellWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      for (let start = 0; start < thumbnails.length; start += columns) {
        const row = thumbnails.slice(start, start + columns);
        const sizes = row.map(({ data }) => fitImage(data, Math.min(52, cellWidth), 45));
        const rowImageHeight = Math.max(...sizes.map(({ height }) => height));
        const rowHeight = rowImageHeight + 7;
        ensureSpace(rowHeight);
        const rowY = cursorY;

        row.forEach((thumbnail, columnIndex) => {
          const size = sizes[columnIndex];
          const cellX = MARGIN + columnIndex * (cellWidth + gap);
          const imageX = cellX + (cellWidth - size.width) / 2;
          const imageY = rowY + rowImageHeight - size.height;
          pdf.addImage(thumbnail.data.dataUrl, imageFormat(thumbnail.data.dataUrl), imageX, imageY, size.width, size.height, undefined, 'FAST');
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(...MUTED_COLOR);
          pdf.text(truncateText(pdf, thumbnail.fileName, cellWidth), cellX, rowY + rowImageHeight + 3.2);
        });

        cursorY += rowHeight;
      }

      if (index < evidences.length - 1) {
        ensureSpace(3);
        pdf.setDrawColor(215, 222, 228);
        pdf.line(MARGIN + 1, cursorY, PAGE_WIDTH - MARGIN - 1, cursorY);
        cursorY += 3;
      }
    }
  } else {
    addParagraph("Aucune piece a conviction n'est enregistree pour ce dossier.");
  }

  addSection('Metadonnees et tracabilite du dossier');
  addFieldRow([
    { label: 'Cree le', value: formatDateTime(criminal.createdAt) },
    { label: 'Derniere modification', value: formatDateTime(criminal.updatedAt) },
  ], 2);
  const createdBy = typeof criminal.createdBy === 'string'
    ? criminal.createdBy
    : criminal.createdBy?.username || [criminal.createdBy?.profile?.firstName, criminal.createdBy?.profile?.lastName].filter(Boolean).join(' ');
  addFieldRow([
    { label: 'Dossier cree par', value: createdBy },
    { label: 'Derniere modification par', value: criminal.updatedBy?.username },
  ], 2);

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED_COLOR);
    pdf.text(`Dossier ${displayValue(criminal.caseNumber || criminal.fileNumber)} - Document confidentiel`, MARGIN, PAGE_HEIGHT - 9);
    pdf.text(`Page ${page} / ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 9, { align: 'right' });
  }

  const safeCaseNumber = (criminal.caseNumber || criminal.fileNumber || criminal.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  pdf.setProperties({
    title: `Dossier criminel ${safeCaseNumber}`,
    subject: `Dossier de ${fullName}`,
    author: 'Securit Afrique Hub',
    creator: 'Securit Afrique Hub',
  });
  return pdf;
}

export function getCriminalPdfFileName(criminal: Criminal) {
  const safeCaseNumber = (criminal.caseNumber || criminal.fileNumber || criminal.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fullName = `${criminal.lastName} ${criminal.firstName}`.trim();
  const safeName = fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `dossier-${safeCaseNumber}-${safeName}.pdf`;
}