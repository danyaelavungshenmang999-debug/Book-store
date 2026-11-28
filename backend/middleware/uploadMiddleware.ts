import fs from 'fs';
import path from 'path';
import multer from 'multer';

const SLIPS_DIR = path.resolve(process.cwd(), 'uploads', 'slips');
const COVERS_DIR = path.resolve(process.cwd(), 'uploads', 'covers');

if (!fs.existsSync(SLIPS_DIR)) {
  fs.mkdirSync(SLIPS_DIR, { recursive: true });
}

if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(SLIPS_DIR)) {
      fs.mkdirSync(SLIPS_DIR, { recursive: true });
    }
    cb(null, SLIPS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.png';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `slip-${uniqueSuffix}${safeExt}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WebP payment slip screenshots are allowed.'));
  }
};

const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });
    cb(null, COVERS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `cover-${uniqueSuffix}${safeExt}`);
  },
});

const coverFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPG, PNG, and WebP book-cover images are allowed.'));
};

export const uploadPaymentSlip = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

export const uploadBookCover = multer({
  storage: coverStorage,
  fileFilter: coverFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
