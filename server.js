// server.ts
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path3 from "path";
import { fileURLToPath } from "url";

// backend/config/db.ts
import mongoose from "mongoose";
var mongoReady = false;
async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.log("[BookHaven DB] MONGODB_URI not provided \u2014 running with local transactional persistence.");
    mongoReady = false;
    return false;
  }
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5e3
    });
    mongoReady = true;
    console.log(`[BookHaven DB] Connected to MongoDB: ${mongoose.connection.host}`);
    return true;
  } catch (err) {
    console.warn("[BookHaven DB] MongoDB connection failed, falling back to local transactional persistence:", err.message);
    mongoReady = false;
    return false;
  }
}
function isMongoConnected() {
  return mongoReady && mongoose.connection.readyState === 1;
}

// backend/config/store.ts
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
var DATA_DIR = path.resolve(process.cwd(), "data");
var DATA_FILE = path.join(DATA_DIR, "bookhaven-db.json");
var SLIPS_DIR = path.resolve(process.cwd(), "uploads", "slips");
var writeQueue = Promise.resolve();
function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SLIPS_DIR)) {
    fs.mkdirSync(SLIPS_DIR, { recursive: true });
  }
}
function createSampleSlipImage() {
  ensureDirectories();
  const slipPath = path.join(SLIPS_DIR, "sample_kbzpay_slip.svg");
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
    fs.writeFileSync(slipPath, svg, "utf-8");
  }
  return "/uploads/slips/sample_kbzpay_slip.svg";
}
function buildSeedData() {
  const now = /* @__PURE__ */ new Date();
  const iso = (daysAgo = 0) => new Date(now.getTime() - daysAgo * 864e5).toISOString();
  const futureIso = (daysAhead = 90) => new Date(now.getTime() + daysAhead * 864e5).toISOString();
  const pastIso = (daysAgo = 10) => new Date(now.getTime() - daysAgo * 864e5).toISOString();
  const customerPassword = bcrypt.hashSync("Customer123!", 10);
  const adminPassword = bcrypt.hashSync("Admin123!", 10);
  const slipUrl = createSampleSlipImage();
  const customerId = "66f100000000000000000001";
  const adminId = "66f100000000000000000002";
  const bookIds = [
    "66f200000000000000000001",
    "66f200000000000000000002",
    "66f200000000000000000003",
    "66f200000000000000000004",
    "66f200000000000000000005",
    "66f200000000000000000006"
  ];
  const users = [
    {
      _id: customerId,
      name: "Aye Chan Moe",
      email: "aye@bookhaven.mm",
      password: customerPassword,
      role: "customer",
      isVerified: true,
      otpHash: null,
      otpExpires: null,
      otpLastSentAt: null,
      otpAttempts: 0,
      otpLockedUntil: null,
      wishlist: [bookIds[0], bookIds[4]],
      shippingAddress: {
        fullName: "Aye Chan Moe",
        phone: "09 782 410 923",
        streetAddress: "No. 42, Inya Myaing Road",
        township: "Bahan",
        city: "Yangon",
        postalCode: "11201"
      },
      createdAt: iso(30),
      updatedAt: iso(2)
    },
    {
      _id: adminId,
      name: "Thant Zin Oo",
      email: "admin@bookhaven.mm",
      password: adminPassword,
      role: "admin",
      isVerified: true,
      otpHash: null,
      otpExpires: null,
      otpLastSentAt: null,
      otpAttempts: 0,
      otpLockedUntil: null,
      wishlist: [],
      shippingAddress: {
        fullName: "Thant Zin Oo",
        phone: "09 795 441 200",
        streetAddress: "No. 18, Pansodan Street",
        township: "Kyauktada",
        city: "Yangon",
        postalCode: "11182"
      },
      createdAt: iso(60),
      updatedAt: iso(1)
    }
  ];
  const books = [
    {
      _id: bookIds[0],
      title: "Temple & Trace: A Journey in Stone",
      author: "Elara Vance",
      isbn: "978-99971-42-01-4",
      description: "An architectural and cultural study exploring centuries-old masonry, terracotta reliefs, and sacred temple courtyards across Southeast Asia and the Bagan plains. Printed on archival ivory cotton stock with annotated line drawings.",
      price: 28500,
      stockCount: 14,
      category: "History & Heritage",
      coverImageUrl: "/src/assets/images/cover_irrawaddy_chronicles_1794943512999.jpg",
      publisher: "Irrawaddy Heritage Press",
      language: "English",
      pages: 312,
      reviews: [
        {
          _id: "rev-1",
          user: customerId,
          name: "Aye Chan Moe",
          rating: 5,
          comment: "The linen binding and measured architectural plates make this a centerpiece on my desk.",
          createdAt: iso(12)
        }
      ],
      rating: 5,
      numReviews: 1,
      createdAt: iso(40),
      updatedAt: iso(5)
    },
    {
      _id: bookIds[1],
      title: "The Silent Reach",
      author: "Nora Elliott",
      isbn: "978-99971-42-02-1",
      description: "Set along misted monsoon riverbanks and botanical conservatories, this literary novel traces two generations of botanists cataloging vanishing highland flora while confronting unspoken family histories.",
      price: 22e3,
      stockCount: 3,
      category: "Literary Fiction",
      coverImageUrl: "/src/assets/images/cover_monsoon_letters_1794943512864.jpg",
      publisher: "Pansodan Literary House",
      language: "English",
      pages: 276,
      reviews: [
        {
          _id: "rev-2",
          user: customerId,
          name: "Aye Chan Moe",
          rating: 5,
          comment: "Quiet, atmospheric prose that stays with you long after the final chapter.",
          createdAt: iso(8)
        }
      ],
      rating: 5,
      numReviews: 1,
      createdAt: iso(32),
      updatedAt: iso(3)
    },
    {
      _id: bookIds[2],
      title: "Modern Colonnade: Architectural Form",
      author: "Elias Vance",
      isbn: "978-99971-42-03-8",
      description: "A visual monograph examining heritage colonnades, shaded verandas, and tropical masonry ventilation strategies in historic downtown Yangon and coastal port cities.",
      price: 36500,
      stockCount: 9,
      category: "Architecture & Design",
      coverImageUrl: "/src/assets/images/cover_yangon_architecture_1794943514779.jpg",
      publisher: "Studio Press Yangon",
      language: "English / Myanmar",
      pages: 248,
      reviews: [],
      rating: 0,
      numReviews: 0,
      createdAt: iso(25),
      updatedAt: iso(4)
    },
    {
      _id: bookIds[3],
      title: "Structural Systems & Design",
      author: "Dr. Elias Thorne & Jessica Chen",
      isbn: "978-99971-42-04-5",
      description: "A rigorous engineering reference covering load-bearing frameworks, resilient distributed architectures, and precision systems modeling for modern builders and technical leads.",
      price: 42e3,
      stockCount: 2,
      category: "Technology & Engineering",
      coverImageUrl: "/src/assets/images/cover_systems_craft_1794943514381.jpg",
      publisher: "Technical Foundry Press",
      language: "English",
      pages: 464,
      reviews: [],
      rating: 0,
      numReviews: 0,
      createdAt: iso(20),
      updatedAt: iso(2)
    },
    {
      _id: bookIds[4],
      title: "The Artisanal Tea House",
      author: "Eliza Reed",
      isbn: "978-99971-42-05-2",
      description: "Celebrating highland tea cultivation, fermented laphet traditions, and morning tea-table rituals from Shan State to Mandalay. Includes 48 recipes, botanical illustrations, and ceramicist profiles.",
      price: 26e3,
      stockCount: 18,
      category: "Culinary & Culture",
      coverImageUrl: "/src/assets/images/cover_shan_tea_table_1794943514901.jpg",
      publisher: "Mandalay Hearth Editions",
      language: "English / Myanmar",
      pages: 224,
      reviews: [
        {
          _id: "rev-3",
          user: customerId,
          name: "Aye Chan Moe",
          rating: 4,
          comment: "Wonderful photography and authentic Shan tea-table stories.",
          createdAt: iso(6)
        }
      ],
      rating: 4,
      numReviews: 1,
      createdAt: iso(18),
      updatedAt: iso(1)
    },
    {
      _id: bookIds[5],
      title: "Commerce Along the Delta",
      author: "Kyaw Min Htet",
      isbn: "978-99971-42-06-9",
      description: "An accessible economic history and practical playbook detailing Myanmar merchant guilds, river trade corridors, digital payment adoption, and modern retail logistics.",
      price: 19500,
      stockCount: 11,
      category: "Business & Economics",
      coverImageUrl: "/src/assets/images/cover_irrawaddy_chronicles_1794943512999.jpg",
      publisher: "Delta Economic Review",
      language: "Myanmar / English",
      pages: 290,
      reviews: [],
      rating: 0,
      numReviews: 0,
      createdAt: iso(10),
      updatedAt: iso(1)
    }
  ];
  const orders = [
    {
      _id: "66f300000000000000000001",
      orderNumber: "BH-2026-1042",
      user: customerId,
      customerName: "Aye Chan Moe",
      customerEmail: "aye@bookhaven.mm",
      orderItems: [
        {
          book: bookIds[2],
          title: "Modern Colonnade: Architectural Form",
          author: "Elias Vance",
          coverImageUrl: "/src/assets/images/cover_yangon_architecture_1794943514779.jpg",
          qty: 1,
          price: 36500
        }
      ],
      shippingAddress: {
        fullName: "Aye Chan Moe",
        phone: "09 782 410 923",
        streetAddress: "No. 42, Inya Myaing Road",
        township: "Bahan",
        city: "Yangon",
        postalCode: "11201"
      },
      paymentMethod: "KBZPay",
      paymentDetails: {
        transactionId: "KBZ9940281755",
        paymentSlipUrl: slipUrl,
        verificationStatus: "Pending"
      },
      discountAmount: 0,
      subtotal: 36500,
      deliveryFee: 0,
      totalPrice: 36500,
      orderStatus: "Pending Verification",
      isPaid: false,
      createdAt: iso(0),
      updatedAt: iso(0)
    },
    {
      _id: "66f300000000000000000002",
      orderNumber: "BH-2026-1039",
      user: customerId,
      customerName: "Aye Chan Moe",
      customerEmail: "aye@bookhaven.mm",
      orderItems: [
        {
          book: bookIds[4],
          title: "The Artisanal Tea House",
          author: "Eliza Reed",
          coverImageUrl: "/src/assets/images/cover_shan_tea_table_1794943514901.jpg",
          qty: 2,
          price: 26e3
        }
      ],
      shippingAddress: {
        fullName: "Aye Chan Moe",
        phone: "09 782 410 923",
        streetAddress: "No. 42, Inya Myaing Road",
        township: "Bahan",
        city: "Yangon",
        postalCode: "11201"
      },
      paymentMethod: "WaveMoney",
      paymentDetails: {
        transactionId: "WAVE773190442",
        paymentSlipUrl: slipUrl,
        verificationStatus: "Approved",
        verifiedAt: iso(2),
        verifiedBy: "Thant Zin Oo"
      },
      couponCode: "BOOKHAVEN10",
      discountAmount: 5200,
      subtotal: 52e3,
      deliveryFee: 0,
      totalPrice: 46800,
      orderStatus: "Shipped",
      isPaid: true,
      paidAt: iso(2),
      createdAt: iso(3),
      updatedAt: iso(2)
    },
    {
      _id: "66f300000000000000000003",
      orderNumber: "BH-2026-1031",
      user: customerId,
      customerName: "Aye Chan Moe",
      customerEmail: "aye@bookhaven.mm",
      orderItems: [
        {
          book: bookIds[0],
          title: "Temple & Trace: A Journey in Stone",
          author: "Elara Vance",
          coverImageUrl: "/src/assets/images/cover_irrawaddy_chronicles_1794943512999.jpg",
          qty: 1,
          price: 28500
        }
      ],
      shippingAddress: {
        fullName: "Aye Chan Moe",
        phone: "09 782 410 923",
        streetAddress: "No. 42, Inya Myaing Road",
        township: "Bahan",
        city: "Yangon",
        postalCode: "11201"
      },
      paymentMethod: "CashOnDelivery",
      paymentDetails: {
        verificationStatus: "NotRequired"
      },
      discountAmount: 0,
      subtotal: 28500,
      deliveryFee: 2500,
      totalPrice: 31e3,
      orderStatus: "Delivered",
      isPaid: true,
      paidAt: iso(7),
      createdAt: iso(9),
      updatedAt: iso(7)
    }
  ];
  const coupons = [
    {
      _id: "66f400000000000000000001",
      code: "BOOKHAVEN10",
      discountPercentage: 10,
      expiryDate: futureIso(120),
      isActive: true,
      usageLimit: 100,
      usedCount: 25,
      createdAt: iso(30),
      updatedAt: iso(30)
    },
    {
      _id: "66f400000000000000000002",
      code: "YANGON15",
      discountPercentage: 15,
      expiryDate: futureIso(60),
      isActive: true,
      usageLimit: 50,
      usedCount: 10,
      createdAt: iso(15),
      updatedAt: iso(15)
    },
    {
      _id: "66f400000000000000000003",
      code: "THADINGYUT20",
      discountPercentage: 20,
      expiryDate: pastIso(15),
      isActive: false,
      usageLimit: 30,
      usedCount: 30,
      createdAt: iso(45),
      updatedAt: iso(15)
    }
  ];
  return { users, books, orders, coupons };
}
function loadStore() {
  ensureDirectories();
  createSampleSlipImage();
  if (!fs.existsSync(DATA_FILE)) {
    const seeded = buildSeedData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2), "utf-8");
    return seeded;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    const seeded = buildSeedData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2), "utf-8");
    return seeded;
  }
}
async function runStoreTransaction(fn) {
  const run = async () => {
    const db = loadStore();
    const snapshot = JSON.stringify(db);
    try {
      const result = await fn(db);
      fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
      return result;
    } catch (err) {
      fs.writeFileSync(DATA_FILE, snapshot, "utf-8");
      throw err;
    }
  };
  const next = writeQueue.then(run, run);
  writeQueue = next.then(
    () => void 0,
    () => void 0
  );
  return next;
}
function generateObjectId() {
  const hex = Math.floor(Date.now() / 1e3).toString(16).padStart(8, "0");
  let random = "";
  for (let i = 0; i < 16; i++) {
    random += Math.floor(Math.random() * 16).toString(16);
  }
  return hex + random;
}

