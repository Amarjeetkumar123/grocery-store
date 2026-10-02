// Splits CSV text (as saved by Excel or Google Sheets) into rows of cells.
// Handles quoted cells containing commas, line breaks and doubled quotes,
// Windows line endings and the invisible marker Excel adds at the start.
export function parseCsv(text) {
  const source = text.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let insideQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (insideQuotes) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') insideQuotes = false;
      else cell += character;
    } else if (character === '"') insideQuotes = true;
    else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += character;
  }
  if (insideQuotes) throw new Error('A quote mark (") is opened but never closed.');
  if (cell !== '' || row.length > 0) rows.push([...row, cell]);
  return rows.filter((cells) => cells.some((value) => value.trim() !== ''));
}
