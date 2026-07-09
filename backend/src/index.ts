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
import crypto from 'crypto';
import multer from 'multer';
import Stripe from 'stripe';

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
const adminPassword = process.env.ADMIN_PASSWORD || 'Love1877';
const adminToken = process.env.ADMIN_TOKEN || 'dadasstore-dev-token';
const downloadSecret = process.env.DOWNLOAD_SECRET || adminToken;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripeCurrency = process.env.STRIPE_CURRENCY || 'usd';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// ===================================
// MIDDLEWARE (code that runs for every request)
// ===================================

// Allow requests from other apps (like mobile app)
app.use(cors());
// "cors()" = CORS = Cross-Origin Resource Sharing
// Without this, mobile app can't talk to backend

// Store uploaded PDF files in a local folder.
const backendRootDir = path.resolve(__dirname, '..');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : backendRootDir;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Store product data in a local JSON file so it survives restarts.
const dataFilePath = path.join(dataDir, 'products.json');
const purchasesFilePath = path.join(dataDir, 'purchases.json');
const storeSettingsFilePath = path.join(dataDir, 'store-settings.json');
const leadsFilePath = path.join(dataDir, 'leads.json');
const promotionsFilePath = path.join(dataDir, 'promotions.json');
const globalSaleFilePath = path.join(dataDir, 'global-sale.json');

// Make uploaded files available through a URL.
app.use('/uploads', express.static(uploadsDir));

const jsonBodyParser = express.json();
app.use((req: Request, res: Response, next: express.NextFunction) => {
  if (req.path === '/api/webhooks/stripe' || req.path === '/webhooks/stripe') {
    return next();
  }

  return jsonBodyParser(req, res, next);
});

