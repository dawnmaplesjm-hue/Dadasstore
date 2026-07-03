import { useEffect, useState } from 'react';

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

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error, setError] = useState('');
  const purchasableProducts = products.filter((product) => product.pdfUrl);
  const comingSoonProducts = products.filter((product) => !product.pdfUrl);
  const categoryLabels = ['Digital Books', 'Templates', 'Worksheets', 'Bundles'];

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

  return (
    <div className="store-shell">
      <main className="store-phone">
        <header className="top-row">
          <div>
            <p className="overline">Discover</p>
            <h1>Dada Shop</h1>
          </div>
          <button className="icon-pill" type="button">Cart</button>
        </header>

        <section className="promo-banner">
          <p className="overline">Limited Deal</p>
          <h2>Summer learning bundle</h2>
          <p>Instant PDF delivery after checkout. New products added every week.</p>
          <button className="cta-pill" type="button">Explore now</button>
        </section>

        <section className="search-strip">
          <input type="text" readOnly value="Search digital products" aria-label="Search" />
          <button className="icon-pill" type="button">Filter</button>
        </section>

        <section className="chip-row">
          {categoryLabels.map((label) => (
            <span key={label} className="chip">{label}</span>
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

        <section className="section-card">
          <div className="section-head">
            <h2>Featured Drops</h2>
            <span>Fresh this week</span>
          </div>

          {loading ? (
            <p className="muted">Loading products...</p>
          ) : purchasableProducts.length === 0 ? (
            <p className="muted">No products are ready for checkout yet.</p>
          ) : (
            <div className="product-grid">
              {purchasableProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="thumb-block" aria-hidden="true">PDF</div>
                  <div className="product-copy">
                    <h3>{product.title}</h3>
                    <p>{product.pdfName || 'Instant download after payment.'}</p>
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
              <span>Needs PDF upload</span>
            </div>
            <div className="coming-list">
              {comingSoonProducts.map((product) => (
                <article className="coming-item" key={product.id}>
                  <div>
                    <strong>{product.title}</strong>
                    <p>${product.price.toFixed(2)}</p>
                  </div>
                  <span className="locked">Unavailable</span>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="section-card">
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
