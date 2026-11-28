import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { OrderStatus, PaymentMethod, VerificationStatus } from '../models/Order.ts';

export interface StoreUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'admin';
  isVerified: boolean;
  otpHash: string | null;
  otpExpires: string | null;
  otpLastSentAt: string | null;
  otpAttempts: number;
  otpLockedUntil: string | null;
  wishlist: string[];
  shippingAddress: {
    fullName: string;
    phone: string;
    streetAddress: string;
    township: string;
    city: string;
    postalCode: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StoreReview {
  _id: string;
  user: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface StoreBook {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  description: string;
  price: number;
  stockCount: number;
  category: string;
  coverImageUrl: string;
  publisher: string;
  language: string;
  pages: number;
  reviews: StoreReview[];
  rating: number;
  numReviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreOrder {
  _id: string;
  orderNumber: string;
  user: string;
  customerName: string;
  customerEmail: string;
  orderItems: Array<{
    book: string;
    title: string;
    author: string;
    coverImageUrl: string;
    qty: number;
    price: number;
  }>;
  shippingAddress: {
    fullName: string;
    phone: string;
    streetAddress: string;
    township: string;
    city: string;
    postalCode: string;
  };
  paymentMethod: PaymentMethod;
  paymentDetails: {
    transactionId?: string;
    paymentSlipUrl?: string;
    verificationStatus: VerificationStatus;
    rejectionReason?: string;
    verifiedAt?: string;
    verifiedBy?: string;
  };
  couponCode?: string;
  discountAmount: number;
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  orderStatus: OrderStatus;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreCoupon {
  _id: string;
  code: string;
  discountPercentage: number;
  expiryDate: string;
  isActive: boolean;
  usageLimit: number;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreDatabase {
  users: StoreUser[];
  books: StoreBook[];
  orders: StoreOrder[];
  coupons: StoreCoupon[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'bookhaven-db.json');
const SLIPS_DIR = path.resolve(process.cwd(), 'uploads', 'slips');

let writeQueue: Promise<void> = Promise.resolve();

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SLIPS_DIR)) {
    fs.mkdirSync(SLIPS_DIR, { recursive: true });
  }
}

function createSampleSlipImage(): string {
  ensureDirectories();
  const slipPath = path.join(SLIPS_DIR, 'sample_kbzpay_slip.svg');
  if (!fs.existsSync(slipPath)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="620" viewBox="0 0 420 620">
  <rect width="420" height="620" fill="#F8FAFC"/>
  <rect x="20" y="20" width="380" height="580" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>
  <rect x="20" y="20" width="380" height="78" rx="16" fill="#0055A5"/>
  <rect x="20" y="76" width="380" height="22" fill="#0055A5"/>
  <text x="44" y="66" font-family="sans-serif" font-size="22" font-weight="700" fill="#FFFFFF">KBZPay Transfer Receipt</text>
  <circle cx="210" cy="148" r="24" fill="#DCFCE7"/>
  <path d="M198 148 l8 8 l16 -16" stroke="#15803D" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="210" y="196" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="600" fill="#15803D">Payment Successful</text>
  <text x="210" y="238" text-anchor="middle" font-family="monospace" font-size="28" font-weight="700" fill="#0F172A">- 36,500.00 MMK</text>
  <line x1="44" y1="268" x2="376" y2="268" stroke="#E2E8F0" stroke-dasharray="4 4"/>
  <text x="44" y="302" font-family="sans-serif" font-size="13" fill="#64748B">Transaction Time</text>
  <text x="376" y="302" text-anchor="end" font-family="monospace" font-size="13" fill="#0F172A">17/11/2026 10:42:18</text>
  <text x="44" y="338" font-family="sans-serif" font-size="13" fill="#64748B">Transaction ID</text>
  <text x="376" y="338" text-anchor="end" font-family="monospace" font-size="13" font-weight="700" fill="#0F172A">KBZ9940281755</text>
  <text x="44" y="374" font-family="sans-serif" font-size="13" fill="#64748B">Transfer To</text>
  <text x="376" y="374" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="600" fill="#0F172A">BookHaven Myanmar</text>
  <text x="44" y="410" font-family="sans-serif" font-size="13" fill="#64748B">Merchant Phone</text>
  <text x="376" y="410" text-anchor="end" font-family="monospace" font-size="13" fill="#0F172A">09 795 441 200</text>
  <text x="44" y="446" font-family="sans-serif" font-size="13" fill="#64748B">Notes</text>
  <text x="376" y="446" text-anchor="end" font-family="sans-serif" font-size="13" fill="#0F172A">Order BH-2026-1042</text>
  <rect x="44" y="486" width="332" height="72" rx="8" fill="#F1F5F9"/>
  <text x="210" y="518" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#475569">Verified Wallet Reference</text>
  <text x="210" y="538" text-anchor="middle" font-family="monospace" font-size="11" fill="#64748B">MMQR-KBZ-441200-BH1042</text>
</svg>`;
    fs.writeFileSync(slipPath, svg, 'utf-8');
  }
  return '/uploads/slips/sample_kbzpay_slip.svg';
}

export function buildSeedData(): StoreDatabase {
  const now = new Date();
  const iso = (daysAgo = 0) => new Date(now.getTime() - daysAgo * 86400000).toISOString();
  const futureIso = (daysAhead = 90) => new Date(now.getTime() + daysAhead * 86400000).toISOString();
  const pastIso = (daysAgo = 10) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

  const customerPassword = bcrypt.hashSync('Customer123!', 10);
  const adminPassword = bcrypt.hashSync('Admin123!', 10);
  const slipUrl = createSampleSlipImage();

  const customerId = '66f100000000000000000001';
  const adminId = '66f100000000000000000002';

  const bookIds = [
    '66f200000000000000000001',
    '66f200000000000000000002',
    '66f200000000000000000003',
    '66f200000000000000000004',
    '66f200000000000000000005',
    '66f200000000000000000006',
  ];

  const users: StoreUser[] = [
    {
      _id: customerId,
      name: 'Aye Chan Moe',
      email: 'aye@bookhaven.mm',
      password: customerPassword,
      role: 'customer',
      isVerified: true,
      otpHash: null,
      otpExpires: null,
      otpLastSentAt: null,
      otpAttempts: 0,
      otpLockedUntil: null,
      wishlist: [bookIds[0], bookIds[4]],
      shippingAddress: {
        fullName: 'Aye Chan Moe',
        phone: '09 782 410 923',
        streetAddress: 'No. 42, Inya Myaing Road',
        township: 'Bahan',
        city: 'Yangon',
        postalCode: '11201',
      },
      createdAt: iso(30),
      updatedAt: iso(2),
    },
    {
      _id: adminId,
      name: 'Thant Zin Oo',
      email: 'admin@bookhaven.mm',
      password: adminPassword,
      role: 'admin',
      isVerified: true,
      otpHash: null,
      otpExpires: null,
      otpLastSentAt: null,
      otpAttempts: 0,
      otpLockedUntil: null,
      wishlist: [],
      shippingAddress: {
        fullName: 'Thant Zin Oo',
        phone: '09 795 441 200',
        streetAddress: 'No. 18, Pansodan Street',
        township: 'Kyauktada',
        city: 'Yangon',
        postalCode: '11182',
      },
      createdAt: iso(60),
      updatedAt: iso(1),
    },
  ];

  const books: StoreBook[] = [
    {
      _id: bookIds[0],
      title: 'Temple & Trace: A Journey in Stone',
      author: 'Elara Vance',
      isbn: '978-99971-42-01-4',
      description:
        'An architectural and cultural study exploring centuries-old masonry, terracotta reliefs, and sacred temple courtyards across Southeast Asia and the Bagan plains. Printed on archival ivory cotton stock with annotated line drawings.',
      price: 28500,
      stockCount: 14,
      category: 'History & Heritage',
      coverImageUrl: '/src/assets/images/cover_irrawaddy_chronicles_1794943512999.jpg',
      publisher: 'Irrawaddy Heritage Press',
      language: 'English',
      pages: 312,
      reviews: [
        {
          _id: 'rev-1',
          user: customerId,
          name: 'Aye Chan Moe',
          rating: 5,
          comment: 'The linen binding and measured architectural plates make this a centerpiece on my desk.',
          createdAt: iso(12),
        },
      ],
      rating: 5,
      numReviews: 1,
      createdAt: iso(40),
      updatedAt: iso(5),
    },
    {
      _id: bookIds[1],
      title: 'The Silent Reach',
      author: 'Nora Elliott',
      isbn: '978-99971-42-02-1',
      description:
        'Set along misted monsoon riverbanks and botanical conservatories, this literary novel traces two generations of botanists cataloging vanishing highland flora while confronting unspoken family histories.',
      price: 22000,
      stockCount: 3,
      category: 'Literary Fiction',
      coverImageUrl: '/src/assets/images/cover_monsoon_letters_1794943512864.jpg',
      publisher: 'Pansodan Literary House',
      language: 'English',
      pages: 276,
      reviews: [
        {
          _id: 'rev-2',
          user: customerId,
          name: 'Aye Chan Moe',
          rating: 5,
          comment: 'Quiet, atmospheric prose that stays with you long after the final chapter.',
          createdAt: iso(8),
        },
      ],
      rating: 5,
      numReviews: 1,
      createdAt: iso(32),
      updatedAt: iso(3),
    },
    {
      _id: bookIds[2],
      title: 'Modern Colonnade: Architectural Form',
      author: 'Elias Vance',
      isbn: '978-99971-42-03-8',
      description:
        'A visual monograph examining heritage colonnades, shaded verandas, and tropical masonry ventilation strategies in historic downtown Yangon and coastal port cities.',
      price: 36500,
      stockCount: 9,
      category: 'Architecture & Design',
      coverImageUrl: '/src/assets/images/cover_yangon_architecture_1794943514779.jpg',
      publisher: 'Studio Press Yangon',
      language: 'English / Myanmar',
      pages: 248,
      reviews: [],
      rating: 0,
      numReviews: 0,
      createdAt: iso(25),
      updatedAt: iso(4),
    },
    {
      _id: bookIds[3],
      title: 'Structural Systems & Design',
      author: 'Dr. Elias Thorne & Jessica Chen',
      isbn: '978-99971-42-04-5',
      description:
        'A rigorous engineering reference covering load-bearing frameworks, resilient distributed architectures, and precision systems modeling for modern builders and technical leads.',
      price: 42000,
      stockCount: 2,
      category: 'Technology & Engineering',
      coverImageUrl: '/src/assets/images/cover_systems_craft_1794943514381.jpg',
      publisher: 'Technical Foundry Press',
      language: 'English',
      pages: 464,
      reviews: [],
      rating: 0,
      numReviews: 0,
      createdAt: iso(20),
      updatedAt: iso(2),
    },
    {
      _id: bookIds[4],
      title: 'The Artisanal Tea House',
      author: 'Eliza Reed',
      isbn: '978-99971-42-05-2',
      description:
        'Celebrating highland tea cultivation, fermented laphet traditions, and morning tea-table rituals from Shan State to Mandalay. Includes 48 recipes, botanical illustrations, and ceramicist profiles.',
      price: 26000,
      stockCount: 18,
      category: 'Culinary & Culture',
      coverImageUrl: '/src/assets/images/cover_shan_tea_table_1794943514901.jpg',
      publisher: 'Mandalay Hearth Editions',
      language: 'English / Myanmar',
      pages: 224,
      reviews: [
        {
          _id: 'rev-3',
          user: customerId,
          name: 'Aye Chan Moe',
          rating: 4,
          comment: 'Wonderful photography and authentic Shan tea-table stories.',
          createdAt: iso(6),
        },
      ],
      rating: 4,
      numReviews: 1,
      createdAt: iso(18),
      updatedAt: iso(1),
    },
    {
      _id: bookIds[5],
      title: 'Commerce Along the Delta',
      author: 'Kyaw Min Htet',
      isbn: '978-99971-42-06-9',
      description:
        'An accessible economic history and practical playbook detailing Myanmar merchant guilds, river trade corridors, digital payment adoption, and modern retail logistics.',
      price: 19500,
      stockCount: 11,
      category: 'Business & Economics',
      coverImageUrl: '/src/assets/images/cover_irrawaddy_chronicles_1794943512999.jpg',
      publisher: 'Delta Economic Review',
      language: 'Myanmar / English',
      pages: 290,
      reviews: [],
      rating: 0,
      numReviews: 0,
      createdAt: iso(10),
      updatedAt: iso(1),
    },
  ];

  const orders: StoreOrder[] = [
    {
      _id: '66f300000000000000000001',
      orderNumber: 'BH-2026-1042',
      user: customerId,
      customerName: 'Aye Chan Moe',
      customerEmail: 'aye@bookhaven.mm',
      orderItems: [
        {
          book: bookIds[2],
          title: 'Modern Colonnade: Architectural Form',
          author: 'Elias Vance',
          coverImageUrl: '/src/assets/images/cover_yangon_architecture_1794943514779.jpg',
          qty: 1,
          price: 36500,
        },
      ],
      shippingAddress: {
        fullName: 'Aye Chan Moe',
        phone: '09 782 410 923',
        streetAddress: 'No. 42, Inya Myaing Road',
        township: 'Bahan',
        city: 'Yangon',
        postalCode: '11201',
      },
      paymentMethod: 'KBZPay',
      paymentDetails: {
        transactionId: 'KBZ9940281755',
        paymentSlipUrl: slipUrl,
        verificationStatus: 'Pending',
      },
      discountAmount: 0,
      subtotal: 36500,
      deliveryFee: 0,
      totalPrice: 36500,
      orderStatus: 'Pending Verification',
      isPaid: false,
      createdAt: iso(0),
      updatedAt: iso(0),
    },
    {
      _id: '66f300000000000000000002',
      orderNumber: 'BH-2026-1039',
      user: customerId,
      customerName: 'Aye Chan Moe',
      customerEmail: 'aye@bookhaven.mm',
      orderItems: [
        {
          book: bookIds[4],
          title: 'The Artisanal Tea House',
          author: 'Eliza Reed',
          coverImageUrl: '/src/assets/images/cover_shan_tea_table_1794943514901.jpg',
          qty: 2,
          price: 26000,
        },
      ],
      shippingAddress: {
        fullName: 'Aye Chan Moe',
        phone: '09 782 410 923',
        streetAddress: 'No. 42, Inya Myaing Road',
        township: 'Bahan',
        city: 'Yangon',
        postalCode: '11201',
      },
      paymentMethod: 'WaveMoney',
      paymentDetails: {
        transactionId: 'WAVE773190442',
        paymentSlipUrl: slipUrl,
        verificationStatus: 'Approved',
        verifiedAt: iso(2),
        verifiedBy: 'Thant Zin Oo',
      },
      couponCode: 'BOOKHAVEN10',
      discountAmount: 5200,
      subtotal: 52000,
      deliveryFee: 0,
      totalPrice: 46800,
      orderStatus: 'Shipped',
      isPaid: true,
      paidAt: iso(2),
      createdAt: iso(3),
      updatedAt: iso(2),
    },
    {
      _id: '66f300000000000000000003',
      orderNumber: 'BH-2026-1031',
      user: customerId,
      customerName: 'Aye Chan Moe',
      customerEmail: 'aye@bookhaven.mm',
      orderItems: [
        {
          book: bookIds[0],
          title: 'Temple & Trace: A Journey in Stone',
          author: 'Elara Vance',
          coverImageUrl: '/src/assets/images/cover_irrawaddy_chronicles_1794943512999.jpg',
          qty: 1,
          price: 28500,
        },
      ],
      shippingAddress: {
        fullName: 'Aye Chan Moe',
        phone: '09 782 410 923',
        streetAddress: 'No. 42, Inya Myaing Road',
        township: 'Bahan',
        city: 'Yangon',
        postalCode: '11201',
      },
      paymentMethod: 'CashOnDelivery',
      paymentDetails: {
        verificationStatus: 'NotRequired',
      },
      discountAmount: 0,
      subtotal: 28500,
      deliveryFee: 2500,
      totalPrice: 31000,
      orderStatus: 'Delivered',
      isPaid: true,
      paidAt: iso(7),
      createdAt: iso(9),
      updatedAt: iso(7),
    },
  ];

  const coupons: StoreCoupon[] = [
    {
      _id: '66f400000000000000000001',
      code: 'BOOKHAVEN10',
      discountPercentage: 10,
      expiryDate: futureIso(120),
      isActive: true,
      usageLimit: 100,
      usedCount: 25,
      createdAt: iso(30),
      updatedAt: iso(30),
    },
    {
      _id: '66f400000000000000000002',
      code: 'YANGON15',
      discountPercentage: 15,
      expiryDate: futureIso(60),
      isActive: true,
      usageLimit: 50,
      usedCount: 10,
      createdAt: iso(15),
      updatedAt: iso(15),
    },
    {
      _id: '66f400000000000000000003',
      code: 'THADINGYUT20',
      discountPercentage: 20,
      expiryDate: pastIso(15),
      isActive: false,
      usageLimit: 30,
      usedCount: 30,
      createdAt: iso(45),
      updatedAt: iso(15),
    },
  ];

  return { users, books, orders, coupons };
}

export function loadStore(): StoreDatabase {
  ensureDirectories();
  createSampleSlipImage();
  if (!fs.existsSync(DATA_FILE)) {
    const seeded = buildSeedData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as StoreDatabase;
  } catch {
    const seeded = buildSeedData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }
}

export async function runStoreTransaction<T>(fn: (db: StoreDatabase) => Promise<T> | T): Promise<T> {
  const run = async (): Promise<T> => {
    const db = loadStore();
    const snapshot = JSON.stringify(db);
    try {
      const result = await fn(db);
      fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
      return result;
    } catch (err) {
      // Atomic rollback on failure
      fs.writeFileSync(DATA_FILE, snapshot, 'utf-8');
      throw err;
    }
  };

  const next = writeQueue.then(run, run);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export function generateObjectId(): string {
  const hex = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  let random = '';
  for (let i = 0; i < 16; i++) {
    random += Math.floor(Math.random() * 16).toString(16);
  }
  return hex + random;
}