const upload = multer({
  storage: multer.diskStorage({
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

// Sample product data stored in memory for learning.
// This is not a real database, so data resets when the server restarts.
type Product = {
  id: number;
  title: string;
  price: number;
  description?: string;
  isBestSeller?: boolean;
  pdfUrl?: string;
  pdfName?: string;
  imageUrl?: string;
  imageName?: string;
};

type Purchase = {
  sessionId: string;
  productId: number;
  productTitle: string;
  productPrice: number;
  customerEmail?: string;
  purchasedAt: string;
  downloadUrl: string;
};

type Lead = {
  email: string;
  name?: string;
  source?: string;
  createdAt: string;
};

type Promotion = {
  code: string;
  kind: 'percent' | 'fixed';
  amount: number;
  active: boolean;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
};

type GlobalSaleSettings = {
  active: boolean;
  kind: 'percent' | 'fixed';
  amount: number;
  label: string;
  startsAt?: string;
  endsAt?: string;
  updatedAt: string;
};

type StoreSettings = {
  newReleaseTitle: string;
  newReleaseMessage: string;
  saleBannerEnabled: boolean;
  saleBannerTitle: string;
  saleBannerMessage: string;
  featuredProductId: number | null;
  featuredProductLabel: string;
  cardBadgeText: string;
  cardKickerText: string;
  shopSectionTitle: string;
  benefitOne: string;
  benefitTwo: string;
  benefitThree: string;
  detailsButtonText: string;
  buyButtonText: string;
  buyFeaturedButtonText: string;
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
  { id: 1, title: 'Math Ebook', price: 9.99, description: 'A beginner-friendly math ebook.', isBestSeller: false, pdfUrl: '' },
  { id: 2, title: 'Science Worksheet', price: 4.99, description: 'Printable science worksheet for learners.', isBestSeller: false, pdfUrl: '' }
];

const defaultStoreSettings: StoreSettings = {
  newReleaseTitle: 'Premium digital bundle',
  newReleaseMessage: 'Buy once, download instantly, and access your files anytime.',
  saleBannerEnabled: false,
  saleBannerTitle: 'Sale now live',
  saleBannerMessage: 'Limited-time savings on digital products.',
  featuredProductId: null,
  featuredProductLabel: 'Featured pick',
  cardBadgeText: 'Best Seller',
  cardKickerText: 'Digital Download',
  shopSectionTitle: 'Shop Products',
  benefitOne: 'Instant download',
  benefitTwo: 'Secure checkout',
  benefitThree: 'Mobile ready',
  detailsButtonText: 'View details',
  buyButtonText: 'Buy now',
  buyFeaturedButtonText: 'Buy Featured'
};

function sanitizeStoreText(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function parseIsBestSeller(input: unknown): boolean {
  if (typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'string') {
    const normalized = input.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
  }

  return false;
}

function parseCheckoutProductToken(rawProductId: string): number {
  const normalizedValue = rawProductId.trim();
  if (!normalizedValue) {
    return NaN;
  }

  const numericValue = Number(normalizedValue);
  if (!Number.isNaN(numericValue)) {
    return numericValue;
  }

  // Facebook catalogs often use IDs like p-3-1. We map these back to the numeric product id.
  const catalogMatch = normalizedValue.match(/^p-(\d+)(?:-\d+)?$/i);
  if (catalogMatch?.[1]) {
    return Number(catalogMatch[1]);
  }

  return NaN;
}

function parseCheckoutProductsParam(req: Request): Array<{ productId: number; quantity: number }> | null {
  const productsRaw = typeof req.query.products === 'string' ? req.query.products.trim() : '';
  if (!productsRaw) {
    return null;
  }

  let decodedProducts = productsRaw;
  try {
    decodedProducts = decodeURIComponent(productsRaw);
  } catch {
    decodedProducts = productsRaw;
  }

  const parsedProducts = decodedProducts
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawProductId, rawQuantity] = entry.split(':');
      const productId = parseCheckoutProductToken(rawProductId || '');
      const parsedQuantity = Number(rawQuantity || '1');
      const quantity = Number.isNaN(parsedQuantity) ? 1 : Math.max(1, Math.floor(parsedQuantity));

      if (Number.isNaN(productId)) {
        return null;
      }

      return { productId, quantity };
    })
    .filter((entry): entry is { productId: number; quantity: number } => Boolean(entry));

  return parsedProducts.length > 0 ? parsedProducts : null;
}

function parseCheckoutProductId(req: Request): number {
  const productsParam = parseCheckoutProductsParam(req);
  if (productsParam && productsParam.length > 0) {
    return productsParam[0].productId;
  }

  const pathValue = typeof req.params.productId === 'string' ? req.params.productId : '';
  const queryValue = typeof req.query.product_id === 'string'
    ? req.query.product_id
    : typeof req.query.productId === 'string'
      ? req.query.productId
      : typeof req.query.id === 'string'
        ? req.query.id
        : '';

  const rawValue = pathValue || queryValue;
  const parsedValue = parseCheckoutProductToken(rawValue);

  return Number.isNaN(parsedValue) ? NaN : parsedValue;
}

function parseCheckoutQuantity(req: Request): number {
  const productsParam = parseCheckoutProductsParam(req);
  if (productsParam && productsParam.length > 0) {
    return productsParam[0].quantity;
  }

  const rawQuantity = typeof req.query.quantity === 'string'
    ? req.query.quantity
    : typeof req.query.qty === 'string'
      ? req.query.qty
      : '1';

  const parsedQuantity = Number(rawQuantity);
  if (Number.isNaN(parsedQuantity)) {
    return 1;
  }

  return Math.max(1, Math.floor(parsedQuantity));
}

function parseCheckoutCouponCode(req: Request): string {
  const rawValue = typeof req.query.coupon_code === 'string'
    ? req.query.coupon_code
    : typeof req.query.couponCode === 'string'
      ? req.query.couponCode
      : typeof req.query.coupon === 'string'
        ? req.query.coupon
        : typeof req.query.discount_code === 'string'
          ? req.query.discount_code
          : '';

  return rawValue.trim();
}

function normalizePromotionCode(input: string) {
  return input.trim().toUpperCase();
}

function loadPromotions(): Promotion[] {
  if (!fs.existsSync(promotionsFilePath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(promotionsFilePath, 'utf-8');
    const loadedPromotions = JSON.parse(fileContents) as Promotion[];

    if (!Array.isArray(loadedPromotions)) {
      return [];
    }

    return loadedPromotions;
  } catch {
    return [];
  }
}

function loadGlobalSale(): GlobalSaleSettings {
  if (!fs.existsSync(globalSaleFilePath)) {
    return {
      active: false,
      kind: 'percent',
      amount: 0,
      label: 'Store Sale',
      updatedAt: new Date().toISOString()
    };
  }

  try {
    const fileContents = fs.readFileSync(globalSaleFilePath, 'utf-8');
    const loadedSale = JSON.parse(fileContents) as Partial<GlobalSaleSettings>;

    return {
      active: Boolean(loadedSale.active),
      kind: loadedSale.kind === 'fixed' ? 'fixed' : 'percent',
      amount: typeof loadedSale.amount === 'number' ? loadedSale.amount : 0,
      label: typeof loadedSale.label === 'string' && loadedSale.label.trim() ? loadedSale.label.trim() : 'Store Sale',
      startsAt: typeof loadedSale.startsAt === 'string' && loadedSale.startsAt.trim() ? loadedSale.startsAt.trim() : undefined,
      endsAt: typeof loadedSale.endsAt === 'string' && loadedSale.endsAt.trim() ? loadedSale.endsAt.trim() : undefined,
      updatedAt: typeof loadedSale.updatedAt === 'string' ? loadedSale.updatedAt : new Date().toISOString()
    };
  } catch {
    return {
      active: false,
      kind: 'percent',
      amount: 0,
      label: 'Store Sale',
      updatedAt: new Date().toISOString()
    };
  }
}

function savePromotions(promotionsToSave: Promotion[]) {
  fs.writeFileSync(promotionsFilePath, JSON.stringify(promotionsToSave, null, 2), 'utf-8');
}

function saveGlobalSale(globalSaleToSave: GlobalSaleSettings) {
  fs.writeFileSync(globalSaleFilePath, JSON.stringify(globalSaleToSave, null, 2), 'utf-8');
}

function isPromotionActive(promotion: Promotion) {
  if (!promotion.active) {
    return false;
  }

  const now = Date.now();

  if (promotion.startsAt) {
    const startsAt = Date.parse(promotion.startsAt);
    if (!Number.isNaN(startsAt) && now < startsAt) {
      return false;
    }
  }

  if (promotion.endsAt) {
    const endsAt = Date.parse(promotion.endsAt);
    if (!Number.isNaN(endsAt) && now > endsAt) {
      return false;
    }
  }

  return true;
}

function calculateUnitAmountWithPromotion(baseUnitAmount: number, promotion: Promotion) {
  if (promotion.kind === 'percent') {
    const discountMultiplier = Math.max(0, Math.min(100, promotion.amount));
    const discounted = Math.round(baseUnitAmount * (1 - discountMultiplier / 100));
    return Math.max(50, discounted);
  }

  const fixedDiscountCents = Math.round(Math.max(0, promotion.amount) * 100);
  return Math.max(50, baseUnitAmount - fixedDiscountCents);
}

function getActivePromotionByCode(rawCode: string, promotions: Promotion[]) {
  const normalizedCode = normalizePromotionCode(rawCode);

  if (!normalizedCode) {
    return null;
  }

  const matchedPromotion = promotions.find((promotion) => normalizePromotionCode(promotion.code) === normalizedCode);
  if (!matchedPromotion || !isPromotionActive(matchedPromotion)) {
    return null;
  }

  return matchedPromotion;
}

function getActiveGlobalSalePromotion(globalSale: GlobalSaleSettings) {
  if (!globalSale.active || globalSale.amount <= 0) {
    return null;
  }

  const pseudoPromotion: Promotion = {
    code: 'STORE_SALE',
    kind: globalSale.kind,
    amount: globalSale.amount,
    active: globalSale.active,
    description: globalSale.label,
    startsAt: globalSale.startsAt,
    endsAt: globalSale.endsAt,
    createdAt: globalSale.updatedAt,
    updatedAt: globalSale.updatedAt
  };

  if (!isPromotionActive(pseudoPromotion)) {
    return null;
  }

  return pseudoPromotion;
}

async function resolveStripeDiscount(code: string): Promise<Stripe.Checkout.SessionCreateParams.Discount[] | undefined> {
  if (!stripe || !code) {
    return undefined;
  }

  // Accept either a Stripe coupon id or a promotion code.
  try {
    const coupon = await stripe.coupons.retrieve(code);
    if (!coupon.deleted) {
      return [{ coupon: coupon.id }];
    }
  } catch {
    // Keep trying as promotion code.
  }

  try {
    const promotionCodes = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
    const promotionCode = promotionCodes.data[0];
    if (promotionCode) {
      return [{ promotion_code: promotionCode.id }];
    }
  } catch {
    // Fall through to invalid coupon handling.
  }

  return undefined;
}

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

function loadPurchases(): Purchase[] {
  if (!fs.existsSync(purchasesFilePath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(purchasesFilePath, 'utf-8');
    const loadedPurchases = JSON.parse(fileContents) as Purchase[];

    if (!Array.isArray(loadedPurchases)) {
      return [];
    }

    return loadedPurchases;
  } catch {
    return [];
  }
}

function loadStoreSettings(): StoreSettings {
  if (!fs.existsSync(storeSettingsFilePath)) {
    return defaultStoreSettings;
  }

  try {
    const fileContents = fs.readFileSync(storeSettingsFilePath, 'utf-8');
    const loadedSettings = JSON.parse(fileContents) as Partial<StoreSettings>;

    return {
      newReleaseTitle: typeof loadedSettings.newReleaseTitle === 'string'
        ? loadedSettings.newReleaseTitle
        : defaultStoreSettings.newReleaseTitle,
      newReleaseMessage: typeof loadedSettings.newReleaseMessage === 'string'
        ? loadedSettings.newReleaseMessage
        : defaultStoreSettings.newReleaseMessage,
      saleBannerEnabled: typeof loadedSettings.saleBannerEnabled === 'boolean'
        ? loadedSettings.saleBannerEnabled
        : defaultStoreSettings.saleBannerEnabled,
      saleBannerTitle: typeof loadedSettings.saleBannerTitle === 'string'
        ? loadedSettings.saleBannerTitle
        : defaultStoreSettings.saleBannerTitle,
      saleBannerMessage: typeof loadedSettings.saleBannerMessage === 'string'
        ? loadedSettings.saleBannerMessage
        : defaultStoreSettings.saleBannerMessage,
      featuredProductId: typeof loadedSettings.featuredProductId === 'number'
        ? loadedSettings.featuredProductId
        : defaultStoreSettings.featuredProductId,
      featuredProductLabel: typeof loadedSettings.featuredProductLabel === 'string'
        ? loadedSettings.featuredProductLabel
        : defaultStoreSettings.featuredProductLabel,
      cardBadgeText: typeof loadedSettings.cardBadgeText === 'string'
        ? loadedSettings.cardBadgeText
        : defaultStoreSettings.cardBadgeText,
      cardKickerText: typeof loadedSettings.cardKickerText === 'string'
        ? loadedSettings.cardKickerText
        : defaultStoreSettings.cardKickerText,
      shopSectionTitle: typeof loadedSettings.shopSectionTitle === 'string'
        ? loadedSettings.shopSectionTitle
        : defaultStoreSettings.shopSectionTitle,
      benefitOne: typeof loadedSettings.benefitOne === 'string'
        ? loadedSettings.benefitOne
        : defaultStoreSettings.benefitOne,
      benefitTwo: typeof loadedSettings.benefitTwo === 'string'
        ? loadedSettings.benefitTwo
        : defaultStoreSettings.benefitTwo,
      benefitThree: typeof loadedSettings.benefitThree === 'string'
        ? loadedSettings.benefitThree
        : defaultStoreSettings.benefitThree,
      detailsButtonText: typeof loadedSettings.detailsButtonText === 'string'
        ? loadedSettings.detailsButtonText
        : defaultStoreSettings.detailsButtonText,
      buyButtonText: typeof loadedSettings.buyButtonText === 'string'
        ? loadedSettings.buyButtonText
        : defaultStoreSettings.buyButtonText,
      buyFeaturedButtonText: typeof loadedSettings.buyFeaturedButtonText === 'string'
        ? loadedSettings.buyFeaturedButtonText
        : defaultStoreSettings.buyFeaturedButtonText
    };
  } catch {
    return defaultStoreSettings;
  }
}

function loadLeads(): Lead[] {
  if (!fs.existsSync(leadsFilePath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(leadsFilePath, 'utf-8');
    const loadedLeads = JSON.parse(fileContents) as Lead[];

    if (!Array.isArray(loadedLeads)) {
      return [];
    }

    return loadedLeads;
  } catch {
    return [];
  }
}

function saveProducts(productsToSave: Product[]) {
  fs.writeFileSync(dataFilePath, JSON.stringify(productsToSave, null, 2), 'utf-8');
}

function savePurchases(purchasesToSave: Purchase[]) {
  fs.writeFileSync(purchasesFilePath, JSON.stringify(purchasesToSave, null, 2), 'utf-8');
}

function saveLeads(leadsToSave: Lead[]) {
  fs.writeFileSync(leadsFilePath, JSON.stringify(leadsToSave, null, 2), 'utf-8');
}

function createDownloadToken(sessionId: string, productId: number) {
  return crypto.createHmac('sha256', downloadSecret).update(`${sessionId}:${productId}`).digest('hex');
}

function isValidDownloadToken(sessionId: string, productId: number, token: string) {
  return createDownloadToken(sessionId, productId) === token;
}

function saveStoreSettings(settingsToSave: StoreSettings) {
  fs.writeFileSync(storeSettingsFilePath, JSON.stringify(settingsToSave, null, 2), 'utf-8');
}

function deleteUploadedFile(fileUrl?: string) {
  if (!fileUrl) {
    return;
  }

  const fileName = path.basename(fileUrl);
  const filePath = path.join(uploadsDir, fileName);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function getNextProductId(existingProducts: Product[]) {
  const highestId = existingProducts.reduce((maxId, item) => {
    return item.id > maxId ? item.id : maxId;
  }, 0);

  return highestId + 1;
}

function getProductPdfPath(product: Product) {
  if (!product.pdfUrl) {
    return null;
  }

  return path.join(uploadsDir, path.basename(product.pdfUrl));
}

function getUploadedFile(req: Request, fieldName: 'pdf' | 'image') {
  const filesByField = req.files as { [fieldName: string]: Express.Multer.File[] } | undefined;

  if (!filesByField || !Array.isArray(filesByField[fieldName]) || filesByField[fieldName].length === 0) {
    return null;
  }

  return filesByField[fieldName][0];
}

const purchases: Purchase[] = loadPurchases();
const storeSettings: StoreSettings = loadStoreSettings();
const leads: Lead[] = loadLeads();
const promotions: Promotion[] = loadPromotions();
const globalSale: GlobalSaleSettings = loadGlobalSale();

if (!fs.existsSync(purchasesFilePath)) {
  savePurchases(purchases);
}

if (!fs.existsSync(storeSettingsFilePath)) {
  saveStoreSettings(storeSettings);
}

if (!fs.existsSync(leadsFilePath)) {
  saveLeads(leads);
}

if (!fs.existsSync(promotionsFilePath)) {
  savePromotions(promotions);
}

if (!fs.existsSync(globalSaleFilePath)) {
  saveGlobalSale(globalSale);
}

function recordPurchase(sessionId: string, product: Product, customerEmail?: string) {
  const existingPurchase = purchases.find((item) => item.sessionId === sessionId);
  if (existingPurchase) {
    return existingPurchase;
  }

  const purchase: Purchase = {
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

async function recordPurchaseFromSession(sessionId: string) {
  const { session, product } = await getVerifiedCheckoutSession(sessionId);
  return recordPurchase(session.id, product, session.customer_details?.email || session.customer_email || undefined);
}

async function getVerifiedCheckoutSession(sessionId: string) {
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
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    throw new Error('The product file could not be found.');
  }

  return { session, product, pdfPath };
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

// GET /api/store-settings returns simple storefront UI settings.
app.get('/api/store-settings', (_req: Request, res: Response) => {
  res.json(storeSettings);
});

// PUT /api/admin/store-settings updates storefront UI settings.
app.put('/api/admin/store-settings', requireAdminAuth, (req: Request, res: Response) => {
  const payload = req.body as Partial<StoreSettings>;

  storeSettings.newReleaseTitle = sanitizeStoreText(payload.newReleaseTitle, defaultStoreSettings.newReleaseTitle);
  storeSettings.newReleaseMessage = sanitizeStoreText(payload.newReleaseMessage, defaultStoreSettings.newReleaseMessage);
  storeSettings.saleBannerTitle = sanitizeStoreText(payload.saleBannerTitle, defaultStoreSettings.saleBannerTitle);
  storeSettings.saleBannerMessage = sanitizeStoreText(payload.saleBannerMessage, defaultStoreSettings.saleBannerMessage);
  if (typeof payload.saleBannerEnabled === 'boolean') {
    storeSettings.saleBannerEnabled = payload.saleBannerEnabled;
  }
  storeSettings.featuredProductLabel = sanitizeStoreText(payload.featuredProductLabel, defaultStoreSettings.featuredProductLabel);
  storeSettings.cardBadgeText = sanitizeStoreText(payload.cardBadgeText, defaultStoreSettings.cardBadgeText);
  storeSettings.cardKickerText = sanitizeStoreText(payload.cardKickerText, defaultStoreSettings.cardKickerText);
  storeSettings.shopSectionTitle = sanitizeStoreText(payload.shopSectionTitle, defaultStoreSettings.shopSectionTitle);
  storeSettings.benefitOne = sanitizeStoreText(payload.benefitOne, defaultStoreSettings.benefitOne);
  storeSettings.benefitTwo = sanitizeStoreText(payload.benefitTwo, defaultStoreSettings.benefitTwo);
  storeSettings.benefitThree = sanitizeStoreText(payload.benefitThree, defaultStoreSettings.benefitThree);
  storeSettings.detailsButtonText = sanitizeStoreText(payload.detailsButtonText, defaultStoreSettings.detailsButtonText);
  storeSettings.buyButtonText = sanitizeStoreText(payload.buyButtonText, defaultStoreSettings.buyButtonText);
  storeSettings.buyFeaturedButtonText = sanitizeStoreText(payload.buyFeaturedButtonText, defaultStoreSettings.buyFeaturedButtonText);

  if (payload.featuredProductId === null) {
    storeSettings.featuredProductId = null;
  } else if (typeof payload.featuredProductId === 'number' && Number.isInteger(payload.featuredProductId)) {
    const hasProduct = products.some((product) => product.id === payload.featuredProductId);
    storeSettings.featuredProductId = hasProduct ? payload.featuredProductId : null;
  }

  saveStoreSettings(storeSettings);

  res.json(storeSettings);
});

// POST /api/admin/login gives a simple token to the admin dashboard.
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid admin email or password.' });
  }

  res.json({ token: adminToken });
});

// GET /api/admin/promotions returns promotion codes configured in admin.
app.get('/api/admin/promotions', requireAdminAuth, (_req: Request, res: Response) => {
  res.json(promotions);
});

// POST /api/admin/promotions creates a new promotion code.
app.post('/api/admin/promotions', requireAdminAuth, (req: Request, res: Response) => {
  const payload = req.body as Partial<Promotion>;
  const code = normalizePromotionCode(typeof payload.code === 'string' ? payload.code : '');
  const kind = payload.kind === 'fixed' ? 'fixed' : payload.kind === 'percent' ? 'percent' : null;
  const amount = Number(payload.amount);

  if (!code || !/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return res.status(400).json({ error: 'Code must be 3-32 chars using letters, numbers, _ or -.' });
  }

  if (!kind) {
    return res.status(400).json({ error: 'Promotion type must be percent or fixed.' });
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0.' });
  }

  if (kind === 'percent' && amount > 100) {
    return res.status(400).json({ error: 'Percent promotions cannot be greater than 100.' });
  }

  if (promotions.some((promotion) => normalizePromotionCode(promotion.code) === code)) {
    return res.status(409).json({ error: 'A promotion with this code already exists.' });
  }

  const now = new Date().toISOString();
  const createdPromotion: Promotion = {
    code,
    kind,
    amount,
    active: payload.active !== false,
    description: typeof payload.description === 'string' ? payload.description.trim() : '',
    startsAt: typeof payload.startsAt === 'string' && payload.startsAt.trim() ? payload.startsAt.trim() : undefined,
    endsAt: typeof payload.endsAt === 'string' && payload.endsAt.trim() ? payload.endsAt.trim() : undefined,
    createdAt: now,
    updatedAt: now
  };

  promotions.unshift(createdPromotion);
  savePromotions(promotions);

  return res.status(201).json(createdPromotion);
});

// PUT /api/admin/promotions/:code updates an existing promotion code.
app.put('/api/admin/promotions/:code', requireAdminAuth, (req: Request, res: Response) => {
  const routeCode = normalizePromotionCode(req.params.code || '');
  const promotion = promotions.find((item) => normalizePromotionCode(item.code) === routeCode);

  if (!promotion) {
    return res.status(404).json({ error: 'Promotion not found.' });
  }

  const payload = req.body as Partial<Promotion>;

  if (typeof payload.kind === 'string') {
    if (payload.kind !== 'percent' && payload.kind !== 'fixed') {
      return res.status(400).json({ error: 'Promotion type must be percent or fixed.' });
    }

    promotion.kind = payload.kind;
  }

  if (payload.amount !== undefined) {
    const amount = Number(payload.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0.' });
    }

    if (promotion.kind === 'percent' && amount > 100) {
      return res.status(400).json({ error: 'Percent promotions cannot be greater than 100.' });
    }

    promotion.amount = amount;
  }

  if (typeof payload.active === 'boolean') {
    promotion.active = payload.active;
  }

  if (typeof payload.description === 'string') {
    promotion.description = payload.description.trim();
  }

  if (payload.startsAt !== undefined) {
    promotion.startsAt = typeof payload.startsAt === 'string' && payload.startsAt.trim() ? payload.startsAt.trim() : undefined;
  }

  if (payload.endsAt !== undefined) {
    promotion.endsAt = typeof payload.endsAt === 'string' && payload.endsAt.trim() ? payload.endsAt.trim() : undefined;
  }

  promotion.updatedAt = new Date().toISOString();
  savePromotions(promotions);

  return res.json(promotion);
});

// DELETE /api/admin/promotions/:code removes a promotion code.
app.delete('/api/admin/promotions/:code', requireAdminAuth, (req: Request, res: Response) => {
  const routeCode = normalizePromotionCode(req.params.code || '');
  const index = promotions.findIndex((item) => normalizePromotionCode(item.code) === routeCode);

  if (index === -1) {
    return res.status(404).json({ error: 'Promotion not found.' });
  }

  promotions.splice(index, 1);
  savePromotions(promotions);

  return res.json({ message: 'Promotion deleted successfully.' });
});

// GET /api/admin/global-sale returns no-code store-wide sale settings.
app.get('/api/admin/global-sale', requireAdminAuth, (_req: Request, res: Response) => {
  res.json(globalSale);
});

// PUT /api/admin/global-sale updates no-code store-wide sale settings.
app.put('/api/admin/global-sale', requireAdminAuth, (req: Request, res: Response) => {
  const payload = req.body as Partial<GlobalSaleSettings>;

  if (typeof payload.active === 'boolean') {
    globalSale.active = payload.active;
  }

  if (payload.kind === 'percent' || payload.kind === 'fixed') {
    globalSale.kind = payload.kind;
  }

  if (payload.amount !== undefined) {
    const amount = Number(payload.amount);
    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ error: 'Sale amount must be 0 or greater.' });
    }

    if (globalSale.kind === 'percent' && amount > 100) {
      return res.status(400).json({ error: 'Percent sale amount cannot exceed 100.' });
    }

    globalSale.amount = amount;
  }

  if (typeof payload.label === 'string') {
    globalSale.label = payload.label.trim() || 'Store Sale';
  }

  if (payload.startsAt !== undefined) {
    globalSale.startsAt = typeof payload.startsAt === 'string' && payload.startsAt.trim() ? payload.startsAt.trim() : undefined;
  }

  if (payload.endsAt !== undefined) {
    globalSale.endsAt = typeof payload.endsAt === 'string' && payload.endsAt.trim() ? payload.endsAt.trim() : undefined;
  }

  globalSale.updatedAt = new Date().toISOString();
  saveGlobalSale(globalSale);

  return res.json(globalSale);
});

const handleStripeWebhook = async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(500).send('Stripe is not configured.');
  }

  let event: Stripe.Event;

  try {
    if (stripeWebhookSecret) {
      const signature = req.headers['stripe-signature'];
      if (!signature || typeof signature !== 'string') {
        return res.status(400).send('Missing Stripe signature.');
      }

      event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
    } else {
      event = JSON.parse(req.body.toString('utf-8')) as Stripe.Event;
    }
  } catch {
    if (stripeWebhookSecret) {
      return res.status(400).send('Invalid Stripe signature. Check STRIPE_WEBHOOK_SECRET for this endpoint.');
    }

    return res.status(400).send('Invalid Stripe webhook payload.');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      if (session.payment_status === 'paid' && session.metadata?.productId) {
        await recordPurchaseFromSession(session.id);
      }
    } catch {
      return res.status(500).send('Unable to save purchase.');
    }
  }

  return res.json({ received: true });
};

