const Queue = require('bull');
const nodemailer = require('nodemailer');

// Create a new queue with Redis connection
const emailQueue = new Queue('email-queue', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Helper function to create transporter
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

// Function to send the actual email
const sendFollowUpEmail = async (to, name) => {
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

// Schedule an email for same day at 1:00 PM
exports.scheduleFollowUpEmail = async (email, name) => {
  try {
    if (!email || !name) {
      throw new Error('Email and name are required');
    }
    
    const timezone = 'Asia/Colombo';
    
    // Create a date object for today at 1:00 PM
    const today = new Date();
    today.setHours(13, 0, 0, 0); // Set to 1:00 PM (13:00)
    
    // Check if 1:00 PM has already passed today
    const now = new Date();
    if (now > today) {
      console.log('1:00 PM has already passed for today. Scheduling for tomorrow.');
      today.setDate(today.getDate() + 1); // Schedule for tomorrow if 1:00 PM today has passed
    }
    
    // Calculate delay in milliseconds
    const delay = today.getTime() - now.getTime();
    
    // Format scheduled time for logging
    const scheduledTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(today);
    
    // Add job to queue with delay
    const job = await emailQueue.add(
      {
        email,
        name,
        scheduledFor: today.toISOString()
      },
      {
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000 // 1 minute initial delay, then exponential
        },
        removeOnComplete: false, // Keep completed jobs for history
        removeOnFail: false // Keep failed jobs for debugging
      }
    );
    
    console.log(`Email scheduled with job ID ${job.id} for ${email} at ${scheduledTime}`);
    return { jobId: job.id, scheduledTime };
  } catch (error) {
    console.error('Error scheduling email:', error);
    throw error;
  }
};

// Process the queue
emailQueue.process(async (job) => {
  console.log(`Processing job ${job.id} for ${job.data.email}`);
  const { email, name } = job.data;
  await sendFollowUpEmail(email, name);
  console.log(`Job ${job.id} completed: Email sent to ${email}`);
  return { success: true };
});

// Event handlers for monitoring
emailQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed successfully`);
});

emailQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed for ${job.data.email}:`, error);
});

emailQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

// Setup function to be called when your application starts
exports.setupQueue = () => {
  console.log('Email queue initialized');
  return emailQueue;
};

// Export the sendFollowUpEmail function for direct use
exports.sendFollowUpEmail = sendFollowUpEmail;
