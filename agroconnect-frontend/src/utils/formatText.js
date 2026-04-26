/**
 * Professional Display Formatter for AgroConnect
 * 
 * Safely formats normalized lowercase strings for UI display.
 * - Capitalizes standard words.
 * - Converts specific keywords (APMC, UP, MSP, etc.) to all-caps.
 * - Preserves spacing and punctuation.
 * - Prevents mutations to underlying data.
 */

export const formatDisplayText = (text) => {
  if (!text || typeof text !== 'string') return text || "";

  // List of keywords that should always be in ALL CAPS
  const upperCaseKeywords = [
    "APMC", "MSP", "FCI", "UP", "HP", "AP", "MP", "UK", "PB", "RJ", "GJ", "MH", "KA", "TN", "KL", "TS", "BR", "JH", "OD", "WB", "AS"
  ];

  return text
    .split(/\s+/) // Split by any whitespace
    .map((word) => {
      if (!word) return "";

      // Remove punctuation for comparison (e.g., "apmc," -> "apmc")
      const cleanWord = word.replace(/[^a-zA-Z]/g, "").toUpperCase();

      if (upperCaseKeywords.includes(cleanWord)) {
        return word.toUpperCase();
      }

      // Handle standard capitalization (First letter upper, rest lower)
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};
