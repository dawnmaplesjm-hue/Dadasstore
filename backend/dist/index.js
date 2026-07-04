"use strict";
// ===================================
// DADA'S STORE - BACKEND SERVER
// The "brain" of the app
// ===================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Step 1: Get the tools we need
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const stripe_1 = __importDefault(require("stripe"));
// "import" = bring in code from other files
// "express" = the web server tool
// "dotenv" = read .env file (keeps secrets safe)
// "cors" = allow mobile app to talk to us
// Step 2: Load environment settings
dotenv_1.default.config();
// This reads your .env file
// Now we can use process.env.PORT, etc
// Step 3: Create the Express app (the server)
const app = (0, express_1.default)();
// "app" = our entire server
// Type is "Express" = tells TypeScript what it is
// Step 4: Get the port number
const port = process.env.PORT || 5000;
// "process.env.PORT" = get PORT from .env file
// "|| 5000" = if no PORT in .env, use 5000 instead
// "||" means "OR" in programming
// Simple admin credentials from environment variables.
const adminEmail = process.env.ADMIN_EMAIL || 'admin@dadasstore.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'Love1877';
const adminToken = process.env.ADMIN_TOKEN || 'dadasstore-dev-token';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripeCurrency = process.env.STRIPE_CURRENCY || 'usd';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = stripeSecretKey ? new stripe_1.default(stripeSecretKey) : null;
// ===================================
// MIDDLEWARE (code that runs for every request)
// ===================================
// Allow requests from other apps (like mobile app)
app.use((0, cors_1.default)());
// "cors()" = CORS = Cross-Origin Resource Sharing
// Without this, mobile app can't talk to backend
// Store uploaded PDF files in a local folder.
const backendRootDir = path_1.default.resolve(__dirname, '..');
const uploadsDir = path_1.default.join(backendRootDir, 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Store product data in a local JSON file so it survives restarts.
const dataFilePath = path_1.default.join(backendRootDir, 'products.json');
const purchasesFilePath = path_1.default.join(backendRootDir, 'purchases.json');
const storeSettingsFilePath = path_1.default.join(backendRootDir, 'store-settings.json');
// Make uploaded files available through a URL.
app.use('/uploads', express_1.default.static(uploadsDir));
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, callback) => callback(null, uploadsDir),
        filename: (_req, file, callback) => {
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            callback(null, `${Date.now()}-${safeName}`);
        }
    }),
    fileFilter: (_req, file, callback) => {
        const fileName = file.originalname.toLowerCase();
        const isPdf = file.mimetype === 'application/pdf' || fileName.endsWith('.pdf');
        const isImage = file.mimetype.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(fileName);
        if (isPdf || isImage) {
            callback(null, true);
            return;
        }
        callback(new Error('Only PDF or image files are allowed.'));
    }
});
const uploadProductAssets = upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]);
function requireAdminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const expectedValue = `Bearer ${adminToken}`;
    if (!authHeader || authHeader !== expectedValue) {
        return res.status(401).json({ error: 'Unauthorized. Please login as admin.' });
    }
    next();
}
const defaultProducts = [
    { id: 1, title: 'Math Ebook', price: 9.99, description: 'A beginner-friendly math ebook.', pdfUrl: '' },
    { id: 2, title: 'Science Worksheet', price: 4.99, description: 'Printable science worksheet for learners.', pdfUrl: '' }
];
const defaultStoreSettings = {
    newReleaseTitle: 'Premium digital bundle',
    newReleaseMessage: 'Buy once, download instantly, and access your files anytime.'
};
function loadProducts() {
    if (!fs_1.default.existsSync(dataFilePath)) {
        return defaultProducts;
    }
    try {
        const fileContents = fs_1.default.readFileSync(dataFilePath, 'utf-8');
        const loadedProducts = JSON.parse(fileContents);
        if (!Array.isArray(loadedProducts)) {
            return defaultProducts;
        }
        return loadedProducts;
    }
    catch {
        return defaultProducts;
    }
}
function loadPurchases() {
    if (!fs_1.default.existsSync(purchasesFilePath)) {
        return [];
    }
    try {
        const fileContents = fs_1.default.readFileSync(purchasesFilePath, 'utf-8');
        const loadedPurchases = JSON.parse(fileContents);
        if (!Array.isArray(loadedPurchases)) {
            return [];
        }
        return loadedPurchases;
    }
    catch {
        return [];
    }
}
function loadStoreSettings() {
    if (!fs_1.default.existsSync(storeSettingsFilePath)) {
        return defaultStoreSettings;
    }
    try {
        const fileContents = fs_1.default.readFileSync(storeSettingsFilePath, 'utf-8');
        const loadedSettings = JSON.parse(fileContents);
        return {
            newReleaseTitle: typeof loadedSettings.newReleaseTitle === 'string'
                ? loadedSettings.newReleaseTitle
                : defaultStoreSettings.newReleaseTitle,
            newReleaseMessage: typeof loadedSettings.newReleaseMessage === 'string'
                ? loadedSettings.newReleaseMessage
                : defaultStoreSettings.newReleaseMessage
        };
    }
    catch {
        return defaultStoreSettings;
    }
}
function saveProducts(productsToSave) {
    fs_1.default.writeFileSync(dataFilePath, JSON.stringify(productsToSave, null, 2), 'utf-8');
}
function savePurchases(purchasesToSave) {
    fs_1.default.writeFileSync(purchasesFilePath, JSON.stringify(purchasesToSave, null, 2), 'utf-8');
}
function saveStoreSettings(settingsToSave) {
    fs_1.default.writeFileSync(storeSettingsFilePath, JSON.stringify(settingsToSave, null, 2), 'utf-8');
}
function deleteUploadedFile(fileUrl) {
    if (!fileUrl) {
        return;
    }
    const fileName = path_1.default.basename(fileUrl);
    const filePath = path_1.default.join(uploadsDir, fileName);
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
}
function getProductPdfPath(product) {
    if (!product.pdfUrl) {
        return null;
    }
    return path_1.default.join(uploadsDir, path_1.default.basename(product.pdfUrl));
}
function getUploadedFile(req, fieldName) {
    const filesByField = req.files;
    if (!filesByField || !Array.isArray(filesByField[fieldName]) || filesByField[fieldName].length === 0) {
        return null;
    }
    return filesByField[fieldName][0];
}
const purchases = loadPurchases();
const storeSettings = loadStoreSettings();
if (!fs_1.default.existsSync(purchasesFilePath)) {
    savePurchases(purchases);
}
if (!fs_1.default.existsSync(storeSettingsFilePath)) {
    saveStoreSettings(storeSettings);
}
// Tell Express to understand JSON after the Stripe webhook route.
app.use(express_1.default.json());
// "app.use" = add middleware
// "express.json()" = understand when people send JSON
function recordPurchase(sessionId, product, customerEmail) {
    const existingPurchase = purchases.find((item) => item.sessionId === sessionId);
    if (existingPurchase) {
        return existingPurchase;
    }
    const purchase = {
        sessionId,
        productId: product.id,
        productTitle: product.title,
        productPrice: product.price,
        customerEmail,
        purchasedAt: new Date().toISOString(),
        downloadUrl: `/api/checkout/download/${sessionId}`
    };
    purchases.unshift(purchase);
    savePurchases(purchases);
    return purchase;
}
async function recordPurchaseFromSession(sessionId) {
    const { session, product } = await getVerifiedCheckoutSession(sessionId);
    return recordPurchase(session.id, product, session.customer_details?.email || session.customer_email || undefined);
}
async function getVerifiedCheckoutSession(sessionId) {
    if (!stripe) {
        throw new Error('Stripe is not configured.');
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
        throw new Error('Payment has not completed yet.');
    }
    const productId = Number(session.metadata?.productId);
    if (Number.isNaN(productId)) {
        throw new Error('Checkout session is missing product details.');
    }
    const product = products.find((item) => item.id === productId);
    if (!product) {
        throw new Error('Product not found for this checkout session.');
    }
    if (!product.pdfUrl) {
        throw new Error('This product does not have a downloadable file yet.');
    }
    const pdfPath = getProductPdfPath(product);
    if (!pdfPath || !fs_1.default.existsSync(pdfPath)) {
        throw new Error('The product file could not be found.');
    }
    return { session, product, pdfPath };
}
const products = loadProducts();
if (!fs_1.default.existsSync(dataFilePath)) {
    saveProducts(products);
}
// ===================================
// ENDPOINTS (doors people can knock on)
// ===================================
// ENDPOINT 1: Health check
app.get('/api/health', (req, res) => {
    // When someone visits http://localhost:5000/api/health
    // We respond with: {"status": "Server is running!"}
    res.json({ status: 'Server is running!' });
});
// NEW: Welcome endpoint - says hi to anyone who visits
app.get('/api/welcome', (req, res) => {
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
app.get('/api/products', (req, res) => {
    // Send all products as JSON
    res.json(products);
});
// GET /api/products/:id returns a single product by its ID
app.get('/api/products/:id', (req, res) => {
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
// GET /api/store-settings returns simple storefront UI settings.
app.get('/api/store-settings', (_req, res) => {
    res.json(storeSettings);
});
// PUT /api/admin/store-settings updates storefront UI settings.
app.put('/api/admin/store-settings', requireAdminAuth, (req, res) => {
    const { newReleaseTitle, newReleaseMessage } = req.body;
    if (typeof newReleaseTitle !== 'string' || typeof newReleaseMessage !== 'string') {
        return res.status(400).json({ error: 'Please provide newReleaseTitle and newReleaseMessage as text.' });
    }
    storeSettings.newReleaseTitle = newReleaseTitle.trim() || defaultStoreSettings.newReleaseTitle;
    storeSettings.newReleaseMessage = newReleaseMessage.trim() || defaultStoreSettings.newReleaseMessage;
    saveStoreSettings(storeSettings);
    res.json(storeSettings);
});
// POST /api/admin/login gives a simple token to the admin dashboard.
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (email !== adminEmail || password !== adminPassword) {
        return res.status(401).json({ error: 'Invalid admin email or password.' });
    }
    res.json({ token: adminToken });
});
// POST /api/webhooks/stripe lets Stripe tell the server when payment succeeds.
app.post('/api/webhooks/stripe', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
        return res.status(500).send('Stripe is not configured.');
    }
    let event;
    try {
        if (stripeWebhookSecret) {
            const signature = req.headers['stripe-signature'];
            if (!signature || typeof signature !== 'string') {
                return res.status(400).send('Missing Stripe signature.');
            }
            event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
        }
        else {
            event = JSON.parse(req.body.toString('utf-8'));
        }
    }
    catch {
        return res.status(400).send('Invalid Stripe webhook payload.');
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        try {
            if (session.payment_status === 'paid' && session.metadata?.productId) {
                await recordPurchaseFromSession(session.id);
            }
        }
        catch {
            return res.status(500).send('Unable to save purchase.');
        }
    }
    return res.json({ received: true });
});
// Tell Express to understand JSON after the Stripe webhook route.
app.use(express_1.default.json());
// "app.use" = add middleware
// "express.json()" = understand when people send JSON
// POST /api/checkout/create-session starts a Stripe Checkout flow for one product.
app.post('/api/checkout/create-session', async (req, res) => {
    if (!stripe) {
        return res.status(500).json({ error: 'Stripe is not configured on the server.' });
    }
    const requestOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : frontendUrl;
    const productId = Number(req.body.productId);
    if (Number.isNaN(productId)) {
        return res.status(400).json({ error: 'Product ID must be a number.' });
    }
    const product = products.find((item) => item.id === productId);
    if (!product) {
        return res.status(404).json({ error: 'Product not found.' });
    }
    if (!product.pdfUrl) {
        return res.status(400).json({ error: 'This product does not have a downloadable file yet.' });
    }
    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            success_url: `${requestOrigin}/?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${requestOrigin}/?canceled=true`,
            metadata: { productId: String(product.id) },
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: stripeCurrency,
                        unit_amount: Math.round(product.price * 100),
                        product_data: {
                            name: product.title,
                            description: product.description || product.pdfName || 'Instant digital download'
                        }
                    }
                }
            ]
        });
        if (!session.url) {
            return res.status(500).json({ error: 'Stripe did not return a checkout URL.' });
        }
        res.json({ checkoutUrl: session.url });
    }
    catch {
        res.status(500).json({ error: 'Unable to start Stripe checkout.' });
    }
});
// GET /api/checkout/session/:sessionId checks a Stripe payment and returns the purchase details.
app.get('/api/checkout/session/:sessionId', async (req, res) => {
    try {
        const { session, product } = await getVerifiedCheckoutSession(req.params.sessionId);
        recordPurchase(session.id, product, session.customer_details?.email || session.customer_email || undefined);
        res.json({
            sessionId: session.id,
            productId: product.id,
            productTitle: product.title,
            downloadUrl: `/api/checkout/download/${session.id}`
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to verify checkout session.';
        res.status(400).json({ error: message });
    }
});
// GET /api/purchases/recent returns the latest saved purchases.
app.get('/api/purchases/recent', (req, res) => {
    const count = Number(req.query.count || 10);
    const safeCount = Number.isNaN(count) ? 10 : Math.min(Math.max(count, 1), 20);
    res.json(purchases.slice(0, safeCount));
});
// GET /api/checkout/download/:sessionId streams the PDF after payment is verified.
app.get('/api/checkout/download/:sessionId', async (req, res) => {
    try {
        const { pdfPath, product } = await getVerifiedCheckoutSession(req.params.sessionId);
        res.download(pdfPath, product.pdfName || path_1.default.basename(pdfPath));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to download file.';
        res.status(400).json({ error: message });
    }
});
// POST /api/products accepts a new product and returns it
app.post('/api/products', requireAdminAuth, (req, res) => {
    const { title, price, description } = req.body;
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
        description: typeof description === 'string' ? description.trim() : '',
        pdfUrl: ''
    };
    products.push(newProduct);
    saveProducts(products);
    res.status(201).json(newProduct);
});
// POST /api/products/upload accepts a PDF file and saves it with the product
app.post('/api/products/upload', requireAdminAuth, uploadProductAssets, (req, res) => {
    const { title, price, description } = req.body;
    const uploadedPdf = getUploadedFile(req, 'pdf');
    const uploadedImage = getUploadedFile(req, 'image');
    if (!title || typeof title !== 'string' || !price || Number.isNaN(Number(price))) {
        return res.status(400).json({
            error: 'Please send a valid product title, price, and PDF file.'
        });
    }
    if (!uploadedPdf) {
        return res.status(400).json({ error: 'Please choose a PDF file to upload.' });
    }
    const newProduct = {
        id: products.length + 1,
        title: title.trim(),
        price: Number(price),
        description: typeof description === 'string' ? description.trim() : '',
        pdfUrl: `/uploads/${uploadedPdf.filename}`,
        pdfName: uploadedPdf.originalname,
        imageUrl: uploadedImage ? `/uploads/${uploadedImage.filename}` : '',
        imageName: uploadedImage ? uploadedImage.originalname : ''
    };
    products.push(newProduct);
    saveProducts(products);
    res.status(201).json(newProduct);
});
// PUT /api/products/:id updates a product by its ID
app.put('/api/products/:id', requireAdminAuth, (req, res) => {
    const productId = Number(req.params.id);
    const { title, price, description } = req.body;
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
    if (typeof description === 'string') {
        product.description = description.trim();
    }
    saveProducts(products);
    res.json(product);
});
// PUT /api/products/:id/upload updates product info and can replace the PDF file
app.put('/api/products/:id/upload', requireAdminAuth, uploadProductAssets, (req, res) => {
    const productId = Number(req.params.id);
    const { title, price, description } = req.body;
    const uploadedPdf = getUploadedFile(req, 'pdf');
    const uploadedImage = getUploadedFile(req, 'image');
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
    if (typeof description === 'string') {
        product.description = description.trim();
    }
    if (uploadedPdf) {
        // Replace previous PDF file so the uploads folder stays clean.
        deleteUploadedFile(product.pdfUrl);
        product.pdfUrl = `/uploads/${uploadedPdf.filename}`;
        product.pdfName = uploadedPdf.originalname;
    }
    if (uploadedImage) {
        // Replace previous image file when admin uploads a new one.
        deleteUploadedFile(product.imageUrl);
        product.imageUrl = `/uploads/${uploadedImage.filename}`;
        product.imageName = uploadedImage.originalname;
    }
    saveProducts(products);
    res.json(product);
});
// DELETE /api/products/:id removes a product by its ID
app.delete('/api/products/:id', requireAdminAuth, (req, res) => {
    const productId = Number(req.params.id);
    if (Number.isNaN(productId)) {
        return res.status(400).json({ error: 'Product ID must be a number.' });
    }
    const index = products.findIndex((item) => item.id === productId);
    if (index === -1) {
        return res.status(404).json({ error: 'Product not found.' });
    }
    deleteUploadedFile(products[index].pdfUrl);
    deleteUploadedFile(products[index].imageUrl);
    products.splice(index, 1);
    saveProducts(products);
    res.json({ message: 'Product deleted successfully.' });
});
// Convert common upload/runtime errors into JSON so the admin UI can show clear messages.
app.use((error, _req, res, _next) => {
    if (error instanceof multer_1.default.MulterError) {
        const uploadMessage = error.code === 'LIMIT_UNEXPECTED_FILE'
            ? `Unexpected file field: ${error.field || 'unknown'}`
            : `Upload error: ${error.message}`;
        return res.status(400).json({ error: uploadMessage });
    }
    if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Unexpected server error.' });
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
//# sourceMappingURL=index.js.map