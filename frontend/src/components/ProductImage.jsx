import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';

/**
 * Robust Image component that handles:
 * 1. Direct URL (Supabase Public)
 * 2. Fallback to Proxy URL (Backend)
 * 3. Fallback to Placeholder icon
 */
const ProductImage = ({ 
  src, 
  alt, 
  productId, 
  getProxyUrl, 
  className = "w-full h-full object-cover",
  placeholderClass = "h-6 w-6 text-slate-400"
}) => {
  const [loadError, setLoadError] = useState(false);
  const [proxyMode, setProxyMode] = useState(false);

  // Reset state if src or productId changes
  useEffect(() => {
    setLoadError(false);
    setProxyMode(false);
  }, [src, productId]);

  if (!src || loadError) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-slate-100">
        <Package className={placeholderClass} />
      </div>
    );
  }

  const currentSrc = proxyMode && getProxyUrl ? getProxyUrl(productId) : src;

  return (
    <img
      src={currentSrc}
      alt={alt || "Product"}
      className={className}
      onError={() => {
        if (!proxyMode && getProxyUrl) {
          setProxyMode(true);
        } else {
          setLoadError(true);
        }
      }}
    />
  );
};

export default ProductImage;
