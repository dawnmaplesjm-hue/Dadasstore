"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const googleapis_1 = require("googleapis");
dotenv_1.default.config();
const backendRoot = path_1.default.resolve(__dirname, '..', '..');
const productsPath = path_1.default.join(backendRoot, 'products.json');
const defaultOutputFile = path_1.default.join(backendRoot, 'merchant-feed.tsv');
const merchantBaseUrl = (process.env.MERCHANT_BASE_URL || 'http://localhost:5174').replace(/\/$/, '');
const productLinkTemplate = process.env.MERCHANT_PRODUCT_LINK_TEMPLATE || `${merchantBaseUrl}/?product={id}`;
const imageLinkTemplate = process.env.MERCHANT_IMAGE_LINK_TEMPLATE || `${merchantBaseUrl}{imagePath}`;
const merchantBrand = process.env.MERCHANT_BRAND || "Dada's Store";
const merchantCurrency = (process.env.MERCHANT_CURRENCY || 'USD').toUpperCase();
const merchantContentLanguage = (process.env.MERCHANT_CONTENT_LANGUAGE || 'en').toLowerCase();
const merchantTargetCountry = (process.env.MERCHANT_TARGET_COUNTRY || 'US').toUpperCase();
const merchantCategory = process.env.MERCHANT_GOOGLE_PRODUCT_CATEGORY || 'Media > Books';
const merchantProductType = process.env.MERCHANT_PRODUCT_TYPE || 'Digital Products > Ebooks';
function parseOptions(argv) {
    const formatArg = argv.find((arg) => arg.startsWith('--format='));
    const outputArg = argv.find((arg) => arg.startsWith('--output='));
    const rawFormat = (formatArg?.split('=')[1] || 'both').toLowerCase();
    const format = rawFormat === 'tsv' || rawFormat === 'content-api' || rawFormat === 'both' ? rawFormat : 'both';
    const outputFile = outputArg?.split('=')[1] || process.env.MERCHANT_OUTPUT_FILE || defaultOutputFile;
    return { format, outputFile: path_1.default.resolve(outputFile) };
}
function safeText(value, fallback) {
    if (typeof value !== 'string') {
        return fallback;
    }
    const trimmed = value.trim();
    return trimmed || fallback;
}
function cleanFeedCell(value) {
    return value.replace(/[\t\r\n]+/g, ' ').trim();
}
function toAbsoluteUrl(rawUrl) {
    if (/^https?:\/\//i.test(rawUrl)) {
        return rawUrl;
    }
    const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    return `${merchantBaseUrl}${normalizedPath}`;
}
function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function replaceToken(template, token, value) {
    return template.split(token).join(value);
}
function buildProductLink(product) {
    if (product.merchantLink) {
        return toAbsoluteUrl(product.merchantLink);
    }
    const withId = replaceToken(productLinkTemplate, '{id}', String(product.id));
    return replaceToken(withId, '{slug}', slugify(product.title));
}
function buildImageLink(product) {
    if (product.imageLink) {
        return toAbsoluteUrl(product.imageLink);
    }
    if (product.imageUrl) {
        return toAbsoluteUrl(product.imageUrl);
    }
    const withId = replaceToken(imageLinkTemplate, '{id}', String(product.id));
    const withSlug = replaceToken(withId, '{slug}', slugify(product.title));
    return replaceToken(withSlug, '{imagePath}', '/uploads/default-product.png');
}
function loadProducts() {
    if (!fs_1.default.existsSync(productsPath)) {
        throw new Error(`products.json not found at ${productsPath}`);
    }
    const raw = fs_1.default.readFileSync(productsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        throw new Error('products.json must contain an array of products.');
    }
    return parsed.filter((item) => typeof item.id === 'number' && typeof item.title === 'string' && typeof item.price === 'number');
}
function toFeedRows(products) {
    return products.map((product) => {
        const description = safeText(product.description, `Digital download: ${product.title}`);
        const availability = product.availability || 'in stock';
        const condition = product.condition || 'new';
        const brand = safeText(product.brand, merchantBrand);
        const googleProductCategory = safeText(product.googleProductCategory, merchantCategory);
        const productType = safeText(product.productType, merchantProductType);
        const identifierExists = typeof product.identifierExists === 'boolean' ? product.identifierExists : false;
        return {
            id: `product-${product.id}`,
            title: product.title,
            description,
            link: buildProductLink(product),
            image_link: buildImageLink(product),
            availability,
            price: `${product.price.toFixed(2)} ${merchantCurrency}`,
            condition,
            brand,
            google_product_category: googleProductCategory,
            product_type: productType,
            identifier_exists: identifierExists ? 'yes' : 'no'
        };
    });
}
function writeTsv(rows, outputFile) {
    const headers = [
        'id',
        'title',
        'description',
        'link',
        'image_link',
        'availability',
        'price',
        'condition',
        'brand',
        'google_product_category',
        'product_type',
        'identifier_exists'
    ];
    const lines = [
        headers.join('\t'),
        ...rows.map((row) => headers.map((header) => cleanFeedCell(row[header])).join('\t'))
    ];
    fs_1.default.writeFileSync(outputFile, `${lines.join('\n')}\n`, 'utf-8');
}
function parsePriceValue(priceWithCurrency) {
    const [value] = priceWithCurrency.split(' ');
    return Number(value).toFixed(2);
}
function toContentApiProduct(row) {
    return {
        offerId: row.id,
        title: row.title,
        description: row.description,
        link: row.link,
        imageLink: row.image_link,
        channel: 'online',
        contentLanguage: merchantContentLanguage,
        targetCountry: merchantTargetCountry,
        availability: row.availability,
        condition: row.condition,
        price: {
            value: parsePriceValue(row.price),
            currency: merchantCurrency
        },
        brand: row.brand,
        googleProductCategory: row.google_product_category,
        productTypes: [row.product_type],
        identifierExists: false
    };
}
async function syncWithContentApi(rows) {
    const merchantId = process.env.MERCHANT_CENTER_ID;
    if (!merchantId) {
        throw new Error('MERCHANT_CENTER_ID is required for Content API sync.');
    }
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const auth = new googleapis_1.google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/content'],
        keyFile: keyFile || undefined,
        credentials: serviceAccountJson ? JSON.parse(serviceAccountJson) : undefined
    });
    const content = googleapis_1.google.content({ version: 'v2.1', auth });
    const entries = rows.map((row, index) => ({
        batchId: index + 1,
        merchantId,
        method: 'insert',
        product: toContentApiProduct(row)
    }));
    const response = await content.products.custombatch({
        requestBody: { entries }
    });
    const resultEntries = response.data.entries || [];
    const failed = resultEntries.filter((entry) => entry.errors && entry.errors.errors && entry.errors.errors.length > 0);
    if (failed.length > 0) {
        const details = failed
            .map((entry) => {
            const offerId = entry.product?.offerId || 'unknown';
            const message = entry.errors?.errors?.map((error) => error.message).join('; ') || 'Unknown Content API error';
            return `- ${offerId}: ${message}`;
        })
            .join('\n');
        throw new Error(`Content API sync finished with ${failed.length} failures:\n${details}`);
    }
}
async function run() {
    const options = parseOptions(process.argv.slice(2));
    const products = loadProducts();
    const rows = toFeedRows(products);
    if (rows.length === 0) {
        throw new Error('No products found in products.json. Add at least one product first.');
    }
    if (options.format === 'tsv' || options.format === 'both') {
        writeTsv(rows, options.outputFile);
        console.log(`Saved Merchant Center TSV feed: ${options.outputFile}`);
        console.log(`Products exported: ${rows.length}`);
    }
    if (options.format === 'content-api' || options.format === 'both') {
        await syncWithContentApi(rows);
        console.log(`Content API sync complete for ${rows.length} products.`);
    }
}
run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
});
//# sourceMappingURL=googleMerchantFeed.js.map