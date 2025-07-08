import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ChevronDownIcon, ChevronRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

function DocumentSidebar({ sections, onSectionClick, isCollapsed, onToggleCollapse }) {
  const [expandedSections, setExpandedSections] = useState(new Set(['section2']));
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleSectionClick = (sectionId, event) => {
    event.stopPropagation();
    onSectionClick(sectionId);
  };

  const renderSection = (section, level = 0) => {
    const hasSubsections = section.subsections && section.subsections.length > 0;
    const isExpanded = expandedSections.has(section.id);
    const indentClass = level > 0 ? `ml-${level * 4}` : '';

    // 搜索过滤
    if (searchTerm && !section.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      // 检查子章节是否匹配
      if (!hasSubsections || !section.subsections.some(sub => 
        sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.subsections && sub.subsections.some(subsub =>
          subsub.title.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      )) {
        return null;
      }
    }

    return (
      <div key={section.id} className={`${indentClass}`}>
        <div
          className="flex items-center py-2 px-3 hover:bg-gray-100 cursor-pointer group transition-colors"
          onClick={() => hasSubsections ? toggleSection(section.id) : handleSectionClick(section.id, event)}
        >
          {hasSubsections ? (
            isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
            )
          ) : (
            <div className="w-4 h-4 mr-2 flex-shrink-0" />
          )}
          
          <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
          
          <span 
            className="text-sm text-gray-700 group-hover:text-gray-900 truncate"
            title={section.title}
          >
            {section.title}
          </span>
        </div>

        {hasSubsections && isExpanded && (
          <div className="ml-4">
            {section.subsections.map(subsection => renderSection(subsection, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredSections = sections.filter(section => {
    if (!searchTerm) return true;
    
    const matchesTitle = section.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubsections = section.subsections && section.subsections.some(sub =>
      sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.subsections && sub.subsections.some(subsub =>
        subsub.title.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
    
    return matchesTitle || matchesSubsections;
  });

  return (
    <div className="h-full bg-white flex flex-col overflow-hidden">
      {/* 顶部标题 */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        {!isCollapsed && <h2 className="text-sm font-medium text-gray-900 truncate">目录</h2>}
        <button onClick={onToggleCollapse} className="text-gray-500 hover:text-gray-900 ml-auto">
          {isCollapsed ? (
            <ChevronDoubleRightIcon className="h-5 w-5" />
          ) : (
            <ChevronDoubleLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* 搜索框 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="请输入关键词搜索"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 目录树 */}
          <div className="flex-1 overflow-y-auto">
            {filteredSections.length > 0 ? (
              <div className="py-2">
                {filteredSections.map(section => renderSection(section))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm ? '未找到匹配的章节' : '暂无目录'}
              </div>
            )}
          </div>

          {/* 底部信息 */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              共 {sections.reduce((count, section) => {
                const subsectionCount = section.subsections ? 
                  section.subsections.reduce((subCount, sub) => {
                    return subCount + 1 + (sub.subsections ? sub.subsections.length : 0);
                  }, 0) : 0;
                return count + 1 + subsectionCount;
              }, 0)} 个章节
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DocumentSidebar; 