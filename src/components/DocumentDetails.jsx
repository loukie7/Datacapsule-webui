import { useEffect, useState } from 'react';
import DetailCard from './DetailCard';

const filterButtons = [
    { id: 'title', label: 'H 标题', color: 'bg-blue-500', types: ['title'] },
    { id: 'table', label: '表格', color: 'bg-green-500', types: ['table'] },
    { id: 'text', label: '段落', color: 'bg-orange-500', types: ['text'] },
    { id: 'image', label: '图片', color: 'bg-yellow-500', types: ['image'] },
    { id: 'stamp', label: '印章', color: 'bg-gray-500', types: ['stamp'] },
    { id: 'catalog', label: '目录', color: 'bg-purple-500', types: ['catalog'] },
    { id: 'equation', label: '公式', color: 'bg-teal-500', types: ['equation'] },
    { id: 'handwriting', label: '手写体', color: 'bg-pink-500', types: ['handwriting'] },
    { id: 'header_footer', label: '页眉页脚', color: 'bg-indigo-500', types: ['header_footer'] }
];

export default function DocumentDetails() {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeFilters, setActiveFilters] = useState(new Set(filterButtons.map(b => b.id)));
    
    useEffect(() => {
        fetch('/docs/素材2_content_list.json')
            .then(res => {
                if (!res.ok) throw new Error('加载 JSON 数据失败');
                return res.json();
            })
            .then(data => {
                const processedData = data.map((item, index) => ({
                    ...item,
                    id: `item-${index}`, // Ensure unique id for each item
                    // Re-assign type for 'text' with 'text_level'
                    type: item.type === 'text' && item.text_level === 1 ? 'title' : item.type
                }));
                setRawData(processedData);
            })
            .catch((e) => {
                setError(e.message || '加载失败');
                setRawData([]);
            })
            .finally(() => setLoading(false));
    }, []);
    
    const toggleFilter = (filterId) => {
        const newActiveFilters = new Set(activeFilters);
        if (newActiveFilters.has(filterId)) {
            newActiveFilters.delete(filterId);
        } else {
            newActiveFilters.add(filterId);
        }
        setActiveFilters(newActiveFilters);
    };

    const activeTypes = new Set(
        filterButtons.filter(b => activeFilters.has(b.id)).flatMap(b => b.types)
    );
    
    const filteredDetails = rawData.filter(item => activeTypes.has(item.type));
    
    if (loading) return <div className="p-4 text-center text-gray-500">加载中...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
    
    return (
        <div className="h-full bg-gray-50 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
                <h2 className="text-sm font-medium text-gray-900">详情展示</h2>
            </div>
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
                <div className="grid grid-cols-4 gap-2">
                    {filterButtons.map((button) => (
                        <button
                            key={button.id}
                            onClick={() => toggleFilter(button.id)}
                            className={`px-2 py-1.5 text-xs font-medium rounded text-white flex items-center justify-center transition-all ${
                                activeFilters.has(button.id)
                                    ? button.color
                                    : 'bg-gray-300 hover:bg-gray-400'
                            }`}
                        >
                            {button.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {filteredDetails.length > 0 ? (
                    filteredDetails.map((item) => (
                        <DetailCard 
                            key={item.id} 
                            item={item}
                            onCopy={() => navigator.clipboard.writeText(JSON.stringify(item, null, 2))}
                            onDelete={() => console.log('Delete item:', item.id)}
                        />
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        没有匹配筛选条件的条目。
                    </div>
                )}
            </div>
        </div>
    );
} 