import { useEffect, useState } from 'react';
import { openParentModal, closeParentModal, formatEntryForParentModal, injectParentHelpers } from '@/lib/parent-modal';

export function useIframeModal() {
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    const inIframe = typeof window !== 'undefined' && window !== window.parent;
    setIsInIframe(inIframe);

    if (inIframe) {
      // Inject helper functions into parent window
      injectParentHelpers();
    }
  }, []);

  const openModal = (entry: any): boolean => {
    if (isInIframe) {
      const modalData = formatEntryForParentModal(entry);
      return openParentModal(modalData);
    }
    return false;
  };

  const closeModal = (): boolean => {
    if (isInIframe) {
      return closeParentModal();
    }
    return false;
  };

  return {
    isInIframe,
    openModal,
    closeModal
  };
}