// POST /api/webhooks/stripe lets Stripe tell the server when payment succeeds.
// POST /webhooks/stripe is kept as a compatibility alias for misconfigured dashboard URLs.
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// POST /api/leads stores signup form emails from the landing page.
app.post('/api/leads', (req: Request, res: Response) => {
  const rawEmail = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const rawName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const rawSource = typeof req.body.source === 'string' ? req.body.source.trim() : '';
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);

  if (!isValidEmail) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const existingLead = leads.find((lead) => lead.email === rawEmail);

  if (existingLead) {
    existingLead.name = rawName || existingLead.name || '';
    existingLead.source = rawSource || existingLead.source || 'landing-page';
    existingLead.createdAt = new Date().toISOString();
  } else {
    leads.unshift({
      email: rawEmail,
      name: rawName,
      source: rawSource || 'landing-page',
      createdAt: new Date().toISOString()
    });
  }

  saveLeads(leads);

  return res.status(201).json({ message: 'Lead saved.' });
});

// POST /api/checkout/create-session starts a Stripe Checkout flow for one product.
app.post('/api/checkout/create-session', async (req: Request, res: Response) => {
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

  const baseUnitAmount = Math.round(product.price * 100);
  const couponCode = typeof req.body.couponCode === 'string' ? req.body.couponCode.trim() : '';
  const localPromotion = couponCode ? getActivePromotionByCode(couponCode, promotions) : null;
  const globalSalePromotion = couponCode ? null : getActiveGlobalSalePromotion(globalSale);
  const appliedPromotion = localPromotion || globalSalePromotion;
  const stripeDiscounts = couponCode && !localPromotion ? await resolveStripeDiscount(couponCode) : undefined;

  if (couponCode && !localPromotion && !stripeDiscounts) {
    return res.status(400).json({ error: 'Coupon code is invalid or inactive.' });
  }

  const unitAmount = appliedPromotion
    ? calculateUnitAmountWithPromotion(baseUnitAmount, appliedPromotion)
    : baseUnitAmount;

  const originalPrice = Number((baseUnitAmount / 100).toFixed(2));
  const discountedPrice = Number((unitAmount / 100).toFixed(2));
  const discountValue = Number((originalPrice - discountedPrice).toFixed(2));

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${requestOrigin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${requestOrigin}/?canceled=true`,
      metadata: {
        productId: String(product.id),
        couponCode: couponCode || '',
        localPromotionCode: localPromotion?.code || '',
        globalSaleApplied: globalSalePromotion ? 'true' : 'false'
      },
      discounts: stripeDiscounts,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: stripeCurrency,
            unit_amount: unitAmount,
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

    res.json({
      checkoutUrl: session.url,
      coupon: {
        code: localPromotion?.code || (globalSalePromotion ? globalSale.label : couponCode || ''),
        applied: Boolean(appliedPromotion),
        kind: appliedPromotion?.kind || '',
        amount: appliedPromotion?.amount || 0,
        source: localPromotion ? 'code' : globalSalePromotion ? 'global-sale' : 'none',
        originalPrice,
        discountedPrice,
        discountValue
      }
    });
  } catch {
    res.status(500).json({ error: 'Unable to start Stripe checkout.' });
  }
});

async function startCheckoutFromRequest(req: Request, res: Response) {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured on the server.' });
  }

  const requestedProductsFromParam = parseCheckoutProductsParam(req);
  const requestedProducts = requestedProductsFromParam && requestedProductsFromParam.length > 0
    ? requestedProductsFromParam
    : (() => {
      const productId = parseCheckoutProductId(req);
      if (Number.isNaN(productId)) {
        return [];
      }

      return [{ productId, quantity: parseCheckoutQuantity(req) }];
    })();

  if (requestedProducts.length === 0) {
    return res.status(400).json({ error: 'Product ID must be a number.' });
  }

  const checkoutItems = requestedProducts.map(({ productId, quantity }) => {
    const product = products.find((item) => item.id === productId);
    return { productId, quantity, product };
  });

  const missingProduct = checkoutItems.find((item) => !item.product);
  if (missingProduct) {
    return res.status(404).json({ error: `Product not found for id ${missingProduct.productId}.` });
  }

  const productWithoutFile = checkoutItems.find((item) => !item.product?.pdfUrl);
  if (productWithoutFile) {
    return res.status(400).json({ error: `Product ${productWithoutFile.product?.title || productWithoutFile.productId} does not have a downloadable file yet.` });
  }

  const couponCode = parseCheckoutCouponCode(req);
  const localPromotion = couponCode ? getActivePromotionByCode(couponCode, promotions) : null;
  const globalSalePromotion = couponCode ? null : getActiveGlobalSalePromotion(globalSale);
  const appliedPromotion = localPromotion || globalSalePromotion;
  const discounts = couponCode && !localPromotion ? await resolveStripeDiscount(couponCode) : undefined;

  if (couponCode && !localPromotion && !discounts) {
    return res.status(400).json({ error: 'Coupon code is invalid or inactive.' });
  }

  const lineItems = checkoutItems.map((item) => {
    const product = item.product as Product;
    const baseUnitAmount = Math.round(product.price * 100);
    const unitAmount = appliedPromotion
      ? calculateUnitAmountWithPromotion(baseUnitAmount, appliedPromotion)
      : baseUnitAmount;

    return {
      quantity: item.quantity,
      price_data: {
        currency: stripeCurrency,
        unit_amount: unitAmount,
        product_data: {
          name: product.title,
          description: product.description || product.pdfName || 'Instant digital download'
        }
      }
    };
  });

  const primaryProductId = requestedProducts[0]?.productId;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/?canceled=true`,
      metadata: {
        productId: String(primaryProductId),
        productIds: requestedProducts.map((item) => item.productId).join(','),
        couponCode: couponCode || '',
        localPromotionCode: localPromotion?.code || '',
        globalSaleApplied: globalSalePromotion ? 'true' : 'false'
      },
      discounts,
      line_items: lineItems
    });

    if (!session.url) {
      return res.status(500).json({ error: 'Stripe did not return a checkout URL.' });
    }

    return res.redirect(303, session.url);
  } catch {
    return res.status(500).json({ error: 'Unable to start Stripe checkout.' });
  }
}

