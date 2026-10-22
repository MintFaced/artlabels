// Price bands: a pastel strip along the bottom of each label so the price tier
// reads from across the room.

export const BANDS = {
  100: { name: "100", hex: "#B5E5C0", rgb: [181, 229, 192] }, // pastel green
  250: { name: "250", hex: "#F8BCD0", rgb: [248, 188, 208] }, // pastel pink
  500: { name: "500", hex: "#FCE9A0", rgb: [252, 233, 160] }, // pastel yellow
};

// Height of the strip in mm (label is 100 x 70mm)
export const BAND_H_MM = 10;

// Pull a band out of the free-text price, e.g. "NZD 250" or "$500 / 0.1 eth"
export const detectBand = (price = "") => {
  const nums = (price.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => Number(n.replace(/,/g, "")));
  const hit = nums.find((n) => BANDS[n]);
  return hit ? String(hit) : "none";
};

// label.band is "auto" (default), "none", or "100" / "250" / "500"
export const resolveBand = (label) => {
  const choice = label.band || "auto";
  const key = choice === "auto" ? detectBand(label.price) : choice;
  return BANDS[key] || null;
};
