// server/utils/googleSheets.js
const { google } = require('googleapis');
const path = require('path');

// Initialize Google Sheets client
const authenticateGoogleSheets = async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../config/google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    return sheets;
  } catch (error) {
    console.error('Error authenticating with Google Sheets:', error);
    throw error;
  }
};

// Add application data to Google Sheet
exports.addApplicationToSheet = async (applicationData) => {
  try {
    const sheets = await authenticateGoogleSheets();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    // Format data for sheet
    const rowData = [
      applicationData.personal_info.name || '',
      applicationData.personal_info.email || '',
      applicationData.personal_info.phone || '',
      JSON.stringify(applicationData.education) || '',
      JSON.stringify(applicationData.qualifications) || '',
      JSON.stringify(applicationData.projects) || '',
      applicationData.cv_public_link || '',
      new Date().toISOString()
    ];
    
    // Append data to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:H',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData]
      }
    });
    
    console.log('Application data added to Google Sheet');
    return true;
  } catch (error) {
    console.error('Error adding to Google Sheet:', error);
    throw error;
  }
};

// Create Google Sheet if it doesn't exist
exports.createSheet = async () => {
  try {
    const sheets = await authenticateGoogleSheets();
    
    // Create a new spreadsheet
    const response = await sheets.spreadsheets.create({
      resource: {
        properties: {
          title: 'Job Applications'
        },
        sheets: [
          {
            properties: {
              title: 'Sheet1',
              gridProperties: {
                rowCount: 1000,
                columnCount: 8
              }
            }
          }
        ]
      }
    });
    
    const spreadsheetId = response.data.spreadsheetId;
    
    // Add headers to the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1:H1',
      valueInputOption: 'RAW',
      resource: {
        values: [['Name', 'Email', 'Phone', 'Education', 'Qualifications', 'Projects', 'CV Link', 'Submission Time']]
      }
    });
    
    // Make the sheet public (anyone with the link can view)
    await sheets.permissions.create({
      fileId: spreadsheetId,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    console.log(`Created Google Sheet with ID: ${spreadsheetId}`);
    console.log(`Public URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`);
    
    return spreadsheetId;
  } catch (error) {
    console.error('Error creating Google Sheet:', error);
    throw error;
  }
};