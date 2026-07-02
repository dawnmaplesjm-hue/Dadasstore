# 💡 Coding Concepts Explained

## What You'll Learn

This document explains the **"why"** behind the code.

---

## 1. Variables

### What is a Variable?

A variable is like a **labeled box** that holds information.

```typescript
// Create a box called 'productName' and put "Math Ebook" in it
const productName = "Math Ebook";

// Create a box called 'price' and put 9.99 in it
const price = 9.99;

// Create a box called 'quantity' and put 5 in it
const quantity = 5;
```

### const vs let

```typescript
// const = "This won't change" (use this most of the time)
const adminEmail = "you@email.com";
// adminEmail = "new@email.com";  // ❌ ERROR! Can't change

// let = "This might change"
let cartTotal = 0;
cartTotal = 10;  // ✅ OK! Changed it
```

### Types (TypeScript Feature)

```typescript
// String = text
const title: string = "My Ebook";

// number = a number
const price: number = 9.99;

// boolean = true or false
const isAvailable: boolean = true;

// any = anything (avoid if possible)
const anything: any = "could be anything";
```

---

## 2. Functions

### What is a Function?

A function is a **reusable recipe** or **instruction set**.

```typescript
// Old way (repetitive)
const item1Total = 10 * 2;  // 10 dollars, quantity 2
const item2Total = 5 * 3;   // 5 dollars, quantity 3
const item3Total = 20 * 1;  // 20 dollars, quantity 1

// Better way (function)
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

const item1Total = calculateTotal(10, 2);   // 20
const item2Total = calculateTotal(5, 3);    // 15
const item3Total = calculateTotal(20, 1);   // 20
```

### Function Breakdown

```typescript
function calculateTotal(price: number, quantity: number): number {
  //     ^                ^                        ^
  //     |                |                        |
  //  function name    INPUTS (parameters)      OUTPUT type
  
  return price * quantity;
  // Send back the result
}
```

### Real Example: Getting a Product

```typescript
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
```

---

## 3. Objects

### What is an Object?

An object is a **container of related information**.

```typescript
// A customer object
const customer = {
  id: 1,
  name: "John",
  email: "john@email.com",
  createdAt: "2024-01-01"
};

// Access information
console.log(customer.name);   // "John"
console.log(customer.email);  // "john@email.com"
```

### Real Example: Product Object

```typescript
const product = {
  id: 1,
  title: "Algebra Worksheet",
  description: "30 algebra practice problems",
  price: 4.99,
  category: "worksheet",
  fileUrl: "https://storage.com/algebra.pdf",
  fileSize: 2048576,  // bytes
  createdAt: "2024-01-15"
};

// Use it
console.log(product.title);     // "Algebra Worksheet"
console.log(product.price);     // 4.99
```

---

## 4. Arrays

### What is an Array?

An array is a **list of things**.

```typescript
// Array of products
const products = [
  {
    id: 1,
    title: "Math Ebook",
    price: 9.99
  },
  {
    id: 2,
    title: "Science Worksheet",
    price: 4.99
  },
  {
    id: 3,
    title: "Lesson Plan",
    price: 14.99
  }
];

// Access items
console.log(products[0].title);  // "Math Ebook" (first item)
console.log(products[1].title);  // "Science Worksheet" (second item)
console.log(products.length);    // 3 (how many items)
```

### Loop Through Array

```typescript
// Loop through all products
products.forEach((product) => {
  console.log(product.title);
  // Prints:
  // Math Ebook
  // Science Worksheet
  // Lesson Plan
});

// Create a new array with just prices
const prices = products.map((product) => product.price);
// prices = [9.99, 4.99, 14.99]

// Find expensive products (over $10)
const expensive = products.filter((product) => product.price > 10);
// expensive = [{id: 3, title: "Lesson Plan", price: 14.99}]
```

---

## 5. Conditionals (if/else)

### What is a Conditional?

Code that runs based on a **yes/no question**.

