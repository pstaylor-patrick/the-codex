import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;

  let videoId = null;
  
  // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/watch\?v=([^&]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  } else {
    // Shortened URL: https://youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortMatch) {
      videoId = shortMatch[1];
    } else {
      // Embed URL: https://www.youtube.com/embed/VIDEO_ID
      const embedMatch = url.match(/youtube\.com\/embed\/([^?]+)/);
      if (embedMatch) {
        videoId = embedMatch[1]; // Already in embed format, but we extract ID to standardize
      }
    }
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // Fallback for other potential (but less common) formats or if no match
  // This part can be expanded if more URL types need to be supported
  // For now, if it's not a known YouTube format, return null or the original URL if it's already an embed link
  if (url.includes('youtube.com/embed/')) {
    return url; // Assume it's already a valid embed URL
  }
  
  console.warn(`Could not parse YouTube video ID from URL: ${url}`);
  return null; // Or return the original URL if you want to try embedding it directly
}
