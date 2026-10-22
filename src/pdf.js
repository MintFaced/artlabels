import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { BAND_H_MM, resolveBand } from "./bands.js";

// Label dimensions in mm (at 300dpi: 1181x827px → ~100x70mm)
export const LABEL_W_MM = 100;
export const LABEL_H_MM = 70;
export const COLS = 3;
export const ROWS = 6;
export const LABELS_PER_PAGE = COLS * ROWS;
// A3 dimensions in mm
const A3_W = 297;
const A3_H = 420;

// QR sits bottom right, just above the band
export const QR_MM = 18;
export const QR_RIGHT_MM = 6;
export const QR_GAP_MM = 3; // gap between QR and band

const TITLE_MAX_W = LABEL_W_MM - 16;

export const parseDescription = (text = "") => {
  const parts = [];
  const regex = /\*([^*]+)\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), italic: false });
    }
    parts.push({ text: match[1], italic: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), italic: false });
  }
  return parts;
};

// What prints on the label: no scheme, no www, no trailing slash
export const shortUrl = (url = "") =>
  url.trim().replace(/^[a-z]+:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");

// What the QR opens: always a full https URL
export const fullUrl = (url = "") => {
  const u = url.trim();
  if (!u) return "";
  return /^[a-z]+:\/\//i.test(u) ? u : `https://${u}`;
};

// QR as a square boolean grid
export const qrMatrix = (url) => {
  const target = fullUrl(url);
  if (!target) return null;
  const { modules } = QRCode.create(target, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const rows = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) row.push(Boolean(modules.data[r * n + c]));
    rows.push(row);
  }
  return rows;
};

// Vector QR: one rect per horizontal run of dark modules
const drawQR = (doc, url, x, y, size) => {
  const m = qrMatrix(url);
  if (!m) return;
  const cell = size / m.length;
  doc.setFillColor(0, 0, 0);
  m.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (!row[c]) { c++; continue; }
      let run = 1;
      while (c + run < row.length && row[c + run]) run++;
      // tiny overlap so runs don't show hairline seams when printed
      doc.rect(x + c * cell, y + r * cell, run * cell + 0.01, cell + 0.01, "F");
      c += run;
    }
  });
};

export const drawLabelPDF = (doc, label, x, y, { showBranding = true } = {}) => {
  const leftMargin = x + 8;
  const topStart = y + 14;

  // Line 1: Title — Bold 16pt, shrinks to fit long titles
  doc.setFont("helvetica", "bold");
  let titleSize = 16;
  doc.setFontSize(titleSize);
  while (titleSize > 10 && doc.getTextWidth(label.title || "") > TITLE_MAX_W) {
    titleSize -= 0.5;
    doc.setFontSize(titleSize);
  }
  doc.text(label.title || "", leftMargin, topStart);

  // Line 2: Date — Regular 12pt (tight)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(label.date || "", leftMargin, topStart + 6);

  // Line 3: Artist — Bold 12pt (tight)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(label.artist || "", leftMargin, topStart + 11);

  // Line 4: Description — 6pt with italic support
  const descY = topStart + 20;
  doc.setFontSize(6);
  let cursorX = leftMargin;
  parseDescription(label.description).forEach((part) => {
    doc.setFont("helvetica", part.italic ? "italic" : "normal");
    doc.text(part.text, cursorX, descY);
    cursorX += doc.getTextWidth(part.text);
  });

  // Line 5: Price — 6pt
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(label.price || "", leftMargin, descY + 5);

  // Line 6: URL — 6pt, plus QR bottom right
  if (label.url) {
    doc.text(shortUrl(label.url), leftMargin, descY + 10);
    drawQR(
      doc,
      label.url,
      x + LABEL_W_MM - QR_RIGHT_MM - QR_MM,
      y + LABEL_H_MM - BAND_H_MM - QR_GAP_MM - QR_MM,
      QR_MM
    );
  }

  // Price band — pastel strip across the bottom
  const band = resolveBand(label);
  if (band) {
    doc.setFillColor(...band.rgb);
    doc.rect(x, y + LABEL_H_MM - BAND_H_MM, LABEL_W_MM, BAND_H_MM, "F");
  }

  // THE LINE branding — bottom right, centred in the strip
  if (showBranding) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("THE LINE", x + LABEL_W_MM - 4, y + LABEL_H_MM - BAND_H_MM / 2 + 1.5, { align: "right" });
  }
};

export const buildLabelsPDF = (labels, opts = {}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a3" });
  const totalPages = Math.ceil(labels.length / LABELS_PER_PAGE);

  // Center the grid on the page
  const gridW = COLS * LABEL_W_MM;
  const gridH = ROWS * LABEL_H_MM;
  const offsetX = (A3_W - gridW) / 2;
  const offsetY = (A3_H - gridH) / 2;

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage("a3", "portrait");

    // Draw labels
    const startIdx = page * LABELS_PER_PAGE;
    for (let i = 0; i < LABELS_PER_PAGE; i++) {
      const li = startIdx + i;
      if (li >= labels.length) break;
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      drawLabelPDF(doc, labels[li], offsetX + col * LABEL_W_MM, offsetY + row * LABEL_H_MM, opts);
    }

    // Draw dotted cut lines (on top of the bands)
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.2);
    for (let c = 0; c <= COLS; c++) {
      const lx = offsetX + c * LABEL_W_MM;
      doc.line(lx, offsetY, lx, offsetY + gridH);
    }
    for (let r = 0; r <= ROWS; r++) {
      const ly = offsetY + r * LABEL_H_MM;
      doc.line(offsetX, ly, offsetX + gridW, ly);
    }
    doc.setLineDashPattern([], 0);
  }

  return doc;
};
