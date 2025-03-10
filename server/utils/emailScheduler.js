const nodemailer = require('nodemailer');
const schedule = require('node-schedule');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

exports.sendFollowUpEmail = async (to, name, immediate = false) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    
    const mailOptions = {
      from: `"Recruitment Team" <${process.env.EMAIL_USER}>`,
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
    console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));
    return true;
  } catch (error) {
    console.error('Error sending follow-up email:', error);
    console.error('Error details:', error.message);
    throw error;
  }
};

exports.scheduleFollowUpEmail = async (email, name) => {
  try {
    if (!email || !name) {
      throw new Error('Email and name are required');
    }
    
    const timezone = 'UTC';
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const job = schedule.scheduleJob(tomorrow, async () => {
      await exports.sendFollowUpEmail(email, name);
    });
    
    console.log(`Follow-up email scheduled for ${tomorrow.toISOString()} (${timezone})`);
    console.log(`Job scheduled for: ${email}`);
    
    global.scheduledJobs = global.scheduledJobs || {};
    global.scheduledJobs[email] = job;
    
    return true;
  } catch (error) {
    console.error('Error scheduling follow-up email:', error);
    throw error;
  }
};

exports.testEmail = async (email, name) => {
  try {
    console.log(`Sending test email to ${email}`);
    return await exports.sendFollowUpEmail(email, name, true);
  } catch (error) {
    console.error('Test email failed:', error);
    throw error;
  }
};
