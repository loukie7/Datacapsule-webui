import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentFilter from './DocumentFilter';
import DocumentTable from './DocumentTable';
import NewDocumentModal from './NewDocumentModal';

// 模拟数据
const mockDocuments = [
  {
    id: 1,
    filename: '7.jpg',
    parseType: '通用文档解析',
    status: 'success',
    statusText: '解析成功',
    createdAt: '2025-06-28 11:37:10'
  },
  {
    id: 2,
    filename: '8.jpg',
    parseType: '通用文档解析',
    status: 'success',
    statusText: '解析成功',
    createdAt: '2025-06-28 11:37:10'
  },
  {
    id: 3,
    filename: '素材2.pdf',
    parseType: '通用文档解析',
    status: 'success',
    statusText: '解析成功',
    createdAt: '2025-06-28 11:27:59'
  },
  {
    id: 4,
    filename: '素材3.pdf',
    parseType: '通用文档解析',
    status: 'success',
    statusText: '解析成功',
    createdAt: '2025-06-28 11:27:58'
  },
  {
    id: 5,
    filename: '素材4.pdf',
    parseType: '通用文档解析',
    status: 'success',
    statusText: '解析成功',
    createdAt: '2025-06-28 11:27:58'
  },
  {
    id: 6,
    filename: '素材5.pdf',
    parseType: '通用文档解析',
    status: 'success',
    statusText: '解析成功',
    createdAt: '2025-06-28 11:27:58'
  },
  {
    id: 7,
    filename: '素材6.pdf',
    parseType: '通用文档解析',
    status: 'success',
    statusText: '解析成功',
    createdAt: '2025-06-28 11:25:27'
  },
  {
    id: 8,
    filename: '素材1.pdf',
    parseType: '通用文档解析',
    status: 'success',
    statusText: '解析成功',
    createdAt: '2025-06-28 11:18:08'
  },
  {
    id: 9,
    filename: '素材6.pdf',
    parseType: '通用文档解析',
    status: 'error',
    statusText: '解析失败',
    createdAt: '2025-06-28 11:16:59'
  },
  {
    id: 10,
    filename: '素材5.pdf',
    parseType: '通用文档解析',
    status: 'error',
    statusText: '解析失败',
    createdAt: '2025-06-28 11:16:59'
  }
];

function DocumentParsingPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState(mockDocuments);
  const [filteredDocuments, setFilteredDocuments] = useState(mockDocuments);
  const [isNewDocumentModalOpen, setIsNewDocumentModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    filename: '',
    parseType: '全部',
    status: '全部',
    startDate: '',
    endDate: ''
  });

  const documentsPerPage = 10;
  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);
  const startIndex = (currentPage - 1) * documentsPerPage;
  const endIndex = startIndex + documentsPerPage;
  const currentDocuments = filteredDocuments.slice(startIndex, endIndex);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    
    // 应用筛选逻辑
    let filtered = documents.filter(doc => {
      const matchesFilename = !newFilters.filename || 
        doc.filename.toLowerCase().includes(newFilters.filename.toLowerCase());
      
      const matchesParseType = newFilters.parseType === '全部' || 
        doc.parseType === newFilters.parseType;
      
      const matchesStatus = newFilters.status === '全部' || 
        doc.status === newFilters.status;
      
      const matchesDateRange = (!newFilters.startDate || doc.createdAt >= newFilters.startDate) &&
        (!newFilters.endDate || doc.createdAt <= newFilters.endDate);
      
      return matchesFilename && matchesParseType && matchesStatus && matchesDateRange;
    });
    
    setFilteredDocuments(filtered);
    setCurrentPage(1); // 重置到第一页
  };

  const handleNewDocument = (documentData) => {
    const newDoc = {
      id: documents.length + 1,
      ...documentData,
      status: 'pending',
      statusText: '解析中',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    
    const updatedDocuments = [newDoc, ...documents];
    setDocuments(updatedDocuments);
    setFilteredDocuments(updatedDocuments);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">文档解析</h1>
            </div>
            <button
              onClick={() => setIsNewDocumentModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span>新建解析</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* 筛选区域 */}
          <DocumentFilter
            filters={filters}
            onFilterChange={handleFilterChange}
          />
          
          {/* 文档列表 */}
          <DocumentTable
            documents={currentDocuments}
            startIndex={startIndex}
            totalCount={filteredDocuments.length}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* 新建文档模态框 */}
      <NewDocumentModal
        isOpen={isNewDocumentModalOpen}
        onClose={() => setIsNewDocumentModalOpen(false)}
        onSubmit={handleNewDocument}
      />
    </div>
  );
}

export default DocumentParsingPage; 