import ExcelJS from 'exceljs';
import { readBinaryFile, readTextFile } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

export async function extractSpreadsheet(filePath, options = {}) {
  const { maxRows = 50, maxCols = 20, maxLength = 25000 } = options;

  logger.debug(`Extracting spreadsheet from: ${filePath}`);

  try {
    if (filePath.endsWith('.csv') || filePath.endsWith('.tsv')) {
      return await extractCsv(filePath, options);
    }

    const buffer = await readBinaryFile(filePath);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheetNames = workbook.worksheets.map(ws => ws.name);
    const sheets = {};
    let totalContent = '';

    // Process up to 3 sheets
    for (const worksheet of workbook.worksheets.slice(0, 3)) {
      const sheetName = worksheet.name;
      const data = [];

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber <= maxRows) {
          // Get cell values, limiting to maxCols
          const rowData = [];
          for (let col = 1; col <= Math.min(row.cellCount, maxCols); col++) {
            const cell = row.getCell(col);
            // Handle different cell value types
            let value = cell.value;
            if (value && typeof value === 'object') {
              // Handle rich text, formulas, dates, etc.
              if (value.richText) {
                value = value.richText.map(rt => rt.text).join('');
              } else if (value.result !== undefined) {
                value = value.result; // Formula result
              } else if (value instanceof Date) {
                value = value.toISOString();
              } else if (value.text) {
                value = value.text; // Hyperlinks
              }
            }
            rowData.push(value);
          }
          data.push(rowData);
        }
      });

      sheets[sheetName] = data;
      totalContent += `Sheet: ${sheetName}\n${JSON.stringify(data, null, 2)}\n\n`;
    }

    if (totalContent.length > maxLength) {
      totalContent = totalContent.substring(0, maxLength);
    }

    return {
      content: totalContent,
      metadata: {
        sheetNames,
        sheetCount: sheetNames.length,
      },
      sheets,
    };
  } catch (error) {
    logger.error(`Spreadsheet extraction failed: ${error.message}`);
    throw error;
  }
}

async function extractCsv(filePath, options = {}) {
  const { maxRows = 50, maxLength = 25000 } = options;

  const content = await readTextFile(filePath);
  const delimiter = filePath.endsWith('.tsv') ? '\t' : ',';

  const lines = content.split('\n').slice(0, maxRows);
  const data = lines.map((line) => line.split(delimiter));

  let result = JSON.stringify(data, null, 2);
  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  return {
    content: result,
    metadata: {
      rows: lines.length,
      delimiter,
    },
  };
}

export default extractSpreadsheet;
