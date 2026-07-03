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
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(() => setError('Unable to load products.'))
      .finally(() => setLoading(false));

    fetch('http://localhost:5000/api/purchases/recent')
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

    fetch(`http://localhost:5000/api/checkout/session/${sessionId}`)
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Unable to verify the payment.');
        }

        const fullDownloadUrl = `http://localhost:5000${data.downloadUrl}`;
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
      const response = await fetch('http://localhost:5000/api/checkout/create-session', {
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

  return (
    <div className="app-shell">
      <main className="app-frame">
        <section className="app-hero">
          <span className="eyebrow">Customer App</span>
          <h1>Shop digital products and download them right after Stripe checkout.</h1>
          <p>
            Customers can buy a product, pay with Stripe, and instantly download the PDF after payment is verified.
          </p>
        </section>

        {error && <div className="message error">{error}</div>}

        {(checkingOut || checkoutMessage) && (
          <section className="checkout-card">
            <div>
              <span className="checkout-label">Secure Checkout</span>
              <h2>{checkingOut ? 'Processing your order' : 'Order complete'}</h2>
              <p>{checkoutMessage || 'Your purchase is ready.'}</p>
            </div>
            {downloadUrl && !checkingOut && (
              <a className="primary-link" href={downloadUrl}>
                Download again
              </a>
            )}
          </section>
        )}

        <section className="history-card">
          <div className="catalog-header">
            <div>
              <h2>Recent purchases</h2>
              <p>These completed Stripe orders are saved on the server.</p>
            </div>
          </div>

          {recentPurchases.length === 0 ? (
            <p className="message">No completed purchases yet.</p>
          ) : (
            <div className="history-list">
              {recentPurchases.map((purchase) => (
                <article className="history-item" key={purchase.sessionId}>
                  <div>
                    <strong>{purchase.productTitle}</strong>
                    <p>${purchase.productPrice.toFixed(2)} purchased on {new Date(purchase.purchasedAt).toLocaleString()}</p>
                  </div>
                  <a className="primary-link" href={`http://localhost:5000${purchase.downloadUrl}`}>
                    Download
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="feature-strip">
          <div>
            <strong>{purchasableProducts.length}</strong>
            <span>Buy now</span>
          </div>
          <div>
            <strong>{comingSoonProducts.length}</strong>
            <span>Coming soon</span>
          </div>
          <div>
            <strong>Live</strong>
            <span>Backend connected</span>
          </div>
        </section>

        <section className="catalog-card">
          <div className="catalog-header">
            <div>
              <h2>Ready to buy</h2>
              <p>These products already have a PDF attached, so Stripe checkout will work and the file will download after payment.</p>
            </div>
          </div>

          {loading ? (
            <p className="message">Loading products...</p>
          ) : purchasableProducts.length === 0 ? (
            <p className="message">No products are ready for checkout yet.</p>
          ) : (
            <div className="catalog-grid">
              {purchasableProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-top">
                    <div>
                      <span className="product-tag">Digital Product</span>
                      <h3>{product.title}</h3>
                    </div>
                    <div className="price-pill">${product.price.toFixed(2)}</div>
                  </div>

                  <div className="product-bottom">
                    <p>{product.pdfName ? 'Instant download after payment.' : 'Add a PDF before enabling checkout.'}</p>
                    <button
                      className="primary-link"
                      type="button"
                      disabled={!product.pdfUrl}
                      onClick={() => startCheckout(product.id)}
                    >
                      {product.pdfUrl ? 'Buy with Stripe' : 'Checkout unavailable'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {comingSoonProducts.length > 0 && (
          <section className="catalog-card" style={{ marginTop: '18px' }}>
            <div className="catalog-header">
              <div>
                <h2>Coming soon</h2>
                <p>These products are in the catalog, but they still need a PDF before checkout can be enabled.</p>
              </div>
            </div>

            <div className="catalog-grid">
              {comingSoonProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-top">
                    <div>
                      <span className="product-tag">Not purchasable yet</span>
                      <h3>{product.title}</h3>
                    </div>
                    <div className="price-pill">${product.price.toFixed(2)}</div>
                  </div>

                  <div className="product-bottom">
                    <p>Add a PDF in the admin panel to unlock Stripe checkout.</p>
                    <span className="secondary-button">Checkout unavailable</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