// backend/models/Book.ts
import mongoose2, { Schema } from "mongoose";
var reviewSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1e3
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);
var bookSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Book title is required"],
      trim: true,
      maxlength: [160, "Title cannot exceed 160 characters"]
    },
    author: {
      type: String,
      required: [true, "Author name is required"],
      trim: true,
      maxlength: [100, "Author cannot exceed 100 characters"]
    },
    isbn: {
      type: String,
      required: [true, "ISBN is required"],
      unique: true,
      trim: true
    },
    description: {
      type: String,
      required: [true, "Book description is required"],
      trim: true,
      maxlength: [3e3, "Description cannot exceed 3000 characters"]
    },
    price: {
      type: Number,
      required: [true, "Price (MMK) is required"],
      min: [0, "Price cannot be negative"]
    },
    stockCount: {
      type: Number,
      required: [true, "Stock count is required"],
      min: [0, "Stock count cannot be negative"],
      default: 0
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true
    },
    coverImageUrl: {
      type: String,
      required: [true, "Cover image URL is required"],
      trim: true
    },
    publisher: {
      type: String,
      trim: true,
      default: "BookHaven Editions"
    },
    language: {
      type: String,
      trim: true,
      set: (value) => {
        const language = String(value ?? "").trim().toLowerCase();
        if (language === "myanmar" || language.includes("burmese")) return "myanmar";
        if (language.includes("english") || language.includes("bilingual")) return "english";
        return "none";
      },
      default: "english"
    },
    pages: {
      type: Number,
      min: 1,
      default: 240
    },
    reviews: {
      type: [reviewSchema],
      default: []
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    numReviews: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);
bookSchema.index({ title: "text", author: "text", isbn: "text", category: "text" });
var BookModel = mongoose2.models.Book || mongoose2.model("Book", bookSchema);

// backend/models/Coupon.ts
import mongoose3, { Schema as Schema2 } from "mongoose";
var couponSchema = new Schema2(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true
    },
    discountPercentage: {
      type: Number,
      required: [true, "Discount percentage is required"],
      min: [1, "Discount must be at least 1%"],
      max: [90, "Discount cannot exceed 90%"]
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"]
    },
    isActive: {
      type: Boolean,
      default: true
    },
    usageLimit: {
      type: Number,
      min: [1, "Usage limit must be at least 1"],
      default: 1e3
    },
    usedCount: {
      type: Number,
      min: [0, "Used count cannot be negative"],
      default: 0
    }
  },
  {
    timestamps: true
  }
);
var CouponModel = mongoose3.models.Coupon || mongoose3.model("Coupon", couponSchema);

// backend/models/User.ts
import mongoose4, { Schema as Schema3 } from "mongoose";
import bcrypt2 from "bcryptjs";
var shippingAddressSchema = new Schema3(
  {
    fullName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    streetAddress: { type: String, trim: true, default: "" },
    township: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "Yangon" },
    postalCode: { type: String, trim: true, default: "" }
  },
  { _id: false }
);
var userSchema = new Schema3(
  {
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"]
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false
    },
    role: {
      type: String,
      enum: ["customer", "staff", "admin"],
      default: "customer"
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: "active"
    },
    otpHash: {
      type: String,
      default: null,
      select: false
    },
    otpExpires: {
      type: Date,
      default: null,
      select: false
    },
    otpLastSentAt: {
      type: Date,
      default: null,
      select: false
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    otpLockedUntil: {
      type: Date,
      default: null,
      select: false
    },
    wishlist: [
      {
        type: Schema3.Types.ObjectId,
        ref: "Book"
      }
    ],
    shippingAddress: {
      type: shippingAddressSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);
userSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  const salt = await bcrypt2.genSalt(10);
  this.password = await bcrypt2.hash(this.password, salt);
});
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt2.compare(candidatePassword, this.password);
};
var UserModel = mongoose4.models.User || mongoose4.model("User", userSchema);

// backend/routes/adminRoutes.ts
import { Router } from "express";