// GET /api/checkout/start creates a Stripe Checkout session from query params.
// Example: /api/checkout/start?product_id=1&coupon_code=SUMMER10
app.get('/api/checkout/start', async (req: Request, res: Response) => {
  return startCheckoutFromRequest(req, res);
});

// GET /api/checkout/start/:productId creates a Stripe Checkout session and redirects.
// This is useful for platforms like Facebook Shop that require a fixed product checkout URL.
app.get('/api/checkout/start/:productId', async (req: Request, res: Response) => {
  return startCheckoutFromRequest(req, res);
});

// GET /api/checkout/session/:sessionId checks a Stripe payment and returns the purchase details.
app.get('/api/checkout/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { session, product } = await getVerifiedCheckoutSession(req.params.sessionId);
    recordPurchase(session.id, product, session.customer_details?.email || session.customer_email || undefined);
    const downloadToken = createDownloadToken(session.id, product.id);

    res.json({
      sessionId: session.id,
      productId: product.id,
      productTitle: product.title,
      productPrice: product.price,
      downloadToken,
      downloadUrl: `/api/checkout/download/${session.id}?token=${downloadToken}`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify checkout session.';
    res.status(400).json({ error: message });
  }
});

// GET /api/purchases/recent returns the latest saved purchases.
app.get('/api/purchases/recent', (req: Request, res: Response) => {
  const count = Number(req.query.count || 10);
  const safeCount = Number.isNaN(count) ? 10 : Math.min(Math.max(count, 1), 20);

  res.json(purchases.slice(0, safeCount));
});

