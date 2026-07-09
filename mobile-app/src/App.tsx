import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

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

type PurchaseResult = {
  sessionId: string;
  productTitle: string;
  productPrice: number;
  downloadUrl: string;
};

type CouponPreview = {
  code: string;
  applied: boolean;
  kind: 'percent' | 'fixed' | '';
  amount: number;
  originalPrice: number;
  discountedPrice: number;
  discountValue: number;
};

type PendingCheckout = {
  url: string;
  productTitle: string;
  coupon: CouponPreview;
};

type StoreSettings = {
  newReleaseTitle: string;
  newReleaseMessage: string;
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

const apiBaseUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL || apiBaseUrl;

const fetchFromApi = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${configuredApiBaseUrl}${path}`, {
    cache: 'no-store',
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return response;
};

const getAdminPanelUrl = () => {
  if (import.meta.env.VITE_ADMIN_URL) {
    return import.meta.env.VITE_ADMIN_URL;
  }

  try {
    const apiUrl = new URL(configuredApiBaseUrl);
    apiUrl.port = '5173';
    apiUrl.pathname = '/';
    apiUrl.search = '';
    apiUrl.hash = '';
    return apiUrl.toString();
  } catch {
    return 'http://localhost:5173';
  }
};

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    newReleaseTitle: 'Premium digital bundle',
    newReleaseMessage: 'Buy once, download instantly, and access your files anytime.',
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
  });
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [activeList, setActiveList] = useState<'buy' | 'soon'>('buy');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'name'>('featured');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const adminPressStartedAt = useRef<number | null>(null);
  const adminPressHandled = useRef(false);
  const trackedPurchaseSessions = useRef<Set<string>>(new Set());
  const purchasableProducts = products.filter((product) => product.pdfUrl);
  const comingSoonProducts = products.filter((product) => !product.pdfUrl);
  const adminPanelUrl = getAdminPanelUrl();
  const refreshIntervalMs = 5000;
  const adminLongPressMs = 1200;

  const getSessionId = () => new URLSearchParams(window.location.search).get('session_id') || '';

  const triggerBlobDownload = async (url: string, fileName: string) => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Unable to load the purchased file.');
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetchFromApi('/api/products');

      const data = await response.json();
      setProducts(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load products.');
    }
  }, []);

  const refreshStore = useCallback(async () => {
    setError('');
    await Promise.all([
      loadProducts(),
      fetchFromApi('/api/store-settings')
        .then((response) => response.json())
        .then((settings: StoreSettings) => {
          setStoreSettings({
            newReleaseTitle: settings.newReleaseTitle || 'Premium digital bundle',
            newReleaseMessage: settings.newReleaseMessage || 'Buy once, download instantly, and access your files anytime.',
            featuredProductId: typeof settings.featuredProductId === 'number' ? settings.featuredProductId : null,
            featuredProductLabel: settings.featuredProductLabel || 'Featured pick',
            cardBadgeText: settings.cardBadgeText || 'Best Seller',
            cardKickerText: settings.cardKickerText || 'Digital Download',
            shopSectionTitle: settings.shopSectionTitle || 'Shop Products',
            benefitOne: settings.benefitOne || 'Instant download',
            benefitTwo: settings.benefitTwo || 'Secure checkout',
            benefitThree: settings.benefitThree || 'Mobile ready',
            detailsButtonText: settings.detailsButtonText || 'View details',
            buyButtonText: settings.buyButtonText || 'Buy now',
            buyFeaturedButtonText: settings.buyFeaturedButtonText || 'Buy Featured'
          });
        })
        .catch(() => {
          // Keep default settings if this call fails.
        })
    ]);
    setLoading(false);
  }, [loadProducts]);

  useEffect(() => {
    void refreshStore();
  }, [refreshStore]);

  useEffect(() => {
    const onWindowFocus = () => {
      void refreshStore();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshStore();
      }
    };

    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refreshStore]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshStore();
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshStore]);

  useEffect(() => {
    const sessionId = getSessionId();

    if (!sessionId) {
      if (new URLSearchParams(window.location.search).get('canceled')) {
        setError('Checkout was canceled before payment completed.');
      }

      return;
    }

    setCheckingOut(true);
    setError('');
    setPurchaseResult(null);

    fetchFromApi(`/api/checkout/session/${sessionId}`)
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Unable to verify the payment.');
        }

        const fullDownloadUrl = `${configuredApiBaseUrl}${data.downloadUrl}`;
        setPurchaseResult({
          sessionId,
          productTitle: data.productTitle,
          productPrice: Number(data.productPrice || 0),
          downloadUrl: fullDownloadUrl
        });
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : 'Unable to verify the payment.');
      })
      .finally(() => {
        setCheckingOut(false);
      });
  }, []);

  useEffect(() => {
    if (!purchaseResult || checkingOut) {
      return;
    }

    if (trackedPurchaseSessions.current.has(purchaseResult.sessionId)) {
      return;
    }

    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Purchase', {
        currency: 'USD',
        value: purchaseResult.productPrice,
        content_name: purchaseResult.productTitle
      });
    }

    trackedPurchaseSessions.current.add(purchaseResult.sessionId);
  }, [purchaseResult, checkingOut]);

  const startCheckout = async (productId: number) => {
    setError('');
    const normalizedCoupon = couponCode.trim().toUpperCase();
    const checkoutProduct = products.find((item) => item.id === productId);

    try {
      const response = await fetchFromApi('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          couponCode: normalizedCoupon || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to start checkout.');
      }

      const couponPreview = data.coupon as CouponPreview | undefined;
      if (couponPreview?.applied && couponPreview.discountValue > 0) {
        setPendingCheckout({
          url: data.checkoutUrl,
          productTitle: checkoutProduct?.title || 'Selected product',
          coupon: couponPreview
        });
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to start checkout.');
    }
  };

  const confirmPendingCheckout = () => {
    if (!pendingCheckout) {
      return;
    }

    window.location.href = pendingCheckout.url;
  };

  const cancelPendingCheckout = () => {
    setPendingCheckout(null);
  };

  const formatPurchaseDate = (isoDate: string) => new Date(isoDate).toLocaleDateString();

  const searchValue = searchTerm.trim().toLowerCase();
  const filteredProducts = purchasableProducts.filter((product) => {
    if (!searchValue) {
      return true;
    }

    const searchableText = `${product.title} ${product.pdfName || ''}`.toLowerCase();
    return searchableText.includes(searchValue);
  });

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];

    if (sortBy === 'price-low') {
      sorted.sort((a, b) => a.price - b.price);
      return sorted;
    }

    if (sortBy === 'price-high') {
      sorted.sort((a, b) => b.price - a.price);
      return sorted;
    }

    if (sortBy === 'name') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      return sorted;
    }

    return sorted;
  }, [filteredProducts, sortBy]);

  const featuredProduct =
    (storeSettings.featuredProductId !== null
      ? purchasableProducts.find((product) => product.id === storeSettings.featuredProductId) || null
      : null) || sortedProducts[0] || null;

  const openAdminPanel = () => {
    const runtimeWindow = window as Window & {
      Capacitor?: {
        isNativePlatform?: () => boolean;
      };
    };

    const isNativeApp = runtimeWindow.Capacitor?.isNativePlatform?.() ?? false;

    // In native WebView, delayed window.open can be blocked. Navigate directly instead.
    if (isNativeApp) {
      window.location.assign(adminPanelUrl);
      return;
    }

    const openedWindow = window.open(adminPanelUrl, '_blank', 'noopener,noreferrer');

    if (!openedWindow) {
      window.location.assign(adminPanelUrl);
    }
  };

  const startAdminPress = () => {
    if (adminPressStartedAt.current !== null) {
      return;
    }

    adminPressStartedAt.current = Date.now();
    adminPressHandled.current = false;
  };

  const finishAdminPress = () => {
    if (adminPressStartedAt.current === null) {
      return;
    }

    const elapsedMs = Date.now() - adminPressStartedAt.current;
    adminPressStartedAt.current = null;

    if (elapsedMs >= adminLongPressMs && !adminPressHandled.current) {
      adminPressHandled.current = true;
      openAdminPanel();
    }
  };

  const cancelAdminPress = () => {
    adminPressStartedAt.current = null;
    adminPressHandled.current = false;
  };

  const openProductDetails = (product: Product) => {
    setSelectedProduct(product);
  };

  const closeProductDetails = () => {
    setSelectedProduct(null);
  };

  const getCardSummary = (product: Product) => {
    if (!product.description && !product.pdfName) {
      return 'Tap View details to read the full description.';
    }

    return 'Tap View details to read the full description.';
  };

  const getFullDescription = (product: Product) => {
    return product.description || product.pdfName || 'Instant digital product download.';
  };

  if (purchaseResult && !checkingOut) {
    return (
      <div className="store-shell success-shell">
        <main className="store-phone success-page">
          <header className="top-row">
            <div>
              <p className="overline">Payment complete</p>
              <h1>Download ready</h1>
            </div>
            <button className="icon-pill" type="button" onClick={() => window.location.assign('/')}>Store</button>
          </header>

          <section className="success-card">
            <p className="success-label">Your purchase is ready</p>
            <h2>{purchaseResult.productTitle}</h2>
            <p>Thank you for your purchase. Tap the button to download your file now.</p>
            <div className="success-actions">
              <a className="buy-button success-download" href={purchaseResult.downloadUrl}>
                Download now
              </a>
              <button className="secondary-button" type="button" onClick={() => window.location.assign('/') }>
                Back to store
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="store-shell">
      <main className="store-phone">
        <header className="top-row">
          <div
            className="brand-block"
            onTouchStart={startAdminPress}
            onTouchEnd={finishAdminPress}
            onTouchCancel={cancelAdminPress}
            onPointerDown={startAdminPress}
            onPointerUp={finishAdminPress}
            onPointerCancel={cancelAdminPress}
            onContextMenu={(event) => event.preventDefault()}
          >
            <p className="overline">Digital Store</p>
            <h1>Dada Downloads</h1>
          </div>
          <div className="top-actions">
            <button className="icon-pill" type="button" onClick={() => void refreshStore()}>Refresh</button>
          </div>
        </header>

        <section className="promo-banner">
          <p className="overline">Featured Product</p>
          <h2>{storeSettings.newReleaseTitle}</h2>
          <p>{storeSettings.newReleaseMessage}</p>
        </section>

        <section className="store-benefits" aria-label="Store benefits">
          <span className="benefit-pill">{storeSettings.benefitOne}</span>
          <span className="benefit-pill">{storeSettings.benefitTwo}</span>
          <span className="benefit-pill">{storeSettings.benefitThree}</span>
        </section>

        <section className="search-strip">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search digital products"
            aria-label="Search digital products"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as 'featured' | 'price-low' | 'price-high' | 'name')}
            aria-label="Sort products"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </section>

        <section className="coupon-strip" aria-label="Promotion code">
          <input
            type="text"
            value={couponCode}
            onChange={(event) => {
              setCouponCode(event.target.value.toUpperCase());
              setPendingCheckout(null);
            }}
            placeholder="Promotion code (optional)"
            aria-label="Promotion code"
          />
          <button
            className="icon-pill"
            type="button"
            onClick={() => {
              setCouponCode('');
              setPendingCheckout(null);
            }}
          >
            Clear
          </button>
        </section>

        {error && <div className="status error">{error}</div>}

        {checkingOut && (
          <section className="status success">
            <div>
              <strong>Processing payment</strong>
              <p>Verifying your payment and preparing the download...</p>
            </div>
          </section>
        )}

        {pendingCheckout && (
          <section className="status success coupon-preview">
            <div>
              <strong>Discount applied: {pendingCheckout.coupon.code}</strong>
              <p>
                {pendingCheckout.productTitle}: ${pendingCheckout.coupon.originalPrice.toFixed(2)} to
                {' '}${pendingCheckout.coupon.discountedPrice.toFixed(2)}
              </p>
              <p>You save ${pendingCheckout.coupon.discountValue.toFixed(2)}. Continue to secure checkout?</p>
            </div>
            <div className="coupon-preview-actions">
              <button className="buy-button" type="button" onClick={confirmPendingCheckout}>
                Continue
              </button>
              <button className="secondary-button" type="button" onClick={cancelPendingCheckout}>
                Cancel
              </button>
            </div>
          </section>
        )}

        <section className="stats-grid">
          <button
            type="button"
            className={`stat-button ${activeList === 'buy' ? 'stat-active' : ''}`}
            onClick={() => setActiveList('buy')}
          >
            <strong>{purchasableProducts.length}</strong>
            <span>Buy now</span>
          </button>
          <button
            type="button"
            className={`stat-button ${activeList === 'soon' ? 'stat-active' : ''}`}
            onClick={() => setActiveList('soon')}
          >
            <strong>{comingSoonProducts.length}</strong>
            <span>Coming soon</span>
          </button>
        </section>

        {activeList === 'buy' && (
          <section className="section-card">
          <div className="section-head">
            <h2>{storeSettings.shopSectionTitle}</h2>
            <span>{sortedProducts.length} available now</span>
          </div>

          {featuredProduct && (
            <article className="featured-product">
              <div className="featured-copy">
                <p className="product-kicker">{storeSettings.featuredProductLabel}</p>
                <h3>{featuredProduct.title}</h3>
                <p>{featuredProduct.description || featuredProduct.pdfName || 'Instant download after payment.'}</p>
                <div className="featured-actions">
                  <strong>${featuredProduct.price.toFixed(2)}</strong>
                  <button className="buy-button" type="button" onClick={() => void startCheckout(featuredProduct.id)}>
                    {storeSettings.buyFeaturedButtonText}
                  </button>
                </div>
              </div>
              {featuredProduct.imageUrl ? (
                <img
                  className="featured-image"
                  src={`${configuredApiBaseUrl}${featuredProduct.imageUrl}`}
                  alt={featuredProduct.title}
                />
              ) : (
                <div className="featured-image featured-fallback" aria-hidden="true">
                  <span>Featured</span>
                  <span>Digital Product</span>
                </div>
              )}
            </article>
          )}

          {loading ? (
            <p className="muted">Loading products...</p>
          ) : sortedProducts.length === 0 ? (
            <p className="muted">No products match your search.</p>
          ) : (
            <div className="product-grid">
              {sortedProducts.map((product) => (
                <article
                  className="product-card"
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openProductDetails(product)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openProductDetails(product);
                    }
                  }}
                >
                  <div className="thumb-block product-media" aria-hidden="true">
                    {product.imageUrl ? (
                      <img
                        className="thumb-image"
                        src={`${configuredApiBaseUrl}${product.imageUrl}`}
                        alt={product.title}
                      />
                    ) : (
                      <>
                        <span className="thumb-file-type">PDF</span>
                        <span className="thumb-category">Instant</span>
                      </>
                    )}
                  </div>
                  <div className="product-copy product-content">
                    <p className="product-kicker">{storeSettings.cardKickerText}</p>
                    {product.isBestSeller && <p className="card-badge">{storeSettings.cardBadgeText}</p>}
                    <h3>{product.title}</h3>
                    <p className="product-summary">{getCardSummary(product)}</p>
                    <div className="meta-row">
                      <span className="meta-chip">Instant Access</span>
                      <span className="meta-chip">Secure Checkout</span>
                    </div>
                    <div className="product-row card-actions">
                      <strong>${product.price.toFixed(2)}</strong>
                      <button
                        className="details-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openProductDetails(product);
                        }}
                      >
                        {storeSettings.detailsButtonText}
                      </button>
                      <button
                        className="buy-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void startCheckout(product.id);
                        }}
                      >
                        {storeSettings.buyButtonText}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          </section>
        )}

        {activeList === 'soon' && comingSoonProducts.length > 0 && (
          <section className="section-card">
            <div className="section-head">
              <h2>Coming Soon</h2>
              <span>File upload pending</span>
            </div>
            <div className="coming-list">
              {comingSoonProducts.map((product) => (
                <article className="coming-item" key={product.id}>
                  <div>
                    <strong>{product.title}</strong>
                    <p>${product.price.toFixed(2)} • Upload file to publish</p>
                  </div>
                  <span className="locked">Unavailable</span>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeList === 'soon' && comingSoonProducts.length === 0 && (
          <section className="section-card">
            <div className="section-head">
              <h2>Coming Soon</h2>
              <span>No upcoming products</span>
            </div>
            <p className="muted">There are no coming-soon items right now.</p>
          </section>
        )}

        {selectedProduct && (
          <section className="product-modal-overlay" onClick={closeProductDetails}>
            <article className="product-modal" onClick={(event) => event.stopPropagation()}>
              <button className="modal-close" type="button" onClick={closeProductDetails}>Close</button>
              {selectedProduct.imageUrl && (
                <img
                  className="modal-image"
                  src={`${configuredApiBaseUrl}${selectedProduct.imageUrl}`}
                  alt={selectedProduct.title}
                />
              )}
              <h3>{selectedProduct.title}</h3>
              <div className="modal-tags" aria-label="Product details">
                <span className="meta-chip">Digital Product</span>
                <span className="meta-chip">Instant Access</span>
                <span className="meta-chip">Secure Checkout</span>
              </div>
              <div className="modal-section">
                <p className="modal-label">Full description</p>
                <p>{getFullDescription(selectedProduct)}</p>
              </div>
              <div className="modal-row">
                <strong>${selectedProduct.price.toFixed(2)}</strong>
                <button
                  className="buy-button"
                  type="button"
                  onClick={() => void startCheckout(selectedProduct.id)}
                >
                  {storeSettings.buyButtonText}
                </button>
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
