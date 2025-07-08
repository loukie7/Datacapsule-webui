import { ChatBubbleLeftRightIcon, CodeBracketIcon, EllipsisVerticalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Route, Routes, useNavigate } from 'react-router-dom';
import SplitPane from 'split-pane-react';
import 'split-pane-react/esm/themes/default.css';
import { chatApi } from './api';
import './App.css';
import ChatPanel from './components/ChatPanel';
import DebugPanel from './components/DebugPanel';
import DocumentParsingPage from './components/DocumentParsingPage';
import DocumentViewPage from './components/DocumentViewPage';
import SamplesPage from './components/SamplesPage';
import { sseService } from './services/sse';

// 从 localStorage 加载消息
const loadMessagesFromStorage = () => {
  try {
    const savedMessages = localStorage.getItem('chatMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  } catch (e) {
    console.warn('Error loading messages from storage:', e);
    return [];
  }
};

// 从 localStorage 加载调试数据
const loadDebugDataFromStorage = () => {
  try {
    const savedDebugData = localStorage.getItem('debugData');
    return savedDebugData ? JSON.parse(savedDebugData) : [];
  } catch (e) {
    console.warn('Error loading debug data from storage:', e);
    return [];
  }
};

const VersionSwitcherModal = ({ isOpen, onClose, onVersionSelect }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const versions = await chatApi.getVersions();
      setVersions(versions);
      if (versions.length > 0) {
        setSelectedVersion(versions[0].version);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedVersion) {
      onVersionSelect(selectedVersion);
      toast.success("切换版本到v"+selectedVersion)
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">版本切换</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-4">
                <div className="text-gray-600">加载中...</div>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-gray-600">暂无可用版本</div>
              </div>
            ) : (
              <div className="space-y-4">
                {versions.map((version) => (
                  <div key={version.version} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={version.version}
                        type="radio"
                        name="version"
                        value={version.version}
                        checked={selectedVersion === version.version}
                        onChange={(e) => setSelectedVersion(e.target.value)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 text-left">
                      <label htmlFor={version.version} className="font-medium text-gray-700">
                        {version.version}
                      </label>
                      <p className="text-sm text-gray-500">{version.description}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(version.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!selectedVersion || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              切换版本
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BatchValidationModal = ({ isOpen, onClose, onSubmit }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const lines = input.split('\n').filter(line => line.trim());
    onSubmit(lines);
    setInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">批量验证</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="mb-4">
              <label htmlFor="batchInput" className="block text-sm font-medium text-gray-700 mb-2">
                请输入要验证的内容（每行一条）
              </label>
              <textarea
                id="batchInput"
                rows={10}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入要验证的内容，每行一条..."
              />
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              开始验证
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function App() {
  const [messages, setMessages] = useState(loadMessagesFromStorage);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [streamingStepType, setStreamingStepType] = useState('');
  const [debugData, setDebugData] = useState(loadDebugDataFromStorage);
  const [sizes, setSizes] = useState(['50%', '50%']);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isBatchValidationOpen, setIsBatchValidationOpen] = useState(false);
  const [isVersionSwitcherOpen, setIsVersionSwitcherOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(() => {
    return localStorage.getItem('currentVersion') || '1.0.0';
  });
  const menuRef = useRef(null);
  const graphWindowRef = useRef(null);
  const navigate = useNavigate();

  // 保存消息到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    } catch (e) {
      console.warn('Error saving messages to storage:', e);
    }
  }, [messages]);

  // 保存调试数据到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('debugData', JSON.stringify(debugData));
    } catch (e) {
      console.warn('Error saving debug data to storage:', e);
    }
  }, [debugData]);

  // 保存当前版本到 localStorage
  useEffect(() => {
    localStorage.setItem('currentVersion', currentVersion);
  }, [currentVersion]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = sseService.onMessage((debugMessage) => {
      // 只处理非聊天相关的调试消息（版本更新、训练状态等）
      setDebugData(prev => [...prev, debugMessage]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSendMessage = useCallback(async (message) => {
    // 添加用户消息，包含retryContent字段
    setMessages(prev => [...prev, { 
      type: 'user', 
      content: message,
      retryContent: message  // 添加重试内容字段
    }]);
    
    // 清空之前的推理过程，准备新的对话
    setStreamingMessage('');
    setStreamingReasoning('');
    setStreamingStepType('');
    
    // SSE连接用于状态推送（版本更新等），聊天流式数据直接通过API处理
    sseService.connectForReason('聊天对话');

    try {
      // 直接发送流式聊天请求并处理SSE响应
      for await (const response of chatApi.sendMessage(message, currentVersion)) {
        console.log('收到流式响应:', response); // 添加调试日志
        
        if (response.type === 'stream') {
          // 使用 flushSync 强制立即更新状态，确保实时显示
          flushSync(() => {
            setStreamingMessage(response.content || '');
            setStreamingReasoning(response.reasoning || '');
            setStreamingStepType(response.stepType || '');
          });
        } else if (response.type === 'complete') {
          // 清空流式消息
          setStreamingMessage('');
          
          // 添加最终消息
          setMessages(prev => [
            ...prev,
            { 
              type: 'assistant', 
              content: response.content,
              retryContent: message
            }
          ]);
          
          // 处理debug数据并添加到调试面板
          if (response.debug) {
            console.log('接收到完整debug数据:', response.debug);
            setDebugData(prev => [...prev, response.debug]);
          }
        } else if (response.type === 'error') {
          // 清空流式消息
          setStreamingMessage('');
          
          // 添加错误消息
          setMessages(prev => [
            ...prev,
            { 
              type: 'assistant', 
              content: response.content,
              error: true,
              retryContent: message
            }
          ]);
        }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      // 清空流式消息
      setStreamingMessage('');
      setMessages(prev => [
        ...prev,
        { 
          type: 'assistant', 
          content: `Error: ${error.message}`,
          error: true,
          retryContent: message
        }
      ]);
    }
  }, [currentVersion]);

  const handleBatchValidation = async (lines) => {
    for (const line of lines) {
      await handleSendMessage(line);
    }
  };

  const handleEditDebug = async (id, updates) => {
    const response = await chatApi.saveEdit(id, updates);
    if (response.success && response.data) {
      setDebugData(prev => 
        prev.map(item => item.id === id ? response.data : item)
      );
    }
    return response;
  };

  const handleVersionSelect = (version) => {
    setCurrentVersion(version);
    console.log('Version switched to:', version);
    // 版本切换时建立SSE连接以接收版本更新事件
    sseService.connectForReason('版本切换');
  };

  // 清除所有数据
  const handleClearData = useCallback(() => {
    toast((t) => (
      <div className="flex flex-col space-y-2">
        <div className="text-sm font-medium">确定要清除所有聊天记录和调试数据吗？</div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => {
              setMessages([]);
              setDebugData([]);
              localStorage.removeItem('chatMessages');
              localStorage.removeItem('debugData');
              toast.success('数据已清除');
              toast.dismiss(t.id);
            }}
            className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
          >
            清除
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
  }, []);

  // 处理打开graph.html页面，使用缓存机制
  const handleOpenGraph = () => {
    if (graphWindowRef.current && !graphWindowRef.current.closed) {
      // 窗口已存在且未关闭，切换到该窗口
      graphWindowRef.current.focus();
    } else {
      // 窗口不存在或已关闭，创建新窗口
      graphWindowRef.current = window.open('/graph.html', '_blank');
    }
  };

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 5500,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <div className="fixed inset-0 flex flex-col">
        <Routes>
          <Route path="/" element={
            <>
              <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
                  <h1 className="text-sm font-medium text-gray-800">AI Chat Assistant</h1>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleOpenGraph}
                    className="px-5 py-2 bg-blue-300 hover:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center shadow-md hover:shadow-lg border-2 border-blue-500"
                  >
                    Link
                  </button>
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="p-1.5 rounded-lg hover:bg-gray-100"
                    >
                      <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              navigate('/samples');
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            查看所有样本
                          </button>
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              navigate('/document-parsing');
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            文档解析
                          </button>
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              setIsBatchValidationOpen(true);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            批量验证
                          </button>
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              setIsVersionSwitcherOpen(true);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                          >
                            <CodeBracketIcon className="h-4 w-4 mr-2" />
                            版本切换
                          </button>
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              handleClearData();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            清除所有数据
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex">
                <SplitPane
                  split="vertical"
                  sizes={sizes}
                  onChange={setSizes}
                >
                  <ChatPanel
                    messages={messages}
                    streamingMessage={streamingMessage}
                    streamingReasoning={streamingReasoning}
                    streamingStepType={streamingStepType}
                    onSendMessage={handleSendMessage}
                  />
                  <DebugPanel 
                    debugData={debugData}
                    onLike={(id) => chatApi.saveFeedback(id, true)}
                    onEdit={handleEditDebug}
                  />
                </SplitPane>
              </div>

              <BatchValidationModal
                isOpen={isBatchValidationOpen}
                onClose={() => setIsBatchValidationOpen(false)}
                onSubmit={handleBatchValidation}
              />

              <VersionSwitcherModal
                isOpen={isVersionSwitcherOpen}
                onClose={() => setIsVersionSwitcherOpen(false)}
                onVersionSelect={handleVersionSelect}
              />
            </>
          } />
          <Route path="/samples" element={<SamplesPage />} />
          <Route path="/document-parsing" element={<DocumentParsingPage />} />
          <Route path="/document-view/:id" element={<DocumentViewPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;