// backend/models/Order.ts
import mongoose5, { Schema as Schema4 } from "mongoose";
var orderItemSchema = new Schema4(
  {
    book: { type: Schema4.Types.ObjectId, ref: "Book", required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    coverImageUrl: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);
var orderStatusHistorySchema = new Schema4(
  {
    status: {
      type: String,
      enum: ["Pending Verification", "Processing", "Shipped", "Delivered", "Cancelled"],
      required: true
    },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String, trim: true },
    note: { type: String, trim: true }
  },
  { _id: false }
);
var orderSchema = new Schema4(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    user: {
      type: Schema4.Types.ObjectId,
      ref: "User",
      required: true
    },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    orderItems: {
      type: [orderItemSchema],
      required: true,
      validate: [(v) => v.length > 0, "Order must contain at least one item"]
    },
    shippingAddress: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      streetAddress: { type: String, required: true, trim: true },
      township: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      postalCode: { type: String, trim: true, default: "11181" }
    },
    paymentMethod: {
      type: String,
      enum: ["KBZPay", "WaveMoney", "AYAPay", "CashOnDelivery"],
      required: true
    },
    paymentDetails: {
      transactionId: { type: String, trim: true },
      paymentSlipUrl: { type: String, trim: true },
      verificationStatus: {
        type: String,
        enum: ["NotRequired", "Pending", "Approved", "Rejected"],
        default: "Pending"
      },
      rejectionReason: { type: String, trim: true },
      verifiedAt: { type: Date },
      verifiedBy: { type: String }
    },
    couponCode: { type: String, trim: true },
    discountAmount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    orderStatus: {
      type: String,
      enum: ["Pending Verification", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending Verification"
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: {
      type: Date
    },
    trackingNumber: { type: String, trim: true, default: "" },
    carrier: { type: String, trim: true, default: "" },
    statusHistory: { type: [orderStatusHistorySchema], default: [] },
    returnRequest: {
      requested: { type: Boolean, default: false },
      reason: { type: String, trim: true },
      status: { type: String, enum: ["None", "Requested", "Approved", "Rejected", "Refunded"], default: "None" },
      requestedAt: { type: Date },
      resolvedAt: { type: Date }
    },
    refund: {
      status: { type: String, enum: ["None", "Requested", "Processing", "Refunded", "Rejected"], default: "None" },
      amount: { type: Number, min: 0, default: 0 },
      reason: { type: String, trim: true },
      processedAt: { type: Date }
    }
  },
  {
    timestamps: true
  }
);
var OrderModel = mongoose5.models.Order || mongoose5.model("Order", orderSchema);

// backend/models/InventoryAdjustment.ts
import mongoose6, { Schema as Schema5 } from "mongoose";
var schema = new Schema5(
  {
    book: { type: Schema5.Types.ObjectId, ref: "Book", required: true, index: true },
    previousStock: { type: Number, required: true, min: 0 },
    adjustment: { type: Number, required: true },
    resultingStock: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: ["Restock", "Sale", "Cancellation", "PaymentRejection", "Damage", "Return", "AdminCorrection"], required: true },
    performedBy: { type: Schema5.Types.ObjectId, ref: "User" },
    note: { type: String, trim: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
var InventoryAdjustmentModel = mongoose6.models.InventoryAdjustment || mongoose6.model("InventoryAdjustment", schema);

// backend/models/AdminActivity.ts
import mongoose7, { Schema as Schema6 } from "mongoose";
var schema2 = new Schema6(
  {
    actor: { type: Schema6.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, enum: ["Book", "Order", "Payment", "Coupon", "Customer", "Staff", "Inventory", "Settings"], required: true },
    entityId: { type: String, trim: true },
    changes: { type: Schema6.Types.Mixed },
    ipAddress: { type: String, trim: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
var AdminActivityModel = mongoose7.models.AdminActivity || mongoose7.model("AdminActivity", schema2);

// backend/controllers/adminController.ts
async function getAdminAnalytics(_req, res) {
  try {
    if (isMongoConnected()) {
      const [revenueAgg, totalOrders2, pendingVerificationCount2, lowStockBooks2, recentOrders2, methodAgg] = await Promise.all([
        OrderModel.aggregate([
          { $match: { isPaid: true, orderStatus: { $ne: "Cancelled" } } },
          { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
        ]),
        OrderModel.countDocuments(),
        OrderModel.countDocuments({ orderStatus: "Pending Verification" }),
        BookModel.find({ stockCount: { $lt: 5 } }).sort({ stockCount: 1 }),
        OrderModel.find().sort({ createdAt: -1 }).limit(8),
        OrderModel.aggregate([
          { $match: { orderStatus: { $ne: "Cancelled" } } },
          {
            $group: {
              _id: "$paymentMethod",
              count: { $sum: 1 },
              volume: { $sum: "$totalPrice" }
            }
          }
        ])
      ]);
      res.json({
        totalRevenue: revenueAgg[0]?.totalRevenue || 0,
        totalOrders: totalOrders2,
        pendingVerificationCount: pendingVerificationCount2,
        lowStockBooks: lowStockBooks2,
        recentOrders: recentOrders2,
        paymentBreakdown: methodAgg
      });
      return;
    }
    const db = loadStore();
    const totalRevenue = db.orders.filter((o) => o.isPaid && o.orderStatus !== "Cancelled").reduce((sum, o) => sum + o.totalPrice, 0);
    const totalOrders = db.orders.length;
    const pendingVerificationCount = db.orders.filter(
      (o) => o.orderStatus === "Pending Verification"
    ).length;
    const lowStockBooks = db.books.filter((b) => b.stockCount < 5).sort((a, b) => a.stockCount - b.stockCount);
    const recentOrders = [...db.orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
    const methods = ["KBZPay", "WaveMoney", "AYAPay", "CashOnDelivery"];
    const paymentBreakdown = methods.map((m) => {
      const matching = db.orders.filter((o) => o.paymentMethod === m && o.orderStatus !== "Cancelled");
      return {
        _id: m,
        count: matching.length,
        volume: matching.reduce((s, o) => s + o.totalPrice, 0)
      };
    });
    res.json({
      totalRevenue,
      totalOrders,
      pendingVerificationCount,
      lowStockBooks,
      recentOrders,
      paymentBreakdown
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to compute analytics." });
  }
}
async function getCoupons(_req, res) {
  try {
    if (isMongoConnected()) {
      const coupons = await CouponModel.find().sort({ createdAt: -1 });
      res.json({ coupons });
      return;
    }
    const db = loadStore();
    res.json({ coupons: db.coupons });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch coupons." });
  }
}
async function createCoupon(req, res) {
  try {
    const { code, discountPercentage, expiryDate, usageLimit } = req.body;
    if (!code || !discountPercentage || !expiryDate) {
      res.status(400).json({ message: "Code, discount percentage, and expiry date are required." });
      return;
    }
    const normalized = code.trim().toUpperCase();
    if (isMongoConnected()) {
      const coupon2 = await CouponModel.create({
        code: normalized,
        discountPercentage: Number(discountPercentage),
        expiryDate: new Date(expiryDate),
        isActive: true,
        usageLimit: Math.max(1, Number(usageLimit ?? 1e3)),
        usedCount: 0
      });
      res.status(201).json({ coupon: coupon2 });
      return;
    }
    const coupon = await runStoreTransaction((db) => {
      if (db.coupons.some((c) => c.code === normalized)) {
        throw Object.assign(new Error("A promo code with that name already exists."), { status: 409 });
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const created = {
        _id: generateObjectId(),
        code: normalized,
        discountPercentage: Math.min(90, Math.max(1, Number(discountPercentage))),
        expiryDate: new Date(expiryDate).toISOString(),
        usageLimit: usageLimit ? Math.max(1, Number(usageLimit)) : 1e3,
        usedCount: 0,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      db.coupons.unshift(created);
      return created;
    });
    res.status(201).json({ coupon });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Failed to create coupon." });
  }
}
async function toggleCoupon(req, res) {
  try {
    const { id } = req.params;
    if (isMongoConnected()) {
      const coupon2 = await CouponModel.findById(id);
      if (!coupon2) {
        res.status(404).json({ message: "Coupon not found." });
        return;
      }
      coupon2.isActive = !coupon2.isActive;
      await coupon2.save();
      res.json({ coupon: coupon2 });
      return;
    }
    const coupon = await runStoreTransaction((db) => {
      const found = db.coupons.find((c) => c._id === id);
      if (!found) {
        throw Object.assign(new Error("Coupon not found."), { status: 404 });
      }
      found.isActive = !found.isActive;
      found.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      return found;
    });
    res.json({ coupon });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Failed to toggle coupon." });
  }
}
async function getCustomers(_req, res) {
  if (!isMongoConnected()) {
    const db = loadStore();
    res.json({ customers: db.users.filter((u) => u.role === "customer") });
    return;
  }
  const customers = await UserModel.find({ role: "customer" }).sort({ createdAt: -1 });
  res.json({ customers });
}
async function updateCustomerStatus(req, res) {
  const { id } = req.params;
  const { accountStatus } = req.body;
  if (!accountStatus || !["active", "suspended"].includes(accountStatus)) {
    res.status(400).json({ message: "Account status must be active or suspended." });
    return;
  }
  if (!isMongoConnected()) {
    await runStoreTransaction((db) => {
      const user = db.users.find((u) => u._id === id && u.role === "customer");
      if (!user) throw Object.assign(new Error("Customer not found."), { status: 404 });
      user.accountStatus = accountStatus;
      user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    });
    res.json({ message: "Customer account status updated." });
    return;
  }
  const customer = await UserModel.findOneAndUpdate(
    { _id: id, role: "customer" },
    { $set: { accountStatus } },
    { new: true }
  );
  if (!customer) {
    res.status(404).json({ message: "Customer not found." });
    return;
  }
  await AdminActivityModel.create({ actor: req.user.id, actorName: req.user.name, action: "Update customer account status", entityType: "Customer", entityId: id, changes: { accountStatus } });
  res.json({ customer });
}
async function getReports(req, res) {
  const start = req.query.start ? new Date(String(req.query.start)) : new Date(Date.now() - 30 * 864e5);
  const end = req.query.end ? new Date(String(req.query.end)) : /* @__PURE__ */ new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    res.status(400).json({ message: "Invalid start/end date range." });
    return;
  }
  if (!isMongoConnected()) {
    const db = loadStore();
    const orders2 = db.orders.filter((o) => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end);
    const paid = orders2.filter((o) => o.isPaid && o.orderStatus !== "Cancelled");
    res.json({ revenue: paid.reduce((s, o) => s + o.totalPrice, 0), orders: paid.length, salesSeries: [], bestSellingBooks: [] });
    return;
  }
  const [revenue, orders, bestSelling] = await Promise.all([
    OrderModel.aggregate([{ $match: { isPaid: true, orderStatus: { $ne: "Cancelled" }, createdAt: { $gte: start, $lte: end } } }, { $group: { _id: null, revenue: { $sum: "$totalPrice" }, count: { $sum: 1 } } }]),
    OrderModel.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }),
    OrderModel.aggregate([{ $match: { orderStatus: { $ne: "Cancelled" }, createdAt: { $gte: start, $lte: end } } }, { $unwind: "$orderItems" }, { $group: { _id: "$orderItems.book", title: { $first: "$orderItems.title" }, sold: { $sum: "$orderItems.qty" }, revenue: { $sum: { $multiply: ["$orderItems.qty", "$orderItems.price"] } } } }, { $sort: { sold: -1 } }, { $limit: 10 }])
  ]);
  const salesSeries = await OrderModel.aggregate([{ $match: { isPaid: true, orderStatus: { $ne: "Cancelled" }, createdAt: { $gte: start, $lte: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$totalPrice" }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  res.json({ revenue: revenue[0]?.revenue || 0, orders: revenue[0]?.count || 0, orderList: orders, salesSeries, bestSellingBooks: bestSelling });
}
async function getInventoryHistory(_req, res) {
  if (!isMongoConnected()) {
    res.json({ adjustments: [] });
    return;
  }
  const adjustments = await InventoryAdjustmentModel.find().sort({ createdAt: -1 }).limit(100).populate("book", "title isbn");
  res.json({ adjustments });
}
async function getAdminActivity(_req, res) {
  if (!isMongoConnected()) {
    res.json({ activity: [] });
    return;
  }
  const activity = await AdminActivityModel.find().sort({ createdAt: -1 }).limit(200);
  res.json({ activity });
}

// backend/middleware/authMiddleware.ts
import jwt from "jsonwebtoken";
function getJwtSecret() {
  return process.env.JWT_SECRET?.trim() || "bookhaven_dev_jwt_secret_key_change_in_prod";
}
function signAuthToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}
async function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authentication required. Please sign in." });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (isMongoConnected()) {
      const user2 = await UserModel.findById(decoded.id).select("-password -otp -otpExpires");
      if (!user2) {
        res.status(401).json({ message: "User account no longer exists." });
        return;
      }
      if (!user2.isVerified) {
        res.status(403).json({ message: "Please verify your email OTP before continuing." });
        return;
      }
      if (user2.accountStatus === "suspended") {
        res.status(403).json({ message: "This account has been suspended." });
        return;
      }
      req.user = {
        id: user2._id.toString(),
        name: user2.name,
        email: user2.email,
        role: user2.role,
        isVerified: user2.isVerified
      };
      next();
      return;
    }
    const db = loadStore();
    const user = db.users.find((u) => u._id === decoded.id);
    if (!user) {
      res.status(401).json({ message: "User account no longer exists." });
      return;
    }
    if (!user.isVerified) {
      res.status(403).json({ message: "Please verify your email OTP before continuing." });
      return;
    }
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    };
    next();
  } catch {
    res.status(401).json({ message: "Session expired or invalid token. Please sign in again." });
  }
}
function adminOnly(req, res, next) {
  if (!req.user || !["admin", "staff"].includes(req.user.role)) {
    res.status(403).json({ message: "Staff or administrator access required." });
    return;
  }
  next();
}

// backend/routes/adminRoutes.ts
var router = Router();
router.get("/analytics", protect, adminOnly, getAdminAnalytics);
router.get("/coupons", protect, adminOnly, getCoupons);
router.post("/coupons", protect, adminOnly, createCoupon);
router.put("/coupons/:id/toggle", protect, adminOnly, toggleCoupon);
router.get("/customers", protect, adminOnly, getCustomers);
router.put("/customers/:id/status", protect, adminOnly, updateCustomerStatus);
router.get("/reports", protect, adminOnly, getReports);
router.get("/inventory/history", protect, adminOnly, getInventoryHistory);
router.get("/activity", protect, adminOnly, getAdminActivity);
var adminRoutes_default = router;

// backend/routes/authRoutes.ts
import { Router as Router2 } from "express";

// backend/controllers/authController.ts
import crypto from "crypto";
import bcrypt3 from "bcryptjs";
import mongoose8 from "mongoose";

// backend/utils/sendEmail.ts
import { Resend } from "resend";
var EmailDeliveryError = class extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "EmailDeliveryError";
    this.status = status;
    this.code = code;
  }
};
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function buildOtpHtml(name, otp) {
  const safeName = escapeHtml(name);
  return `
    <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #FAF9F6; color: #18181B; border: 1px solid #E5E0D8;">
      <h1 style="margin: 0 0 8px; font-size: 24px; color: #0F5132;">BookHaven Myanmar</h1>
      <p style="margin: 0 0 24px; font-family: sans-serif; font-size: 14px; color: #52525B;">Email verification required</p>
      <p style="font-family: sans-serif; font-size: 15px; line-height: 1.6;">Mingalaba ${safeName},</p>
      <p style="font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Use the 6-digit verification code below to verify your email address and activate your BookHaven account.
        This code expires in <strong>5 minutes</strong>.
      </p>
      <div style="margin: 28px 0; padding: 18px; background: #FFFFFF; border: 1px solid #D4D4D8; text-align: center;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0F5132;">${otp}</span>
      </div>
      <p style="font-family: sans-serif; font-size: 12px; color: #71717A;">
        Never share this verification code with anyone. BookHaven staff will never ask for your code.
      </p>
    </div>
  `;
}
async function sendOtpEmail(toEmail, name, otp) {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    const devMessage = "Development configuration error: RESEND_API_KEY is not configured in backend environment variables.";
    const prodMessage = "Verification email service is temporarily unavailable. Please try again later.";
    throw new EmailDeliveryError(
      process.env.NODE_ENV !== "production" ? devMessage : prodMessage,
      503,
      "EMAIL_NOT_CONFIGURED"
    );
  }
  const resend = new Resend(resendKey);
  const fromAddress = process.env.EMAIL_FROM?.trim() || "BookHaven <onboarding@resend.dev>";
  const html = buildOtpHtml(name, otp);
  const subject = `${otp} is your BookHaven verification code`;
  let result;
  try {
    result = await resend.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject,
      html
    });
  } catch (err) {
    console.error("[BookHaven Mailer] Resend request failed:", err);
    throw new EmailDeliveryError(
      "Unable to reach the Resend email service. Please try again shortly.",
      502,
      "EMAIL_DELIVERY_FAILED"
    );
  }
  if (result.error || !result.data?.id) {
    console.error("[Resend Full Error]:", {
      name: result.error?.name,
      message: result.error?.message,
      statusCode: result.error?.statusCode
    });
    throw new EmailDeliveryError(
      `Resend failed: ${result.error?.message || "Unknown error"}`,
      502,
      "EMAIL_DELIVERY_FAILED"
    );
  }
}

// backend/controllers/authController.ts
var OTP_EXPIRY_MS = 5 * 60 * 1e3;
var RESEND_COOLDOWN_MS = 60 * 1e3;
var MAX_OTP_ATTEMPTS = 5;
var OTP_LOCKOUT_MS = 15 * 60 * 1e3;
function generateSixDigitOtp() {
  return crypto.randomInt(0, 1e6).toString().padStart(6, "0");
}
async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || name.trim().length < 2) {
      res.status(400).json({ message: "Please enter your full name (at least 2 characters)." });
      return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      res.status(400).json({ message: "Please provide a valid email address." });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const now = Date.now();
    if (isMongoConnected()) {
      const existing = await UserModel.findOne({ email: normalizedEmail }).select(
        "+otpLastSentAt +otpLockedUntil"
      );
      if (existing && existing.isVerified) {
        res.status(409).json({ message: "An account with this email already exists." });
        return;
      }
      if (existing?.otpLockedUntil && existing.otpLockedUntil.getTime() > now) {
        const waitMinutes = Math.ceil((existing.otpLockedUntil.getTime() - now) / 6e4);
        res.status(429).json({
          message: `Verification is temporarily locked due to too many failed attempts. Try again in ${waitMinutes} minute(s).`
        });
        return;
      }
      if (existing?.otpLastSentAt && now - existing.otpLastSentAt.getTime() < RESEND_COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil(
          (RESEND_COOLDOWN_MS - (now - existing.otpLastSentAt.getTime())) / 1e3
        );
        res.status(429).json({
          message: `Please wait ${retryAfterSeconds}s before requesting another verification code.`,
          retryAfterSeconds
        });
        return;
      }
      const otp2 = generateSixDigitOtp();
      const otpHash2 = await bcrypt3.hash(otp2, 10);
      const otpExpires = new Date(now + OTP_EXPIRY_MS);
      const otpLastSentAt = new Date(now);
      await sendOtpEmail(normalizedEmail, trimmedName, otp2);
      if (existing && !existing.isVerified) {
        existing.name = trimmedName;
        existing.password = password;
        existing.otpHash = otpHash2;
        existing.otpExpires = otpExpires;
        existing.otpLastSentAt = otpLastSentAt;
        existing.otpAttempts = 0;
        existing.otpLockedUntil = null;
        await existing.save();
      } else {
        await UserModel.create({
          name: trimmedName,
          email: normalizedEmail,
          password,
          role: "customer",
          isVerified: false,
          otpHash: otpHash2,
          otpExpires,
          otpLastSentAt,
          otpAttempts: 0,
          otpLockedUntil: null
        });
      }
      res.status(201).json({
        message: "Verification code sent to your email. Please check your inbox (expires in 5 minutes).",
        email: normalizedEmail,
        cooldownSeconds: 60,
        expiresInSeconds: 300
      });
      return;
    }
    const dbSnapshot = loadStore();
    const existingLocal = dbSnapshot.users.find((u) => u.email === normalizedEmail);
    if (existingLocal && existingLocal.isVerified) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }
    if (existingLocal?.otpLockedUntil && new Date(existingLocal.otpLockedUntil).getTime() > now) {
      const waitMinutes = Math.ceil(
        (new Date(existingLocal.otpLockedUntil).getTime() - now) / 6e4
      );
      res.status(429).json({
        message: `Verification is temporarily locked due to too many failed attempts. Try again in ${waitMinutes} minute(s).`
      });
      return;
    }
    if (existingLocal?.otpLastSentAt && now - new Date(existingLocal.otpLastSentAt).getTime() < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (now - new Date(existingLocal.otpLastSentAt).getTime())) / 1e3
      );
      res.status(429).json({
        message: `Please wait ${retryAfterSeconds}s before requesting another verification code.`,
        retryAfterSeconds
      });
      return;
    }
    const otp = generateSixDigitOtp();
    const otpHash = await bcrypt3.hash(otp, 10);
    const otpExpiresIso = new Date(now + OTP_EXPIRY_MS).toISOString();
    const otpLastSentIso = new Date(now).toISOString();
    await sendOtpEmail(normalizedEmail, trimmedName, otp);
    await runStoreTransaction(async (db) => {
      const existing = db.users.find((u) => u.email === normalizedEmail);
      if (existing && existing.isVerified) {
        const err = new Error("An account with this email already exists.");
        err.status = 409;
        throw err;
      }
      const hashedPassword = await bcrypt3.hash(password, 10);
      const nowIso = new Date(now).toISOString();
      if (existing && !existing.isVerified) {
        existing.name = trimmedName;
        existing.password = hashedPassword;
        existing.otpHash = otpHash;
        existing.otpExpires = otpExpiresIso;
        existing.otpLastSentAt = otpLastSentIso;
        existing.otpAttempts = 0;
        existing.otpLockedUntil = null;
        existing.updatedAt = nowIso;
      } else {
        db.users.push({
          _id: generateObjectId(),
          name: trimmedName,
          email: normalizedEmail,
          password: hashedPassword,
          role: "customer",
          isVerified: false,
          otpHash,
          otpExpires: otpExpiresIso,
          otpLastSentAt: otpLastSentIso,
          otpAttempts: 0,
          otpLockedUntil: null,
          wishlist: [],
          shippingAddress: {
            fullName: trimmedName,
            phone: "",
            streetAddress: "",
            township: "",
            city: "Yangon",
            postalCode: "11181"
          },
          createdAt: nowIso,
          updatedAt: nowIso
        });
      }
    });
    res.status(201).json({
      message: "Verification code sent to your email. Please check your inbox (expires in 5 minutes).",
      email: normalizedEmail,
      cooldownSeconds: 60,
      expiresInSeconds: 300
    });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({
      message: error.message || "Registration failed.",
      code: error.code
    });
  }
}
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp || !/^\d{6}$/.test(otp.trim())) {
      res.status(400).json({ message: "Please provide your email and a valid 6-digit OTP code." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    const now = Date.now();
    if (isMongoConnected()) {
      const user = await UserModel.findOne({ email: normalizedEmail }).select(
        "+otpHash +otpExpires +otpAttempts +otpLockedUntil"
      );
      if (!user) {
        res.status(404).json({ message: "Account not found." });
        return;
      }
      if (user.isVerified) {
        res.status(400).json({ message: "Account is already verified. Please sign in." });
        return;
      }
      if (user.otpLockedUntil && user.otpLockedUntil.getTime() > now) {
        const waitMinutes = Math.ceil((user.otpLockedUntil.getTime() - now) / 6e4);
        res.status(429).json({
          message: `Too many incorrect verification attempts. Please wait ${waitMinutes} minute(s) before trying again.`
        });
        return;
      }
      if (!user.otpHash || !user.otpExpires) {
        res.status(400).json({ message: "No active verification code found. Please request a new code." });
        return;
      }
      if (user.otpExpires.getTime() < now) {
        user.otpHash = null;
        user.otpExpires = null;
        await user.save();
        res.status(400).json({ message: "Verification code has expired. Please request a new code." });
        return;
      }
      const isMatch2 = await bcrypt3.compare(cleanOtp, user.otpHash);
      if (!isMatch2) {
        user.otpAttempts = (user.otpAttempts || 0) + 1;
        if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
          user.otpLockedUntil = new Date(now + OTP_LOCKOUT_MS);
          user.otpHash = null;
          user.otpExpires = null;
          await user.save();
          res.status(429).json({
            message: "Too many incorrect verification attempts. Verification has been locked for 15 minutes."
          });
          return;
        }
        await user.save();
        const remaining = MAX_OTP_ATTEMPTS - user.otpAttempts;
        res.status(400).json({
          message: `Invalid 6-digit verification code. ${remaining} attempt(s) remaining.`
        });
        return;
      }
      user.isVerified = true;
      user.otpHash = null;
      user.otpExpires = null;
      user.otpLastSentAt = null;
      user.otpAttempts = 0;
      user.otpLockedUntil = null;
      await user.save();
      const token2 = signAuthToken({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: true
      });
      res.json({
        message: "Email verified successfully.",
        token: token2,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          wishlist: user.wishlist.map((id) => id.toString()),
          shippingAddress: user.shippingAddress
        }
      });
      return;
    }
    const dbCheck = loadStore();
    const candidate = dbCheck.users.find((u) => u.email === normalizedEmail);
    if (!candidate) {
      res.status(404).json({ message: "Account not found." });
      return;
    }
    if (candidate.isVerified) {
      res.status(400).json({ message: "Account is already verified. Please sign in." });
      return;
    }
    if (candidate.otpLockedUntil && new Date(candidate.otpLockedUntil).getTime() > now) {
      const waitMinutes = Math.ceil((new Date(candidate.otpLockedUntil).getTime() - now) / 6e4);
      res.status(429).json({
        message: `Too many incorrect verification attempts. Please wait ${waitMinutes} minute(s) before trying again.`
      });
      return;
    }
    if (!candidate.otpHash || !candidate.otpExpires) {
      res.status(400).json({ message: "No active verification code found. Please request a new code." });
      return;
    }
    if (new Date(candidate.otpExpires).getTime() < now) {
      await runStoreTransaction((db) => {
        const user = db.users.find((u) => u.email === normalizedEmail);
        if (user) {
          user.otpHash = null;
          user.otpExpires = null;
          user.updatedAt = new Date(now).toISOString();
        }
      });
      res.status(400).json({ message: "Verification code has expired. Please request a new code." });
      return;
    }
    const isMatch = await bcrypt3.compare(cleanOtp, candidate.otpHash);
    if (!isMatch) {
      const attemptResult = await runStoreTransaction((db) => {
        const user = db.users.find((u) => u.email === normalizedEmail);
        if (!user) return { locked: false, remaining: 0 };
        user.otpAttempts = (user.otpAttempts || 0) + 1;
        user.updatedAt = new Date(now).toISOString();
        if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
          user.otpLockedUntil = new Date(now + OTP_LOCKOUT_MS).toISOString();
          user.otpHash = null;
          user.otpExpires = null;
          return { locked: true, remaining: 0 };
        }
        return { locked: false, remaining: MAX_OTP_ATTEMPTS - user.otpAttempts };
      });
      if (attemptResult.locked) {
        res.status(429).json({
          message: "Too many incorrect verification attempts. Verification has been locked for 15 minutes."
        });
        return;
      }
      res.status(400).json({
        message: `Invalid 6-digit verification code. ${attemptResult.remaining} attempt(s) remaining.`
      });
      return;
    }
    const verifiedUser = await runStoreTransaction((db) => {
      const user = db.users.find((u) => u.email === normalizedEmail);
      if (!user) {
        const err = new Error("Account not found.");
        err.status = 404;
        throw err;
      }
      user.isVerified = true;
      user.otpHash = null;
      user.otpExpires = null;
      user.otpLastSentAt = null;
      user.otpAttempts = 0;
      user.otpLockedUntil = null;
      user.updatedAt = new Date(now).toISOString();
      return user;
    });
    const token = signAuthToken({
      id: verifiedUser._id,
      name: verifiedUser.name,
      email: verifiedUser.email,
      role: verifiedUser.role,
      isVerified: true
    });
    res.json({
      message: "Email verified successfully.",
      token,
      user: {
        id: verifiedUser._id,
        name: verifiedUser.name,
        email: verifiedUser.email,
        role: verifiedUser.role,
        isVerified: verifiedUser.isVerified,
        wishlist: verifiedUser.wishlist,
        shippingAddress: verifiedUser.shippingAddress
      }
    });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "OTP verification failed." });
  }
}
async function resendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email address is required." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const now = Date.now();
    const otp = generateSixDigitOtp();
    const otpHash = await bcrypt3.hash(otp, 10);
    const otpExpires = new Date(now + OTP_EXPIRY_MS);
    const otpLastSentAt = new Date(now);
    if (isMongoConnected()) {
      const user = await UserModel.findOne({ email: normalizedEmail }).select(
        "+otpLastSentAt +otpLockedUntil"
      );
      if (!user) {
        res.status(404).json({ message: "No account found with this email." });
        return;
      }
      if (user.isVerified) {
        res.status(400).json({ message: "Account is already verified." });
        return;
      }
      if (user.otpLockedUntil && user.otpLockedUntil.getTime() > now) {
        const waitMinutes = Math.ceil((user.otpLockedUntil.getTime() - now) / 6e4);
        res.status(429).json({
          message: `Verification is temporarily locked due to too many failed attempts. Try again in ${waitMinutes} minute(s).`
        });
        return;
      }
      if (user.otpLastSentAt && now - user.otpLastSentAt.getTime() < RESEND_COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil(
          (RESEND_COOLDOWN_MS - (now - user.otpLastSentAt.getTime())) / 1e3
        );
        res.status(429).json({
          message: `Please wait ${retryAfterSeconds}s before requesting another verification code.`,
          retryAfterSeconds
        });
        return;
      }
      await sendOtpEmail(normalizedEmail, user.name, otp);
      user.otpHash = otpHash;
      user.otpExpires = otpExpires;
      user.otpLastSentAt = otpLastSentAt;
      user.otpAttempts = 0;
      await user.save();
      res.json({
        message: "A new 6-digit verification code has been sent to your email.",
        cooldownSeconds: 60,
        expiresInSeconds: 300
      });
      return;
    }
    const dbSnapshot = loadStore();
    const userLocal = dbSnapshot.users.find((u) => u.email === normalizedEmail);
    if (!userLocal) {
      res.status(404).json({ message: "No account found with this email." });
      return;
    }
    if (userLocal.isVerified) {
      res.status(400).json({ message: "Account is already verified." });
      return;
    }
    if (userLocal.otpLockedUntil && new Date(userLocal.otpLockedUntil).getTime() > now) {
      const waitMinutes = Math.ceil((new Date(userLocal.otpLockedUntil).getTime() - now) / 6e4);
      res.status(429).json({
        message: `Verification is temporarily locked due to too many failed attempts. Try again in ${waitMinutes} minute(s).`
      });
      return;
    }
    if (userLocal.otpLastSentAt && now - new Date(userLocal.otpLastSentAt).getTime() < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (now - new Date(userLocal.otpLastSentAt).getTime())) / 1e3
      );
      res.status(429).json({
        message: `Please wait ${retryAfterSeconds}s before requesting another verification code.`,
        retryAfterSeconds
      });
      return;
    }
    await sendOtpEmail(normalizedEmail, userLocal.name, otp);
    await runStoreTransaction((db) => {
      const user = db.users.find((u) => u.email === normalizedEmail);
      if (!user) return;
      user.otpHash = otpHash;
      user.otpExpires = otpExpires.toISOString();
      user.otpLastSentAt = otpLastSentAt.toISOString();
      user.otpAttempts = 0;
      user.updatedAt = new Date(now).toISOString();
    });
    res.json({
      message: "A new 6-digit verification code has been sent to your email.",
      cooldownSeconds: 60,
      expiresInSeconds: 300
    });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({
      message: error.message || "Could not resend OTP.",
      code: error.code
    });
  }
}
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Please enter both email and password." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (isMongoConnected()) {
      const user2 = await UserModel.findOne({ email: normalizedEmail }).select("+password");
      if (!user2 || !await user2.comparePassword(password)) {
        res.status(401).json({ message: "Invalid email or password." });
        return;
      }
      if (!user2.isVerified) {
        res.status(403).json({
          message: "Please verify your email OTP before logging in.",
          needsVerification: true,
          email: user2.email
        });
        return;
      }
      const token2 = signAuthToken({
        id: user2._id.toString(),
        name: user2.name,
        email: user2.email,
        role: user2.role,
        isVerified: user2.isVerified
      });
      res.json({
        token: token2,
        user: {
          id: user2._id.toString(),
          name: user2.name,
          email: user2.email,
          role: user2.role,
          isVerified: user2.isVerified,
          wishlist: user2.wishlist.map((id) => id.toString()),
          shippingAddress: user2.shippingAddress
        }
      });
      return;
    }
    const db = loadStore();
    const user = db.users.find((u) => u.email === normalizedEmail);
    if (!user || !await bcrypt3.compare(password, user.password)) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }
    if (!user.isVerified) {
      res.status(403).json({
        message: "Please verify your email OTP before logging in.",
        needsVerification: true,
        email: user.email
      });
      return;
    }
    const token = signAuthToken({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        wishlist: user.wishlist,
        shippingAddress: user.shippingAddress
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Login failed." });
  }
}
async function getProfile(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }
    if (isMongoConnected()) {
      const user2 = await UserModel.findById(req.user.id);
      if (!user2) {
        res.status(404).json({ message: "User not found." });
        return;
      }
      res.json({
        user: {
          id: user2._id.toString(),
          name: user2.name,
          email: user2.email,
          role: user2.role,
          isVerified: user2.isVerified,
          wishlist: user2.wishlist.map((id) => id.toString()),
          shippingAddress: user2.shippingAddress
        }
      });
      return;
    }
    const db = loadStore();
    const user = db.users.find((u) => u._id === req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        wishlist: user.wishlist,
        shippingAddress: user.shippingAddress
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not load profile." });
  }
}
async function updateProfile(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }
    const { name, shippingAddress } = req.body;
    if (isMongoConnected()) {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
      }
      if (name && name.trim().length >= 2) user.name = name.trim();
      if (shippingAddress) user.shippingAddress = shippingAddress;
      await user.save();
      res.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          wishlist: user.wishlist.map((id) => id.toString()),
          shippingAddress: user.shippingAddress
        }
      });
      return;
    }
    const updated = await runStoreTransaction((db) => {
      const user = db.users.find((u) => u._id === req.user.id);
      if (!user) {
        const err = new Error("User not found.");
        err.status = 404;
        throw err;
      }
      if (name && name.trim().length >= 2) user.name = name.trim();
      if (shippingAddress) user.shippingAddress = shippingAddress;
      user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      return user;
    });
    res.json({
      user: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isVerified: updated.isVerified,
        wishlist: updated.wishlist,
        shippingAddress: updated.shippingAddress
      }
    });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Profile update failed." });
  }
}
async function toggleWishlist(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }
    const { bookId } = req.params;
    if (isMongoConnected()) {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
      }
      const exists = user.wishlist.some((id) => id.toString() === bookId);
      if (exists) {
        user.wishlist = user.wishlist.filter((id) => id.toString() !== bookId);
      } else {
        user.wishlist.push(new mongoose8.Types.ObjectId(bookId));
      }
      await user.save();
      res.json({ wishlist: user.wishlist.map((id) => id.toString()) });
      return;
    }
    const wishlist = await runStoreTransaction((db) => {
      const user = db.users.find((u) => u._id === req.user.id);
      if (!user) {
        const err = new Error("User not found.");
        err.status = 404;
        throw err;
      }
      if (user.wishlist.includes(bookId)) {
        user.wishlist = user.wishlist.filter((id) => id !== bookId);
      } else {
        user.wishlist.push(bookId);
      }
      user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      return user.wishlist;
    });
    res.json({ wishlist });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Wishlist update failed." });
  }
}

