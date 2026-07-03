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
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 700, margin: '0 auto' }}>
      <h1>Dada's Admin Panel</h1>
      <p>Add and manage products for your store.</p>

      {error && (
        <div style={{ color: 'red', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 24, display: 'grid', gap: 12 }}>
        <input
          placeholder="Product title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          style={{ padding: 10, fontSize: 16 }}
        />
        <input
          placeholder="Price"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          style={{ padding: 10, fontSize: 16 }}
        />
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
          style={{ padding: 10, fontSize: 16 }}
        />
        <small style={{ color: '#555' }}>Pick a PDF to upload, or leave it empty to add a product without a file.</small>
        <button onClick={handleAdd} style={{ padding: '10px 16px', fontSize: 16 }}>
          {pdfFile ? 'Upload PDF Product' : 'Add Product'}
        </button>
      </div>

      <div>
        <h2>Products</h2>
        {products.length === 0 ? (
          <p>No products yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {products.map((product) => (
              <li key={product.id} style={{ marginBottom: 12, border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <strong>{product.title}</strong>
                    <div>${product.price.toFixed(2)}</div>
                    {product.pdfUrl && (
                      <a href={`http://localhost:5000${product.pdfUrl}`} target="_blank" rel="noreferrer">
                        Open PDF
                      </a>
                    )}
                  </div>
                  <button onClick={() => handleDelete(product.id)} style={{ color: 'white', background: '#e63946', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
