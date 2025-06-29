import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

function DocumentPreview({ document, currentPage }) {
  const [pdfError, setPdfError] = useState(false);

  const handlePdfError = () => {
    setPdfError(true);
  };

  // 构建PDF URL
  const pdfUrl = `/docs/素材2_layout.pdf#page=${currentPage}`;

  return (
    <div className="h-full bg-gray-100 flex flex-col">
      {/* PDF预览区域 */}
      <div className="flex-1 overflow-hidden p-4">
        {pdfError ? (
          // PDF加载失败时的后备显示
          <div className="h-full flex items-center justify-center bg-white rounded-lg shadow">
            <div className="text-center p-8 max-w-md">
              <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">PDF预览加载失败</h3>
              <p className="text-sm text-gray-600 mb-4">
                无法加载文件：{document.filename}
              </p>
              <button
                onClick={() => setPdfError(false)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                重试
              </button>
            </div>
          </div>
        ) : (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0 rounded-lg shadow"
            title={`${document.filename} - 第 ${currentPage} 页`}
            onError={handlePdfError}
          />
        )}
      </div>
    </div>
  );
}

export default DocumentPreview; 