// backend/middleware/rateLimitMiddleware.ts
function createRateLimiter(options) {
  const buckets = /* @__PURE__ */ new Map();
  return (req, res, next) => {
    const now = Date.now();
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const emailPart = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const key = `${options.keyPrefix}:${clientIp}:${emailPart}`;
    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }
    if (existing.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1e3));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        message: options.message,
        retryAfterSeconds
      });
      return;
    }
    existing.count += 1;
    next();
  };
}

// backend/routes/authRoutes.ts
var router2 = Router2();
var registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1e3,
  maxRequests: 10,
  keyPrefix: "register",
  message: "Too many registration attempts. Please try again in a few minutes."
});
var verifyOtpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1e3,
  maxRequests: 10,
  keyPrefix: "verify-otp",
  message: "Too many verification attempts. Please wait before trying again."
});
var resendOtpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1e3,
  maxRequests: 6,
  keyPrefix: "resend-otp",
  message: "Too many code resend requests. Please wait before trying again."
});
var loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1e3,
  maxRequests: 15,
  keyPrefix: "login",
  message: "Too many sign-in attempts. Please wait before trying again."
});
router2.post("/register", registerLimiter, registerUser);
router2.post("/verify-otp", verifyOtpLimiter, verifyOtp);
router2.post("/resend-otp", resendOtpLimiter, resendOtp);
router2.post("/login", loginLimiter, loginUser);
router2.get("/profile", protect, getProfile);
router2.put("/profile", protect, updateProfile);
router2.post("/wishlist/:bookId", protect, toggleWishlist);
var authRoutes_default = router2;

