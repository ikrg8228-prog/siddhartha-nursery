import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import cors from 'cors';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Security & middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
app.use(cors());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use(limiter);

const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

if (!MONGO_URI) {
  console.error('MONGO_URI missing. Set it in environment.');
  process.exit(1);
}

// --- DB
await mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 20000
});

// --- Session
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Render auto-terminates TLS at proxy; change to true if you set trust proxy + https
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  },
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    ttl: 60 * 60 * 24 * 7
  })
}));

// --- Auth (simple admin login)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.authed = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'Invalid credentials' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// --- Schema
const SeedSchema = new mongoose.Schema({
  name: { type: String, required: true },
  trays: { type: Number, required: true, min: 0 }
}, {_id: false});

const FarmerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  village: { type: String, required: true },
  phone: { type: String },
  pricePerTray: { type: Number, default: 40 },
  seeds: [SeedSchema],
  advance: { type: Number, default: 0 },
  totalTrays: { type: Number, default: 0 },
  totalBill: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, default: 'Pending' }, // Done when balance 0
  createdAt: { type: Date, default: Date.now }
});

const Farmer = mongoose.model('Farmer', FarmerSchema);

function computeTotals(doc) {
  const trays = (doc.seeds || []).reduce((s, x) => s + Number(x.trays || 0), 0);
  const total = trays * Number(doc.pricePerTray || 0);
  const balance = Math.max(0, total - Number(doc.advance || 0));
  const status = balance === 0 ? 'Done' : 'Pending';
  doc.totalTrays = trays;
  doc.totalBill = total;
  doc.balance = balance;
  doc.status = status;
}

// --- CRUD
app.get('/api/farmers', requireAuth, async (req, res) => {
  const { q, sort = '-createdAt' } = req.query;
  const filter = q ? { name: { $regex: q, $options: 'i' } } : {};
  const list = await Farmer.find(filter).sort(sort).lean();
  res.json({ ok: true, data: list });
});

app.post('/api/farmers', requireAuth, async (req, res) => {
  const payload = req.body || {};
  computeTotals(payload);
  const created = await Farmer.create(payload);
  res.json({ ok: true, data: created });
});

app.put('/api/farmers/:id', requireAuth, async (req, res) => {
  const payload = req.body || {};
  computeTotals(payload);
  const updated = await Farmer.findByIdAndUpdate(req.params.id, payload, { new: true });
  res.json({ ok: true, data: updated });
});

app.delete('/api/farmers/:id', requireAuth, async (req, res) => {
  await Farmer.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// --- Export to Excel
app.get('/api/farmers-export', requireAuth, async (req, res) => {
  const rows = await Farmer.find().sort('-createdAt').lean();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Farmers');
  ws.addRow(['Date', 'Name', 'Village', 'Phone', 'Seed Types', 'Total Trays', 'Price/Tray', 'Advance', 'Total Bill', 'Balance', 'Status']);

  rows.forEach(r => {
    const seedStr = (r.seeds || []).map(s => f"{s.name}:{s.trays}").join(', ');
    ws.addRow([new Date(r.createdAt).toLocaleString(), r.name, r.village, r.phone, seedStr, r.totalTrays, r.pricePerTray, r.advance, r.totalBill, r.balance, r.status]);
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="farmers.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

// --- Static
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log('Siddhartha Nursery server listening on', PORT);
});