// GET /api/admin/purchases returns latest purchase records for admin dashboard.
app.get('/api/admin/purchases', requireAdminAuth, (req: Request, res: Response) => {
  const count = Number(req.query.count || 25);
  const safeCount = Number.isNaN(count) ? 25 : Math.min(Math.max(count, 1), 200);

  res.json(purchases.slice(0, safeCount));
});

// GET /api/admin/leads returns signup leads for admin dashboard.
app.get('/api/admin/leads', requireAdminAuth, (req: Request, res: Response) => {
  const count = Number(req.query.count || 50);
  const safeCount = Number.isNaN(count) ? 50 : Math.min(Math.max(count, 1), 500);

  res.json(leads.slice(0, safeCount));
});

// GET /api/checkout/download/:sessionId streams the PDF after payment is verified.
app.get('/api/checkout/download/:sessionId', async (req: Request, res: Response) => {
  try {
    const { session, product, pdfPath } = await getVerifiedCheckoutSession(req.params.sessionId);
    const token = typeof req.query.token === 'string' ? req.query.token : '';

    if (!token || !isValidDownloadToken(session.id, product.id, token)) {
      return res.status(403).json({ error: 'This download link is invalid or expired.' });
    }

    res.download(pdfPath, product.pdfName || path.basename(pdfPath));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to download file.';
    res.status(400).json({ error: message });
  }
});

