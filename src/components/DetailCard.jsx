import { DocumentDuplicateIcon, TrashIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import TypeTag from './TypeTag';

export default function DetailCard({ item, onCopy, onDelete, onClick }) {
  const renderContent = () => {
    switch (item.type) {
      case 'title':
        return <ReactMarkdown className="markdown-content font-bold">{item.text}</ReactMarkdown>;
      case 'text':
      case 'equation':
        return (
          <ReactMarkdown className="markdown-content" remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {item.text}
          </ReactMarkdown>
        );
      case 'table':
        return (
          <div 
            className="table-content-view overflow-x-auto border rounded bg-gray-50 p-2 text-sm" 
            dangerouslySetInnerHTML={{ __html: item.table_body }} 
          />
        );
      case 'image':
        return (
          <div className="p-2 border rounded">
            <img 
              src={`/docs/${item.img_path}`} 
              alt={item.img_caption?.[0] || '文档图片'} 
              className="max-w-full rounded" 
            />
            {item.img_caption?.[0] && (
              <p className="text-xs text-center text-gray-500 mt-1">{item.img_caption[0]}</p>
            )}
          </div>
        );
      case 'catalog':
        return <div className="text-purple-700 whitespace-pre-line text-sm">{item.text}</div>;
      default:
        return <div className="text-sm text-gray-600">{JSON.stringify(item.text) || '无内容'}</div>;
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex flex-col gap-3 cursor-pointer hover:shadow-md hover:border-blue-400 transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
            <TypeTag type={item.type} />
            <span className="text-gray-400 text-xs">第{(item.page_idx ?? 0) + 1}页</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCopy} className="text-gray-400 hover:text-blue-600">
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-600">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="text-gray-800 text-sm">
        {renderContent()}
      </div>
    </div>
  );
} 