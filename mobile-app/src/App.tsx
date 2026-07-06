import { useCallback, useEffect, useRef, useState } from 'react';

type Product = {
  id: number;
  title: string;
  price: number;
  description?: string;
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
  productTitle: string;
  downloadUrl: string;
};

type StoreSettings = {
  newReleaseTitle: string;
  newReleaseMessage: string;
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
    newReleaseMessage: 'Buy once, download instantly, and access your files anytime.'
  });
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeList, setActiveList] = useState<'buy' | 'soon'>('buy');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const adminPressTimer = useRef<number | null>(null);
  const purchasableProducts = products.filter((product) => product.pdfUrl);
  const comingSoonProducts = products.filter((product) => !product.pdfUrl);
  const adminPanelUrl = getAdminPanelUrl();
  const refreshIntervalMs = 5000;

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
            newReleaseMessage: settings.newReleaseMessage || 'Buy once, download instantly, and access your files anytime.'
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
          productTitle: data.productTitle,
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

  const startCheckout = async (productId: number) => {
    setError('');

    try {
      const response = await fetchFromApi('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to start checkout.');
      }

      window.location.href = data.checkoutUrl;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to start checkout.');
    }
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

  const openAdminPanel = () => {
    window.open(adminPanelUrl, '_blank', 'noopener,noreferrer');
  };

  const startAdminPress = () => {
    if (adminPressTimer.current) {
      window.clearTimeout(adminPressTimer.current);
    }

    adminPressTimer.current = window.setTimeout(() => {
      openAdminPanel();
      adminPressTimer.current = null;
    }, 1200);
  };

  const stopAdminPress = () => {
    if (adminPressTimer.current) {
      window.clearTimeout(adminPressTimer.current);
      adminPressTimer.current = null;
    }
  };

  const openProductDetails = (product: Product) => {
    setSelectedProduct(product);
  };

  const closeProductDetails = () => {
    setSelectedProduct(null);
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
            onPointerDown={startAdminPress}
            onPointerUp={stopAdminPress}
            onPointerLeave={stopAdminPress}
            onPointerCancel={stopAdminPress}
          >
            <p className="overline">Digital Store</p>
            <h1>Dada Downloads</h1>
          </div>
          <div className="top-actions">
            <button className="icon-pill" type="button" onClick={() => void refreshStore()}>Refresh</button>
          </div>
        </header>

        <section className="promo-banner">
          <p className="overline">New Release</p>
          <h2>{storeSettings.newReleaseTitle}</h2>
          <p>{storeSettings.newReleaseMessage}</p>
        </section>

        <section className="search-strip">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search digital products"
            aria-label="Search digital products"
          />
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
            <h2>Buy Now</h2>
            <span>{filteredProducts.length} ready now</span>
          </div>

          {loading ? (
            <p className="muted">Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="muted">No products match your search.</p>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
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
                  <div className="thumb-block" aria-hidden="true">
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
                  <div className="product-copy">
                    <h3>{product.title}</h3>
                    <p>{product.description || product.pdfName || 'Instant download after payment.'}</p>
                    <div className="meta-row">
                      <span className="meta-chip">Instant Access</span>
                      <span className="meta-chip">Secure Checkout</span>
                    </div>
                    <div className="product-row">
                      <strong>${product.price.toFixed(2)}</strong>
                      <button
                        className="buy-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void startCheckout(product.id);
                        }}
                      >
                        Buy now
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
              <p>{selectedProduct.description || selectedProduct.pdfName || 'Instant digital product download.'}</p>
              <div className="modal-row">
                <strong>${selectedProduct.price.toFixed(2)}</strong>
                <button
                  className="buy-button"
                  type="button"
                  onClick={() => void startCheckout(selectedProduct.id)}
                >
                  Buy now
                </button>
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
