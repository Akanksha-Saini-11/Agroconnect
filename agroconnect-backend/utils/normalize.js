export const normalizeText = (value) => {
  if (!value) return value;

  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};