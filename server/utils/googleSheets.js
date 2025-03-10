const { google } = require('googleapis');

// Initialize Google Sheets client
const authenticateGoogleSheets = async () => {
  try {
    // Parse credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    
    // Create auth client using the parsed credentials
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

// Function to format array data into readable string
const formatArrayData = (arr, keyFields) => {
  if (!arr || arr.length === 0) return '';
  
  return arr.map(item => {
    if (typeof item === 'object') {
      // Extract specified keys from object
      return keyFields.map(key => item[key] || '').filter(val => val).join(': ');
    }
    return item;
  }).join(' | ');
};

// Format qualifications specifically
const formatQualifications = (qualifications) => {
  if (!qualifications || qualifications.length === 0) return '';
  
  return qualifications.map(qual => {
    if (qual.name && qual.details) {
      return `${qual.name}: ${qual.details}`;
    }
    return qual.name || qual.details || '';
  }).join(' | ');
};

// Combined function to handle all Google Sheets operations
exports.storeApplicationData = async (applicationData) => {
  try {
    const sheets = await authenticateGoogleSheets();
    let spreadsheetId = process.env.GOOGLE_SHEET_ID;
   
    // Check if spreadsheet exists, create if it doesn't
    if (!spreadsheetId) {
      spreadsheetId = await createApplicationSheet(sheets);
      // Store the spreadsheet ID for future use
      console.log(`New spreadsheet created with ID: ${spreadsheetId}`);
      // In a production app, you would save this ID to environment variables or a config file
    }
   
    // Format education data
    const educationFormatted = formatArrayData(
      applicationData.education, 
      ['institution', 'degree', 'year']
    );
    
    // Format qualifications data
    const qualificationsFormatted = formatQualifications(applicationData.qualifications);
    
    // Format projects data
    const projectsFormatted = formatArrayData(
      applicationData.projects, 
      ['name', 'description', 'technologies']
    );
   
    // Format data for sheet
    const rowData = [
      applicationData.personal_info.name || '',
      applicationData.personal_info.email || '',
      applicationData.personal_info.phone || '',
      educationFormatted,
      qualificationsFormatted,
      projectsFormatted,
      applicationData.cv_public_link || '',
      new Date().toISOString(),
      applicationData.status || 'submitted'
    ];
   
    // Append data to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:I',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData]
      }
    });
   
    console.log('Application data added to Google Sheet');
   
    return {
      success: true,
      spreadsheetId,
      publicUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`
    };
  } catch (error) {
    console.error('Error storing data in Google Sheets:', error);
    throw error;
  }
};

// Helper function to create a new application sheet
const createApplicationSheet = async (sheets) => {
  try {
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
                columnCount: 9
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
      range: 'Sheet1!A1:I1',
      valueInputOption: 'RAW',
      resource: {
        values: [['Name', 'Email', 'Phone', 'Education', 'Qualifications', 'Projects', 'CV Link', 'Submission Time', 'Status']]
      }
    });
   
    // Make the sheet public (anyone with the link can view)
    const auth = sheets.context._options.auth;
    const drive = google.drive({ version: 'v3', auth });
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