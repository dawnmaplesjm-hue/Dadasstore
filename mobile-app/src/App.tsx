import { useEffect, useState } from 'react';

type Product = {
  id: number;
  title: string;
  price: number;
  pdfUrl?: string;
  pdfName?: string;
};

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(() => setError('Unable to load products.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-shell">
      <main className="app-frame">
        <section className="app-hero">
          <span className="eyebrow">Customer App</span>
          <h1>Shop digital products in a simple, mobile-style storefront.</h1>
          <p>
            This is the first version of the customer-facing app. It pulls products from the backend and can open PDF downloads.
          </p>
        </section>

        {error && <div className="message error">{error}</div>}

        <section className="feature-strip">
          <div>
            <strong>{products.length}</strong>
            <span>Available products</span>
          </div>
          <div>
            <strong>{products.filter((product) => product.pdfUrl).length}</strong>
            <span>Products with PDFs</span>
          </div>
          <div>
            <strong>Live</strong>
            <span>Backend connected</span>
          </div>
        </section>

        <section className="catalog-card">
          <div className="catalog-header">
            <div>
              <h2>Featured products</h2>
              <p>Browse the store and tap a PDF link when you want to view a file.</p>
            </div>
          </div>

          {loading ? (
            <p className="message">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="message">No products are available yet.</p>
          ) : (
            <div className="catalog-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-top">
                    <div>
                      <span className="product-tag">Digital Product</span>
                      <h3>{product.title}</h3>
                    </div>
                    <div className="price-pill">${product.price.toFixed(2)}</div>
                  </div>

                  <div className="product-bottom">
                    <p>{product.pdfName ? product.pdfName : 'No PDF attached yet.'}</p>
                    {product.pdfUrl ? (
                      <a className="primary-link" href={`http://localhost:5000${product.pdfUrl}`} target="_blank" rel="noreferrer">
                        Open PDF
                      </a>
                    ) : (
                      <button className="secondary-button" type="button">
                        Buy Now
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