// POST /api/products accepts a new product and returns it
app.post('/api/products', requireAdminAuth, (req: Request, res: Response) => {
  const { title, price, description, isBestSeller } = req.body;

  // Basic validation for learning purposes
  if (!title || typeof title !== 'string' || !price || typeof price !== 'number') {
    return res.status(400).json({
      error: 'Please send a valid product with a string title and numeric price.'
    });
  }

  const newProduct = {
    id: getNextProductId(products),
    title,
    price,
    description: typeof description === 'string' ? description.trim() : '',
    isBestSeller: parseIsBestSeller(isBestSeller),
    pdfUrl: ''
  };

  products.push(newProduct);
  saveProducts(products);

  res.status(201).json(newProduct);
});

// POST /api/products/upload accepts a PDF file and saves it with the product
app.post('/api/products/upload', requireAdminAuth, uploadProductAssets, (req: Request, res: Response) => {
  const { title, price, description, isBestSeller } = req.body;
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
    id: getNextProductId(products),
    title: title.trim(),
    price: Number(price),
    description: typeof description === 'string' ? description.trim() : '',
    isBestSeller: parseIsBestSeller(isBestSeller),
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
app.put('/api/products/:id', requireAdminAuth, (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  const { title, price, description, isBestSeller } = req.body;

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

  if (typeof isBestSeller === 'boolean') {
    product.isBestSeller = isBestSeller;
  }

  saveProducts(products);

  res.json(product);
});

// PUT /api/products/:id/upload updates product info and can replace the PDF file
app.put('/api/products/:id/upload', requireAdminAuth, uploadProductAssets, (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  const { title, price, description, isBestSeller } = req.body;
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

  if (isBestSeller !== undefined) {
    product.isBestSeller = parseIsBestSeller(isBestSeller);
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
app.delete('/api/products/:id', requireAdminAuth, (req: Request, res: Response) => {
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
app.use((error: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
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