// backend/routes/bookRoutes.ts
import { Router as Router3 } from "express";

// backend/controllers/bookController.ts
async function getBooks(req, res) {
  try {
    const q = req.query.q?.trim() || "";
    const category = req.query.category?.trim() || "";
    const sort = req.query.sort?.trim() || "newest";
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || "12"), 10) || 12));
    if (isMongoConnected()) {
      const filter = {};
      if (category && category !== "All") filter.category = category;
      if (q) {
        filter.$or = [
          { title: { $regex: q, $options: "i" } },
          { author: { $regex: q, $options: "i" } },
          { isbn: { $regex: q, $options: "i" } },
          { category: { $regex: q, $options: "i" } }
        ];
      }
      const pipeline = [
        { $match: filter },
        {
          $addFields: {
            numReviews: { $size: { $ifNull: ["$reviews", []] } },
            rating: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$reviews", []] } }, 0] },
                { $avg: "$reviews.rating" },
                0
              ]
            }
          }
        }
      ];
      const sortMap = {
        newest: { createdAt: -1 },
        "price-asc": { price: 1, createdAt: -1 },
        "price-desc": { price: -1, createdAt: -1 },
        rating: { rating: -1, numReviews: -1, createdAt: -1 }
      };
      pipeline.push({ $sort: sortMap[sort] || sortMap.newest });
      const countPipeline = [...pipeline.slice(0, 2), { $count: "total" }];
      const countResult = await BookModel.aggregate(countPipeline);
      const total2 = countResult[0]?.total || 0;
      pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
      const books = await BookModel.aggregate(pipeline);
      const categories2 = await BookModel.distinct("category");
      res.json({
        books,
        categories: categories2,
        pagination: { page, limit, total: total2, totalPages: Math.ceil(total2 / limit) }
      });
      return;
    }
    const db = loadStore();
    const categories = Array.from(new Set(db.books.map((b) => b.category)));
    let filtered = [...db.books];
    if (category && category !== "All") filtered = filtered.filter((b) => b.category === category);
    if (q) {
      const needle = q.toLowerCase();
      filtered = filtered.filter(
        (b) => [b.title, b.author, b.isbn, b.category].some((value) => value.toLowerCase().includes(needle))
      );
    }
    filtered = filtered.map((book) => {
      const numReviews = book.reviews.length;
      const rating = numReviews ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / numReviews : 0;
      return { ...book, rating, numReviews };
    });
    if (sort === "price-asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sort === "rating") {
      filtered.sort(
        (a, b) => (b.numReviews === 0 ? -1 : b.rating) - (a.numReviews === 0 ? -1 : a.rating) || b.numReviews - a.numReviews
      );
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const total = filtered.length;
    const paged = filtered.slice((page - 1) * limit, page * limit);
    res.json({
      books: paged,
      categories,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch books." });
  }
}
async function getBookById(req, res) {
  try {
    const { id } = req.params;
    if (isMongoConnected()) {
      const book2 = await BookModel.findById(id);
      if (!book2) {
        res.status(404).json({ message: "Book not found." });
        return;
      }
      res.json({ book: book2 });
      return;
    }
    const db = loadStore();
    const book = db.books.find((b) => b._id === id);
    if (!book) {
      res.status(404).json({ message: "Book not found." });
      return;
    }
    res.json({ book });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load book details." });
  }
}
async function addBookReview(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Please sign in to post a review." });
      return;
    }
    const { id } = req.params;
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ message: "Rating must be between 1 and 5 stars." });
      return;
    }
    if (!comment || comment.trim().length < 4) {
      res.status(400).json({ message: "Please write a brief review (at least 4 characters)." });
      return;
    }
    if (isMongoConnected()) {
      const book = await BookModel.findById(id);
      if (!book) {
        res.status(404).json({ message: "Book not found." });
        return;
      }
      const existingIdx = book.reviews.findIndex(
        (r) => r.user.toString() === req.user.id
      );
      if (existingIdx >= 0) {
        book.reviews[existingIdx].rating = Number(rating);
        book.reviews[existingIdx].comment = comment.trim();
        book.reviews[existingIdx].createdAt = /* @__PURE__ */ new Date();
      } else {
        book.reviews.push({
          user: req.user.id,
          name: req.user.name,
          rating: Number(rating),
          comment: comment.trim(),
          createdAt: /* @__PURE__ */ new Date()
        });
      }
      book.numReviews = book.reviews.length;
      book.rating = book.numReviews ? Number((book.reviews.reduce((sum, item) => sum + item.rating, 0) / book.numReviews).toFixed(1)) : 0;
      await book.save();
      res.status(201).json({ book });
      return;
    }
    const updatedBook = await runStoreTransaction((db) => {
      const book = db.books.find((b) => b._id === id);
      if (!book) {
        const err = new Error("Book not found.");
        err.status = 404;
        throw err;
      }
      const existingIdx = book.reviews.findIndex((r) => r.user === req.user.id);
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      if (existingIdx >= 0) {
        book.reviews[existingIdx].rating = Number(rating);
        book.reviews[existingIdx].comment = comment.trim();
        book.reviews[existingIdx].createdAt = nowIso;
      } else {
        book.reviews.push({
          _id: generateObjectId(),
          user: req.user.id,
          name: req.user.name,
          rating: Number(rating),
          comment: comment.trim(),
          createdAt: nowIso
        });
      }
      book.numReviews = book.reviews.length;
      book.rating = Number(
        (book.reviews.reduce((sum, item) => sum + item.rating, 0) / book.reviews.length).toFixed(1)
      );
      book.updatedAt = nowIso;
      return book;
    });
    res.status(201).json({ book: updatedBook });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Failed to submit review." });
  }
}
async function createBook(req, res) {
  try {
    const {
      title,
      author,
      isbn,
      description,
      price,
      stockCount,
      category,
      coverImageUrl,
      publisher,
      language,
      pages
    } = req.body;
    if (!title || !author || !isbn || !description || price === void 0 || !category) {
      res.status(400).json({ message: "Title, author, ISBN, description, price, and category are required." });
      return;
    }
    const uploadedCover = req.file ? `/uploads/covers/${req.file.filename}` : void 0;
    const finalCover = uploadedCover || coverImageUrl?.trim();
    if (!finalCover) {
      const err = new Error("A real book-cover image is required.");
      err.status = 400;
      throw err;
    }
    if (isMongoConnected()) {
      const book = await BookModel.create({
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        description: description.trim(),
        price: Number(price),
        stockCount: Number(stockCount ?? 0),
        category: category.trim(),
        coverImageUrl: finalCover,
        publisher: publisher?.trim() || "BookHaven Editions",
        language: language?.trim() || "English / Myanmar",
        pages: Number(pages ?? 240)
      });
      res.status(201).json({ book });
      return;
    }
    const created = await runStoreTransaction((db) => {
      if (db.books.some((b) => b.isbn.toLowerCase() === String(isbn).trim().toLowerCase())) {
        const err = new Error("A book with this ISBN already exists.");
        err.status = 409;
        throw err;
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const newBook = {
        _id: generateObjectId(),
        title: String(title).trim(),
        author: String(author).trim(),
        isbn: String(isbn).trim(),
        description: String(description).trim(),
        price: Number(price),
        stockCount: Math.max(0, Number(stockCount ?? 0)),
        category: String(category).trim(),
        coverImageUrl: finalCover,
        publisher: publisher?.trim() || "BookHaven Editions",
        language: language?.trim() || "English / Myanmar",
        pages: Number(pages ?? 240),
        reviews: [],
        rating: 0,
        numReviews: 0,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      db.books.unshift(newBook);
      return newBook;
    });
    res.status(201).json({ book: created });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Failed to create book." });
  }
}
async function updateBook(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const uploadedCover = req.file ? `/uploads/covers/${req.file.filename}` : void 0;
    if (uploadedCover) updates.coverImageUrl = uploadedCover;
    if (isMongoConnected()) {
      const book = await BookModel.findById(id);
      if (!book) {
        res.status(404).json({ message: "Book not found." });
        return;
      }
      if (updates.title !== void 0) book.title = String(updates.title).trim();
      if (updates.author !== void 0) book.author = String(updates.author).trim();
      if (updates.isbn !== void 0) book.isbn = String(updates.isbn).trim();
      if (updates.description !== void 0) book.description = String(updates.description).trim();
      if (updates.price !== void 0) book.price = Math.max(0, Number(updates.price));
      if (updates.stockCount !== void 0) book.stockCount = Math.max(0, Number(updates.stockCount));
      if (updates.category !== void 0) book.category = String(updates.category).trim();
      if (updates.coverImageUrl !== void 0) book.coverImageUrl = String(updates.coverImageUrl).trim();
      if (updates.publisher !== void 0) book.publisher = String(updates.publisher).trim();
      if (updates.language !== void 0) book.language = String(updates.language).trim();
      if (updates.pages !== void 0) book.pages = Math.max(1, Number(updates.pages));
      await book.save();
      res.json({ book });
      return;
    }
    const updated = await runStoreTransaction((db) => {
      const book = db.books.find((b) => b._id === id);
      if (!book) {
        const err = new Error("Book not found.");
        err.status = 404;
        throw err;
      }
      if (updates.title !== void 0) book.title = String(updates.title).trim();
      if (updates.author !== void 0) book.author = String(updates.author).trim();
      if (updates.isbn !== void 0) book.isbn = String(updates.isbn).trim();
      if (updates.description !== void 0) book.description = String(updates.description).trim();
      if (updates.price !== void 0) book.price = Math.max(0, Number(updates.price));
      if (updates.stockCount !== void 0) book.stockCount = Math.max(0, Number(updates.stockCount));
      if (updates.category !== void 0) book.category = String(updates.category).trim();
      if (updates.coverImageUrl !== void 0) {
        const uploadedCover2 = req.file ? `/uploads/covers/${req.file.filename}` : void 0;
        if (uploadedCover2) updates.coverImageUrl = uploadedCover2;
        book.coverImageUrl = String(updates.coverImageUrl).trim();
      }
      if (updates.publisher !== void 0) book.publisher = String(updates.publisher).trim();
      if (updates.language !== void 0) book.language = String(updates.language).trim();
      if (updates.pages !== void 0) book.pages = Math.max(1, Number(updates.pages));
      book.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      return book;
    });
    res.json({ book: updated });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Failed to update book." });
  }
}
async function deleteBook(req, res) {
  try {
    const { id } = req.params;
    if (isMongoConnected()) {
      const deleted = await BookModel.findByIdAndDelete(id);
      if (!deleted) {
        res.status(404).json({ message: "Book not found." });
        return;
      }
      res.json({ message: "Book removed from catalog." });
      return;
    }
    await runStoreTransaction((db) => {
      const idx = db.books.findIndex((b) => b._id === id);
      if (idx === -1) {
        const err = new Error("Book not found.");
        err.status = 404;
        throw err;
      }
      db.books.splice(idx, 1);
    });
    res.json({ message: "Book removed from catalog." });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Failed to delete book." });
  }
}
async function deleteBookReview(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }
    const { id } = req.params;
    if (isMongoConnected()) {
      const book = await BookModel.findById(id);
      if (!book) {
        res.status(404).json({ message: "Book not found." });
        return;
      }
      const reviewIndex = book.reviews.findIndex((review) => review.user.toString() === req.user.id);
      if (reviewIndex === -1) {
        res.status(404).json({ message: "Review not found." });
        return;
      }
      book.reviews.splice(reviewIndex, 1);
      book.numReviews = book.reviews.length;
      book.rating = book.numReviews ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / book.numReviews : 0;
      await book.save();
      res.json({ book });
      return;
    }
    const updatedBook = await runStoreTransaction((db) => {
      const book = db.books.find((item) => item._id === id);
      if (!book) {
        const err = new Error("Book not found.");
        err.status = 404;
        throw err;
      }
      const reviewIndex = book.reviews.findIndex((review) => review.user === req.user.id);
      if (reviewIndex === -1) {
        const err = new Error("Review not found.");
        err.status = 404;
        throw err;
      }
      book.reviews.splice(reviewIndex, 1);
      book.numReviews = book.reviews.length;
      book.rating = book.numReviews ? Number((book.reviews.reduce((sum, review) => sum + review.rating, 0) / book.numReviews).toFixed(1)) : 0;
      book.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      return book;
    });
    res.json({ book: updatedBook });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Failed to delete review." });
  }
}

