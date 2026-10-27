/**
 * Kitchen Inbox - receives items from the Alexa skill and adds them as rows.
 * Standalone Apps Script project (script.google.com) deployed as a Web app
 * (Execute as: Me, Who has access: Anyone). The token stops anyone else adding rows.
 */
const SHEET_ID = '__SHEET_ID__';
const TOKEN = '__TOKEN__';

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return reply({ ok: false, error: 'bad json' });
  }
  if (body.token !== TOKEN) return reply({ ok: false, error: 'bad token' });

  let item = String(body.item || '').trim().slice(0, 500);
  if (!item) return reply({ ok: false, error: 'empty item' });
  // Keep the sheet from treating spoken text as a formula.
  if (/^[=+\-@]/.test(item)) item = "'" + item;

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  sheet.appendRow([new Date(), item, 'new', '']);
  return reply({ ok: true });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
