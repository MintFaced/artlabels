import { useState, useRef } from "react";
import { jsPDF } from "jspdf";

const DEFAULT_LABEL = {
  title: "",
  date: "",
  artist: "",
  description: "",
  price: "",
};

const SAMPLE_LABELS = [
  {
    title: "On The Brightside",
    date: "3 Feb 2026",
    artist: "MintFace",
    description: "Paint on acrylic, 120 x 80cm — *Artificial Flowers 1/1 on Ethereum*",
    price: "NZD 6,000 / 1 eth",
  },
  {
    title: "Neon Pastoral",
    date: "10 Feb 2026",
    artist: "MintFace",
    description: "Oil on canvas, 90 x 60cm — *Digital Garden 1/1 on Tezos*",
    price: "NZD 4,500 / 0.75 eth",
  },
];

// Label dimensions in mm (at 300dpi: 1181x827px → ~100x70mm)
const LABEL_W_MM = 100;
const LABEL_H_MM = 70;
const COLS = 3;
const ROWS = 6;
const LABELS_PER_PAGE = COLS * ROWS;
// A3 dimensions in mm
const A3_W = 297;
const A3_H = 420;

const parseDescription = (text) => {
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

export default function App() {
  const [labels, setLabels] = useState(SAMPLE_LABELS);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_LABEL });
  const [generating, setGenerating] = useState(false);
  const [showBranding, setShowBranding] = useState(true);

  const startEdit = (index) => {
    setForm({ ...labels[index] });
    setEditing(index);
  };

  const startNew = () => {
    setForm({ ...DEFAULT_LABEL });
    setEditing("new");
  };

  const save = () => {
    if (editing === "new") {
      setLabels([...labels, { ...form }]);
    } else {
      const updated = [...labels];
      updated[editing] = { ...form };
      setLabels(updated);
    }
    setEditing(null);
  };

  const remove = (index) => {
    setLabels(labels.filter((_, i) => i !== index));
    if (editing === index) setEditing(null);
  };

  const duplicate = (index) => {
    const copy = { ...labels[index] };
    setLabels([...labels.slice(0, index + 1), copy, ...labels.slice(index + 1)]);
  };

  // --- PDF Generation using jsPDF directly (no canvas) ---

  const drawLabelPDF = (doc, label, x, y) => {
    const leftMargin = x + 8;
    const topStart = y + 14;

    // Line 1: Title — Bold 16pt
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(label.title, leftMargin, topStart);

    // Line 2: Date — Regular 12pt (tight)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(label.date, leftMargin, topStart + 6);

    // Line 3: Artist — Bold 12pt (tight)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(label.artist, leftMargin, topStart + 11);

    // Line 4: Description — 6pt with italic support
    const descY = topStart + 20;
    doc.setFontSize(6);
    const parts = parseDescription(label.description);
    let cursorX = leftMargin;
    parts.forEach((part) => {
      doc.setFont("helvetica", part.italic ? "oblique" : "normal");
      doc.text(part.text, cursorX, descY);
      cursorX += doc.getTextWidth(part.text);
    });

    // Line 5: Price — 6pt
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(label.price, leftMargin, descY + 5);

    // THE LINE branding — bottom right
    if (showBranding) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("THE LINE", x + LABEL_W_MM - 4, y + LABEL_H_MM - 4, { align: "right" });
    }
  };

  const generatePDF = () => {
    setGenerating(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a3",
      });

      const totalPages = Math.ceil(labels.length / LABELS_PER_PAGE);

      // Center the grid on the page
      const gridW = COLS * LABEL_W_MM;
      const gridH = ROWS * LABEL_H_MM;
      const offsetX = (A3_W - gridW) / 2;
      const offsetY = (A3_H - gridH) / 2;

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) doc.addPage("a3", "portrait");

        // Draw dotted cut lines
        doc.setDrawColor(200, 200, 200);
        doc.setLineDashPattern([1, 1], 0);
        doc.setLineWidth(0.2);

        // Vertical lines
        for (let c = 0; c <= COLS; c++) {
          const lx = offsetX + c * LABEL_W_MM;
          doc.line(lx, offsetY, lx, offsetY + gridH);
        }
        // Horizontal lines
        for (let r = 0; r <= ROWS; r++) {
          const ly = offsetY + r * LABEL_H_MM;
          doc.line(offsetX, ly, offsetX + gridW, ly);
        }

        doc.setLineDashPattern([], 0);

        // Draw labels
        const startIdx = page * LABELS_PER_PAGE;
        for (let i = 0; i < LABELS_PER_PAGE; i++) {
          const li = startIdx + i;
          if (li >= labels.length) break;
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const lx = offsetX + col * LABEL_W_MM;
          const ly = offsetY + row * LABEL_H_MM;
          drawLabelPDF(doc, labels[li], lx, ly);
        }
      }

      doc.save("gallery-labels.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed: " + err.message);
    }

    setGenerating(false);
  };

  const field = (key, label, placeholder) => (
    <div className="flex items-center gap-3 mb-1">
      <span className="w-24 text-right text-xs opacity-40 shrink-0 uppercase tracking-widest">{label}</span>
      <input
        className="flex-1 bg-transparent border-b border-neutral-700 text-neutral-100 text-sm py-1 px-0 outline-none focus:border-neutral-400 transition-colors"
        style={{ fontFamily: "'Space Mono', 'Courier New', monospace" }}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300" style={{ fontFamily: "'Space Mono', 'Courier New', monospace" }}>
      {/* Header */}
      <div className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-xs tracking-widest uppercase opacity-40">THE LINE</span>
          <span className="text-xs opacity-20 ml-3">/ label generator</span>
        </div>
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-2 cursor-pointer text-xs opacity-40 hover:opacity-70 transition-opacity">
            <input
              type="checkbox"
              checked={showBranding}
              onChange={(e) => setShowBranding(e.target.checked)}
              className="accent-neutral-500"
            />
            <span className="uppercase tracking-widest">the line</span>
          </label>
          <button
            onClick={startNew}
            className="text-xs uppercase tracking-widest border border-neutral-700 px-4 py-2 hover:bg-neutral-800 transition-colors"
          >
            + add label
          </button>
          <button
            onClick={generatePDF}
            disabled={labels.length === 0 || generating}
            className="text-xs uppercase tracking-widest border border-neutral-500 text-neutral-100 px-4 py-2 hover:bg-neutral-800 transition-colors disabled:opacity-30"
          >
            {generating ? "generating..." : `export pdf (${Math.ceil(labels.length / 18)} pg)`}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Label List */}
        <div className="flex-1 p-6">
          <div className="text-xs uppercase tracking-widest opacity-30 mb-4">
            {labels.length} label{labels.length !== 1 ? "s" : ""} in collection
          </div>

          {labels.length === 0 && (
            <div className="text-xs opacity-20 py-12 text-center">no labels yet — click + add label to start</div>
          )}

          <div className="space-y-1">
            {labels.map((label, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors border ${
                  editing === i ? "border-neutral-500 bg-neutral-900" : "border-transparent hover:bg-neutral-900/50"
                }`}
                onClick={() => startEdit(i)}
              >
                <span className="text-xs opacity-20 w-6 text-right">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-sm text-neutral-100">{label.title || "Untitled"}</span>
                <span className="text-xs opacity-40">{label.artist}</span>
                <span className="text-xs opacity-25">{label.date}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); duplicate(i); }}
                  className="text-xs opacity-30 hover:opacity-70 px-2"
                  title="Duplicate"
                >
                  dup
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(i); }}
                  className="text-xs opacity-30 hover:opacity-70 text-red-400 px-2"
                  title="Delete"
                >
                  del
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Panel */}
        {editing !== null && (
          <div className="w-96 border-l border-neutral-800 p-6">
            <div className="text-xs uppercase tracking-widest opacity-30 mb-6">
              {editing === "new" ? "new label" : `editing #${String(editing + 1).padStart(2, "0")}`}
            </div>

            {field("title", "title", "On The Brightside")}
            {field("date", "date", "3 Feb 2026")}
            {field("artist", "artist", "MintFace")}
            {field("description", "desc", "Paint on acrylic, 120 x 80cm — *Italic text*")}
            {field("price", "price", "NZD 6,000 / 1 eth")}

            <div className="text-xs opacity-20 mt-3 mb-6">wrap text in *asterisks* for italic</div>

            <div className="flex gap-2">
              <button
                onClick={save}
                className="text-xs uppercase tracking-widest border border-neutral-500 text-neutral-100 px-4 py-2 hover:bg-neutral-800 transition-colors"
              >
                save
              </button>
              <button
                onClick={() => setEditing(null)}
                className="text-xs uppercase tracking-widest opacity-40 px-4 py-2 hover:opacity-70"
              >
                cancel
              </button>
            </div>

            {/* Mini Preview */}
            <div className="mt-8 border border-neutral-800 bg-white p-4 relative" style={{ aspectRatio: "1181/827" }}>
              <div style={{ fontFamily: "Helvetica, Arial, sans-serif", color: "#000", transform: "scale(0.85)", transformOrigin: "top left" }}>
                <div style={{ fontWeight: "bold", fontSize: 18 }}>{form.title || "Title"}</div>
                <div style={{ fontSize: 13, marginTop: 1 }}>{form.date || "Date"}</div>
                <div style={{ fontWeight: "bold", fontSize: 13, marginTop: 1 }}>{form.artist || "Artist"}</div>
                <div style={{ fontSize: 8, marginTop: 14, fontWeight: 300 }}>
                  {parseDescription(form.description || "Description").map((p, j) => (
                    <span key={j} style={{ fontStyle: p.italic ? "italic" : "normal" }}>{p.text}</span>
                  ))}
                </div>
                <div style={{ fontSize: 8, marginTop: 6, fontWeight: 300 }}>{form.price || "Price"}</div>
              </div>
              {showBranding && (
                <div style={{ fontFamily: "Helvetica, Arial, sans-serif", color: "#000", fontWeight: "bold", fontSize: 13, position: "absolute", textAlign: "right", bottom: 6, right: 8 }}>
                  THE LINE
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
