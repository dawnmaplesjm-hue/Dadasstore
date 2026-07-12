# 🎓 Dada's Store - Learn Coding While Building Your App

Welcome! This is YOUR e-commerce app for selling ebooks, worksheets, and lesson plans.

**Goal:** Build a complete app AND learn how to code!

## 📁 Project Structure

```text
Dadasstore/
├── backend/              # The "brain" - handles products, payments
├── admin-panel/          # Your dashboard to upload products
├── mobile-app/           # What customers see
└── docs/
    ├── LEARNING_GUIDE.md # Start here!
    └── CONCEPTS.md       # Coding concepts explained
```

## 🎯 Your First Steps

1. **Read:** `docs/LEARNING_GUIDE.md` (beginner guide)
2. **Understand:** `docs/CONCEPTS.md` (what is code?)
3. **Build:** Start with backend (simplest part)
4. **Learn:** Read comments in every file
5. **Experiment:** Change things and see what happens!

## 💡 Learning Approach

✅ Every file has comments explaining the code
✅ Code is written simply (not fancy)
✅ Start with backend, then admin, then mobile
✅ Test each part before moving to next
✅ Ask questions! (add issues on GitHub)

## 🚀 Quick Start

```bash
# Get the code
git clone https://github.com/dawnmaplesjm-hue/Dadasstore.git
cd Dadasstore

# Read the learning guide first!
cat docs/LEARNING_GUIDE.md

# Then setup backend
cd backend
npm install
npm run dev
```

## Google Merchant Center Feed (Digital Products)

Use the backend script to generate a tab-delimited feed and optionally push products through the Google Content API.

```bash
cd backend
npm install

# 1) Export a tab-delimited feed file (merchant-feed.tsv)
npm run merchant:feed

# 2) Export + sync to Google Merchant Center using Content API
# (requires MERCHANT_CENTER_ID and service-account credentials in backend/.env)
npm run merchant:sync
```

The feed pulls from `backend/products.json`, so your admin panel product list is the source of truth.

---

**Next:** Open `docs/LEARNING_GUIDE.md` to begin! 🎓
