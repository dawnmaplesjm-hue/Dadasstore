import { useCallback, useEffect, useState } from 'react';

type Product = {
  id: number;
  title: string;
  price: number;
  pdfUrl?: string;
  pdfName?: string;
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

const apiBaseUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL || apiBaseUrl;

const getApiBaseCandidates = () => {
  const candidates = [
    import.meta.env.VITE_API_BASE_URL,
    configuredApiBaseUrl,
    `${window.location.protocol}//${window.location.hostname}:5000`,
    'http://10.0.2.2:5000',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(candidates));
};

const apiBaseCandidates = getApiBaseCandidates();

const fetchFromApi = async (path: string, init?: RequestInit) => {
  let lastError: unknown = null;

  for (const baseUrl of apiBaseCandidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        cache: 'no-store',
        ...init
      });

      if (response.ok) {
        return response;
      }

      lastError = new Error(`Request failed with status ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
  }

  const attemptedHosts = apiBaseCandidates.join(', ');
  const details = lastError instanceof Error ? lastError.message : 'Unknown network error.';
  throw new Error(`Unable to reach the store backend. Tried: ${attemptedHosts}. Last error: ${details}`);
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
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const purchasableProducts = products.filter((product) => product.pdfUrl);
  const comingSoonProducts = products.filter((product) => !product.pdfUrl);
  const adminPanelUrl = getAdminPanelUrl();

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
    } catch {
      setError('Unable to load products.');
    }
  }, []);

  const refreshStore = useCallback(async () => {
    setError('');
    setLoading(true);
    await loadProducts();
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
    const sessionId = getSessionId();

    if (!sessionId) {
      if (new URLSearchParams(window.location.search).get('canceled')) {
        setError('Checkout was canceled before payment completed.');
      }

      return;
    }

    setCheckingOut(true);
    setError('');
    setCheckoutMessage('Verifying your payment and preparing the download...');

    fetchFromApi(`/api/checkout/session/${sessionId}`)
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Unable to verify the payment.');
        }

        const fullDownloadUrl = `${configuredApiBaseUrl}${data.downloadUrl}`;
        setDownloadUrl(fullDownloadUrl);
        await triggerBlobDownload(fullDownloadUrl, `${data.productTitle}.pdf`);
        setCheckoutMessage(`Payment confirmed for ${data.productTitle}. Your download has started.`);
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
    setCheckoutMessage('');

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

  return (
    <div className="store-shell">
      <main className="store-phone">
        <header className="top-row">
          <div>
            <p className="overline">Digital Store</p>
            <h1>Dada Downloads</h1>
          </div>
          <div className="top-actions">
            <button className="icon-pill" type="button" onClick={openAdminPanel}>Admin</button>
            <button className="icon-pill" type="button" onClick={() => void refreshStore()}>Refresh</button>
          </div>
        </header>

        <section className="promo-banner">
          <p className="overline">New Release</p>
          <h2>Premium digital bundle</h2>
          <p>Buy once, download instantly, and access your files anytime.</p>
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

        {(checkingOut || checkoutMessage) && (
          <section className="status success">
            <div>
              <strong>{checkingOut ? 'Processing payment' : 'Order complete'}</strong>
              <p>{checkoutMessage || 'Your purchase is ready.'}</p>
            </div>
            {downloadUrl && !checkingOut && (
              <a className="mini-link" href={downloadUrl}>Download again</a>
            )}
          </section>
        )}

        <section className="stats-grid">
          <article>
            <strong>{purchasableProducts.length}</strong>
            <span>Buy now</span>
          </article>
          <article>
            <strong>{comingSoonProducts.length}</strong>
            <span>Coming soon</span>
          </article>
        </section>

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
                <article className="product-card" key={product.id}>
                  <div className="thumb-block" aria-hidden="true">
                    <span className="thumb-file-type">PDF</span>
                    <span className="thumb-category">Instant</span>
                  </div>
                  <div className="product-copy">
                    <h3>{product.title}</h3>
                    <p>{product.pdfName || 'Instant download after payment.'}</p>
                    <div className="meta-row">
                      <span className="meta-chip">Instant Access</span>
                      <span className="meta-chip">Secure Checkout</span>
                    </div>
                    <div className="product-row">
                      <strong>${product.price.toFixed(2)}</strong>
                      <button className="buy-button" type="button" onClick={() => startCheckout(product.id)}>
                        Buy now
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {comingSoonProducts.length > 0 && (
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
      </main>
    </div>
  );
}
