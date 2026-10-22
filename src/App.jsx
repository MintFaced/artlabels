import { useState } from "react";
import { BANDS, BAND_KEYS, BAND_H_MM, detectBand, resolveBand } from "./bands.js";
import {
  LABEL_W_MM,
  LABEL_H_MM,
  LABELS_PER_PAGE,
  QR_MM,
  QR_RIGHT_MM,
  QR_GAP_MM,
  parseDescription,
  shortUrl,
  qrMatrix,
  buildLabelsPDF,
} from "./pdf.js";

const DEFAULT_LABEL = {
  title: "",
  date: "",
  artist: "",
  description: "",
  price: "",
  url: "",
  band: "auto",
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

// On-screen QR, same grid the PDF draws
const QRPreview = ({ url, style }) => {
  const m = qrMatrix(url);
  if (!m) return null;
  const n = m.length;
  let d = "";
  m.forEach((row, r) => row.forEach((on, c) => { if (on) d += `M${c} ${r}h1v1h-1z`; }));
  return (
    <svg viewBox={`0 0 ${n} ${n}`} style={style} shapeRendering="crispEdges">
      <path d={d} fill="#000" />
    </svg>
  );
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

  // --- PDF Generation (src/pdf.js, jsPDF directly, no canvas) ---

  const generatePDF = () => {
    setGenerating(true);
    try {
      buildLabelsPDF(labels, { showBranding }).save("gallery-labels.pdf");
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
        value={form[key] ?? ""}
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
            {generating ? "generating..." : `export pdf (${Math.ceil(labels.length / LABELS_PER_PAGE)} pg)`}
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
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: resolveBand(label)?.hex || "transparent", border: resolveBand(label) ? "none" : "1px solid #404040" }}
                  title={resolveBand(label) ? `band ${resolveBand(label).name}` : "no band"}
                />
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
            {field("price", "price", "NZD 1,000 / 0.25 eth")}
            {field("url", "url", "mintface.art/10k")}

            <div className="flex items-center gap-3 mt-3">
              <span className="w-24 text-right text-xs opacity-40 shrink-0 uppercase tracking-widest">band</span>
              <div className="flex gap-1 flex-wrap">
                {[
                  { key: "auto", label: `auto${detectBand(form.price) !== "none" ? " · " + detectBand(form.price) : ""}` },
                  ...BAND_KEYS.map((k) => ({ key: k, label: k })),
                  { key: "none", label: "none" },
                ].map((opt) => {
                  const active = (form.band || "auto") === opt.key;
                  const swatch = BANDS[opt.key]?.hex;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setForm({ ...form, band: opt.key })}
                      className={`text-xs px-2 py-1 border flex items-center gap-1 transition-colors ${
                        active ? "border-neutral-300 text-neutral-100" : "border-neutral-800 opacity-50 hover:opacity-80"
                      }`}
                    >
                      {swatch && <span className="w-2 h-2 rounded-full inline-block" style={{ background: swatch }} />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-xs opacity-20 mt-3 mb-6">wrap text in *asterisks* for italic · band auto-picks from price · url adds a QR</div>

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
                {form.url && <div style={{ fontSize: 8, marginTop: 6, fontWeight: 300 }}>{shortUrl(form.url)}</div>}
              </div>
              {form.url && (
                <QRPreview
                  url={form.url}
                  style={{
                    position: "absolute",
                    width: `${(QR_MM / LABEL_W_MM) * 100}%`,
                    right: `${(QR_RIGHT_MM / LABEL_W_MM) * 100}%`,
                    bottom: `${((BAND_H_MM + QR_GAP_MM) / LABEL_H_MM) * 100}%`,
                  }}
                />
              )}
              {(resolveBand(form) || showBranding) && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: `${(BAND_H_MM / LABEL_H_MM) * 100}%`,
                    background: resolveBand(form)?.hex || "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 8,
                  }}
                >
                  {showBranding && (
                    <span style={{ fontFamily: "Helvetica, Arial, sans-serif", color: "#000", fontWeight: "bold", fontSize: 13 }}>THE LINE</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
