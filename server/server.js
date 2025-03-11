require('dotenv').config();
const express = require('express');
const cors = require('cors');
const applicationRoutes = require('./routes/applications');
const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS to specifically allow requests from your frontend
const corsOptions = {
  origin: 'https://job-application-processing-pipeline.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/applications', applicationRoutes);

app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});