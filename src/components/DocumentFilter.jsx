import { MagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import DateRangePicker from './DateRangePicker';

function DocumentFilter({ filters, onFilterChange }) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleInputChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    onFilterChange(newFilters);
  };

  const handleDateRangeChange = (startDate, endDate) => {
    const newFilters = { ...filters, startDate, endDate };
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      filename: '',
      parseType: '全部',
      status: '全部',
      startDate: '',
      endDate: ''
    };
    onFilterChange(clearedFilters);
    setShowClearConfirm(false);
  };

  const confirmClearFilters = () => {
    setShowClearConfirm(true);
  };

  return (
    <>
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
          {/* 文件名搜索 - 占2列 */}
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文件名称
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="请输入文件名称"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.filename}
                onChange={(e) => handleInputChange('filename', e.target.value)}
              />
            </div>
          </div>

          {/* 解析类型 - 占1列 */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              解析类型：
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.parseType}
              onChange={(e) => handleInputChange('parseType', e.target.value)}
            >
              <option value="全部">全部</option>
              <option value="通用文档解析">通用文档解析</option>
              <option value="专业文档解析">专业文档解析</option>
              <option value="图像文档解析">图像文档解析</option>
            </select>
          </div>

          {/* 状态 - 占1列 */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              状态：
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              <option value="全部">全部</option>
              <option value="success">解析成功</option>
              <option value="error">解析失败</option>
              <option value="pending">解析中</option>
            </select>
          </div>

          {/* 创建时间 - 占2列 */}
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              创建时间：
            </label>
            <DateRangePicker
              startDate={filters.startDate}
              endDate={filters.endDate}
              onDateChange={handleDateRangeChange}
              placeholder="开始日期 至 结束日期"
            />
          </div>

          {/* 清除按钮 - 占1列 */}
          <div className="flex justify-end lg:col-span-1">
            <button
              onClick={confirmClearFilters}
              className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors group"
              title="清除筛选条件"
            >
              <TrashIcon className="h-5 w-5 text-gray-600 group-hover:text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* 清除确认对话框 */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                确认清除筛选条件
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                您确定要清除所有筛选条件吗？这将重置文件名称、解析类型、状态和创建时间等所有筛选条件。
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </button>
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  确认清除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DocumentFilter; 