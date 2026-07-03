// ===================================
// DADA'S STORE - BACKEND SERVER
// The "brain" of the app
// ===================================

// Step 1: Get the tools we need
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// "import" = bring in code from other files
// "express" = the web server tool
// "dotenv" = read .env file (keeps secrets safe)
// "cors" = allow mobile app to talk to us

// Step 2: Load environment settings
dotenv.config();
// This reads your .env file
// Now we can use process.env.PORT, etc

// Step 3: Create the Express app (the server)
const app: Express = express();
// "app" = our entire server
// Type is "Express" = tells TypeScript what it is

// Step 4: Get the port number
const port = process.env.PORT || 5000;
// "process.env.PORT" = get PORT from .env file
// "|| 5000" = if no PORT in .env, use 5000 instead
// "||" means "OR" in programming

// Simple admin credentials from environment variables.
const adminEmail = process.env.ADMIN_EMAIL || 'admin@dadasstore.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
const adminToken = process.env.ADMIN_TOKEN || 'dadasstore-dev-token';

// ===================================
// MIDDLEWARE (code that runs for every request)
// ===================================

// Tell Express to understand JSON
app.use(express.json());
// "app.use" = add middleware
// "express.json()" = understand when people send JSON

// Allow requests from other apps (like mobile app)
app.use(cors());
// "cors()" = CORS = Cross-Origin Resource Sharing
// Without this, mobile app can't talk to backend

// Store uploaded PDF files in a local folder.
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Store product data in a local JSON file so it survives restarts.
const dataFilePath = path.join(process.cwd(), 'products.json');

// Make uploaded files available through a URL.
app.use('/uploads', express.static(uploadsDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadsDir),
    filename: (_req, file, callback) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      callback(null, `${Date.now()}-${safeName}`);
    }
  }),
  fileFilter: (_req, file, callback) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      callback(null, true);
      return;
    }

    callback(new Error('Only PDF files are allowed.'));
  }
});

// Sample product data stored in memory for learning.
// This is not a real database, so data resets when the server restarts.
type Product = {
  id: number;
  title: string;
  price: number;
  pdfUrl?: string;
  pdfName?: string;
};

function requireAdminAuth(req: Request, res: Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const expectedValue = `Bearer ${adminToken}`;

  if (!authHeader || authHeader !== expectedValue) {
    return res.status(401).json({ error: 'Unauthorized. Please login as admin.' });
  }

  next();
}

const defaultProducts: Product[] = [
  { id: 1, title: 'Math Ebook', price: 9.99, pdfUrl: '' },
  { id: 2, title: 'Science Worksheet', price: 4.99, pdfUrl: '' }
];

function loadProducts(): Product[] {
  if (!fs.existsSync(dataFilePath)) {
    return defaultProducts;
  }

  try {
    const fileContents = fs.readFileSync(dataFilePath, 'utf-8');
    const loadedProducts = JSON.parse(fileContents) as Product[];

    if (!Array.isArray(loadedProducts)) {
      return defaultProducts;
    }

    return loadedProducts;
  } catch {
    return defaultProducts;
  }
}

function saveProducts(productsToSave: Product[]) {
  fs.writeFileSync(dataFilePath, JSON.stringify(productsToSave, null, 2), 'utf-8');
}

function deletePdfFile(pdfUrl?: string) {
  if (!pdfUrl) {
    return;
  }

  const fileName = path.basename(pdfUrl);
  const filePath = path.join(uploadsDir, fileName);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

const products: Product[] = loadProducts();

if (!fs.existsSync(dataFilePath)) {
  saveProducts(products);
}

// ===================================
// ENDPOINTS (doors people can knock on)
// ===================================

// ENDPOINT 1: Health check
app.get('/api/health', (req: Request, res: Response) => {
  // When someone visits http://localhost:5000/api/health
  // We respond with: {"status": "Server is running!"}
  res.json({ status: 'Server is running!' });
});
// NEW: Welcome endpoint - says hi to anyone who visits
app.get('/api/welcome', (req: Request, res: Response) => {
  res.json({ 
    message: 'Welcome to Dada\'s Store!',
    owner: 'Your Name Here' 
  });
});

// "app.get" = listening for GET requests
// "/api/health" = the URL path
// "(req, res) =>" = arrow function
//   req = what they asked for
//   res = what we send back
// "res.json()" = send back JSON data

// ===================================
// TODO: Add more endpoints here
// ===================================
// We'll add these:
// - GET /api/products (get all products)
// - GET /api/products/:id (get one product)
app.get('/api/products', (req: Request, res: Response) => {
  // Send all products as JSON
  res.json(products);
});

// GET /api/products/:id returns a single product by its ID
app.get('/api/products/:id', (req: Request, res: Response) => {
  const productId = Number(req.params.id);

  if (Number.isNaN(productId)) {
    return res.status(400).json({ error: 'Product ID must be a number.' });
  }

  const product = products.find((item) => item.id === productId);

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  res.json(product);
});

// POST /api/admin/login gives a simple token to the admin dashboard.
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid admin email or password.' });
  }

  res.json({ token: adminToken });
});

