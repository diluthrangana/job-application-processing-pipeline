// server/utils/emailScheduler.js
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to send follow-up email
const sendFollowUpEmail = async (to, name) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: 'Your Job Application: CV Under Review',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${name},</h2>
          <p>Thank you for applying to our position. We wanted to let you know that your CV is currently under review by our team.</p>
          <p>We appreciate your interest in our company and will get back to you regarding the next steps in the application process.</p>
          <p>If you have any questions in the meantime, please don't hesitate to contact us.</p>
          <p>Best regards,<br>Recruitment Team</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Follow-up email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending follow-up email:', error);
    throw error;
  }
};

// Function to schedule follow-up email for the next day based on timezone
exports.scheduleFollowUpEmail = async (email, name) => {
  try {
    // Get applicant's timezone (can be enhanced with timezone detection API)
    // For now, we'll assume a default timezone of UTC+0
    const timezone = 'UTC';
    
    // Schedule email for the next day at 10:00 AM in the applicant's timezone
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const job = schedule.scheduleJob(tomorrow, async () => {
      await sendFollowUpEmail(email, name);
    });
    
    console.log(`Follow-up email scheduled for ${tomorrow.toISOString()} (${timezone})`);
    return true;
  } catch (error) {
    console.error('Error scheduling follow-up email:', error);
    throw error;
  }
};