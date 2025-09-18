interface ModalData {
  title: string;
  description?: string;
  content?: string;
  entryData?: any;
}

/**
 * Sends modal data to parent window for display
 */
export function openParentModal(data: ModalData): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // Check if we're in an iframe
    if (window !== window.parent) {
      // Send message to parent window
      window.parent.postMessage({
        type: 'IFRAME_MODAL_OPEN',
        data: data
      }, '*');
      return true;
    }
  } catch (error) {
    console.warn('Failed to communicate with parent window:', error);
  }

  return false;
}

/**
 * Closes modal in parent window
 */
export function closeParentModal(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (window !== window.parent) {
      window.parent.postMessage({
        type: 'IFRAME_MODAL_CLOSE'
      }, '*');
      return true;
    }
  } catch (error) {
    console.warn('Failed to communicate with parent window:', error);
  }

  return false;
}

/**
 * Formats entry data for parent modal display
 */
export function formatEntryForParentModal(entry: any): ModalData {
  const videoSection = entry.type === 'exicon' && entry.videoLink ? `
    <div style="margin: 16px 0;">
      <h4 style="font-weight: 600; margin-bottom: 8px;">Video</h4>
      <div style="margin-bottom: 12px;">
        <iframe
          width="100%"
          height="300"
          src="${getYouTubeEmbedUrl(entry.videoLink)}"
          frameborder="0"
          allowfullscreen
          style="border-radius: 8px;">
        </iframe>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button onclick="copyToClipboard('${entry.videoLink}')" style="
          padding: 6px 12px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">Copy Video Link</button>
        <a href="${entry.videoLink}" target="_blank" style="
          padding: 6px 12px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          text-decoration: none;
          color: inherit;
          font-size: 14px;
        ">Open Video</a>
      </div>
    </div>
  ` : '';

  const tagsSection = entry.tags && entry.tags.length > 0 ? `
    <div style="margin: 16px 0;">
      <h4 style="font-weight: 600; margin-bottom: 8px;">Tags</h4>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${entry.tags.map((tag: any) => `
          <span style="
            background: #e5e7eb;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            color: #374151;
          ">${tag.name}</span>
        `).join('')}
      </div>
    </div>
  ` : '';

  const copyButton = `
    <button onclick="copyEntryUrl('${entry.id}', '${entry.type}')" style="
      padding: 8px 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 8px;
    ">Copy Entry URL</button>
  `;

  const content = `
    <div style="max-width: none;">
      <div style="margin-bottom: 16px;">
        <p style="line-height: 1.6; margin: 0; color: #374151;">${entry.description || 'No description available.'}</p>
      </div>
      ${videoSection}
      ${tagsSection}
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end;">
        ${copyButton}
      </div>
    </div>
  `;

  return {
    title: entry.name,
    description: `${entry.type === 'exicon' ? 'Exercise' : 'Term'}`,
    content: content,
    entryData: entry
  };
}

/**
 * Helper function to get YouTube embed URL (simple version)
 */
function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';

  const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId[1]}`;
  }

  return url;
}

/**
 * Injects helper functions into parent window for modal interactions
 */
export function injectParentHelpers(): void {
  if (typeof window === 'undefined' || window === window.parent) return;

  try {
    // Create a script element with helper functions
    const script = `
      window.copyEntryUrl = function(entryId, entryType) {
        const baseUrl = entryType === 'lexicon' && window.location.pathname.includes('lexicon-2') ? 'lexicon-2' : entryType;
        const url = 'https://f3nation.com/' + baseUrl + '?entryId=' + encodeURIComponent(entryId);

        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function() {
            showToast('Entry URL Copied!', 'The link has been copied to your clipboard.');
          }).catch(function() {
            fallbackCopy(url);
          });
        } else {
          fallbackCopy(url);
        }
      };

      window.copyToClipboard = function(text) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(function() {
            showToast('Copied!', 'The link has been copied to your clipboard.');
          }).catch(function() {
            fallbackCopy(text);
          });
        } else {
          fallbackCopy(text);
        }
      };

      window.fallbackCopy = function(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied!', 'The text has been copied to your clipboard.');
      };

      window.showToast = function(title, message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.style.cssText = \`
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          z-index: 100000;
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 300px;
        \`;
        toast.innerHTML = \`
          <div style="font-weight: 600; margin-bottom: 4px;">\${title}</div>
          <div style="font-size: 14px; opacity: 0.9;">\${message}</div>
        \`;

        document.body.appendChild(toast);

        setTimeout(function() {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 3000);
      };
    `;

    // Send script to parent window
    window.parent.postMessage({
      type: 'IFRAME_INJECT_HELPERS',
      script: script
    }, '*');

  } catch (error) {
    console.warn('Failed to inject parent helpers:', error);
  }
}