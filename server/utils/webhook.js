// server/utils/webhook.js
const axios = require('axios');

exports.sendWebhook = async (payload) => {
  try {
    const webhookUrl = 'https://rnd-assignment.automations-3d6.workers.dev/';
    
    const candidateEmail = process.env.CANDIDATE_EMAIL || 'your-email@example.com';
    
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Candidate-Email': candidateEmail
      }
    });
    
    console.log('Webhook sent successfully:', response.status);
    return response.data;
  } catch (error) {
    console.error('Error sending webhook:', error);
    throw error;
  }
};