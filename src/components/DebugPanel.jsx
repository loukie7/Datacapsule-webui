import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import {
  HandThumbUpIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  EllipsisVerticalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { chatApi } from '../api';
import toast from 'react-hot-toast';

// 创建一个全局的 savedMessages 管理函数
const getSavedMessages = () => {
  try {
    const saved = localStorage.getItem('savedDebugMessages');
    return new Set(JSON.parse(saved) || []);
  } catch (e) {
    console.warn('Error loading saved messages:', e);
    return new Set();
  }
};

const updateSavedMessages = (messageId) => {
  try {
    const savedMessages = getSavedMessages();
    savedMessages.add(messageId);
    localStorage.setItem('savedDebugMessages', JSON.stringify(Array.from(savedMessages)));
    return savedMessages;
  } catch (e) {
    console.warn('Error saving messages:', e);
    return getSavedMessages();
  }
};

const CollapsibleContent = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = content.split('\n');
  const shouldCollapse = lines.length > 5;
  const displayedContent =
    shouldCollapse && !isExpanded
      ? lines.slice(0, 5).join('\n') + '\n...'
      : content;

  return (
    <div className="relative">
      <div
        className={classNames(
          'bg-gray-50 rounded p-2',
          shouldCollapse && !isExpanded && 'max-h-[150px] overflow-hidden'
        )}
      >
        <ReactMarkdown>{displayedContent}</ReactMarkdown>
      </div>
      {shouldCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? (
            <>
              <ChevronUpIcon className="h-4 w-4 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDownIcon className="h-4 w-4 mr-1" />
              Show more
            </>
          )}
        </button>
      )}
    </div>
  );
};

const RetrievMethodDisplay = ({ methods }) => {
  try {
    const parsedMethods =
      typeof methods === 'string' ? JSON.parse(methods) : methods;

    if (!Array.isArray(parsedMethods)) {
      return <div className="bg-gray-50 rounded p-2">{String(methods)}</div>;
    }

    return (
      <div className="bg-gray-50 rounded p-2 space-y-2">
        {parsedMethods.map((methodData, index) => (
          <div
            key={index}
            className="border-b last:border-b-0 pb-2 last:pb-0"
          >
            <div className="font-medium text-gray-700">
              {methodData.method}
            </div>
            <div className="text-sm text-gray-600">
              {methodData.args && typeof methodData.args === 'object' && 
                Object.entries(methodData.args).map(([key, value]) => (
                  <div key={key} className="ml-4">
                    <span className="font-mono">{key}</span>:{' '}
                    <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                  </div>
                ))
              }
            </div>
          </div>
        ))}
      </div>
    );
  } catch (e) {
    console.error('Error rendering methods:', e);
    return <div className="bg-gray-50 rounded p-2">{String(methods)}</div>;
  }
};

const MessageDisplay = ({ messages }) => {
  if (!messages || !Array.isArray(messages)) return null;

  return (
    <div className="space-y-2">
      {messages.map((msg, index) => (
        <div key={index} className="bg-gray-50 rounded p-2">
          <div className="text-xs font-medium text-gray-700 mb-1">
            {msg.role}
          </div>
          <CollapsibleContent content={msg.content} />
        </div>
      ))}
    </div>
  );
};

