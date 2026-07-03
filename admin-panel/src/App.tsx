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
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then(setProducts)
      .catch(() => setError('Unable to load products.'));
  }, []);

  const handleAdd = async () => {
    setError('');

    const parsedPrice = Number(price);
    if (!title.trim() || Number.isNaN(parsedPrice)) {
      setError('Please enter a valid title and price.');
      return;
    }

    const response = pdfFile
      ? await fetch('http://localhost:5000/api/products/upload', {
          method: 'POST',
          body: (() => {
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('price', String(parsedPrice));
            formData.append('pdf', pdfFile);
            return formData;
          })()
        })
      : await fetch('http://localhost:5000/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), price: parsedPrice })
        });

    if (!response.ok) {
      const result = await response.json();
      setError(result.error || 'Unable to add product.');
      return;
    }

    const newProduct = await response.json();
    setProducts((current) => [...current, newProduct]);
    setTitle('');
    setPrice('');
    setPdfFile(null);
  };

  const handleDelete = async (id: number) => {
    const shouldDelete = window.confirm('Delete this product? This cannot be undone.');
    if (!shouldDelete) {
      return;
    }

    const response = await fetch(`http://localhost:5000/api/products/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      setError('Unable to delete product.');
      return;
    }

    setProducts((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="admin-shell">
      <main className="admin-panel">
        <section className="hero-card">
          <div>
            <span className="eyebrow">Admin Dashboard</span>
            <h1>Dada's Store</h1>
            <p>Add products, upload PDFs, and manage the catalog from one place.</p>
          </div>
          <div className="hero-stats">
            <div>
              <strong>{products.length}</strong>
              <span>Total products</span>
            </div>
            <div>
              <strong>{products.filter((product) => product.pdfUrl).length}</strong>
              <span>PDF products</span>
            </div>
          </div>
        </section>

        {error && <div className="error-banner">{error}</div>}

        <section className="content-grid">
          <div className="panel-card form-card">
            <h2>Create Product</h2>
            <p className="card-subtitle">Use the form below to add a digital product and optionally attach a PDF.</p>

            <div className="form-grid">
              <input
                placeholder="Product title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <input
                placeholder="Price"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
              <label className="file-picker">
                <span>{pdfFile ? pdfFile.name : 'Choose PDF file'}</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <small className="helper-text">Pick a PDF to upload, or leave it empty to add a product without a file.</small>
              <button className="primary-button" onClick={handleAdd}>
                {pdfFile ? 'Upload PDF Product' : 'Add Product'}
              </button>
            </div>
          </div>

          <div className="panel-card list-card">
            <div className="list-header">
              <div>
                <h2>Products</h2>
                <p className="card-subtitle">Manage what customers will see in the store.</p>
              </div>
            </div>

            {products.length === 0 ? (
              <p className="empty-state">No products yet.</p>
            ) : (
              <ul className="product-list">
                {products.map((product) => (
                  <li key={product.id} className="product-card">
                    <div className="product-main">
                      <div>
                        <strong>{product.title}</strong>
                        <div className="product-price">${product.price.toFixed(2)}</div>
                      </div>
                      <div className="product-actions">
                        {product.pdfUrl && (
                          <a href={`http://localhost:5000${product.pdfUrl}`} target="_blank" rel="noreferrer" className="pdf-link">
                            Open PDF
                          </a>
                        )}
                        <button className="danger-button" onClick={() => handleDelete(product.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
