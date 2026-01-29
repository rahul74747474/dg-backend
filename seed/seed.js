require("dotenv").config();
const mongoose = require("mongoose");

// const User = require("../src/modules/Users/user.model");
const Product = require("../src/modules/products/products.model");

const MONGO_URI = process.env.MONGO_DB_URI;

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    /* ================= CLEAN DB ================= */
    await Promise.all([
      Product.deleteMany(),
    ]);
    console.log("🧹 Old data cleared");

    /* ================= CATEGORIES ================= */


    /* ================= PRODUCTS ================= */
    const products = await Product.insertMany([
      {
        name: "Premium Plain Makhana",
        slug: "premium-plain-makhana",
        category: "makhana",
        description: "Premium Plain Makhana is a wholesome, gluten-free snack made from carefully selected lotus seeds. Naturally rich in protein, fiber, and essential minerals, this makhana is lightly roasted to retain its natural crunch and nutritional value. It is ideal for guilt-free snacking, weight management, and daily healthy eating. Free from artificial flavors, preservatives, and added sugar, this plain makhana can be enjoyed as-is or customized with your favorite seasonings.",
        price: 249,
        images: ["https://i.ibb.co/8gLg3z3F/44.webp"],
        stock: 100,
        flavour: "plain",
        weight: "250g",
      },
      {
        name: "Peri Peri Makhana",
        slug: "peri-peri-makhana",
        category: "roasted",
        description: "Peri Peri Makhana is a bold and spicy snack crafted for those who love a fiery kick. Made from premium lotus seeds, these makhanas are roasted to perfection and coated with a zesty peri peri seasoning that delivers intense flavor without compromising on health. High in protein and low in calories, this snack is perfect for evening cravings, parties, or post-workout munching. Enjoy the crunch with a burst of spice in every bite.",
        price: 299,
        images: ["https://i.ibb.co/49b7Wf5/22.webp"],
        stock: 80,
        flavour: "peri peri",
        weight: "250g",
      },
      {
        name: "Black Pepper Makhana",
        slug: "black-pepper-makhana",
        category: "roasted",
        description: "Black Pepper Makhana offers a classic and bold flavor profile with the warmth of freshly ground black pepper. These premium lotus seeds are slow roasted and seasoned to deliver a sharp yet balanced taste. Rich in antioxidants and plant-based protein, this makhana supports digestion and boosts metabolism. A perfect alternative to fried snacks, it delivers both flavor and nutrition in a satisfying crunch.",
        price: 299,
        images: ["https://i.ibb.co/PZPQyKLw/33.webp"],
        stock: 80,
        flavour: "black pepper",
        weight: "250g",
      },
      {
        name: "Mint Roasted Makhana",
        slug: "mint-roasted-makhana",
        category: "roasted",
        description: "Mint Roasted Makhana is a refreshing and light snack infused with cool mint flavors. Crafted using high-quality lotus seeds, this makhana is roasted for the perfect crunch and lightly seasoned to deliver a fresh, soothing taste. Ideal for summer snacking and digestion-friendly diets, it is low in fat, high in nutrients, and free from artificial additives. A refreshing twist on healthy snacking.",
        price: 299,
        images: ["https://i.ibb.co/997pbdjt/1.webp"],
        stock: 90,
        flavour: "mint",
        weight: "250g",
      },
    ]);


    console.log("🎉 FULL SEED COMPLETE");
    process.exit();
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seed();
