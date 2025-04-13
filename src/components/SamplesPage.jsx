import {
  ArrowLeftIcon,
  BeakerIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../api';
import { websocketService } from '../services/websocket';

const PAGE_SIZE = 5;

// 更新训练动画组件
const TrainingAnimation = ({ isVisible }) => {
  const [status, setStatus] = useState('准备中...');
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!isVisible) return;
    
    // 监听优化状态更新
    const unsubscribe = websocketService.onTrainingStatus((data) => {
      console.log('Training animation received data:', data);
      
      if (data.type === 'optimization_status') {
        setStatus(data.message || getStatusText(data.status));
        setProgress(data.progress || 0);
      } else if (data.type === 'training_completed') {
        // 训练完成后会自动关闭动画，不需要在这里处理
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [isVisible]);
  
  // 根据状态获取显示文本
  const getStatusText = (status) => {
    switch (status) {
      case 'loading_data': return '正在准备训练数据...';
      case 'preparing_model': return '正在准备模型...';
      case 'optimizing': return '正在进行模型优化...';
      case 'saving_model': return '正在保存优化后的模型...';
      default: return '正在处理...';
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full text-center">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">正在训练样本</h3>
        <p className="text-sm text-gray-500 mb-4">
          {status}
        </p>
        
        {/* 进度条 */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-400">
          进度: {progress}%
        </p>
      </div>
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={classNames(
            "relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md",
            currentPage === 1 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-700 hover:bg-gray-50"
          )}
        >
          上一页
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={classNames(
            "relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md",
            currentPage === totalPages
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-700 hover:bg-gray-50"
          )}
        >
          下一页
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            第 <span className="font-medium">{currentPage}</span> 页，
            共 <span className="font-medium">{totalPages}</span> 页
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className={classNames(
                "relative inline-flex items-center rounded-l-md px-2 py-2",
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              )}
            >
              <span className="sr-only">第一页</span>
              <ChevronDoubleLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={classNames(
                "relative inline-flex items-center px-2 py-2",
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              )}
            >
              <span className="sr-only">上一页</span>
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={classNames(
                    "relative inline-flex items-center px-4 py-2 text-sm font-semibold",
                    currentPage === pageNum
                      ? "z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={classNames(
                "relative inline-flex items-center px-2 py-2",
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              )}
            >
              <span className="sr-only">下一页</span>
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={classNames(
                "relative inline-flex items-center rounded-r-md px-2 py-2",
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              )}
            >
              <span className="sr-only">最后一页</span>
              <ChevronDoubleRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

const SamplesList = ({ 
  samples, 
  onViewDetails, 
  onDelete, 
  onEdit, 
  versions, 
  selectedVersion, 
  onVersionChange, 
  pagination, 
  onPageChange,
  selectedSamples,
  onSelectSamples,
  onTrain,
  isTraining
}) => {
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    setSelectAll(samples.every(sample => selectedSamples.has(sample.id)));
  }, [samples, selectedSamples]);

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    const newSelected = new Set(selectedSamples);
    if (checked) {
      samples.forEach(sample => newSelected.add(sample.id));
    } else {
      samples.forEach(sample => newSelected.delete(sample.id));
    }
    onSelectSamples(newSelected);
  };

  const handleSelectSample = (id, checked) => {
    const newSelected = new Set(selectedSamples);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    onSelectSamples(newSelected);
    setSelectAll(samples.every(sample => newSelected.has(sample.id)));
  };

  return (
    <div className="mt-8 flow-root">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={selectedVersion || ''}
              onChange={(e) => onVersionChange(e.target.value || null)}
              className="rounded-md border-gray-300 py-1.5 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">选择版本</option>
              {versions.map(version => (
                <option key={version.version} value={version.version}>
                  {version.version}
                </option>
              ))}
            </select>
          </div>
          {selectedSamples.size > 0 && (
            <span className="text-sm text-gray-700">
              已选择 {selectedSamples.size} 个样本
            </span>
          )}
        </div>
        {selectedSamples.size > 0 && (
          <button
            onClick={onTrain}
            disabled={isTraining}
            className={classNames(
              "inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              isTraining ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
            )}
          >
            <BeakerIcon className="w-4 h-4 mr-2" />
            {isTraining ? '训练中...' : '训练选中样本'}
          </button>
        )}
      </div>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="relative py-3.5 pl-4 pr-3 sm:pl-6">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectAll}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    问题
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    版本号
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    模型
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    处理时间
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    消息时间
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {samples.map((sample, index) => (
                  <tr key={`${sample.id}-${index}`} className={index % 2 === 0 ? undefined : 'bg-gray-50'}>
                    <td className="relative py-4 pl-4 pr-3 sm:pl-6">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedSamples.has(sample.id)}
                        onChange={(e) => handleSelectSample(sample.id, e.target.checked)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {sample.question}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {sample.version || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {sample.model}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {sample.processingTime}ms
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {format(new Date(sample.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={async () => {
                            const response = await chatApi.getSampleDetails(sample.id);
                            if (response.success) {
                              onViewDetails(response.sample);
                            } else {
                              toast.error(response.error || '获取样本详情失败');
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => {
                            toast((t) => (
                              <div className="flex flex-col space-y-2">
                                <div className="text-sm font-medium">确定要删除这个样本吗？</div>
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => {
                                      onDelete(sample.id);
                                      toast.dismiss(t.id);
                                    }}
                                    className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                                  >
                                    删除
                                  </button>
                                  <button
                                    onClick={() => toast.dismiss(t.id)}
                                    className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            ), {
                              duration: Infinity,
                            });
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {pagination && (
          <Pagination
            currentPage={pagination.current_page}
            totalPages={pagination.total_pages}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </div>
  );
};

const MessageDisplay = ({ messages }) => {
  if (!messages || !Array.isArray(messages)) return null;

  return (
    <div className="space-y-2">
      {messages.map((msg, index) => (
        <div key={index} className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-700 mb-1">
            {msg.role}
          </div>
          <div className="text-sm whitespace-pre-wrap">
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  );
};

const DebugDetails = ({ debug, onClose }) => {
  if (!debug) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 text-left">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium text-gray-900">Debug 详情</h2>
            <span className="text-sm text-gray-500">版本: v{debug.version || 'N/A'}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">关闭</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900">问题</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              {debug.question}
            </div>
          </div>

          {debug.messages && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">消息历史</h3>
              <MessageDisplay messages={debug.messages} />
            </div>
          )}

          {debug.retrievmethod && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">召回方法</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(debug.retrievmethod, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900">提示词</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              {debug.prompt}
            </div>
          </div>

          {debug.reasoning && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">推理过程</h3>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                {debug.reasoning}
              </div>
            </div>
          )}

          {debug.answer && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">回答内容</h3>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                {debug.answer}
              </div>
            </div>
          )}

          {!debug.answer && debug.modelResponse && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">模型返回</h3>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                {debug.modelResponse}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">处理信息</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <div>处理时间: {debug.processingTime}ms</div>
                <div>模型: {debug.model}</div>
                <div>&nbsp;</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Token 统计</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <div>总计: {debug.tokens.total_tokens}</div>
                <div>Prompt: {debug.tokens.prompt_tokens}</div>
                <div>Completion: {debug.tokens.completion_tokens}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SamplesPage() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebug, setSelectedDebug] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSamples, setSelectedSamples] = useState(new Set());
  const [isTraining, setIsTraining] = useState(false);
  const [showTrainingAnimation, setShowTrainingAnimation] = useState(false);
  const [trainingVersion, setTrainingVersion] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const savedSelection = localStorage.getItem('selectedSamples');
      if (savedSelection) {
        setSelectedSamples(new Set(JSON.parse(savedSelection)));
      }
    } catch (error) {
      console.error('Error loading selected samples:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('selectedSamples', JSON.stringify(Array.from(selectedSamples)));
    } catch (error) {
      console.error('Error saving selected samples:', error);
    }
  }, [selectedSamples]);

  useEffect(() => {
    loadVersions();
  }, []);

  useEffect(() => {
    loadSamples();
  }, [selectedVersion, currentPage]);

  const loadVersions = async () => {
    try {
      const versions = await chatApi.getVersions();
      setVersions(versions);
    } catch (error) {
      console.error('Error loading versions:', error);
      toast.error('加载版本列表失败');
    }
  };

  const loadSamples = async () => {
    try {
      setLoading(true);
      const response = await chatApi.getSavedSamples(selectedVersion, currentPage, PAGE_SIZE);
      if (response.success) {
        setSamples(response.samples);
        setPagination(response.pagination);
      } else {
        toast.error(response.error || '加载样本失败');
      }
    } catch (error) {
      console.error('Error loading samples:', error);
      toast.error('加载样本失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await chatApi.deleteSample(id);
      if (response.success) {
        setSamples(samples.filter(sample => sample.id !== id));
        toast.success('删除成功');
      } else {
        toast.error(response.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting sample:', error);
      toast.error('删除失败');
    }
  };

  const handleEdit = (sample) => {
    setSelectedDebug(sample);
  };

  const handleVersionChange = (version) => {
    setSelectedVersion(version);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // 添加 WebSocket 训练状态监听
  useEffect(() => {
    const unsubscribe = websocketService.onTrainingStatus((data) => {
      console.log('SamplesPage received training status:', data);
      
      if (data.type === 'training_completed' || 
          (data.type === 'version_update' && data.data?.training_ids)) {
        setIsTraining(false);
        setShowTrainingAnimation(false);
        setTrainingVersion(null);
      }
    });
    
    // 确保 WebSocket 连接已建立
    websocketService.connect();
    
    return () => {
      unsubscribe();
    };
  }, []);

  const handleTrain = async () => {
    const selectedIds = Array.from(selectedSamples);
    if (selectedIds.length === 0) {
      toast.error('请至少选择一个样本');
      return;
    }

    try {
      const response = await chatApi.addTrainingSamples(selectedIds, selectedVersion);
      if (response.success) {
        // 任务创建成功后才显示训练动画
        setIsTraining(true);
        setShowTrainingAnimation(true);
        setTrainingVersion(selectedVersion);
        toast.success(response.message || '训练任务已创建，正在优化中...');
        
        // 清空选中的样本
        setSelectedSamples(new Set());
        localStorage.removeItem('selectedSamples');
      } else {
        toast.error(response.error || '添加训练样本失败');
      }
    } catch (error) {
      console.error('Error training samples:', error);
      toast.error('添加训练样本时发生错误');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 训练动画组件 */}
      <TrainingAnimation isVisible={showTrainingAnimation} version={trainingVersion} />
      
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-medium text-gray-900">样本管理</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">加载中...</div>
          </div>
        ) : samples.length === 0 ? (
          <div>
            <div className="mt-8 flow-root">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                    <select
                      value={selectedVersion || ''}
                      onChange={(e) => handleVersionChange(e.target.value || null)}
                      className="rounded-md border-gray-300 py-1.5 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">选择版本</option>
                      {versions.map(version => (
                        <option key={version.version} value={version.version}>
                          {version.version}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center py-12">
              <div className="text-gray-600">暂无样本数据</div>
            </div>
          </div>
        ) : (
          <SamplesList
            samples={samples}
            onViewDetails={setSelectedDebug}
            onDelete={handleDelete}
            onEdit={handleEdit}
            versions={versions}
            selectedVersion={selectedVersion}
            onVersionChange={handleVersionChange}
            pagination={pagination}
            onPageChange={handlePageChange}
            selectedSamples={selectedSamples}
            onSelectSamples={setSelectedSamples}
            onTrain={handleTrain}
            isTraining={isTraining}
          />
        )}
      </div>

      {selectedDebug && (
        <DebugDetails
          debug={selectedDebug}
          onClose={() => setSelectedDebug(null)}
        />
      )}
    </div>
  );
}