// backend/middleware/uploadMiddleware.ts
import fs2 from "fs";
import path2 from "path";
import multer from "multer";
var SLIPS_DIR2 = path2.resolve(process.cwd(), "uploads", "slips");
var COVERS_DIR = path2.resolve(process.cwd(), "uploads", "covers");
if (!fs2.existsSync(SLIPS_DIR2)) {
  fs2.mkdirSync(SLIPS_DIR2, { recursive: true });
}
if (!fs2.existsSync(COVERS_DIR)) {
  fs2.mkdirSync(COVERS_DIR, { recursive: true });
}
var storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs2.existsSync(SLIPS_DIR2)) {
      fs2.mkdirSync(SLIPS_DIR2, { recursive: true });
    }
    cb(null, SLIPS_DIR2);
  },
  filename: (_req, file, cb) => {
    const ext = path2.extname(file.originalname).toLowerCase() || ".png";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".png";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `slip-${uniqueSuffix}${safeExt}`);
  }
});
var fileFilter = (_req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, and WebP payment slip screenshots are allowed."));
  }
};
var coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs2.existsSync(COVERS_DIR)) fs2.mkdirSync(COVERS_DIR, { recursive: true });
    cb(null, COVERS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path2.extname(file.originalname).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `cover-${uniqueSuffix}${safeExt}`);
  }
});
var coverFileFilter = (_req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG, and WebP book-cover images are allowed."));
};
var uploadPaymentSlip = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB max
  }
});
var uploadBookCover = multer({
  storage: coverStorage,
  fileFilter: coverFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// backend/routes/bookRoutes.ts
var router3 = Router3();
router3.get("/", getBooks);
router3.get("/:id", getBookById);
router3.post("/:id/reviews", protect, addBookReview);
router3.delete("/:id/reviews", protect, deleteBookReview);
router3.post("/", protect, adminOnly, uploadBookCover.single("cover"), createBook);
router3.put("/:id", protect, adminOnly, uploadBookCover.single("cover"), updateBook);
router3.delete("/:id", protect, adminOnly, deleteBook);
var bookRoutes_default = router3;

// backend/routes/orderRoutes.ts
import { Router as Router4 } from "express";

// backend/controllers/orderController.ts
import mongoose9 from "mongoose";
function calculateDeliveryFee(subtotalAfterDiscount, city) {
  if (subtotalAfterDiscount >= 35e3) return 0;
  return city.trim().toLowerCase() === "yangon" ? 2500 : 4500;
}
function makeOrderNumber() {
  const num = Math.floor(1050 + Math.random() * 8900);
  return `BH-2026-${num}`;
}
async function validateCoupon(req, res) {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      res.status(400).json({ message: "Please enter a promo code." });
      return;
    }
    const normalized = code.trim().toUpperCase();
    if (isMongoConnected()) {
      const coupon2 = await CouponModel.findOne({ code: normalized });
      if (!coupon2 || !coupon2.isActive) {
        res.status(404).json({ message: "Promo code is invalid or inactive." });
        return;
      }
      if (coupon2.expiryDate.getTime() < Date.now()) {
        res.status(400).json({ message: "This promo code has expired." });
        return;
      }
      if (coupon2.usedCount >= coupon2.usageLimit) {
        res.status(400).json({ message: "This promo code has reached its usage limit." });
        return;
      }
      res.json({
        code: coupon2.code,
        discountPercentage: coupon2.discountPercentage
      });
      return;
    }
    const db = loadStore();
    const coupon = db.coupons.find((c) => c.code === normalized);
    if (!coupon || !coupon.isActive) {
      res.status(404).json({ message: "Promo code is invalid or inactive." });
      return;
    }
    if (new Date(coupon.expiryDate).getTime() < Date.now()) {
      res.status(400).json({ message: "This promo code has expired." });
      return;
    }
    if (coupon.usedCount >= coupon.usageLimit) {
      res.status(400).json({ message: "This promo code has reached its usage limit." });
      return;
    }
    res.json({
      code: coupon.code,
      discountPercentage: coupon.discountPercentage
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Coupon validation failed." });
  }
}
async function createOrder(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }
    const rawItems = typeof req.body.orderItems === "string" ? JSON.parse(req.body.orderItems) : req.body.orderItems;
    const rawShipping = typeof req.body.shippingAddress === "string" ? JSON.parse(req.body.shippingAddress) : req.body.shippingAddress;
    const paymentMethod = req.body.paymentMethod;
    const transactionId = req.body.transactionId?.trim() || "";
    const couponCode = req.body.couponCode?.trim().toUpperCase() || "";
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      res.status(400).json({ message: "Your shopping bag is empty." });
      return;
    }
    if (!rawShipping || !rawShipping.fullName?.trim() || !rawShipping.phone?.trim() || !rawShipping.streetAddress?.trim() || !rawShipping.township?.trim() || !rawShipping.city?.trim()) {
      res.status(400).json({ message: "Complete Myanmar shipping address (Name, Phone, Street, Township, City) is required." });
      return;
    }
    if (!["KBZPay", "WaveMoney", "AYAPay", "CashOnDelivery"].includes(paymentMethod)) {
      res.status(400).json({ message: "Please select a valid payment method." });
      return;
    }
    const isDigitalWallet = paymentMethod === "KBZPay" || paymentMethod === "WaveMoney" || paymentMethod === "AYAPay";
    const walletLabel = paymentMethod === "KBZPay" ? "KBZPay" : paymentMethod === "WaveMoney" ? "Wave Money" : "AYA Pay";
    if (isDigitalWallet) {
      if (transactionId.length < 6) {
        res.status(400).json({
          message: `Please enter a valid ${walletLabel} Transaction ID (minimum 6 characters).`
        });
        return;
      }
      if (!req.file) {
        res.status(400).json({
          message: `Please upload your ${walletLabel} payment slip screenshot.`
        });
        return;
      }
    }
    const paymentSlipUrl = req.file ? `/uploads/slips/${req.file.filename}` : void 0;
    if (isMongoConnected()) {
      const session = await mongoose9.startSession();
      session.startTransaction();
      try {
        let subtotal = 0;
        const verifiedItems = [];
        for (const item of rawItems) {
          const qty = Math.max(1, Number(item.qty));
          const book = await BookModel.findById(item.bookId).session(session);
          if (!book) {
            throw Object.assign(new Error("One of the books in your bag is no longer available."), { status: 404 });
          }
          if (book.stockCount < qty) {
            throw Object.assign(
              new Error(`Insufficient stock for "${book.title}". Only ${book.stockCount} copy/copies remaining.`),
              { status: 409 }
            );
          }
          book.stockCount -= qty;
          await book.save({ session });
          subtotal += book.price * qty;
          verifiedItems.push({
            book: book._id,
            title: book.title,
            author: book.author,
            coverImageUrl: book.coverImageUrl,
            qty,
            price: book.price
          });
        }
        let discountAmount = 0;
        let appliedCoupon;
        if (couponCode) {
          const coupon = await CouponModel.findOne({ code: couponCode }).session(session);
          if (coupon && coupon.isActive && coupon.expiryDate.getTime() >= Date.now() && coupon.usedCount < coupon.usageLimit) {
            discountAmount = Math.round(subtotal * coupon.discountPercentage / 100);
            appliedCoupon = coupon.code;
          }
        }
        const afterDiscount = Math.max(0, subtotal - discountAmount);
        const deliveryFee = calculateDeliveryFee(afterDiscount, rawShipping.city);
        const totalPrice = afterDiscount + deliveryFee;
        const [order] = await OrderModel.create(
          [
            {
              orderNumber: makeOrderNumber(),
              user: req.user.id,
              customerName: req.user.name,
              customerEmail: req.user.email,
              orderItems: verifiedItems,
              shippingAddress: {
                fullName: rawShipping.fullName.trim(),
                phone: rawShipping.phone.trim(),
                streetAddress: rawShipping.streetAddress.trim(),
                township: rawShipping.township.trim(),
                city: rawShipping.city.trim(),
                postalCode: rawShipping.postalCode?.trim() || "11181"
              },
              paymentMethod,
              paymentDetails: {
                transactionId: isDigitalWallet ? transactionId : void 0,
                paymentSlipUrl: isDigitalWallet ? paymentSlipUrl : void 0,
                verificationStatus: isDigitalWallet ? "Pending" : "NotRequired"
              },
              couponCode: appliedCoupon,
              discountAmount,
              subtotal,
              deliveryFee,
              totalPrice,
              orderStatus: isDigitalWallet ? "Pending Verification" : "Processing",
              isPaid: false
            }
          ],
          { session }
        );
        if (appliedCoupon) {
          await CouponModel.updateOne(
            { code: appliedCoupon, $expr: { $lt: ["$usedCount", "$usageLimit"] } },
            { $inc: { usedCount: 1 } },
            { session }
          );
        }
        await session.commitTransaction();
        session.endSession();
        res.status(201).json({ order });
        return;
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }
    }
    const createdOrder = await runStoreTransaction((db) => {
      let subtotal = 0;
      const verifiedItems = [];
      for (const item of rawItems) {
        const qty = Math.max(1, Number(item.qty));
        const book = db.books.find((b) => b._id === item.bookId);
        if (!book) {
          throw Object.assign(new Error("One of the books in your bag is no longer available."), { status: 404 });
        }
        if (book.stockCount < qty) {
          throw Object.assign(
            new Error(`Insufficient stock for "${book.title}". Only ${book.stockCount} remaining.`),
            { status: 409 }
          );
        }
        book.stockCount -= qty;
        book.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        subtotal += book.price * qty;
        verifiedItems.push({
          book: book._id,
          title: book.title,
          author: book.author,
          coverImageUrl: book.coverImageUrl,
          qty,
          price: book.price
        });
      }
      let discountAmount = 0;
      let appliedCoupon;
      if (couponCode) {
        const coupon = db.coupons.find((c) => c.code === couponCode);
        if (coupon && coupon.isActive && new Date(coupon.expiryDate).getTime() >= Date.now()) {
          discountAmount = Math.round(subtotal * coupon.discountPercentage / 100);
          appliedCoupon = coupon.code;
          coupon.usedCount += 1;
          coupon.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
      }
      const afterDiscount = Math.max(0, subtotal - discountAmount);
      const deliveryFee = calculateDeliveryFee(afterDiscount, rawShipping.city);
      const totalPrice = afterDiscount + deliveryFee;
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const newOrder = {
        _id: generateObjectId(),
        orderNumber: makeOrderNumber(),
        user: req.user.id,
        customerName: req.user.name,
        customerEmail: req.user.email,
        orderItems: verifiedItems,
        shippingAddress: {
          fullName: rawShipping.fullName.trim(),
          phone: rawShipping.phone.trim(),
          streetAddress: rawShipping.streetAddress.trim(),
          township: rawShipping.township.trim(),
          city: rawShipping.city.trim(),
          postalCode: rawShipping.postalCode?.trim() || "11181"
        },
        paymentMethod,
        paymentDetails: {
          transactionId: isDigitalWallet ? transactionId : void 0,
          paymentSlipUrl: isDigitalWallet ? paymentSlipUrl : void 0,
          verificationStatus: isDigitalWallet ? "Pending" : "NotRequired"
        },
        couponCode: appliedCoupon,
        discountAmount,
        subtotal,
        deliveryFee,
        totalPrice,
        orderStatus: isDigitalWallet ? "Pending Verification" : "Processing",
        isPaid: false,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      db.orders.unshift(newOrder);
      return newOrder;
    });
    res.status(201).json({ order: createdOrder });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Checkout failed." });
  }
}
async function getMyOrders(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }
    if (isMongoConnected()) {
      const orders2 = await OrderModel.find({ user: req.user.id }).sort({ createdAt: -1 });
      res.json({ orders: orders2 });
      return;
    }
    const db = loadStore();
    const orders = db.orders.filter((o) => o.user === req.user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load orders." });
  }
}
async function cancelOrder(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }
    const { id } = req.params;
    if (isMongoConnected()) {
      const session = await mongoose9.startSession();
      session.startTransaction();
      try {
        const order = await OrderModel.findById(id).session(session);
        if (!order) {
          throw Object.assign(new Error("Order not found."), { status: 404 });
        }
        if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
          throw Object.assign(new Error("You cannot cancel another customer\u2019s order."), { status: 403 });
        }
        if (!["Pending Verification", "Processing"].includes(order.orderStatus)) {
          throw Object.assign(
            new Error(`Orders in "${order.orderStatus}" status can no longer be cancelled.`),
            { status: 400 }
          );
        }
        for (const item of order.orderItems) {
          await BookModel.findByIdAndUpdate(
            item.book,
            { $inc: { stockCount: item.qty } },
            { session }
          );
        }
        order.orderStatus = "Cancelled";
        await order.save({ session });
        await session.commitTransaction();
        session.endSession();
        res.json({ order });
        return;
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }
    }
    const updatedOrder = await runStoreTransaction((db) => {
      const order = db.orders.find((o) => o._id === id);
      if (!order) {
        throw Object.assign(new Error("Order not found."), { status: 404 });
      }
      if (order.user !== req.user.id && req.user.role !== "admin") {
        throw Object.assign(new Error("You cannot cancel another customer\u2019s order."), { status: 403 });
      }
      if (!["Pending Verification", "Processing"].includes(order.orderStatus)) {
        throw Object.assign(
          new Error(`Orders in "${order.orderStatus}" status can no longer be cancelled.`),
          { status: 400 }
        );
      }
      for (const item of order.orderItems) {
        const book = db.books.find((b) => b._id === item.book);
        if (book) {
          book.stockCount += item.qty;
          book.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
      }
      order.orderStatus = "Cancelled";
      order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      return order;
    });
    res.json({ order: updatedOrder });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Could not cancel order." });
  }
}
async function getAllOrders(req, res) {
  try {
    const statusFilter = req.query.status?.trim() || "";
    if (isMongoConnected()) {
      const filter = {};
      if (statusFilter && statusFilter !== "All") {
        filter.orderStatus = statusFilter;
      }
      const orders2 = await OrderModel.find(filter).sort({ createdAt: -1 });
      res.json({ orders: orders2 });
      return;
    }
    const db = loadStore();
    let orders = [...db.orders];
    if (statusFilter && statusFilter !== "All") {
      orders = orders.filter((o) => o.orderStatus === statusFilter);
    }
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch orders." });
  }
}
async function verifyPayment(req, res) {
  try {
    if (!req.user || req.user.role !== "admin") {
      res.status(403).json({ message: "Admin privileges required." });
      return;
    }
    const { id } = req.params;
    const { action, rejectionReason } = req.body;
    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400).json({ message: 'Action must be either "approve" or "reject".' });
      return;
    }
    if (action === "reject" && (!rejectionReason || rejectionReason.trim().length < 4)) {
      res.status(400).json({ message: "Please provide a clear rejection reason for the customer." });
      return;
    }
    if (isMongoConnected()) {
      const session = await mongoose9.startSession();
      session.startTransaction();
      try {
        const order = await OrderModel.findById(id).session(session);
        if (!order) {
          throw Object.assign(new Error("Order not found."), { status: 404 });
        }
        if (order.paymentDetails.verificationStatus !== "Pending") {
          throw Object.assign(
            new Error("This payment has already been reviewed."),
            { status: 400 }
          );
        }
        if (action === "approve") {
          order.paymentDetails.verificationStatus = "Approved";
          order.paymentDetails.verifiedAt = /* @__PURE__ */ new Date();
          order.paymentDetails.verifiedBy = req.user.name;
          order.isPaid = true;
          order.paidAt = /* @__PURE__ */ new Date();
          order.orderStatus = "Processing";
        } else {
          for (const item of order.orderItems) {
            await BookModel.findByIdAndUpdate(
              item.book,
              { $inc: { stockCount: item.qty } },
              { session }
            );
          }
          order.paymentDetails.verificationStatus = "Rejected";
          order.paymentDetails.rejectionReason = rejectionReason.trim();
          order.paymentDetails.verifiedAt = /* @__PURE__ */ new Date();
          order.paymentDetails.verifiedBy = req.user.name;
          order.isPaid = false;
          order.orderStatus = "Cancelled";
        }
        await order.save({ session });
        await session.commitTransaction();
        session.endSession();
        res.json({ order });
        return;
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }
    }
    const updatedOrder = await runStoreTransaction((db) => {
      const order = db.orders.find((o) => o._id === id);
      if (!order) {
        throw Object.assign(new Error("Order not found."), { status: 404 });
      }
      if (order.paymentDetails.verificationStatus !== "Pending") {
        throw Object.assign(new Error("This payment has already been reviewed."), { status: 400 });
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      if (action === "approve") {
        order.paymentDetails.verificationStatus = "Approved";
        order.paymentDetails.verifiedAt = nowIso;
        order.paymentDetails.verifiedBy = req.user.name;
        order.isPaid = true;
        order.paidAt = nowIso;
        order.orderStatus = "Processing";
      } else {
        for (const item of order.orderItems) {
          const book = db.books.find((b) => b._id === item.book);
          if (book) {
            book.stockCount += item.qty;
            book.updatedAt = nowIso;
          }
        }
        order.paymentDetails.verificationStatus = "Rejected";
        order.paymentDetails.rejectionReason = rejectionReason.trim();
        order.paymentDetails.verifiedAt = nowIso;
        order.paymentDetails.verifiedBy = req.user.name;
        order.isPaid = false;
        order.orderStatus = "Cancelled";
      }
      order.updatedAt = nowIso;
      return order;
    });
    res.json({ order: updatedOrder });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Verification action failed." });
  }
}
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { orderStatus, trackingNumber, carrier } = req.body;
    const allowed = ["Processing", "Shipped", "Delivered"];
    if (!orderStatus || !allowed.includes(orderStatus)) {
      res.status(400).json({ message: "Status must be Processing, Shipped, or Delivered." });
      return;
    }
    if (isMongoConnected()) {
      const order = await OrderModel.findById(id);
      if (!order) {
        res.status(404).json({ message: "Order not found." });
        return;
      }
      if (order.orderStatus === "Cancelled") {
        res.status(400).json({ message: "Cancelled orders cannot be re-opened." });
        return;
      }
      if (order.paymentMethod !== "CashOnDelivery" && !order.isPaid && orderStatus !== "Processing") {
        res.status(400).json({ message: "Digital-wallet orders must be payment-approved before shipping or delivery." });
        return;
      }
      const validTransition = order.orderStatus === "Pending Verification" && orderStatus === "Processing" || order.orderStatus === "Processing" && (orderStatus === "Shipped" || orderStatus === "Delivered") || order.orderStatus === "Shipped" && orderStatus === "Delivered";
      if (!validTransition) {
        res.status(400).json({ message: `Invalid status transition from "${order.orderStatus}" to "${orderStatus}".` });
        return;
      }
      if (orderStatus === "Shipped" && (!trackingNumber?.trim() && !order.trackingNumber)) {
        res.status(400).json({ message: "Tracking number is required when marking an order as shipped." });
        return;
      }
      order.orderStatus = orderStatus;
      if (trackingNumber !== void 0) order.trackingNumber = trackingNumber.trim();
      if (carrier !== void 0) order.carrier = carrier.trim();
      order.statusHistory.push({ status: orderStatus, changedAt: /* @__PURE__ */ new Date(), changedBy: req.user?.name, note: "Admin status update" });
      if (orderStatus === "Delivered" && order.paymentMethod === "CashOnDelivery") {
        order.isPaid = true;
        order.paidAt = /* @__PURE__ */ new Date();
      }
      await order.save();
      res.json({ order });
      return;
    }
    const updated = await runStoreTransaction((db) => {
      const order = db.orders.find((o) => o._id === id);
      if (!order) {
        throw Object.assign(new Error("Order not found."), { status: 404 });
      }
      if (order.orderStatus === "Cancelled") {
        throw Object.assign(new Error("Cancelled orders cannot be re-opened."), { status: 400 });
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      order.orderStatus = orderStatus;
      if (orderStatus === "Delivered" && order.paymentMethod === "CashOnDelivery") {
        order.isPaid = true;
        order.paidAt = nowIso;
      }
      order.updatedAt = nowIso;
      return order;
    });
    res.json({ order: updated });
  } catch (err) {
    const error = err;
    res.status(error.status || 500).json({ message: error.message || "Failed to update order status." });
  }
}
async function requestOrderReturn(req, res) {
  if (!req.user) {
    res.status(401).json({ message: "Not authorized." });
    return;
  }
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason || reason.trim().length < 4) {
    res.status(400).json({ message: "Return reason must be at least 4 characters." });
    return;
  }
  if (isMongoConnected()) {
    const order = await OrderModel.findById(id);
    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }
    if (order.user.toString() !== req.user.id) {
      res.status(403).json({ message: "You cannot request a return for another customer." });
      return;
    }
    if (order.orderStatus !== "Delivered") {
      res.status(400).json({ message: "Only delivered orders can request a return." });
      return;
    }
    if (order.returnRequest?.requested) {
      res.status(400).json({ message: "A return request already exists." });
      return;
    }
    order.returnRequest = { requested: true, reason: reason.trim(), status: "Requested", requestedAt: /* @__PURE__ */ new Date() };
    await order.save();
    res.json({ order });
    return;
  }
  const updated = await runStoreTransaction((db) => {
    const order = db.orders.find((o) => o._id === id);
    if (!order) throw Object.assign(new Error("Order not found."), { status: 404 });
    if (order.user !== req.user.id) throw Object.assign(new Error("You cannot request a return for another customer."), { status: 403 });
    if (order.orderStatus !== "Delivered") throw Object.assign(new Error("Only delivered orders can request a return."), { status: 400 });
    const local = order;
    if (local.returnRequest?.requested) throw Object.assign(new Error("A return request already exists."), { status: 400 });
    local.returnRequest = { requested: true, reason: reason.trim(), status: "Requested", requestedAt: (/* @__PURE__ */ new Date()).toISOString() };
    return order;
  });
  res.json({ order: updated });
}
async function resolveOrderReturn(req, res) {
  if (!req.user || req.user.role === "customer") {
    res.status(403).json({ message: "Staff or administrator access required." });
    return;
  }
  const { id } = req.params;
  const { action, reason } = req.body;
  if (!action || !["approve", "reject"].includes(action)) {
    res.status(400).json({ message: "Action must be approve or reject." });
    return;
  }
  if (isMongoConnected()) {
    const order = await OrderModel.findById(id);
    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }
    if (!order.returnRequest?.requested) {
      res.status(400).json({ message: "No return request exists." });
      return;
    }
    order.returnRequest.status = action === "approve" ? "Approved" : "Rejected";
    order.returnRequest.reason = reason?.trim() || order.returnRequest.reason;
    order.returnRequest.resolvedAt = /* @__PURE__ */ new Date();
    await order.save();
    res.json({ order });
    return;
  }
  const updated = await runStoreTransaction((db) => {
    const order = db.orders.find((o) => o._id === id);
    if (!order) throw Object.assign(new Error("Order not found."), { status: 404 });
    const local = order;
    if (!local.returnRequest?.requested) throw Object.assign(new Error("No return request exists."), { status: 400 });
    local.returnRequest.status = action === "approve" ? "Approved" : "Rejected";
    local.returnRequest.reason = reason?.trim() || local.returnRequest.reason;
    local.returnRequest.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
    return order;
  });
  res.json({ order: updated });
}

