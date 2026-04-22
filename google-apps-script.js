/**
 * Google Apps Script — paste this into https://script.google.com
 * Then deploy as Web App (Execute as: Me, Access: Anyone)
 * Copy the deployment URL into VITE_SCRIPT_URL in .env
 *
 * Sheet: "log infrastruktur"
 * Columns: id_infra | tanggal | sumber | catatan | user | timestamp
 */

const SHEET_ID = '1CFMj0fmiuKtHm8DGS_7zLRkaMbCL33GfkjsK-R9s9gE';
const LOG_SHEET = 'log infrastruktur';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { row } = data;

    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(LOG_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(LOG_SHEET);
      sheet.appendRow(['id_infra', 'tanggal', 'sumber', 'catatan', 'user', 'timestamp']);
    }

    sheet.appendRow([
      row.id_infra ?? '',
      row.tanggal ?? '',
      row.sumber ?? '',
      row.catatan ?? '',
      row.user ?? '',
      row.timestamp ?? new Date().toISOString(),
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Sanitasi.id log endpoint' }))
    .setMimeType(ContentService.MimeType.JSON);
}
