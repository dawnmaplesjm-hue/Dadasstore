# 📚 Learning Guide - Start Here!

## Welcome! 👋

You're about to learn how to code by building a real app. That's awesome!

**This guide explains everything step-by-step.**

---

## Part 1: What is Code?

### Simple Explanation

Code is like instructions for a computer:

```
Pseudo-code (plain English):
  WHEN customer clicks "Buy"
  THEN ask for payment
  THEN give download link

Real code (what we write):
  if (customerClicksBuy) {
    askForPayment();
    giveDownloadLink();
  }
```

### Three Languages We Use

**1. TypeScript/JavaScript** (Backend & Admin)
- "What" the app does
- Like writing a recipe

**2. React** (Admin Dashboard)
- How it looks on screen
- "What buttons" to show

**3. React Native** (Mobile App)
- Make the buttons work on phones
- Same code for iPhone AND Android!

---

## Part 2: Your Project - 3 Parts

### 🔧 Backend (The Brain)

**What it does:**
- Stores product information
- Handles payments
- Gives download links
- Checks if you're the admin

**Think of it like:** A library
- Customers request a book
- Librarian finds it
- Gives it to them

**Location:** `backend/src/index.ts`

### 📱 Admin Panel (Your Dashboard)

**What it does:**
- Let YOU add products
- Let YOU edit products
- Let YOU see sales
- Only YOU can login

**Think of it like:** A store manager's computer
- Stock shelves with products
- Change prices
- See how much money you made

**Location:** `admin-panel/src/App.tsx`

### 📲 Mobile App (Customer View)

**What it does:**
- Customers browse products
- Customers buy with one tap
- Customers download instantly
- Customers see their purchases

**Think of it like:** A phone store
- Browse products
- Add to cart
- Checkout
- Get receipt and files

**Location:** `mobile-app/src/App.tsx`

---

## Part 3: How They Work Together

```
┌─────────────────┐
│  Your Products  │ (stored on backend)
│  Ebooks, etc    │
└────────┬────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
┌────────┐  ┌──────────┐
│ Admin  │  │ Customer │
│ Panel  │  │ Mobile   │
│ (YOU)  │  │ (THEM)   │
└───┬────┘  └─────┬────┘
    │             │
    └─────┬───────┘
          │
          ▼
    ┌──────────────┐
    │ Stripe       │ (payment processor)
    │ ($$$ happens)│
    └──────────────┘
```

**Flow Example:**

1. **You (Admin Panel)** → Upload ebook "Math Lessons.pdf"
2. **Backend** → Saves it, gives it an ID
3. **Customer (Mobile App)** → Sees "Math Lessons - $4.99"
4. **Customer** → Clicks "Buy"
5. **Backend** → Asks Stripe for payment
6. **Stripe** → Takes $4.99 from customer
7. **Backend** → Gets confirmation
8. **Customer** → Gets download link
9. **Customer** → Downloads "Math Lessons.pdf"

---

## Part 4: Install What You Need

### Step 1: Download Node.js

**What is Node.js?**
- Software that runs JavaScript code on your computer
- Like a translator between your code and your computer

**Download:**
1. Go to https://nodejs.org/
2. Download "LTS" version (more stable)
3. Install it
4. Open Terminal (Mac) or Command Prompt (Windows)
5. Type: `node --version`
6. You should see a number like `v18.0.0`

### Step 2: Download VS Code

**What is VS Code?**
- The "notebook" where you write code
- Shows errors
- Helps you understand code

**Download:**
1. Go to https://code.visualstudio.com/
2. Install it
3. Open it

### Step 3: Get the Code

**In Terminal:**

```bash
git clone https://github.com/dawnmaplesjm-hue/Dadasstore.git
cd Dadasstore
code .  # Opens the folder in VS Code
```

---

## Part 5: Start the Backend

### Step 1: Open Terminal in VS Code

- VS Code → Terminal → New Terminal
- Or press: `Ctrl + ~` (or `Cmd + ~` on Mac)

### Step 2: Install Dependencies

**What are dependencies?**
- Code other people wrote that helps us
- Like buying a library of helpful tools

```bash
cd backend
npm install
```

**This downloads all the tools we need.**

Wait... it might take 1-2 minutes.

### Step 3: Start the Server

```bash
npm run dev
```

**You should see:**
```
✅ Server running on http://localhost:5000
```

**What does this mean?**
- Your backend is now ALIVE
- It's waiting for requests
- It's running on your computer at port 5000

### Step 4: Test It

Open your web browser and visit:
```
http://localhost:5000/api/health
```

**You should see:**
```json
{"status": "Server is running!"}
```

🎉 **Success!** Your backend is working!

---

## Part 6: Understanding the Code

### Open `backend/src/index.ts`

Let's read the code line by line:

```typescript
// Line 1: Bringing in the Express tool
import express from 'express';

// Think of it like: "Hey, go get the Express toolbox for me"
// Express helps us build the "listening" part
```

### What is Express?

**Simple Answer:**
- Express = a helper that listens for customer requests
- When customer says "Give me products!"
- Express catches that request
- Passes it to our code to handle

---

## Part 7: Your First Code Change

### Let's Add a New Endpoint

**What is an endpoint?**
- A "door" customers can knock on
- Example: `/api/products` is a door
- When they knock, we respond

### Challenge: Add a "Welcome" Endpoint

**Open:** `backend/src/index.ts`

**Find this line:**
```typescript
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'Server is running!' });
});
```

**Add this AFTER it:**
```typescript
// NEW: Welcome endpoint - says hi to anyone who visits
app.get('/api/welcome', (req: Request, res: Response) => {
  res.json({ 
    message: 'Welcome to Dada\'s Store!',
    owner: 'Your Name Here' 
  });
});
```

### Test It

1. Save the file (Ctrl+S or Cmd+S)
2. Wait... the server should auto-restart
3. Visit in browser: `http://localhost:5000/api/welcome`
4. You should see your message!

🎉 **You just wrote your first endpoint!**

---

## Part 8: Next Steps

✅ Backend running
✅ First endpoint working

**Next:**
- Read `docs/CONCEPTS.md` (learn more concepts)
- Add a `/products` endpoint
- Add a `/products/:id` endpoint
- See the pattern?

---

## 🆘 Troubleshooting

### "npm: command not found"
→ Install Node.js from nodejs.org

### "Port 5000 already in use"
→ Change in `backend/.env`: `PORT=5001`

### "Cannot find module 'express'"
→ Did you run `npm install`? Try again!

### Code doesn't change when I refresh
→ Did you save the file? Press Ctrl+S (or Cmd+S)

---

## 📞 Questions?

**This is normal when learning!**

Steps:
1. Read the error carefully
2. Google the error message
3. Check `docs/CONCEPTS.md`
4. Ask in GitHub issues

---

**You're doing great! Keep going! 🚀**
