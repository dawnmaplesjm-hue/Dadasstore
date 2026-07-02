// ===================================
// DADA'S STORE - BACKEND SERVER
// The "brain" of the app
// ===================================

// Step 1: Get the tools we need
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

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
app.get('/api/products', (req: Request, res: Response) => {
  // Get all products from database
  const allProducts = [
    { id: 1, title: "Math Ebook", price: 9.99 },
    { id: 2, title: "Science Worksheet", price: 4.99 }
  ];
  
  // Send back as JSON
  res.json(allProducts);
  
  // Customer's app receives:
  // [
  //   { id: 1, title: "Math Ebook", price: 9.99 },
  //   { id: 2, title: "Science Worksheet", price: 4.99 }
  // ]
});
// - GET /api/products/:id (get one product)
// Function that GETS a product from our store
function getProduct(productId: number) {
  // Look in our database for this product
  // If found: return the product
  // If not found: return null
  
  return {
    id: productId,
    title: "Math Ebook",
    price: 9.99
  };
}

// USE it
const myProduct = getProduct(1);
console.log(myProduct.title);  // Prints: "Math Ebook"
// - POST /api/products (admin adds product)
// - PUT /api/products/:id (admin edits product)
// - DELETE /api/products/:id (admin deletes product)

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

Next: Add /api/products endpoint!
  `);
});

// ===================================
// That's it! You now have a server running!
// ===================================
