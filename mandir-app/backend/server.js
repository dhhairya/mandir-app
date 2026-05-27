/**
 * Mandir Receipt Generator — Backend Server
 * Stack: Node.js + Express + JSON file storage
 * Run: node server.js
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// ─── File Storage Setup ────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const RECEIPTS_FILE = path.join(DATA_DIR, 'receipts.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Create directories if they don't exist
[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Create receipts file if it doesn't exist
if (!fs.existsSync(RECEIPTS_FILE)) {
  fs.writeFileSync(RECEIPTS_FILE, JSON.stringify({ receipts: [], counter: 1 }));
}

// ─── Multer (image upload) ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `template-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPG/PNG/WEBP allowed'));
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
function readData() {
  try {
    return JSON.parse(fs.readFileSync(RECEIPTS_FILE, 'utf8'));
  } catch {
    return { receipts: [], counter: 1 };
  }
}

function writeData(data) {
  fs.writeFileSync(RECEIPTS_FILE, JSON.stringify(data, null, 2));
}

function toWords(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n === 0) return 'Zero';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
  if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
  if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '');
  return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '');
}

// ─── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mandir Receipt API running', timestamp: new Date().toISOString() });
});

/**
 * POST /api/scan-template
 * Upload a receipt image → AI detects fields via Anthropic API
 * Body: multipart/form-data with field "template" (image file)
 */
app.post('/api/scan-template', upload.single('template'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const apiKey = req.headers['x-api-key'] || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Anthropic API key required. Pass as X-API-Key header or set ANTHROPIC_API_KEY in .env' });

  try {
    const imageData = fs.readFileSync(req.file.path).toString('base64');
    const mimeType = req.file.mimetype;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageData } },
            {
              type: 'text',
              text: `This is a physical receipt template from a Hindu mandir (temple).
Detect all fillable fields. Return ONLY a JSON array, no markdown, no backticks.
Each object must have:
- "key": camelCase identifier (e.g. donorName, amount, phone)
- "label_en": English label
- "label_hi": Hindi label
- "type": one of text / number / tel / date / textarea / select
- "options": string array only if type is select
- "required": true or false
Always include donorName, phone, address, amount, receiptNo, date, paymentMode, donationType if visible.`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.content.map(c => c.text || '').join('').trim();
    const fields = JSON.parse(raw.replace(/```json|```/g, '').trim());

    // Clean up uploaded file after processing
    fs.unlinkSync(req.file.path);

    res.json({ success: true, fields });
  } catch (err) {
    res.status(500).json({ error: 'AI scan failed: ' + err.message });
  }
});

/**
 * GET /api/receipts
 * Fetch all receipts with optional filters
 * Query params: type (donation|membership), from (YYYY-MM-DD), to (YYYY-MM-DD)
 */
app.get('/api/receipts', (req, res) => {
  const { type, from, to } = req.query;
  const data = readData();
  let receipts = [...data.receipts];

  if (type && type !== 'all') receipts = receipts.filter(r => r.type === type);
  if (from) receipts = receipts.filter(r => r.date >= from);
  if (to) receipts = receipts.filter(r => r.date <= to);

  const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);

  res.json({
    success: true,
    count: receipts.length,
    totalAmount,
    receipts
  });
});

/**
 * GET /api/receipts/stats
 * Summary statistics
 */
app.get('/api/receipts/stats', (req, res) => {
  const data = readData();
  const all = data.receipts;
  res.json({
    success: true,
    stats: {
      total: all.length,
      totalAmount: all.reduce((s, r) => s + r.amount, 0),
      donations: all.filter(r => r.type === 'donation').length,
      donationAmount: all.filter(r => r.type === 'donation').reduce((s, r) => s + r.amount, 0),
      memberships: all.filter(r => r.type === 'membership').length,
      membershipAmount: all.filter(r => r.type === 'membership').reduce((s, r) => s + r.amount, 0),
    }
  });
});

/**
 * POST /api/receipts
 * Save a new receipt
 * Body: { donorName, phone, address, amount, type, paymentMode, date, extraFields }
 */
app.post('/api/receipts', (req, res) => {
  const { donorName, phone, address, amount, type, paymentMode, date, extraFields } = req.body;

  if (!donorName || !amount) {
    return res.status(400).json({ error: 'donorName and amount are required' });
  }
  if (!['donation', 'membership'].includes(type)) {
    return res.status(400).json({ error: 'type must be "donation" or "membership"' });
  }

  const data = readData();
  const receiptNo = String(data.counter).padStart(3, '0');
  data.counter += 1;

  const receipt = {
    id: Date.now(),
    receiptNo,
    date: date || new Date().toISOString().split('T')[0],
    donorName: donorName.trim(),
    phone: phone || '',
    address: address || '',
    amount: Math.round(Number(amount)),
    amountInWords: toWords(Math.round(Number(amount))) + ' Rupees Only',
    type,
    paymentMode: paymentMode || 'Cash',
    extraFields: extraFields || {},
    createdAt: new Date().toISOString()
  };

  data.receipts.unshift(receipt);
  writeData(data);

  res.status(201).json({ success: true, receipt });
});

/**
 * DELETE /api/receipts/:id
 * Delete a receipt by ID
 */
app.delete('/api/receipts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readData();
  const before = data.receipts.length;
  data.receipts = data.receipts.filter(r => r.id !== id);

  if (data.receipts.length === before) {
    return res.status(404).json({ error: 'Receipt not found' });
  }

  writeData(data);
  res.json({ success: true, message: 'Receipt deleted' });
});

/**
 * GET /api/receipts/export/csv
 * Download filtered receipts as CSV
 * Query params: type, from, to
 */
app.get('/api/receipts/export/csv', (req, res) => {
  const { type, from, to } = req.query;
  const data = readData();
  let receipts = [...data.receipts];

  if (type && type !== 'all') receipts = receipts.filter(r => r.type === type);
  if (from) receipts = receipts.filter(r => r.date >= from);
  if (to) receipts = receipts.filter(r => r.date <= to);

  const headers = ['Receipt No', 'Date', 'Donor Name', 'Phone', 'Address', 'Type', 'Amount', 'Amount In Words', 'Payment Mode', 'Created At'];
  const rows = receipts.map(r => [
    r.receiptNo,
    r.date,
    `"${r.donorName}"`,
    r.phone,
    `"${r.address}"`,
    r.type,
    r.amount,
    `"${r.amountInWords}"`,
    r.paymentMode,
    r.createdAt
  ].join(','));

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');

  const filename = `mandir-receipts${type && type !== 'all' ? '-' + type : ''}${from ? '-' + from : ''}${to ? '-to-' + to : ''}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🛕  Mandir Receipt API running on http://localhost:${PORT}`);
  console.log(`📋  Endpoints:`);
  console.log(`    GET    /api/health`);
  console.log(`    POST   /api/scan-template        (image upload → AI field detection)`);
  console.log(`    GET    /api/receipts             (?type=donation&from=2025-01-01&to=2025-12-31)`);
  console.log(`    GET    /api/receipts/stats`);
  console.log(`    POST   /api/receipts`);
  console.log(`    DELETE /api/receipts/:id`);
  console.log(`    GET    /api/receipts/export/csv  (?type=membership&from=...&to=...)\n`);
});
