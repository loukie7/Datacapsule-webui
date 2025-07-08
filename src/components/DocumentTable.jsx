import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function DocumentTable({ documents, startIndex, totalCount, currentPage, totalPages, onPageChange }) {
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, document: null });
  const navigate = useNavigate();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'success':
        return '解析成功';
      case 'error':
        return '解析失败';
      case 'pending':
        return '解析中';
      default:
        return '未知状态';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleView = (document) => {
    navigate(`/document-view/${document.id}`);
  };

  const handleEdit = (document) => {
    console.log('重试文档:', document);
    // 这里可以实现重试解析的逻辑
  };

  const handleExport = (document) => {
    console.log('导出文档:', document);
    // 这里可以实现导出文档的逻辑
  };

  const confirmDelete = (document) => {
    setDeleteConfirm({ show: true, document });
  };

  const handleDelete = () => {
    if (deleteConfirm.document) {
      console.log('删除文档:', deleteConfirm.document);
      // 这里可以实现删除文档的逻辑
      setDeleteConfirm({ show: false, document: null });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, document: null });
  };

  return (
    <>
      <div>
        {/* 表格 */}
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  序号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  文件名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  解析类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((document, index) => (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {document.filename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {document.parseType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(document.status)}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(document.status)}`}>
                        {getStatusText(document.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {document.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleView(document)}
                        className="text-blue-600 hover:text-blue-900"
                        title="查看"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => handleEdit(document)}
                        className="text-blue-600 hover:text-blue-900"
                        title="重试"
                      >
                        重试
                      </button>
                      <button
                        onClick={() => handleExport(document)}
                        className="text-blue-600 hover:text-blue-900"
                        title="导出"
                      >
                        导出
                      </button>
                      <button
                        onClick={() => confirmDelete(document)}
                        className="text-red-600 hover:text-red-900"
                        title="删除"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              共 {totalCount} 条
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, index, array) => (
                    <div key={page} className="flex items-center">
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => onPageChange(page)}
                        className={`px-3 py-1 text-sm border rounded ${
                          page === currentPage
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  ))
                }
              </div>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <span>跳至</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">页</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                确认删除文档
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                您确定要删除以下文档吗？
              </p>
              <p className="text-sm font-medium text-gray-900 mb-6">
                文件名：{deleteConfirm.document?.filename}
              </p>
              <p className="text-sm text-red-600 mb-6">
                此操作不可撤销，请谨慎操作。
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DocumentTable; 