import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Serve the standalone HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'public', 'standalone-chat.html'));
});

// Proxy API requests to main server
app.use('/api', (req, res) => {
  // Forward the request to the main server
  res.redirect(`http://localhost:5000${req.originalUrl}`);
});

app.listen(PORT, () => {
  console.log(`Standalone server running at http://localhost:${PORT}`);
});