// POST /api/products accepts a new product and returns it
app.post('/api/products', requireAdminAuth, (req: Request, res: Response) => {
  const { title, price } = req.body;

  // Basic validation for learning purposes
  if (!title || typeof title !== 'string' || !price || typeof price !== 'number') {
    return res.status(400).json({
      error: 'Please send a valid product with a string title and numeric price.'
    });
  }

  const newProduct = {
    id: products.length + 1,
    title,
    price,
    pdfUrl: ''
  };

  products.push(newProduct);
  saveProducts(products);

  res.status(201).json(newProduct);
});

// POST /api/products/upload accepts a PDF file and saves it with the product
app.post('/api/products/upload', requireAdminAuth, upload.single('pdf'), (req: Request, res: Response) => {
  const { title, price } = req.body;

  if (!title || typeof title !== 'string' || !price || Number.isNaN(Number(price))) {
    return res.status(400).json({
      error: 'Please send a valid product title, price, and PDF file.'
    });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Please choose a PDF file to upload.' });
  }

  const newProduct = {
    id: products.length + 1,
    title: title.trim(),
    price: Number(price),
    pdfUrl: `/uploads/${req.file.filename}`,
    pdfName: req.file.originalname
  };

  products.push(newProduct);
  saveProducts(products);

  res.status(201).json(newProduct);
});

// PUT /api/products/:id updates a product by its ID
app.put('/api/products/:id', requireAdminAuth, (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  const { title, price } = req.body;

  if (Number.isNaN(productId)) {
    return res.status(400).json({ error: 'Product ID must be a number.' });
  }

  const product = products.find((item) => item.id === productId);

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  if (title && typeof title === 'string') {
    product.title = title;
  }

  if (price && typeof price === 'number') {
    product.price = price;
  }

  saveProducts(products);

  res.json(product);
});

// PUT /api/products/:id/upload updates product info and can replace the PDF file
app.put('/api/products/:id/upload', requireAdminAuth, upload.single('pdf'), (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  const { title, price } = req.body;

  if (Number.isNaN(productId)) {
    return res.status(400).json({ error: 'Product ID must be a number.' });
  }

  const product = products.find((item) => item.id === productId);

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  if (title && typeof title === 'string') {
    product.title = title.trim();
  }

  if (price && !Number.isNaN(Number(price))) {
    product.price = Number(price);
  }

  if (req.file) {
    // Replace previous PDF file so the uploads folder stays clean.
    deletePdfFile(product.pdfUrl);
    product.pdfUrl = `/uploads/${req.file.filename}`;
    product.pdfName = req.file.originalname;
  }

  saveProducts(products);

  res.json(product);
});

// DELETE /api/products/:id removes a product by its ID
app.delete('/api/products/:id', requireAdminAuth, (req: Request, res: Response) => {
  const productId = Number(req.params.id);

  if (Number.isNaN(productId)) {
    return res.status(400).json({ error: 'Product ID must be a number.' });
  }

  const index = products.findIndex((item) => item.id === productId);

  if (index === -1) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  deletePdfFile(products[index].pdfUrl);
  products.splice(index, 1);
  saveProducts(products);

  res.json({ message: 'Product deleted successfully.' });
});

// ===================================
// START THE SERVER
// ===================================

app.listen(port, () => {
  // "app.listen" = turn on the server
  // "port" = listen on this port number
  // "() => {}" = what to do when server starts
  
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log(`
🎓 Learning Backend Development!

Try visiting these in your browser:
- http://localhost:${port}/api/health
- http://localhost:${port}/api/products
- http://localhost:${port}/api/products/1

You can also POST, PUT, and DELETE /api/products.
  `);
});

// ===================================
// That's it! You now have a server running!
// ===================================
