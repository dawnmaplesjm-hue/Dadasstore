import { useEffect, useRef, useState } from 'react';

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
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const purchasableProducts = products.filter((product) => product.pdfUrl);
  const comingSoonProducts = products.filter((product) => !product.pdfUrl);
  const adminPanelUrl = getAdminPanelUrl();
  const downloadsSectionRef = useRef<HTMLElement | null>(null);
  const historySectionRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    fetch(`${configuredApiBaseUrl}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(() => setError('Unable to load products.'))
      .finally(() => setLoading(false));

    fetch(`${configuredApiBaseUrl}/api/purchases/recent`)
      .then((res) => res.json())
      .then((data) => setRecentPurchases(data))
      .catch(() => setRecentPurchases([]));
  }, []);

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

    fetch(`${configuredApiBaseUrl}/api/checkout/session/${sessionId}`)
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
      const response = await fetch(`${configuredApiBaseUrl}/api/checkout/create-session`, {
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

  const getDigitalCategory = (product: Product) => {
    const value = `${product.title} ${product.pdfName || ''}`.toLowerCase();

    if (value.includes('template')) {
      return 'Template';
    }

    if (value.includes('guide')) {
      return 'Guide';
    }

    if (value.includes('worksheet') || value.includes('workbook')) {
      return 'Worksheet';
    }

    return 'Ebook';
  };

  const categoryLabels = [
    'All',
    ...Array.from(new Set(purchasableProducts.map((product) => getDigitalCategory(product))))
  ];

  const filteredProducts = selectedCategory === 'All'
    ? purchasableProducts
    : purchasableProducts.filter((product) => getDigitalCategory(product) === selectedCategory);

  const showDownloads = () => {
    downloadsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showHistory = () => {
    historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cycleCategoryFilter = () => {
    if (categoryLabels.length === 0) {
      return;
    }

    const currentIndex = categoryLabels.indexOf(selectedCategory);
    const nextIndex = currentIndex === -1 || currentIndex === categoryLabels.length - 1 ? 0 : currentIndex + 1;
    setSelectedCategory(categoryLabels[nextIndex]);
  };

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
            <button className="icon-pill" type="button" onClick={showHistory}>History</button>
          </div>
        </header>

        <section className="promo-banner">
          <p className="overline">New Release</p>
          <h2>Premium digital bundle</h2>
          <p>Buy once, download instantly, and access your files anytime.</p>
          <button className="cta-pill" type="button" onClick={showDownloads}>Browse downloads</button>
        </section>

        <section className="search-strip">
          <input type="text" readOnly value="Search digital products" aria-label="Search" />
          <button className="icon-pill" type="button" onClick={cycleCategoryFilter}>Filter</button>
        </section>

        <section className="chip-row">
          {categoryLabels.map((label) => (
            <button
              key={label}
              className={`chip ${selectedCategory === label ? 'chip-active' : ''}`}
              type="button"
              onClick={() => setSelectedCategory(label)}
            >
              {label}
            </button>
          ))}
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
          <article>
            <strong>{recentPurchases.length}</strong>
            <span>Purchased</span>
          </article>
        </section>

        <section className="section-card" ref={downloadsSectionRef}>
          <div className="section-head">
            <h2>Top Downloads</h2>
            <span>{selectedCategory === 'All' ? 'Ready instantly' : `${selectedCategory} only`}</span>
          </div>

          {loading ? (
            <p className="muted">Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="muted">No products are ready for checkout yet.</p>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="thumb-block" aria-hidden="true">
                    <span className="thumb-file-type">PDF</span>
                    <span className="thumb-category">{getDigitalCategory(product)}</span>
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

        <section className="section-card" ref={historySectionRef}>
          <div className="section-head">
            <h2>Purchase History</h2>
            <span>Saved on server</span>
          </div>
          {recentPurchases.length === 0 ? (
            <p className="muted">No completed purchases yet.</p>
          ) : (
            <div className="history-list">
              {recentPurchases.map((purchase) => (
                <article className="history-item" key={purchase.sessionId}>
                  <div>
                    <strong>{purchase.productTitle}</strong>
                    <p>{formatPurchaseDate(purchase.purchasedAt)}</p>
                  </div>
                  <a className="mini-link" href={`${configuredApiBaseUrl}${purchase.downloadUrl}`}>
                    Download
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
