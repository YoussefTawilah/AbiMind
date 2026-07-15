/**
 * Client-seitige PDF-Textextraktion mit pdf.js.
 * Gescannte PDFs ohne Textlayer liefern leeren Text → dann Bild-Upload nutzen.
 */

import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export class PdfExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfExtractError';
  }
}

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/** Extrahiert allen Text aus einer PDF-Datei */
export async function extractTextFromPdf(file: File): Promise<string> {
  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new PdfExtractError('PDF zu groß (max. 20 MB).');
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new PdfExtractError('Datei ist keine PDF.');
  }

  const buffer = await file.arrayBuffer();
  let pdf: pdfjsLib.PDFDocumentProxy;

  try {
    pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  } catch {
    throw new PdfExtractError('PDF konnte nicht gelesen werden. Datei beschädigt?');
  }

  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) parts.push(pageText);
  }

  const fullText = parts.join('\n\n').trim();

  if (!fullText) {
    throw new PdfExtractError(
      'Kein Text im PDF gefunden. Vermutlich ein Scan – lade die Seite als Bild (JPG/PNG) hoch.',
    );
  }

  return fullText;
}

/** Liest eine Bilddatei als Base64-String (ohne data:-Prefix) */
export async function readImageAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new PdfExtractError('Nur JPG, PNG oder WebP erlaubt.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new PdfExtractError('Bild zu groß (max. 10 MB).');
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return { base64, mimeType: file.type };
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export const ACCEPTED_UPLOAD_TYPES = '.pdf,.jpg,.jpeg,.png,.webp';
