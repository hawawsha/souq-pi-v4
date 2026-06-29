/**
 * Souq Pi - Home Page
 * Dynamic Network Support - Shows current network badge
 */

import { useState, useEffect } from 'react';
import { usePiPrice } from '../contexts/PiPriceContext';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { price, convertToUSD, network } = usePiPrice();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
      }
    } catch (error) {
      console.error("Failed to fetch products", error);
    } finally {
      setLoading(false);
    }
  };

  const getNetworkBadgeColor = () => {
    return network === 'mainnet' ? '#00b894' : '#fdcb6e';
  };

  const getNetworkLabel = () => {
    return network === 'mainnet' ? 'Mainnet' : 'Testnet';
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Souq Pi</h1>

        <div
          className="network-badge"
          style={{ backgroundColor: getNetworkBadgeColor() }}
        >
          {getNetworkLabel()}
        </div>

        {price && (
          <div className="price-badge">
            1 PI = ${price.toFixed(2)} USD
          </div>
        )}
      </header>

      <main className="main">
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : (
          <div className="products-grid">

            {products.map(product => (

              <div key={product.productId} className="product-card">

                {product.images?.length > 0 && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="product-image"
                  />
                )}

                <h3>{product.name}</h3>

                <p>{product.description}</p>

                <div className="price">
                  <span className="pi-price">
                    {product.price} PI
                  </span>

                  <span className="usd-price">
                    ≈ ${convertToUSD(product.price)} USD
                  </span>
                </div>

                <div className="rating">
                  ⭐ {product.ratings?.average || 0} ({product.ratings?.count || 0} reviews)
                </div>

              </div>

            ))}

          </div>
        )}
      </main>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px 0;
          border-bottom: 2px solid #eee;
        }

        .network-badge {
          color: white;
          padding: 5px 15px;
          border-radius: 20px;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 0.85em;
        }

        .price-badge {
          background: #0984e3;
          color: white;
          padding: 5px 15px;
          border-radius: 20px;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          padding: 20px 0;
        }

        .product-card {
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 20px;
          transition: transform 0.2s;
          background: white;
        }

        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }

        .product-image {
          width: 100%;
          height: 220px;
          object-fit: cover;
          border-radius: 10px;
          margin-bottom: 15px;
        }

        .price {
          display: flex;
          flex-direction: column;
          margin: 10px 0;
        }

        .pi-price {
          font-size: 1.5em;
          font-weight: bold;
          color: #00b894;
        }

        .usd-price {
          color: #636e72;
          font-size: 0.9em;
        }

        .loading {
          text-align: center;
          padding: 50px;
          font-size: 1.2em;
        }
      `}</style>
    </div>
  );
}
