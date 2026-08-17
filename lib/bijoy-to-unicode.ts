/**
 * Bijoy (ASCII / SutonnyMJ-family font) -> Unicode Bengali converter.
 *
 * Bijoy is a legacy, non-Unicode Bengali keyboard/font encoding: the text is
 * really a string of plain ASCII bytes that only LOOK like Bengali when
 * rendered with a Bijoy-compatible font (SutonnyMJ, Sutonny, etc). Unicode
 * Bengali is a completely different, standardized code space. Converting
 * requires two things:
 *   1. Mapping each Bijoy ASCII byte/sequence to its Unicode Bengali glyph.
 *   2. Reordering pre-base vowel signs (ি ে ৈ) which Bijoy stores BEFORE the
 *      consonant (visual order) into Unicode's required logical order
 *      (consonant, then vowel sign).
 *
 * IMPORTANT: exact byte tables differ slightly between Bijoy-family fonts
 * (SutonnyMJ vs Sutonny vs Bijoy Bayanno). The table below covers the
 * standard/common layout and should handle most real question banks, but if
 * you find specific words converting incorrectly, add/fix the single
 * offending entry in BIJOY_MAP below — no other code needs to change.
 * Paste a known-good Bijoy sample + its correct Unicode output and this can
 * be tightened further.
 */

// Bijoy ASCII sequence -> Unicode Bengali. Longer sequences are tried first
// (sorted below) so multi-byte combos win over their shorter prefixes.
const BIJOY_MAP: [string, string][] = [
  // Common pre-built conjuncts / special glyphs
  ["¨¯", "্স্ট"],
  ["ª¨", "র্গ"],
  ["·¨", "ঞ্জ"],
  ["†¨", "েজ্ঞ"],
  ["¯Ù", "স্ত্ব"],
  ["Ø", "ক্স"],
  ["Ù", "ত্ত্ব"],
  ["ª", "র্"], // reph (Bijoy "ª" typed before the consonant cluster)
  ["¨", "্য"], // ya-fola

  // Independent vowels
  ["Av", "আ"],
  ["A", "অ"],
  ["B", "ই"],
  ["C", "ঈ"],
  ["D", "উ"],
  ["E", "ঊ"],
  ["F", "ঋ"],
  ["G", "এ"],
  ["H", "ঐ"],
  ["I", "ও"],
  ["J", "ঔ"],

  // Consonants
  ["K", "ক"],
  ["L", "খ"],
  ["M", "গ"],
  ["N", "ঘ"],
  ["O", "ঙ"],
  ["P", "চ"],
  ["Q", "ছ"],
  ["R", "জ"],
  ["S", "ঝ"],
  ["T", "ঞ"],
  ["U", "ট"],
  ["V", "ঠ"],
  ["W", "ড"],
  ["X", "ঢ"],
  ["Y", "ণ"],
  ["Z", "ত"],
  ["_", "থ"],
  ["`", "দ"],
  ["a", "ধ"],
  ["b", "ন"],
  ["c", "প"],
  ["d", "ফ"],
  ["e", "ব"],
  ["f", "ভ"],
  ["g", "ম"],
  ["h", "য"],
  ["i", "র"],
  ["j", "ল"],
  ["k", "শ"],
  ["l", "ষ"],
  ["m", "স"],
  ["n", "হ"],
  ["o", "ড়"],
  ["p", "ঢ়"],
  ["q", "য়"],
  ["r", "ৎ"],

  // Vowel signs (kar)
  ["v", "া"],
  ["w", "ি"], // typed BEFORE the consonant — reordered below
  ["x", "ী"],
  ["y", "ু"],
  ["z", "ূ"],
  ["„", "ৃ"],
  ["†", "ে"], // typed BEFORE the consonant — reordered below
  ["‡", "ৈ"], // typed BEFORE the consonant — reordered below
  ["ˆ", "ো"],
  ["‰", "ৌ"],

  // Signs
  ["s", "ং"],
  ["t", "ঃ"],
  ["u", "ঁ"],
  ["&", "্"],

  // Digits
  ["0", "০"],
  ["1", "১"],
  ["2", "২"],
  ["3", "৩"],
  ["4", "৪"],
  ["5", "৫"],
  ["6", "৬"],
  ["7", "৭"],
  ["8", "৮"],
  ["9", "৯"],

  // Punctuation commonly re-typed on Bijoy layouts
  [".", "।"],
]

export function bijoyToUnicode(input: string): string {
  if (!input) return input

  // 1) Substitute Bijoy bytes for Unicode glyphs, longest match first.
  const sorted = [...BIJOY_MAP].sort((a, b) => b[0].length - a[0].length)
  let output = ""
  outer: for (let i = 0; i < input.length; ) {
    for (const [from, to] of sorted) {
      if (from.length && input.startsWith(from, i)) {
        output += to
        i += from.length
        continue outer
      }
    }
    output += input[i]
    i += 1
  }

  // 2) Fix pre-base vowel sign order (ি / ে / ৈ before consonant -> after it).
  let prev
  do {
    prev = output
    output = output.replace(/([িেৈ])([\u0995-\u09B9\u09DC-\u09DF])/g, "$2$1")
  } while (output !== prev)

  return output
}

/**
 * Recursively converts every string value inside a plain object/array —
 * handy for running the converter over an entire uploaded questions JSON
 * (question text, all four options, explanation, uddipok) in one pass.
 */
export function bijoyToUnicodeDeep<T>(value: T): T {
  if (typeof value === "string") {
    return bijoyToUnicode(value) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => bijoyToUnicodeDeep(v)) as unknown as T
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = bijoyToUnicodeDeep(val)
    }
    return result as T
  }
  return value
}