const EditableField = ({ data, field, label, onEdit, isEvenMessage, onMessageSaved }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    if (field === 'retrievmethod') {
      setEditValue(JSON.stringify(data[field], null, 2));
    } else {
      setEditValue(data[field]);
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      let valueToSave = editValue;
      
      if (field === 'retrievmethod') {
        try {
          valueToSave = JSON.parse(editValue);
        } catch (e) {
          console.error('Invalid JSON format:', e);
          return;
        }
      }

      let response;
      const savedMessages = getSavedMessages();
      
      // 如果消息未保存过，进行全量保存
      if (!savedMessages.has(data.id)) {
        response = await chatApi.saveData(data);
        if (response.success) {
          updateSavedMessages(data.id);
          onMessageSaved?.(data.id);
        }
      }
      
      // 保存编辑的字段
      const updateFields = {
        [field]: valueToSave
      };
      
      response = await chatApi.saveEdit(data.id, updateFields);
      
      if (response.success) {
        onEdit(data.id, { ...data, [field]: valueToSave });
        setIsEditing(false);
        toast.success('保存成功');
      } else {
        toast.error(response.error || '保存失败');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('保存时发生错误');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  if (field === 'messages') {
    return (
      <div className="space-y-2">
        <h3 className="font-semibold">{label}:</h3>
        <MessageDisplay messages={data.messages} />
      </div>
    );
  }

  if (field === 'retrievmethod') {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">{label}:</h3>
          <button
            onClick={handleStartEdit}
            className="p-1 rounded-lg hover:bg-white/50"
            disabled={isSaving}
          >
            <PencilIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full h-32 p-2 border rounded font-mono text-sm"
              disabled={isSaving}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleSave}
                className="p-1 rounded-lg hover:bg-white/50"
                disabled={isSaving}
              >
                <CheckIcon className="h-4 w-4 text-green-600" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 rounded-lg hover:bg-white/50"
                disabled={isSaving}
              >
                <XMarkIcon className="h-4 w-4 text-red-600" />
              </button>
            </div>
          </div>
        ) : (
          <RetrievMethodDisplay methods={data[field]} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{label}:</h3>
        {!isEditing && (
          <button
            onClick={handleStartEdit}
            className="p-1 rounded-lg hover:bg-white/50"
            disabled={isSaving}
          >
            <PencilIcon className="h-4 w-4 text-gray-600" />
          </button>
        )}
        {isEditing && (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="p-1 rounded-lg hover:bg-white/50"
              disabled={isSaving}
            >
              <CheckIcon className="h-4 w-4 text-green-600" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 rounded-lg hover:bg-white/50"
              disabled={isSaving}
            >
              <XMarkIcon className="h-4 w-4 text-red-600" />
            </button>
          </div>
        )}
      </div>
      {isEditing ? (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full h-32 p-2 border rounded"
          disabled={isSaving}
        />
      ) : (
        <CollapsibleContent content={data[field]} />
      )}
    </div>
  );
};

const DebugMessage = ({ data, onEdit, onLike, isEvenMessage, onMessageSaved }) => {
  return (
    <div className={classNames(
      'p-3 rounded-lg text-sm text-left',
      isEvenMessage ? 'bg-blue-50/50' : 'bg-purple-50/50'
    )}>
      
      {data.retrievmethod && (
        <EditableField
          data={data}
          field="retrievmethod"
          label="召回方法"
          onEdit={onEdit}
          isEvenMessage={isEvenMessage}
          onMessageSaved={onMessageSaved}
        />
      )}
      {data.messages && (
        <EditableField
          data={data}
          field="messages"
          label="消息历史"
          onEdit={onEdit}
          isEvenMessage={isEvenMessage}
          onMessageSaved={onMessageSaved}
        />
      )}
      {data.prompt && (
        <EditableField
          data={data}
          field="prompt"
          label="提示词"
          onEdit={onEdit}
          isEvenMessage={isEvenMessage}
          onMessageSaved={onMessageSaved}
        />
      )}
      {data.reasoning && (
        <EditableField
          data={data}
          field="reasoning"
          label="推理过程"
          onEdit={onEdit}
          isEvenMessage={isEvenMessage}
          onMessageSaved={onMessageSaved}
        />
      )}
      {data.answer && (
        <EditableField
          data={data}
          field="answer"
          label="回答内容"
          onEdit={onEdit}
          isEvenMessage={isEvenMessage}
          onMessageSaved={onMessageSaved}
        />
      )}
      {/* 兼容旧版本的 modelResponse 字段 */}
      {!data.answer && data.modelResponse && (
        <EditableField
          data={data}
          field="modelResponse"
          label="模型返回"
          onEdit={onEdit}
          isEvenMessage={isEvenMessage}
          onMessageSaved={onMessageSaved}
        />
      )}

      <div className="flex justify-between text-xs text-gray-500 mt-3">
        <span>Processing Time: {data.processingTime}ms</span>
        <span>
          Tokens: {data.tokens.total_tokens} (Prompt: {data.tokens.prompt_tokens},
          Completion: {data.tokens.completion_tokens})
        </span>
      </div>
    </div>
  );
};

const DebugMessageGroup = ({ messages, isExpanded, onToggle, onLike, onEdit, isEvenGroup }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessagesState, setSavedMessagesState] = useState(getSavedMessages());

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

  if (!messages || messages.length === 0) return null;
  const latestMessage = messages[messages.length - 1];

  const handleSaveAll = async () => {
    if (!latestMessage?.id || savedMessagesState.has(latestMessage.id)) return;
    const toastId = toast.loading('保存中...');
    setIsSaving(true);
    try {
      const response = await chatApi.saveData(latestMessage);
      if (response.success) {
        const newSavedMessages = updateSavedMessages(latestMessage.id);
        setSavedMessagesState(newSavedMessages);
        toast.success('保存成功', { id: toastId });
      } else {
        toast.error(response.error || '保存失败', { id: toastId });
      }
    } catch (error) {
      console.error('Error saving debug message:', error);
      toast.error('保存时发生错误', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessageSaved = useCallback((messageId) => {
    setSavedMessagesState(prev => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
  }, []);

  return (
    <div className={classNames(
      'rounded-lg border border-gray-200/50',
      isEvenGroup ? 'bg-green-50/70' : 'bg-gray-50/70'
    )}>
      <div className="p-3 border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-white/50"
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-600" />
              )}
            </button>
            <span className="text-xs text-gray-500">
              {format(new Date(latestMessage.timestamp), 'yyyy-MM-dd HH:mm:ss')}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              className={classNames(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                'flex items-center space-x-1',
                savedMessagesState.has(latestMessage.id)
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700',
                isSaving && 'opacity-50 cursor-not-allowed'
              )}
              onClick={handleSaveAll}
              disabled={isSaving || savedMessagesState.has(latestMessage.id)}
            >
              {isSaving ? '保存中...' : savedMessagesState.has(latestMessage.id) ? '已保存' : '保存'}
            </button>
            <div className="relative" ref={menuRef}>
            </div>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-700 flex items-center space-x-2">
          <span className="font-medium">问题:</span>
          <span>{latestMessage.question}</span>
        </div>

        <div className="mt-1 text-xs text-gray-500 flex items-center justify-between">
          <span>Message ID: {latestMessage.id} </span>
          {latestMessage.model && (
            <span className="text-blue-600 font-medium">Model: {latestMessage.model}</span>
          )}
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-xs text-gray-500">优化器版本:  v{latestMessage.version || 'N/A'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {messages.map((data, index) => (
            <DebugMessage
              key={index}
              data={data}
              onEdit={onEdit}
              onLike={onLike}
              isEvenMessage={index % 2 === 0}
              onMessageSaved={handleMessageSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DebugPanel = ({ debugData, onLike, onEdit }) => {
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());
  const scrollRef = useRef(null);
  const prevDebugDataLength = useRef(debugData.length);

  const groupedMessages = debugData && debugData.length > 0 ? debugData.reduce((groups, message) => {
    if (!message || !message.id) return groups;
    if (!groups[message.id]) {
      groups[message.id] = [];
    }
    groups[message.id].push(message);
    return groups;
  }, {}) : {};

  const sortedGroupIds = Object.keys(groupedMessages).sort((a, b) => {
    const latestA = groupedMessages[a][groupedMessages[a].length - 1].timestamp;
    const latestB = groupedMessages[b][groupedMessages[b].length - 1].timestamp;
    return new Date(latestA) - new Date(latestB);
  });

  useEffect(() => {
    if (debugData.length > prevDebugDataLength.current) {
      const newExpandedIds = new Set();
      if (sortedGroupIds.length > 0) {
        newExpandedIds.add(sortedGroupIds[sortedGroupIds.length - 1]);
      }
      setExpandedGroupIds(newExpandedIds);
      
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    prevDebugDataLength.current = debugData.length;
  }, [debugData.length, sortedGroupIds]);

  const handleToggleGroup = (groupId) => {
    setExpandedGroupIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {sortedGroupIds.map((groupId, index) => (
          <DebugMessageGroup
            key={groupId}
            messages={groupedMessages[groupId]}
            isExpanded={expandedGroupIds.has(groupId)}
            onToggle={() => handleToggleGroup(groupId)}
            onLike={onLike}
            onEdit={onEdit}
            isEvenGroup={index % 2 === 0}
          />
        ))}
      </div>
    </div>
  );
};

export default DebugPanel;