```typescript
const age = 25;

if (age >= 18) {
  console.log("You can buy");  // This runs
} else {
  console.log("You're too young");
}
```

### Real Example: Checking if Admin

```typescript
const userRole = "admin";

if (userRole === "admin") {
  // Only admins can add products
  allowAddProduct();
} else if (userRole === "customer") {
  // Customers can only browse
  showProducts();
} else {
  // Unknown role
  console.log("Unknown user type");
}
```

### Comparison Operators

```typescript
// Equals
if (price === 9.99) { }  // Exactly 9.99

// Not equals
if (status !== "pending") { }  // Not pending

// Greater than
if (quantity > 5) { }  // More than 5

// Less than or equal
if (age <= 18) { }  // 18 or younger

// Multiple conditions (AND)
if (isAdmin && hasPermission) { }  // Both must be true

// Multiple conditions (OR)
if (isPremium || isFreeDay) { }  // At least one must be true
```

---

## 6. Promises & Async/Await

### What is a Promise?

A Promise is like **waiting for something to happen**.

```typescript
// Real life example:
// You ask a friend "Can you get me a book?"
// Friend: "I promise I'll get it!"
// Friend goes to library (takes time)
// Friend comes back: "Here's your book!" or "Sorry, they're out"

// Code example:
const getBookFromLibrary = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Imagine this takes 2 seconds
    setTimeout(() => {
      resolve("Here's your book!");
      // Or: reject("Book not available");
    }, 2000);
  });
};
```

### Async/Await (Easier Way)

```typescript
// async = "This function waits for things"
async function downloadMyBook() {
  // Wait for the library to find the book
  const book = await getBookFromLibrary();
  
  // After we get it, do this
  console.log(book);  // "Here's your book!"
}

// Use it
downloadMyBook();  // Book will appear in 2 seconds
```

### Real Example: Getting Product from Database

```typescript
// This WAITS for the database
async function getProduct(id: number) {
  // Wait for database to respond
  const product = await database.getProductById(id);
  
  // Now we have the product
  return product;
}

// Use it
const myProduct = await getProduct(1);
console.log(myProduct.title);  // Works!
```

---

## 7. Express & APIs

### What is an API?

An API is a **menu** your app uses to talk to the backend.

```
API Endpoints (like menu items):

GET /api/products
  → "Give me all products"

GET /api/products/1
  → "Give me product #1"

POST /api/products
  → "Here's a new product, save it"

PUT /api/products/1
  → "Update product #1"

DELETE /api/products/1
  → "Delete product #1"
```

### HTTP Methods

```typescript
// GET = Retrieve (read-only, safe)
app.get('/api/products', (req, res) => {
  // Return products
});

// POST = Create (adds something new)
app.post('/api/products', (req, res) => {
  // Save new product
});

// PUT = Update (modify existing)
app.put('/api/products/:id', (req, res) => {
  // Update product with given ID
});

// DELETE = Remove
app.delete('/api/products/:id', (req, res) => {
  // Delete product with given ID
});
```

### Real Example: Get All Products

```typescript
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
```

---

## 8. JSON

### What is JSON?

JSON is a **format for sending information** between apps.

```json
{
  "product": {
    "id": 1,
    "title": "Math Ebook",
    "price": 9.99,
    "inStock": true
  }
}
```

### Converting Between TypeScript and JSON

```typescript
// TypeScript object
const product = {
  id: 1,
  title: "Math Ebook",
  price: 9.99
};

// Convert to JSON (text)
const jsonString = JSON.stringify(product);
// {"id":1,"title":"Math Ebook","price":9.99}

// Convert from JSON back to object
const productAgain = JSON.parse(jsonString);
// { id: 1, title: "Math Ebook", price: 9.99 }
```

---

## Summary

You now understand:

✅ Variables & Types
✅ Functions
✅ Objects & Arrays
✅ Conditionals
✅ Promises & Async/Await
✅ APIs & HTTP
✅ JSON

**Next step:** Apply these in code!

Read the code comments in `backend/src/index.ts`
