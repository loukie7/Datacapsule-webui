import {
    ArrowLeftIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CloudArrowDownIcon,
    DocumentIcon
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SplitPane from 'split-pane-react';
import 'split-pane-react/esm/themes/default.css';
import DocumentDetails from './DocumentDetails';
import DocumentPreview from './DocumentPreview';
import DocumentSidebar from './DocumentSidebar';

// 模拟文档数据
const mockDocument = {
  id: 1,
  filename: '素材2.pdf',
  parseType: '通用文档解析',
  status: 'success',
  createdAt: '2025-06-28 11:27:59',
  content: {
    title: '汽车侧面碰撞的乘员保护',
    subtitle: 'The protection of the occupants in the event of a lateral collision',
    standard: 'GB 20071—2006',
    sections: [
      {
        id: 'section1',
        title: 'GB 20071—2006',
        content: '汽车侧面碰撞的乘员保护'
      },
      {
        id: 'section2', 
        title: '目次',
        subsections: [
          { id: 'c51', title: 'C.5.1 安装', subsections: [
            { id: 'c511', title: 'C.5.1.1 试验场地' },
            { id: 'c512', title: 'C.5.1.2 固定刚性壁障和测力墙' }
          ]},
          { id: 'c52', title: 'C.5.2 移动变形壁障的驱动' },
          { id: 'c53', title: 'C.5.3 测量装置', subsections: [
            { id: 'c531', title: 'C.5.3.1 速度' },
            { id: 'c532', title: 'C.5.3.2 载荷' },
            { id: 'c533', title: 'C.5.3.3 加速度', subsections: [
              { id: 'c5334', title: 'C.5.3.3.4 测量装置应满足ISO 6487' }
            ]}
          ]}
        ]
      }
    ]
  }
};

function DocumentViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [document] = useState(mockDocument);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(12);
  const [sizes, setSizes] = useState([20, 50, 30]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const newSizes = isSidebarCollapsed ? [5, 65, 30] : [20, 50, 30];
    setSizes(newSizes);
  }, [isSidebarCollapsed]);

  console.log('DocumentViewPage rendered, id:', id);

  const handlePrevDocument = () => {
    console.log('上一篇文档');
  };

  const handleNextDocument = () => {
    console.log('下一篇文档');
  };

  const handleSave = () => {
    console.log('保存文档');
  };

  const handleExport = () => {
    console.log('导出文档');
  };

  const handleSectionClick = (sectionId) => {
    console.log('跳转到章节:', sectionId);
  };
  
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 左侧按钮组 */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/document-parsing')}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>返回</span>
            </button>

            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrevDocument}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                <span>上一篇</span>
              </button>
              <button
                onClick={handleNextDocument}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <span>下一篇</span>
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 中间文档标题 */}
          <div className="flex items-center space-x-2">
            <DocumentIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">{document.filename}</span>
          </div>

          {/* 右侧按钮组 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <DocumentIcon className="h-4 w-4" />
              <span>保存</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              <CloudArrowDownIcon className="h-4 w-4" />
              <span>导出</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 - 使用 SplitPane */}
      <div className="flex-1 flex overflow-hidden">
        <SplitPane
          split="vertical"
          sizes={sizes}
          onChange={setSizes}
          resizerClassName="h-full w-2 bg-gray-200 hover:bg-blue-500 cursor-col-resize"
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
        >
          <div className="bg-white border-r border-gray-200 h-full overflow-y-auto">
            <DocumentSidebar
              sections={document.content.sections}
              onSectionClick={handleSectionClick}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={handleToggleSidebar}
            />
          </div>

          <div className="relative h-full overflow-y-auto">
            <DocumentPreview
              document={document}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
            {isDragging && (
              <div
                className="absolute inset-0 z-10"
                style={{ cursor: 'col-resize' }}
              />
            )}
          </div>

          <div className="bg-gray-50 border-l border-gray-200 h-full overflow-y-auto">
            <DocumentDetails
              documentId={document.id}
              onCardClick={setCurrentPage}
            />
          </div>
        </SplitPane>
      </div>
    </div>
  );
}

export default DocumentViewPage; 