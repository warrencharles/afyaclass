import React from 'react';

export interface ResponsiveSinglePagePdfModalProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
  isImage: boolean;
}

declare const ResponsiveSinglePagePdfModal: React.FC<ResponsiveSinglePagePdfModalProps>;
export default ResponsiveSinglePagePdfModal;
