# Dada's Store Production Checklist

Use this checklist before sharing the store with customers.

## 1) Backend Health
- Open: `https://dadasstore-api.onrender.com/api/health`
- Confirm a successful JSON response.

## 2) Storefront Load Check
- Open: `https://dadasstore.pages.dev`
- Confirm products load.
- Confirm images and prices are correct.

## 3) Admin Check
- Open: `https://dadasstore-admin.pages.dev`
- Log in as admin.
- Upload or edit a test product.
- Confirm the storefront updates.

## 4) Purchase Flow Check
- Buy one test product.
- Confirm Stripe payment succeeds.
- Confirm redirect lands on the purchase success page.
- Confirm `Download now` works.

## 5) Stripe Webhook Check
- Render env var `STRIPE_WEBHOOK_SECRET` is set.
- Stripe webhook endpoint is:
  - `https://dadasstore-api.onrender.com/api/webhooks/stripe`
- Confirm webhook events are being received in Stripe dashboard.

## 6) Security Check
- Do not share admin URL publicly.
- Keep admin credentials private.
- Confirm Render env vars are set:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `ADMIN_TOKEN`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

## 7) Deployment Check
- Confirm latest code is pushed to `main`.
- Confirm Render deployed latest backend commit.
- Confirm Cloudflare Pages deployed latest customer commit.
- Hard-refresh browser after deploy.

## 8) Go-Live (Real Customers)
- Switch Stripe from test keys to live keys.
- Run one real payment test (your own card) and verify download.
- Refund your own test charge after verification.

## 9) Share With Customers
- Share only customer URL:
  - `https://dadasstore.pages.dev`
- Keep admin URL private:
  - `https://dadasstore-admin.pages.dev`

## 10) Mobile App-Like Install Instructions
- iPhone (Safari): Share -> Add to Home Screen
- Android (Chrome): Menu -> Add to Home screen

## 11) If Checkout Fails
- Confirm backend URL is live:
  - `https://dadasstore-api.onrender.com/api/health`
- Confirm Stripe backend env vars exist in Render:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `FRONTEND_URL=https://dadasstore.pages.dev`
- Confirm customer app env var in Cloudflare Pages:
  - `VITE_API_BASE_URL=https://dadasstore-api.onrender.com`
- Confirm webhook endpoint in Stripe:
  - `https://dadasstore-api.onrender.com/api/webhooks/stripe`
- Check Render logs for API errors during checkout.
- Check Stripe dashboard for failed events or signature errors.
- Run one test purchase again after any config change.

## 12) If Download Fails
- Confirm product has a PDF attached in admin.
- Confirm backend uploads folder still contains the file.
- Confirm `/api/checkout/session/:sessionId` returns a `downloadUrl`.
- Confirm download link includes the signed token query string.
- Confirm backend `DOWNLOAD_SECRET` is stable and not changing between deploys.
- Check Render logs for `invalid or expired` download token errors.
- Re-run one fresh purchase to generate a new download link.
