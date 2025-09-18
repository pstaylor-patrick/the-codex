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
 * Opens suggest edits form in parent window
 */
export function openParentSuggestEdits(entryId: string, entryName: string, entryType: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (window !== window.parent) {
      window.parent.postMessage({
        type: 'IFRAME_SUGGEST_EDITS_OPEN',
        data: { entryId, entryName, entryType }
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

  const aliasesSection = entry.aliases && entry.aliases.length > 0 ? `
    <p style="
      font-size: 14px;
      color: #6b7280;
      font-style: italic;
      margin: 4px 0 16px 0;
    ">
      Also known as: ${entry.aliases.map((alias: any) => typeof alias === 'string' ? alias : alias.name).join(', ')}
    </p>
  ` : '';

  const tagsSection = entry.tags && entry.tags.length > 0 ? `
    <div style="margin-bottom: 24px;">
      <h3 style="
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #111827;
      ">Tags</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${entry.tags.map((tag: any) => `
          <span style="
            background: #f3f4f6;
            color: #374151;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: normal;
          ">${tag.name}</span>
        `).join('')}
      </div>
    </div>
  ` : '';

  const actionButtons = `
    <div style="display: flex; justify-content: flex-end; gap: 8px;">
      <button onclick="copyEntryUrl('${entry.id}', '${entry.type}')" style="
        display: inline-flex;
        align-items: center;
        padding: 8px 16px;
        background: #f9fafb;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        text-decoration: none;
        transition: all 0.2s;
      " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#f9fafb'">
        Copy URL
      </button>
      <button onclick="openSuggestEdits('${entry.id}', '${escapeHtml(entry.name)}', '${entry.type}')" style="
        display: inline-flex;
        align-items: center;
        padding: 8px 16px;
        background: #f9fafb;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        text-decoration: none;
        transition: all 0.2s;
      " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#f9fafb'">
        Suggest Edits
      </button>
    </div>
  `;

  const content = `
    <div style="padding: 24px;">
      ${aliasesSection}
      <div style="margin-bottom: 24px;">
        <h3 style="
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #111827;
        ">Description</h3>
        <p style="
          line-height: 1.6;
          margin: 0;
          color: #374151;
        ">${entry.description || 'No description available.'}</p>
      </div>
      ${videoSection}
      ${tagsSection}
      ${actionButtons}
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
 * Helper function to escape HTML in strings
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
        const currentPath = window.location.pathname;
        let baseUrl = entryType;

        // Use lexicon-2 if we're on a lexicon-2 page
        if (entryType === 'lexicon' && currentPath.includes('lexicon-2')) {
          baseUrl = 'lexicon-2';
        }

        const url = window.location.origin + '/' + baseUrl + '?entryId=' + encodeURIComponent(entryId);

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

      window.openSuggestEdits = function(entryId, entryName, entryType) {
        // Create suggest edits form modal
        const formModal = createSuggestEditsModal(entryId, entryName, entryType);
        document.body.appendChild(formModal);

        // Animate in
        setTimeout(() => formModal.classList.add('show'), 10);
      };

      window.createSuggestEditsModal = function(entryId, entryName, entryType) {
        const overlay = document.createElement('div');
        overlay.className = 'codex-modal-overlay';
        overlay.style.zIndex = '10001'; // Higher than main modal

        const modal = document.createElement('div');
        modal.className = 'codex-modal-content';
        modal.style.maxWidth = '500px';

        modal.innerHTML = \`
          <div style="padding: 24px;">
            <h2 style="
              font-size: 18px;
              font-weight: 600;
              line-height: 1.5;
              color: #111827;
              margin: 0 0 24px 0;
              padding-right: 40px;
            ">
              Suggest Edits for: \${entryName}
            </h2>
            <form id="suggest-edits-form" style="space-y: 16px;">
              <div style="margin-bottom: 16px;">
                <label style="
                  display: block;
                  color: #374151;
                  font-size: 14px;
                  font-weight: 500;
                  line-height: 1.5;
                  margin-bottom: 6px;
                ">Your Name</label>
                <input type="text" name="name" required style="
                  width: 100%;
                  padding: 8px 12px;
                  border: 1px solid #d1d5db;
                  border-radius: 6px;
                  font-size: 14px;
                  line-height: 1.5;
                  background: #ffffff;
                  color: #111827;
                  box-sizing: border-box;
                  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
                "
                onfocus="this.style.outline='none'; this.style.borderColor='#2563eb'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)';"
                onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none';">
              </div>
              <div style="margin-bottom: 16px;">
                <label style="
                  display: block;
                  color: #374151;
                  font-size: 14px;
                  font-weight: 500;
                  line-height: 1.5;
                  margin-bottom: 6px;
                ">Email (optional)</label>
                <input type="email" name="email" style="
                  width: 100%;
                  padding: 8px 12px;
                  border: 1px solid #d1d5db;
                  border-radius: 6px;
                  font-size: 14px;
                  line-height: 1.5;
                  background: #ffffff;
                  color: #111827;
                  box-sizing: border-box;
                  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
                "
                onfocus="this.style.outline='none'; this.style.borderColor='#2563eb'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)';"
                onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none';">
              </div>
              <div style="margin-bottom: 24px;">
                <label style="
                  display: block;
                  color: #374151;
                  font-size: 14px;
                  font-weight: 500;
                  line-height: 1.5;
                  margin-bottom: 6px;
                ">Suggested Changes</label>
                <textarea name="suggestions" required rows="6" style="
                  width: 100%;
                  padding: 8px 12px;
                  border: 1px solid #d1d5db;
                  border-radius: 6px;
                  font-size: 14px;
                  line-height: 1.5;
                  background: #ffffff;
                  color: #111827;
                  resize: vertical;
                  box-sizing: border-box;
                  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
                  min-height: 120px;
                "
                placeholder="Describe what should be changed or improved..."
                onfocus="this.style.outline='none'; this.style.borderColor='#2563eb'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)';"
                onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none';"></textarea>
              </div>
              <div style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 8px;">
                <button type="button" onclick="closeSuggestEditsModal(this)" style="
                  display: inline-flex;
                  align-items: center;
                  padding: 8px 16px;
                  background: #ffffff;
                  color: #374151;
                  border: 1px solid #d1d5db;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 500;
                  line-height: 1.5;
                  transition: all 0.15s ease-in-out;
                  min-width: 80px;
                  justify-content: center;
                "
                onmouseover="this.style.background='#f9fafb'; this.style.borderColor='#9ca3af';"
                onmouseout="this.style.background='#ffffff'; this.style.borderColor='#d1d5db';">
                  Cancel
                </button>
                <button type="submit" style="
                  display: inline-flex;
                  align-items: center;
                  padding: 8px 16px;
                  background: #2563eb;
                  color: #ffffff;
                  border: 1px solid #2563eb;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 500;
                  line-height: 1.5;
                  transition: all 0.15s ease-in-out;
                  min-width: 140px;
                  justify-content: center;
                "
                onmouseover="this.style.background='#1d4ed8'; this.style.borderColor='#1d4ed8';"
                onmouseout="this.style.background='#2563eb'; this.style.borderColor='#2563eb';">
                  Submit Suggestions
                </button>
              </div>
            </form>
          </div>
        \`;

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.className = 'codex-close-button';
        closeButton.onclick = function() { closeSuggestEditsModal(closeButton); };
        modal.appendChild(closeButton);

        overlay.appendChild(modal);

        // Form submission
        const form = modal.querySelector('#suggest-edits-form');
        form.onsubmit = function(e) {
          e.preventDefault();
          const formData = new FormData(form);

          // Here you would typically send to your API
          console.log('Suggest edits submission:', {
            entryId: entryId,
            entryName: entryName,
            entryType: entryType,
            name: formData.get('name'),
            email: formData.get('email'),
            suggestions: formData.get('suggestions')
          });

          showToast('Suggestions Submitted!', 'Thank you for your feedback.');
          closeSuggestEditsModal(closeButton);
        };

        // Close on overlay click
        overlay.onclick = function(e) {
          if (e.target === overlay) {
            closeSuggestEditsModal(closeButton);
          }
        };

        return overlay;
      };

      window.closeSuggestEditsModal = function(element) {
        const modal = element.closest('.codex-modal-overlay');
        if (modal) {
          modal.classList.remove('show');
          setTimeout(() => {
            if (modal.parentNode) {
              modal.parentNode.removeChild(modal);
            }
          }, 300);
        }
      };

      window.showToast = function(title, message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.style.cssText = \`
          position: fixed;
          top: 20px;
          right: 20px;
          background: #059669;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          z-index: 100000;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 320px;
          min-width: 280px;
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid #065f46;
        \`;
        toast.innerHTML = \`
          <div style="
            font-weight: 600;
            margin-bottom: 4px;
            font-size: 14px;
            line-height: 1.5;
          ">\${title}</div>
          <div style="
            font-size: 13px;
            opacity: 0.95;
            line-height: 1.4;
            color: #f0fdf4;
          ">\${message}</div>
        \`;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
          toast.style.opacity = '1';
          toast.style.transform = 'translateX(0)';
        }, 10);

        setTimeout(function() {
          if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
              if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
              }
            }, 300);
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