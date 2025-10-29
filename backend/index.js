const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config(); // Loads variables from .env
const classifyRoute = require('./routes/classify');

const app = express();

// Always accept CORS (useful for development and deployment)
app.use(cors({ origin: true }));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Mount the /classify endpoint
app.post('/classify', classifyRoute);

// Port from env, fallback 4000
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`✅ Backend running on http://localhost:${PORT} -- MOCK_CLASSIFY=${process.env.MOCK_CLASSIFY}`)
);
