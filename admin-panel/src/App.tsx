import { useEffect, useState } from 'react';

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

const apiBaseUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL || apiBaseUrl;

export default function App() {
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('adminToken') || '');
  const [email, setEmail] = useState('admin@dadasstore.com');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    if (!authToken) {
      return {};
    }

    return { Authorization: `Bearer ${authToken}` };
  };

  const getJsonAuthHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...getAuthHeaders()
  });

  const readErrorMessage = async (response: Response, fallbackMessage: string) => {
    try {
      const result = await response.json();
      return result.error || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  };

  const clearSession = () => {
    localStorage.removeItem('adminToken');
    setAuthToken('');
  };

  useEffect(() => {
    fetch(`${configuredApiBaseUrl}/api/products`)
      .then((res) => res.json())
      .then(setProducts)
      .catch(() => setError('Unable to load products.'));
  }, []);

  const handleLogin = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your admin email and password.');
      return;
    }

    try {
      const response = await fetch(`${configuredApiBaseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, 'Login failed.');
        setError(message);
        return;
      }

      const result = await response.json();
      localStorage.setItem('adminToken', result.token);
      setAuthToken(result.token);
      setPassword('');
    } catch {
      setError('Unable to reach the server. Please check your backend URL and network.');
    }
  };

  const handleAdd = async () => {
    setError('');

    if (!authToken) {
      setError('Please login as admin to add products.');
      return;
    }

    const parsedPrice = Number(price);
    if (!title.trim() || Number.isNaN(parsedPrice)) {
      setError('Please enter a valid title and price.');
      return;
    }

    if (isAdding) {
      return;
    }

    setIsAdding(true);

    try {
      const response = pdfFile
          ? await fetch(`${configuredApiBaseUrl}/api/products/upload`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: (() => {
              const formData = new FormData();
              formData.append('title', title.trim());
              formData.append('price', String(parsedPrice));
              formData.append('description', description.trim());
              formData.append('pdf', pdfFile);
              if (imageFile) {
                formData.append('image', imageFile);
              }
              return formData;
            })()
          })
        : await fetch(`${configuredApiBaseUrl}/api/products`, {
            method: 'POST',
            headers: getJsonAuthHeaders(),
            body: JSON.stringify({ title: title.trim(), price: parsedPrice, description: description.trim() })
          });

      if (!response.ok) {
        const message = await readErrorMessage(response, 'Unable to add product.');
        setError(message);
        if (response.status === 401) {
          clearSession();
        }
        return;
      }

      const newProduct = await response.json();
      setProducts((current) => [...current, newProduct]);
      setTitle('');
      setPrice('');
      setDescription('');
      setPdfFile(null);
      setImageFile(null);
    } catch {
      setError('Unable to reach the server. Please check your backend URL and network.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!authToken) {
      setError('Please login as admin to delete products.');
      return;
    }

    const shouldDelete = window.confirm('Delete this product? This cannot be undone.');
    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(`${configuredApiBaseUrl}/api/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, 'Unable to delete product.');
        setError(message);
        if (response.status === 401) {
          clearSession();
        }
        return;
      }

      setProducts((current) => current.filter((item) => item.id !== id));
    } catch {
      setError('Unable to reach the server. Please check your backend URL and network.');
    }
  };

  const startEditing = (product: Product) => {
    setError('');
    setEditingId(product.id);
    setEditTitle(product.title);
    setEditPrice(String(product.price));
    setEditDescription(product.description || '');
    setEditPdfFile(null);
    setEditImageFile(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
    setEditPrice('');
    setEditDescription('');
    setEditPdfFile(null);
    setEditImageFile(null);
  };

  const saveEditing = async (id: number) => {
    setError('');

    if (!authToken) {
      setError('Please login as admin to edit products.');
      return;
    }

    const parsedPrice = Number(editPrice);
    if (!editTitle.trim() || Number.isNaN(parsedPrice)) {
      setError('Please enter a valid title and price before saving.');
      return;
    }

    try {
        const response = editPdfFile || editImageFile
          ? await fetch(`${configuredApiBaseUrl}/api/products/${id}/upload`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: (() => {
              const formData = new FormData();
              formData.append('title', editTitle.trim());
              formData.append('price', String(parsedPrice));
              formData.append('description', editDescription.trim());
              if (editPdfFile) {
                formData.append('pdf', editPdfFile);
              }
              if (editImageFile) {
                formData.append('image', editImageFile);
              }
              return formData;
            })()
          })
        : await fetch(`${configuredApiBaseUrl}/api/products/${id}`, {
            method: 'PUT',
            headers: getJsonAuthHeaders(),
            body: JSON.stringify({ title: editTitle.trim(), price: parsedPrice, description: editDescription.trim() })
          });

      if (!response.ok) {
        const message = await readErrorMessage(response, 'Unable to update product.');
        setError(message);
        if (response.status === 401) {
          clearSession();
        }
        return;
      }

      const updatedProduct = await response.json();
      setProducts((current) => current.map((product) => (product.id === id ? { ...product, ...updatedProduct } : product)));
      cancelEditing();
    } catch {
      setError('Unable to reach the server. Please check your backend URL and network.');
    }
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
          <div className="hero-auth">
            {authToken ? (
              <button className="muted-button" onClick={clearSession}>Logout</button>
            ) : (
              <span>Login required for edits</span>
            )}
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

        {!authToken && (
          <section className="panel-card login-card">
            <h2>Admin Login</h2>
            <p className="card-subtitle">Use your admin email and password to unlock product management.</p>
            <p className="helper-text">Demo login: admin@dadasstore.com / Love1877. Password is case-sensitive.</p>
            <div className="form-grid">
              <input
                placeholder="Admin email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <input
                type="password"
                placeholder="Love1877"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button className="primary-button" onClick={handleLogin}>Login</button>
            </div>
          </section>
        )}

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
              <textarea
                placeholder="Short product description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
              <label className="file-picker">
                <span>{imageFile ? imageFile.name : 'Choose product image (optional)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <label className="file-picker">
                <span>{pdfFile ? pdfFile.name : 'Choose PDF file'}</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <small className="helper-text">Pick a PDF to upload, or leave it empty to add a product without a file.</small>
              <button className="primary-button" onClick={handleAdd} disabled={isAdding}>
                {isAdding ? 'Uploading...' : pdfFile ? 'Upload PDF Product' : 'Add Product'}
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
                    {editingId === product.id ? (
                      <div className="edit-grid">
                        <input
                          className="edit-input"
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          placeholder="Product title"
                        />
                        <input
                          className="edit-input"
                          value={editPrice}
                          onChange={(event) => setEditPrice(event.target.value)}
                          placeholder="Price"
                        />
                        <textarea
                          className="edit-input edit-textarea"
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                          placeholder="Short product description"
                          rows={3}
                        />
                        <label className="file-picker edit-file-picker">
                          <span>{editImageFile ? editImageFile.name : 'Replace image (optional)'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => setEditImageFile(event.target.files?.[0] ?? null)}
                          />
                        </label>
                        <label className="file-picker edit-file-picker">
                          <span>{editPdfFile ? editPdfFile.name : 'Replace PDF (optional)'}</span>
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(event) => setEditPdfFile(event.target.files?.[0] ?? null)}
                          />
                        </label>
                        <div className="product-actions">
                          <button className="save-button" onClick={() => saveEditing(product.id)}>
                            Save
                          </button>
                          <button className="muted-button" onClick={cancelEditing}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="product-main">
                        <div>
                          <strong>{product.title}</strong>
                          <div className="product-price">${product.price.toFixed(2)}</div>
                          {product.description && <p className="product-description">{product.description}</p>}
                          {product.imageUrl && (
                            <img
                              className="product-thumb"
                              src={`${configuredApiBaseUrl}${product.imageUrl}`}
                              alt={product.title}
                            />
                          )}
                        </div>
                        <div className="product-actions">
                          {product.pdfUrl && (
                            <a href={`${configuredApiBaseUrl}${product.pdfUrl}`} target="_blank" rel="noreferrer" className="pdf-link">
                              Open PDF
                            </a>
                          )}
                          <button className="muted-button" onClick={() => startEditing(product)}>
                            Edit
                          </button>
                          <button className="danger-button" onClick={() => handleDelete(product.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
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
