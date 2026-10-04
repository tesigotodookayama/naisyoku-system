import { google } from 'googleapis';

/**
 * Google Sheets API Integration Library
 * This library handles the connection to Google Sheets used as a database.
 * Authentication is performed using a Service Account.
 */

export interface SheetRow {
  [key: string]: string | number | boolean;
}

// Environment variables check
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * Create an authenticated Google Sheets client.
 */
async function getSheetsClient() {
  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new Error('Google Service Account credentials are missing. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.');
  }

  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: SCOPES,
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Fetch all data from a specific sheet.
 * Assumes the first row contains headers.
 */
export async function getSheetData(sheetName: string): Promise<SheetRow[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const data = rows.slice(1).map((row) => {
      const obj: SheetRow = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    return data;
  } catch (error) {
    console.error(`Error fetching data from sheet ${sheetName}:`, error);
    return [];
  }
}

/**
 * Append a new row to a specific sheet.
 */
export async function appendSheetRow(sheetName: string, row: SheetRow): Promise<void> {
  try {
    const sheets = await getSheetsClient();
    
    // First, get headers to ensure order
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A1:Z1`,
    });

    const headers = response.data.values?.[0] || [];
    const values = headers.map((header: string) => row[header] || '');

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });
  } catch (error) {
    console.error(`Error appending row to sheet ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Update an existing row in a specific sheet.
 * Note: rowIndex is 1-indexed (matching the sheet row number).
 */
export async function updateSheetRow(sheetName: string, rowIndex: number, row: SheetRow): Promise<void> {
  try {
    const sheets = await getSheetsClient();
    
    // Get headers to ensure order
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A1:Z1`,
    });

    const headers = response.data.values?.[0] || [];
    const values = headers.map((header: string) => row[header] || '');

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });
  } catch (error) {
    console.error(`Error updating row ${rowIndex} in sheet ${sheetName}:`, error);
    throw error;
  }
}
