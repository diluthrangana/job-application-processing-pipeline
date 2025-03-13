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
          <p><strong>Note:</strong> This email is being sent after 30 minutes of your submission because limitations with my deployment, as I am currently using a free-tier hosting service that clears data after a short period of time.</p>
          <p>Best regards,<br>Recruitment Team</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Follow-up email sent:', info.messageId);
    if (info.messageId) {
      console.log('Email sent successfully with ID:', info.messageId);
    }
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
    
    const timezone = 'Asia/Colombo';
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const rule = new schedule.RecurrenceRule();
    rule.year = tomorrow.getFullYear();
    rule.month = tomorrow.getMonth();
    rule.date = tomorrow.getDate();
    rule.hour = 10;
    rule.minute = 0;
    rule.tz = timezone;
    
    const job = schedule.scheduleJob(rule, async () => {
      await exports.sendFollowUpEmail(email, name);
    });
    
    const sriLankaTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(tomorrow);
    
    console.log(`Follow-up email scheduled for tomorrow at 10 AM Sri Lanka time: ${sriLankaTime}`);
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
    console.log(`Scheduling email to ${email} to be sent in 30 minutes`);
    
    const timezone = 'Asia/Colombo';
    
    // Calculate time 30 minutes from now
    const thirtyMinutesFromNow = new Date();
    thirtyMinutesFromNow.setMinutes(thirtyMinutesFromNow.getMinutes() + 30);
    
    // Create scheduling rule
    const job = schedule.scheduleJob(thirtyMinutesFromNow, async () => {
      await exports.sendFollowUpEmail(email, name);
      console.log(`Follow-up email sent to ${email} after 30 minute delay`);
    });
    
    // Format the scheduled time for logging
    const scheduledTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(thirtyMinutesFromNow);
    
    console.log(`Email scheduled for: ${scheduledTime}`);
    console.log(`Job scheduled for: ${email}`);
    
    // Store the job in global object to prevent garbage collection
    global.scheduledJobs = global.scheduledJobs || {};
    global.scheduledJobs[email] = job;
    
    // Return confirmation of scheduling
    return {
      success: true,
      message: `Email will be sent to ${email} at ${scheduledTime}`,
      scheduledTime: thirtyMinutesFromNow
    };
  } catch (error) {
    console.error('Error scheduling delayed email:', error);
    throw error;
  }
};
