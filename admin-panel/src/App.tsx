import { useEffect, useState } from 'react';

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

type PurchaseRecord = {
  sessionId: string;
  productId: number;
  productTitle: string;
  productPrice: number;
  customerEmail?: string;
  purchasedAt: string;
};

type LeadRecord = {
  email: string;
  name?: string;
  source?: string;
  createdAt: string;
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
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsBestSeller, setEditIsBestSeller] = useState(false);
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [newReleaseTitle, setNewReleaseTitle] = useState('Premium digital bundle');
  const [newReleaseMessage, setNewReleaseMessage] = useState('Buy once, download instantly, and access your files anytime.');
  const [featuredProductId, setFeaturedProductId] = useState<number | null>(null);
  const [featuredProductLabel, setFeaturedProductLabel] = useState('Featured pick');
  const [cardBadgeText, setCardBadgeText] = useState('Best Seller');
  const [cardKickerText, setCardKickerText] = useState('Digital Download');
  const [shopSectionTitle, setShopSectionTitle] = useState('Shop Products');
  const [benefitOne, setBenefitOne] = useState('Instant download');
  const [benefitTwo, setBenefitTwo] = useState('Secure checkout');
  const [benefitThree, setBenefitThree] = useState('Mobile ready');
  const [detailsButtonText, setDetailsButtonText] = useState('View details');
  const [buyButtonText, setBuyButtonText] = useState('Buy now');
  const [buyFeaturedButtonText, setBuyFeaturedButtonText] = useState('Buy Featured');
  const [recentPurchases, setRecentPurchases] = useState<PurchaseRecord[]>([]);
  const [recentLeads, setRecentLeads] = useState<LeadRecord[]>([]);

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

    fetch(`${configuredApiBaseUrl}/api/store-settings`)
      .then((res) => res.json())
      .then((settings: StoreSettings) => {
        setNewReleaseTitle(settings.newReleaseTitle || 'Premium digital bundle');
        setNewReleaseMessage(settings.newReleaseMessage || 'Buy once, download instantly, and access your files anytime.');
        setFeaturedProductId(typeof settings.featuredProductId === 'number' ? settings.featuredProductId : null);
        setFeaturedProductLabel(settings.featuredProductLabel || 'Featured pick');
        setCardBadgeText(settings.cardBadgeText || 'Best Seller');
        setCardKickerText(settings.cardKickerText || 'Digital Download');
        setShopSectionTitle(settings.shopSectionTitle || 'Shop Products');
        setBenefitOne(settings.benefitOne || 'Instant download');
        setBenefitTwo(settings.benefitTwo || 'Secure checkout');
        setBenefitThree(settings.benefitThree || 'Mobile ready');
        setDetailsButtonText(settings.detailsButtonText || 'View details');
        setBuyButtonText(settings.buyButtonText || 'Buy now');
        setBuyFeaturedButtonText(settings.buyFeaturedButtonText || 'Buy Featured');
      })
      .catch(() => setSettingsError('Unable to load store settings.'));
  }, []);

  useEffect(() => {
    if (!authToken) {
      setRecentPurchases([]);
      setRecentLeads([]);
      return;
    }

    fetch(`${configuredApiBaseUrl}/api/admin/purchases?count=25`, {
      headers: getAuthHeaders()
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            clearSession();
          }
          throw new Error('Unable to load purchases.');
        }

        return res.json();
      })
      .then((records: PurchaseRecord[]) => {
        setRecentPurchases(Array.isArray(records) ? records : []);
      })
      .catch(() => {
        setError('Unable to load recent purchases.');
      });

    fetch(`${configuredApiBaseUrl}/api/admin/leads?count=50`, {
      headers: getAuthHeaders()
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            clearSession();
          }
          throw new Error('Unable to load leads.');
        }

        return res.json();
      })
      .then((records: LeadRecord[]) => {
        setRecentLeads(Array.isArray(records) ? records : []);
      })
      .catch(() => {
        setError('Unable to load signup emails.');
      });
  }, [authToken]);

  const formatAdminDate = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return date.toLocaleString();
  };

  const escapeCsvValue = (value: string) => {
    const normalized = value.replace(/\r?\n/g, ' ').replace(/"/g, '""');
    return `"${normalized}"`;
  };

  const downloadCsv = (fileName: string, headers: string[], rows: string[][]) => {
    const headerRow = headers.map(escapeCsvValue).join(',');
    const bodyRows = rows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(','));
    const csvContent = [headerRow, ...bodyRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const exportPurchasesCsv = () => {
    const rows = recentPurchases.map((purchase) => [
      purchase.sessionId,
      String(purchase.productId),
      purchase.productTitle,
      purchase.productPrice.toFixed(2),
      purchase.customerEmail || '',
      purchase.purchasedAt
    ]);

    downloadCsv(
      'dadasstore-purchases.csv',
      ['sessionId', 'productId', 'productTitle', 'productPrice', 'customerEmail', 'purchasedAt'],
      rows
    );
  };

  const exportLeadsCsv = () => {
    const rows = recentLeads.map((lead) => [
      lead.email,
      lead.name || '',
      lead.source || 'landing-page',
      lead.createdAt
    ]);

    downloadCsv(
      'dadasstore-signup-emails.csv',
      ['email', 'name', 'source', 'createdAt'],
      rows
    );
  };

  const saveStoreSettings = async () => {
    setSettingsError('');
    setSettingsMessage('');

    if (!authToken) {
      setSettingsError('Please login as admin to edit store settings.');
      return;
    }

    try {
      const response = await fetch(`${configuredApiBaseUrl}/api/admin/store-settings`, {
        method: 'PUT',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          newReleaseTitle,
          newReleaseMessage,
          featuredProductId,
          featuredProductLabel,
          cardBadgeText,
          cardKickerText,
          shopSectionTitle,
          benefitOne,
          benefitTwo,
          benefitThree,
          detailsButtonText,
          buyButtonText,
          buyFeaturedButtonText
        })
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, 'Unable to save store settings.');
        setSettingsError(message);
        return;
      }

      setSettingsMessage('Storefront settings saved.');
    } catch {
      setSettingsError('Unable to reach the server. Please check your backend URL and network.');
    }
  };

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
              formData.append('isBestSeller', String(isBestSeller));
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
            body: JSON.stringify({
              title: title.trim(),
              price: parsedPrice,
              description: description.trim(),
              isBestSeller
            })
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
      setIsBestSeller(false);
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
    setEditIsBestSeller(Boolean(product.isBestSeller));
    setEditPdfFile(null);
    setEditImageFile(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
    setEditPrice('');
    setEditDescription('');
    setEditIsBestSeller(false);
    setEditPdfFile(null);
    setEditImageFile(null);
  };

  const toggleBestSeller = async (product: Product) => {
    if (!authToken) {
      setError('Please login as admin to edit products.');
      return;
    }

    try {
      const response = await fetch(`${configuredApiBaseUrl}/api/products/${product.id}`, {
        method: 'PUT',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ isBestSeller: !Boolean(product.isBestSeller) })
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, 'Unable to update best seller status.');
        setError(message);
        if (response.status === 401) {
          clearSession();
        }
        return;
      }

      const updatedProduct = await response.json();
      setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, ...updatedProduct } : item)));
    } catch {
      setError('Unable to reach the server. Please check your backend URL and network.');
    }
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
              formData.append('isBestSeller', String(editIsBestSeller));
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
            body: JSON.stringify({
              title: editTitle.trim(),
              price: parsedPrice,
              description: editDescription.trim(),
              isBestSeller: editIsBestSeller
            })
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
            <div>
              <strong>{recentPurchases.length}</strong>
              <span>Recent purchases</span>
            </div>
            <div>
              <strong>{recentLeads.length}</strong>
              <span>Signup emails</span>
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
            <h2>Storefront Banner</h2>
            <p className="card-subtitle">Edit customer-facing storefront labels, badges, and featured product content.</p>

            {settingsError && <div className="error-banner compact-error">{settingsError}</div>}
            {settingsMessage && <div className="success-banner">{settingsMessage}</div>}

            <div className="form-grid">
              <input
                placeholder="New release title"
                value={newReleaseTitle}
                onChange={(event) => setNewReleaseTitle(event.target.value)}
              />
              <textarea
                placeholder="New release message"
                value={newReleaseMessage}
                onChange={(event) => setNewReleaseMessage(event.target.value)}
                rows={3}
              />
              <select
                value={featuredProductId === null ? '' : String(featuredProductId)}
                onChange={(event) => {
                  const value = event.target.value;
                  setFeaturedProductId(value ? Number(value) : null);
                }}
              >
                <option value="">Auto featured product</option>
                {products.filter((product) => product.pdfUrl).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
              </select>
              <input
                placeholder="Featured label (example: Featured pick)"
                value={featuredProductLabel}
                onChange={(event) => setFeaturedProductLabel(event.target.value)}
              />
              <input
                placeholder="Card badge text (example: Best Seller)"
                value={cardBadgeText}
                onChange={(event) => setCardBadgeText(event.target.value)}
              />
              <input
                placeholder="Card kicker text (example: Digital Download)"
                value={cardKickerText}
                onChange={(event) => setCardKickerText(event.target.value)}
              />
              <input
                placeholder="Shop section title"
                value={shopSectionTitle}
                onChange={(event) => setShopSectionTitle(event.target.value)}
              />
              <input
                placeholder="Benefit pill 1"
                value={benefitOne}
                onChange={(event) => setBenefitOne(event.target.value)}
              />
              <input
                placeholder="Benefit pill 2"
                value={benefitTwo}
                onChange={(event) => setBenefitTwo(event.target.value)}
              />
              <input
                placeholder="Benefit pill 3"
                value={benefitThree}
                onChange={(event) => setBenefitThree(event.target.value)}
              />
              <input
                placeholder="Details button text"
                value={detailsButtonText}
                onChange={(event) => setDetailsButtonText(event.target.value)}
              />
              <input
                placeholder="Buy button text"
                value={buyButtonText}
                onChange={(event) => setBuyButtonText(event.target.value)}
              />
              <input
                placeholder="Featured buy button text"
                value={buyFeaturedButtonText}
                onChange={(event) => setBuyFeaturedButtonText(event.target.value)}
              />
              <button className="muted-button" onClick={() => void saveStoreSettings()}>
                Save Storefront Settings
              </button>
            </div>

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
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={isBestSeller}
                  onChange={(event) => setIsBestSeller(event.target.checked)}
                />
                <span>Mark as Best Seller</span>
              </label>
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
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={editIsBestSeller}
                            onChange={(event) => setEditIsBestSeller(event.target.checked)}
                          />
                          <span>Best Seller</span>
                        </label>
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
                          {product.isBestSeller && <p className="product-badge">Best Seller</p>}
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
                          <button className="muted-button" onClick={() => void toggleBestSeller(product)}>
                            {product.isBestSeller ? 'Remove Best Seller' : 'Mark Best Seller'}
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

        <section className="insights-grid">
          <div className="panel-card list-card">
            <div className="list-header">
              <div>
                <h2>Recent Purchases</h2>
                <p className="card-subtitle">See customer purchases as Stripe checkouts complete.</p>
              </div>
              <button
                className="muted-button compact-button"
                type="button"
                onClick={exportPurchasesCsv}
                disabled={!authToken || recentPurchases.length === 0}
              >
                Export CSV
              </button>
            </div>

            {!authToken ? (
              <p className="empty-state">Login as admin to view customer purchases.</p>
            ) : recentPurchases.length === 0 ? (
              <p className="empty-state">No purchases recorded yet.</p>
            ) : (
              <ul className="data-list">
                {recentPurchases.map((purchase) => (
                  <li key={`${purchase.sessionId}-${purchase.purchasedAt}`} className="data-item">
                    <div className="data-title-row">
                      <strong>{purchase.productTitle}</strong>
                      <span>${purchase.productPrice.toFixed(2)}</span>
                    </div>
                    <p>{purchase.customerEmail || 'No customer email from checkout'}</p>
                    <p>{formatAdminDate(purchase.purchasedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel-card list-card">
            <div className="list-header">
              <div>
                <h2>Signup Emails</h2>
                <p className="card-subtitle">Collected from the landing page free guide form.</p>
              </div>
              <button
                className="muted-button compact-button"
                type="button"
                onClick={exportLeadsCsv}
                disabled={!authToken || recentLeads.length === 0}
              >
                Export CSV
              </button>
            </div>

            {!authToken ? (
              <p className="empty-state">Login as admin to view signup emails.</p>
            ) : recentLeads.length === 0 ? (
              <p className="empty-state">No signup emails recorded yet.</p>
            ) : (
              <ul className="data-list">
                {recentLeads.map((lead) => (
                  <li key={`${lead.email}-${lead.createdAt}`} className="data-item">
                    <div className="data-title-row">
                      <strong>{lead.email}</strong>
                      <span>{lead.source || 'landing-page'}</span>
                    </div>
                    <p>{lead.name || 'No name provided'}</p>
                    <p>{formatAdminDate(lead.createdAt)}</p>
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
