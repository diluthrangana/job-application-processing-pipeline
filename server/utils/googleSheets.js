const { google } = require('googleapis');

const authenticateGoogleSheets = async () => {
  try {
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

const formatArrayData = (arr, keyFields) => {
  if (!arr || arr.length === 0) return '';
  
  return arr.map(item => {
    if (typeof item === 'object') {
      return keyFields.map(key => item[key] || '').filter(val => val).join(': ');
    }
    return item;
  }).join(' | ');
};

const formatQualifications = (qualifications) => {
  if (!qualifications || qualifications.length === 0) return '';
  
  return qualifications.map(qual => {
    if (qual.name && qual.details) {
      return `${qual.name}: ${qual.details}`;
    }
    return qual.name || qual.details || '';
  }).join(' | ');
};

exports.storeApplicationData = async (applicationData) => {
  try {
    const sheets = await authenticateGoogleSheets();
    let spreadsheetId = process.env.GOOGLE_SHEET_ID;
   
    if (!spreadsheetId) {
      spreadsheetId = await createApplicationSheet(sheets);
      console.log(`New spreadsheet created with ID: ${spreadsheetId}`);
    }
   
    const educationFormatted = formatArrayData(
      applicationData.education, 
      ['institution', 'degree', 'year']
    );
    
    const qualificationsFormatted = formatQualifications(applicationData.qualifications);
    
    const projectsFormatted = formatArrayData(
      applicationData.projects, 
      ['name', 'description', 'technologies']
    );
   
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

const createApplicationSheet = async (sheets) => {
  try {
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
   
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1:I1',
      valueInputOption: 'RAW',
      resource: {
        values: [['Name', 'Email', 'Phone', 'Education', 'Qualifications', 'Projects', 'CV Link', 'Submission Time', 'Status']]
      }
    });
   
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