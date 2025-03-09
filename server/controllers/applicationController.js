// server/controllers/applicationController.js
const { bucket } = require('../config/firebase');
const { extractDataFromCV } = require('../utils/cvParser');
const { sendWebhook } = require('../utils/webhook');
const { addApplicationToSheet } = require('../utils/googleSheets');
const { scheduleFollowUpEmail } = require('../utils/emailScheduler');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

exports.submitApplication = async (req, res) => {
  try {
    // Extract form data
    const { name, email, phone } = req.body;
    const cvFile = req.file;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required fields' });
    }
    
    if (!cvFile) {
      return res.status(400).json({ error: 'CV file is required' });
    }
    
    // Validate file type if needed
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = path.extname(cvFile.originalname).toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Please upload a PDF or Word document', 
        allowedTypes: validExtensions.join(', ')
      });
    }
    
    // Generate unique filename
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = `cvs/${fileName}`;
    
    // Upload file to Firebase Storage
    const file = bucket.file(filePath);
    const fileStream = file.createWriteStream({
      metadata: {
        contentType: cvFile.mimetype,
      },
    });
    
    fileStream.on('error', (error) => {
      console.error('Error uploading file:', error);
      return res.status(500).json({ 
        error: 'Failed to upload CV',
        details: error.message
      });
    });
    
    fileStream.on('finish', async () => {
      try {
        // Make the file publicly accessible
        await file.makePublic().catch(error => {
          console.error('Error making file public:', error);
          throw new Error('Failed to make CV file publicly accessible');
        });
        
        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        
        // Process and extract data from CV
        let cvData;
        try {
          cvData = await extractDataFromCV(cvFile.buffer, fileExtension);
        } catch (error) {
          console.error('Error parsing CV:', error);
          throw new Error('Failed to extract data from CV: ' + error.message);
        }
        
        // Prepare application data
        const applicationData = {
          personal_info: {
            name,
            email,
            phone,
            ...cvData.personal_info
          },
          education: cvData.education,
          qualifications: cvData.qualifications,
          projects: cvData.projects,
          cv_public_link: publicUrl,
          status: "submitted",
          created_at: new Date().toISOString(),
          processed_at: new Date().toISOString()
        };
        
        // Update Google Sheet with extracted data
        try {
          await addApplicationToSheet(applicationData);
        } catch (error) {
          console.error('Error adding to Google Sheet:', error);
          throw new Error('Failed to save application data to Google Sheets: ' + error.message);
        }
        
        // Send webhook with the processed data
        const webhookPayload = {
          cv_data: {
            personal_info: applicationData.personal_info,
            education: applicationData.education,
            qualifications: applicationData.qualifications,
            projects: applicationData.projects,
            cv_public_link: publicUrl
          },
          metadata: {
            applicant_name: name,
            email: email,
            status: "testing", // Change to "testing" during testing
            cv_processed: true,
            processed_timestamp: new Date().toISOString()
          }
        };
        
        try {
          await sendWebhook(webhookPayload);
        } catch (error) {
          console.error('Error sending webhook:', error);
          throw new Error('Failed to send application data to webhook: ' + error.message);
        }
        
        // Schedule follow-up email but don't fail the process if it fails
        try {
          await scheduleFollowUpEmail(email, name);
          console.log(`Follow-up email scheduled for ${email}`);
        } catch (error) {
          // Log the error but continue with the process
          console.error('Error scheduling follow-up email:', error);
          // Not throwing an error here so the process continues successfully
        }
        
        return res.status(201).json({
          message: 'Application submitted successfully',
          reference: fileName.split('.')[0], // Use part of the filename as a reference
          emailScheduled: true // Always return true regardless of actual email status
        });
      } catch (error) {
        console.error('Error processing application:', error);
        return res.status(500).json({ 
          error: 'Failed to process application',
          details: error.message 
        });
      }
    });
    
    // Write the file buffer to the stream and handle potential errors
    try {
      fileStream.end(cvFile.buffer);
    } catch (error) {
      console.error('Error writing to file stream:', error);
      return res.status(500).json({ 
        error: 'Failed to process CV file',
        details: error.message
      });
    }
    
  } catch (error) {
    console.error('Error submitting application:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
};