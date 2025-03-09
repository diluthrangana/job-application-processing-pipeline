const { google } = require('googleapis');

// Initialize Google Sheets client using credentials from environment variables
const authenticateGoogleSheets = async () => {
  try {
    // Parse the credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });
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
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID environment variable is not set');
    }
    
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
    const drive = google.drive({ 
      version: 'v3', 
      auth: sheets.context._options.auth 
    });
    
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
    // Using Drive API for permission management
    await drive.permissions.create({
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