// backend/routes/orderRoutes.ts
var router4 = Router4();
router4.post("/validate-coupon", validateCoupon);
router4.post("/", protect, uploadPaymentSlip.single("paymentSlip"), createOrder);
router4.get("/my", protect, getMyOrders);
router4.put("/:id/cancel", protect, cancelOrder);
router4.get("/", protect, adminOnly, getAllOrders);
router4.put("/:id/verify-payment", protect, adminOnly, verifyPayment);
router4.put("/:id/status", protect, adminOnly, updateOrderStatus);
router4.put("/:id/return-request", protect, requestOrderReturn);
router4.put("/:id/return-resolution", protect, adminOnly, resolveOrderReturn);
var orderRoutes_default = router4;

// server.ts
dotenv.config();
async function seedMongoIfEmpty() {
  if (!isMongoConnected()) return;
  const seed = buildSeedData();
  const bookCount = await BookModel.countDocuments();
  try {
    for (const book of seed.books) {
      const existingBook = await BookModel.findOne({ isbn: book.isbn }).lean();
      if (existingBook) continue;
      await BookModel.create({
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        description: book.description,
        price: book.price,
        stockCount: book.stockCount,
        category: book.category,
        coverImageUrl: book.coverImageUrl,
        publisher: book.publisher,
        language: book.language,
        pages: book.pages
      });
    }
  } catch (err) {
    const writeError = err;
    if (writeError.code !== 11e3 && !writeError.writeErrors) {
      throw err;
    }
  }
  if (bookCount === 0) {
    await UserModel.insertMany(
      seed.users.map((u) => ({
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        isVerified: u.isVerified,
        shippingAddress: u.shippingAddress
      }))
    );
    await CouponModel.insertMany(
      seed.coupons.map((c) => ({
        code: c.code,
        discountPercentage: c.discountPercentage,
        expiryDate: new Date(c.expiryDate),
        isActive: c.isActive
      }))
    );
  }
  console.log("[BookHaven DB] Seeded missing MongoDB books.");
}
async function createApp() {
  const app = express();
  await connectDatabase();
  if (isMongoConnected()) {
    await seedMongoIfEmpty();
  } else {
    loadStore();
  }
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path3.resolve(process.cwd(), "uploads")));
  app.use("/src/assets", express.static(path3.resolve(process.cwd(), "frontend/assets")));
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      database: isMongoConnected() ? "mongodb" : "transactional-local"
    });
  });
  app.use("/api/auth", authRoutes_default);
  app.use("/api/books", bookRoutes_default);
  app.use("/api/orders", orderRoutes_default);
  app.use("/api/admin", adminRoutes_default);
  app.use((err, _req, res, _next) => {
    const status = err.status || 400;
    res.status(status).json({ message: err.message || "Server error occurred." });
  });
  if (process.env.NODE_ENV === "production") {
    const distDir = path3.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path3.join(distDir, "index.html"));
    });
  }
  return app;
}
var PORT = Number(process.env.PORT) || 3e3;
var HOST = process.env.HOST || "0.0.0.0";
var isDirectRun = process.argv[1] && path3.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  createApp().then((app) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`[BookHaven Server] Running on http://localhost:${PORT}`);
    });
    server.on("error", (err) => {
      console.error("[BookHaven Server] Listen error:", err);
      process.exit(1);
    });
  }).catch((err) => {
    console.error("[BookHaven Server] Fatal startup error:", err);
    process.exit(1);
  });
}
var server_default = createApp;
export {
  createApp,
  server_default as default
};
