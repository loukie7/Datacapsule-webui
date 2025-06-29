import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

function NewDocumentModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    file: null,
    filename: '',
    parseType: '通用文档解析'
  });
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (file) => {
    if (file) {
      setFormData({
        ...formData,
        file: file,
        filename: file.name
      });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.file && formData.filename && formData.parseType) {
      onSubmit({
        filename: formData.filename,
        parseType: formData.parseType,
        file: formData.file
      });
      // 重置表单
      setFormData({
        file: null,
        filename: '',
        parseType: '通用文档解析'
      });
      onClose();
    }
  };

  const resetForm = () => {
    setFormData({
      file: null,
      filename: '',
      parseType: '通用文档解析'
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">新建解析</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* 文件上传区域 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上传文件
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {formData.file ? (
                  <div className="space-y-2">
                    <CloudArrowUpIcon className="h-12 w-12 mx-auto text-green-500" />
                    <div className="text-sm font-medium text-gray-900">
                      {formData.filename}
                    </div>
                    <div className="text-xs text-gray-500">
                      文件已选择
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileChange(null)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      重新选择
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400" />
                    <div className="text-sm text-gray-600">
                      拖拽文件到此处或
                      <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                        点击上传
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(e.target.files[0])}
                        />
                      </label>
                    </div>
                    <div className="text-xs text-gray-500">
                      支持 PDF、Word、图片等格式
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 文件名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文件名称
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.filename}
                onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
                placeholder="请输入文件名称"
              />
            </div>

            {/* 解析类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                解析类型
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.parseType}
                onChange={(e) => setFormData({ ...formData, parseType: e.target.value })}
              >
                <option value="通用文档解析">通用文档解析</option>
                <option value="专业文档解析">专业文档解析</option>
                <option value="图像文档解析">图像文档解析</option>
              </select>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!formData.file || !formData.filename}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              开始解析
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewDocumentModal; 