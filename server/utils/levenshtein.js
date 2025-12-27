/**
 * Calculate the Levenshtein distance between two strings.
 * This measures how many single-character edits (insertions, deletions, substitutions)
 * are needed to change one string into the other.
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} The edit distance between the two strings
 */
export function levenshteinDistance(str1, str2) {
  if (!str1) return str2 ? str2.length : 0;
  if (!str2) return str1.length;

  const len1 = str1.length;
  const len2 = str2.length;

  // Create a matrix to store distances
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  // Initialize first column
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }

  // Initialize first row
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

export default levenshteinDistance;
