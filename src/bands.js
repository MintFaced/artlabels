// Price bands: a pastel strip along the bottom of each label so the price tier
// reads from across the room.

export const BANDS = {
  250: { name: "250", hex: "#B5E5C0", rgb: [181, 229, 192] }, // pastel green
  500: { name: "500", hex: "#F8BCD0", rgb: [248, 188, 208] }, // pastel pink
  1000: { name: "1000", hex: "#FCE9A0", rgb: [252, 233, 160] }, // pastel yellow
  1500: { name: "1500", hex: "#D9C8F2", rgb: [217, 200, 242] }, // pastel purple
  3000: { name: "3000", hex: "#DEDEDE", rgb: [222, 222, 222] }, // light grey
};

export const BAND_KEYS = Object.keys(BANDS);

// Height of the strip in mm (label is 100 x 70mm)
export const BAND_H_MM = 10;

// Pull a band out of the free-text price, e.g. "NZD 1,000" or "$500 / 0.125 eth"
export const detectBand = (price = "") => {
  const nums = (price.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => Number(n.replace(/,/g, "")));
  const hit = nums.find((n) => BANDS[n]);
  return hit ? String(hit) : "none";
};

// label.band is "auto" (default), "none", or one of BAND_KEYS
export const resolveBand = (label) => {
  const choice = label.band || "auto";
  const key = choice === "auto" ? detectBand(label.price) : choice;
  return BANDS[key] || null;
};
