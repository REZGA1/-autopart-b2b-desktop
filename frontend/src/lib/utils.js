import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(...inputs));
}

// Simple toast notification system
let toastCallback = null;

export function setToastCallback(callback) {
  toastCallback = callback;
}

export function showToast(message, type = 'success') {
  if (toastCallback) {
    toastCallback(message, type);
  }
}

/**
 * Fix image URL by cleaning up nested paths
 * @param {string} imageUrl - Original image URL
 * @param {string} bucketName - Storage bucket name to look for
 * @returns {string|null} Cleaned URL or null
 */
export function fixImageUrl(imageUrl, bucketName) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(p => p === bucketName);

    if (bucketIndex === -1) {
      return imageUrl;
    }

    const fileName = pathParts[pathParts.length - 1];
    const cleanPath = pathParts.slice(0, bucketIndex + 1).join('/');
    url.pathname = `${cleanPath}/${fileName}`;

    return url.toString();
  } catch {
    return imageUrl;
  }
}
