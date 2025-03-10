const { bucket } = require('../config/firebase');
const { extractDataFromCV } = require('../utils/cvParser');
const { storeApplicationData } = require('../utils/googleSheets');
const { sendWebhook } = require('../utils/webhook');
const { scheduleFollowUpEmail } = require('../utils/emailScheduler');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

exports.submitApplication = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const cvFile = req.file;
    
    if (!cvFile) {
      return res.status(400).json({ error: 'CV file is required' });
    }
    
    const fileExtension = path.extname(cvFile.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = `cvs/${fileName}`;
    
    const file = bucket.file(filePath);
    const fileStream = file.createWriteStream({
      metadata: {
        contentType: cvFile.mimetype,
      },
    });
    
    fileStream.on('error', (error) => {
      console.error('Error uploading file:', error);
      return res.status(500).json({ error: 'Failed to upload CV' });
    });
    
    fileStream.on('finish', async () => {
      try {
        await file.makePublic();
        
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        
        const cvData = await extractDataFromCV(cvFile.buffer, fileExtension);
        
        const applicationData = {
          personal_info: {
            name: name || cvData.personal_info.name,
            email: email || cvData.personal_info.email,
            phone: phone || cvData.personal_info.phone,
          },
          education: cvData.education,
          qualifications: cvData.qualifications,
          projects: cvData.projects,
          cv_public_link: publicUrl,
          status: "submitted",
          created_at: new Date().toISOString(),
          processed_at: new Date().toISOString()
        };
        
        const sheetResult = await storeApplicationData(applicationData);
        
        const webhookPayload = {
          cv_data: {
            personal_info: applicationData.personal_info,
            education: applicationData.education,
            qualifications: applicationData.qualifications,
            projects: applicationData.projects,
            cv_public_link: publicUrl
          },
          metadata: {
            applicant_name: applicationData.personal_info.name,
            email: applicationData.personal_info.email,
            status: "testing",
            cv_processed: true,
            processed_timestamp: new Date().toISOString(),
            google_sheet_url: sheetResult.publicUrl
          }
        };
        
        await sendWebhook(webhookPayload);
        
        await scheduleFollowUpEmail(applicationData.personal_info.email, applicationData.personal_info.name);
        
        return res.status(201).json({
          message: 'Application submitted successfully',
          sheetUrl: sheetResult.publicUrl
        });
      } catch (error) {
        console.error('Error processing application:', error);
        return res.status(500).json({ error: 'Failed to process application' });
      }
    });
    
    fileStream.end(cvFile.buffer);
  } catch (error) {
    console.error('Error submitting application:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
