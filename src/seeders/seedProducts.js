import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.model.js";

dotenv.config();

/* ---------- DB CONNECT ---------- */
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://adminn:ss7_Dhoni@main.3gkqcqt.mongodb.net/?appName=main");
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ DB Connection Failed", error);
    process.exit(1);
  }
};

/* ---------- PRODUCT DATA ---------- */
const products = [
  {
    name: "Black Pepper Makhana",
    slug: "black-pepper-makhana",
    description:
      "Classic black pepper flavored makhana roasted with ghee for a bold taste.",
    images: [
      "https://i.ibb.co/kVKBRrSY/Black-Pepper.webp",
      "https://i.ibb.co/KPcSsGg/1.webp",
      "https://i.ibb.co/F4LhmtCH/4.webp",
      "https://i.ibb.co/C33xP8MJ/2.webp",
    ],
    brand: "DesiiGlobal",
    price: 249,
    catName: "Flavoured Makhana",
    countInStock: 120,
    ingredients: [
      "Makhana",
      "Ghee",
      "Black Pepper Powder",
      "Pink Salt",
      "Black Salt",
      "Natural Spices",
    ],
    nutrition: {
      calories: "350–380 kcal",
      protein: "6.9–7 g",
      fat: "12.1–15 g",
      carbs: "47.5–52 g",
      fiber: "9–11 g",
      sugar: "1–1.9 g",
      sodium: "450–550 mg",
    },
    netQuantity: { value: 80, unit: "g" },
    status: "ACTIVE",
    fssaiLicense: "20425291000149",
    shelfLife: "Best before 8 months from packaging date",
    storageInstructions:
      "Store in a cool, dry place. Keep airtight after opening.",
    countryOfOrigin: "India",
  },

  {
    name: "Creamy Onion Garlic Makhana",
    slug: "creamy-onion-garlic-makhana",
    description:
      "Rich creamy makhana roasted with onion and garlic seasoning.",
    images: [
      "https://i.ibb.co/8LCCRj7w/Creamy-Onion-Garlic.webp",
      "https://i.ibb.co/Kcv5RWzk/oamrajrca7ztmbkwrueg.webp",
      "https://i.ibb.co/67gR1mPG/udncyaferhibqwpwfcpo.webp",
      "https://i.ibb.co/Gv483Vvp/w9w8nedssn72i12gxgof.webp",
    ],
    brand: "DesiiGlobal",
    price: 249,
    catName: "Flavoured Makhana",
    countInStock: 100,
    ingredients: [
      "Makhana",
      "Ghee",
      "Cream Powder",
      "Onion Powder",
      "Garlic Powder",
      "Pink Salt",
      "Black Salt",
      "Spices",
    ],
    nutrition: {
      calories: "350–400 kcal",
      protein: "6.5–7 g",
      fat: "12–18 g",
      carbs: "47–52 g",
      fiber: "3.2–11 g",
      sugar: "8–10 g",
      sodium: "450–620 mg",
    },
    netQuantity: { value: 80, unit: "g" },
    status: "ACTIVE",
    fssaiLicense: "20425291000149",
    shelfLife: "Best before 8 months from packaging date",
    storageInstructions:
      "Store in a cool, dry place. Keep airtight after opening.",
    countryOfOrigin: "India",
  },

  {
    name: "Gud & Til Makhana",
    slug: "gud-til-makhana",
    description:
      "Traditional sweet makhana roasted with jaggery and sesame seeds.",
    images: [
      "https://i.ibb.co/q85Tpk1/Gud-Til.webp",
      "https://i.ibb.co/39bB1yxj/vsini9hh6pqz0b9kntzm.webp",
      "https://i.ibb.co/0jJWshn9/qijrtvggjaqbmegy13sn.webp",
      "https://i.ibb.co/fVzFX3CW/wikias47jla1qp06l4ur.webp",
    ],
    brand: "DesiiGlobal",
    price: 249,
    catName: "Sweet Makhana",
    countInStock: 80,
    ingredients: ["Makhana", "Jaggery", "Sesame Seeds", "Ghee"],
    nutrition: {
      calories: "260–280 kcal",
      protein: "5–6 g",
      fat: "6–7 g",
      carbs: "44–46 g",
      fiber: "4–5 g",
      sugar: "10–12 g",
      sodium: "20–35 mg",
    },
    netQuantity: { value: 60, unit: "g" },
    status: "ACTIVE",
    fssaiLicense: "20425291000149",
    shelfLife: "Best before 8 months from packaging date",
    storageInstructions:
      "Store in a cool, dry place. Keep airtight after opening.",
    countryOfOrigin: "India",
  },

  {
    name: "Mint Roasted Makhana",
    slug: "mint-roasted-makhana",
    description:
      "Refreshing mint flavored roasted makhana with herbs.",
    images: [
      "https://i.ibb.co/7JrNXZtZ/Mint-Roasted.webp",
      "https://i.ibb.co/YT3HYDs4/bwf3qb2bbgchvhq2rlfm.webp",
      "https://i.ibb.co/fzRnwQmm/lvrjwla1jwddcnbv0jku.webp",
      "https://i.ibb.co/wZVvG5Tz/jwii5jlzuk7wecahlmak.webp",
    ],
    brand: "DesiiGlobal",
    price: 299,
    catName: "Flavoured Makhana",
    countInStock: 90,
    ingredients: [
      "Makhana",
      "Rock Salt",
      "Mint Powder",
      "Black Salt",
      "Rice Bran Oil",
      "Dry Mango Powder",
      "Spices",
    ],
    nutrition: {
      calories: "370–390 kcal",
      protein: "6.4 g",
      fat: "16.8 g",
      carbs: "51.4 g",
      fiber: "4.8 g",
      sugar: "1.6 g",
      sodium: "562 mg",
    },
    netQuantity: { value: 80, unit: "g" },
    status: "ACTIVE",
    fssaiLicense: "20425291000149",
    shelfLife: "Best before 8 months from packaging date",
    storageInstructions:
      "Store in a cool, dry place. Keep airtight after opening.",
    countryOfOrigin: "India",
  },

  {
    name: "Peri Peri Makhana",
    slug: "peri-peri-makhana",
    description:
      "Spicy peri peri makhana roasted with ghee for fiery flavor.",
    images: [
      "https://i.ibb.co/wh35SSK9/Peri-Peri.webp",
      "https://i.ibb.co/Xx64WpjQ/tv4iheg4kzbd6c4dolwb.webp",
      "https://i.ibb.co/BHwGxPzG/dynpzz7ngcq09yx8zdju.webp",
      "https://i.ibb.co/0jBtJxfg/mxqtnirvqfouxuv33wr5.webp",
    ],
    brand: "DesiiGlobal",
    price: 249,
    catName: "Flavoured Makhana",
    countInStock: 100,
    ingredients: [
      "Makhana",
      "Ghee",
      "Peri Peri Spices",
      "Red Chilli Powder",
      "Cumin",
      "Salt",
      "Garlic Powder",
      "Onion Powder",
    ],
    nutrition: {
      calories: "380–420 kcal",
      protein: "6.2–7.8 g",
      fat: "15–19.8 g",
      carbs: "50.7–63.4 g",
      fiber: "6.7–9 g",
      sugar: "1.9–2 g",
      sodium: "208–512 mg",
    },
    netQuantity: { value: 80, unit: "g" },
    status: "ACTIVE",
    fssaiLicense: "20425291000149",
    shelfLife: "Best before 8 months from packaging date",
    storageInstructions:
      "Store in a cool, dry place. Keep airtight after opening.",
    countryOfOrigin: "India",
  },

  {
    name: "Premium Plain Makhana 100g",
    slug: "premium-plain-makhana-100g",
    description:
      "Gluten free premium plain makhana, roasted and protein rich.",
    images: [
      "https://i.ibb.co/ksS0DdV6/Plain-Makhana-100g.webp",
      "https://i.ibb.co/jvDhMGnX/nt86t0cznumhkoxvfgwn.webp",
      "https://i.ibb.co/qL3RXCLt/n2xrstortvx3odquxiit.webp",
    ],
    brand: "DesiiGlobal",
    price: 199,
    catName: "Plain Makhana",
    countInStock: 150,
    ingredients: ["Makhana"],
    nutrition: {
      calories: "347–350 kcal",
      protein: "9.7 g",
      fat: "0.1 g",
      carbs: "76.9 g",
      fiber: "14.5 g",
      sugar: "0 g",
      sodium: "Very low",
    },
    netQuantity: { value: 100, unit: "g" },
    status: "ACTIVE",
    fssaiLicense: "20425291000149",
    shelfLife: "Best before 8 months from packaging date",
    storageInstructions:
      "Store in a cool, dry place. Keep airtight after opening.",
    countryOfOrigin: "India",
  },

  {
    name: "Premium Plain Makhana 250g",
    slug: "premium-plain-makhana-250g",
    description:
      "Family pack of premium plain makhana for daily healthy snacking.",
    images: [
      "https://i.ibb.co/mPRjZ5t/Plain-Makhana-250g.webp",
      "https://i.ibb.co/gL94BdsC/he0b1jemofdlralrzgls.webp",
      "https://i.ibb.co/MkQrjSN9/ky9j39ghxppkr4klzf76.webp",
    ],
    brand: "DesiiGlobal",
    price: 499,
    catName: "Plain Makhana",
    countInStock: 70,
    ingredients: ["Makhana"],
    nutrition: {
      calories: "867–875 kcal",
      protein: "24–25 g",
      fat: "0.3–0.5 g",
      carbs: "192–197 g",
      fiber: "36–38 g",
      sugar: "0 g",
      sodium: "10–12 mg",
    },
    netQuantity: { value: 250, unit: "g" },
    status: "ACTIVE",
    fssaiLicense: "20425291000149",
    shelfLife: "Best before 8 months from packaging date",
    storageInstructions:
      "Store in a cool, dry place. Keep airtight after opening.",
    countryOfOrigin: "India",
  },
];

/* ---------- SEED FUNCTION ---------- */
const seedProducts = async () => {
  try {
    await connectDB();

    await Product.deleteMany();
    console.log("🗑 Existing products removed");

    await Product.insertMany(products);
    console.log("🌱 Products seeded successfully");

    process.exit();
  } catch (error) {
    console.error("❌ Seeding failed", error);
    process.exit(1);
  }
};

seedProducts();
