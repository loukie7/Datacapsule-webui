import { ArrowPathIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

const Message = memo(({ content, type, reasoning, error, onRetry, originalContent }) => {
  const handleCopy = useCallback(async () => {
    try {
      const textToCopy = reasoning ? `${reasoning}\n\n${content}` : content;
      await navigator.clipboard.writeText(textToCopy);
      toast.success('已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      toast.error('复制失败');
    }
  }, [content, reasoning]);

  const handleRetry = useCallback(() => {
    if (onRetry && (originalContent || content)) {
      onRetry(originalContent || content);
    }
  }, [onRetry, originalContent, content]);

  return (
    <div className={`flex flex-col ${type === 'user' ? 'items-end' : 'items-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg p-3 ${
          type === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-800 shadow-sm border border-gray-100'
        }`}
      >
        {/* 移除推理内容显示，只在StreamingMessage中显示 */}
        <div className="text-sm leading-relaxed text-left">
          {error ? (
            <span className="text-red-500">{content}</span>
          ) : (
            <ReactMarkdown>{content}</ReactMarkdown>
          )}
        </div>
      </div>
      
      {/* 按钮区域 - 消息框外左下角 */}
      <div className="flex items-center gap-2 mt-1 ml-1">
        <button
          onClick={handleRetry}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title={type === 'user' ? '重新发送' : '重新生成'}
        >
          <ArrowPathIcon className="w-3 h-3" />
          {type === 'user' ? '重发' : '重试'}
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
          title="复制内容"
        >
          <ClipboardDocumentIcon className="w-3 h-3" />
          复制
        </button>
      </div>
    </div>
  );
});

const StreamingMessage = memo(({ content, reasoning, stepType }) => {
  // 将推理文本按步骤分割（后端已经格式化好了）
  const reasoningSteps = reasoning ? reasoning.split('\n\n').filter(step => step.trim()) : [];

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] rounded-lg p-3 bg-white text-gray-800 shadow-sm border border-gray-100">
        {/* 显示推理过程 */}
        {reasoning && (
          <div className="mb-2 text-xs text-left opacity-80">
            <div className="font-medium text-blue-600 mb-2">
              {stepType === 'thinking' && '🤔 思考中...'}
              {stepType === 'tool_call' && '🔧 调用工具'}
              {stepType === 'observation' && '👀 观察结果'}
              {stepType === 'final_answer' && '✅ 最终答案'}
              {!stepType && '推理过程'}
            </div>
            {/* 按步骤显示推理内容 */}
            <div className="space-y-2">
              {reasoningSteps.map((step, index) => (
                <div key={index} className="bg-gray-50 rounded p-2 border-l-2 border-blue-200">
                  <div className="text-gray-700 whitespace-pre-wrap">{step}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* 显示答案内容 - 只在最终答案阶段显示流式输出 */}
        {content && stepType === 'final_answer' && (
          <div className="text-sm leading-relaxed text-left">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
        {/* 流式指示器 - 只在推理阶段显示 */}
        {reasoning && stepType !== 'final_answer' && (
          <div className="flex items-center mt-2 text-xs text-gray-400">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="ml-1">
              {stepType === 'thinking' && '推理中...'}
              {stepType === 'tool_call' && '调用工具中...'}
              {stepType === 'observation' && '分析结果中...'}
              {!stepType && '处理中...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

StreamingMessage.displayName = 'StreamingMessage';

const ThinkingIndicator = memo(() => {
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] rounded-lg p-3 bg-white text-gray-800 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <span className="text-gray-400 ml-2 text-xs">思考中...</span>
        </div>
      </div>
    </div>
  );
});

const MessageList = memo(({ messages, streamingMessage, streamingReasoning, streamingStepType, onRetry }) => {
  const renderKey = useCallback((msg, index) => {
    return `${msg.type}-${index}-${msg.content.substring(0, 20)}`;
  }, []);

  // 按时间顺序渲染消息，保持正确的对话顺序
  const renderMessages = () => {
    const result = [];
    
    // 遍历消息，按对话对渲染
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // 渲染消息
      result.push(
        <Message
          key={`msg-${i}-${msg.type}`}
          type={msg.type}
          content={msg.content}
          error={msg.error}
          onRetry={onRetry}
          originalContent={msg.retryContent || msg.content}
        />
      );
      
      // 如果是最后一条用户消息，且没有对应的助手消息，则显示思考过程
      if (msg.type === 'user' && i === messages.length - 1 && !messages[i + 1]) {
        // 思考指示器 - 当没有流式内容时显示
        if (!streamingMessage && !streamingReasoning) {
          result.push(
            <ThinkingIndicator key={`thinking-${i}`} />
          );
        }
        
        // 思考过程 - 流式推理内容
        if (streamingMessage || streamingReasoning) {
          result.push(
            <StreamingMessage 
              key={`streaming-${i}`}
              content={streamingMessage}
              reasoning={streamingReasoning}
              stepType={streamingStepType}
            />
          );
        }
      }
    }
    
    return result;
  };

  return (
    <>
      {renderMessages()}
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.streamingMessage === nextProps.streamingMessage &&
    prevProps.streamingReasoning === nextProps.streamingReasoning &&
    prevProps.streamingStepType === nextProps.streamingStepType
  );
});

export default function ChatPanel({ onSendMessage, messages, streamingMessage, streamingReasoning, streamingStepType }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const scrollTimeoutRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesEndRef.current) {
        const messageList = messageListRef.current;
        const isNearBottom = messageList && 
          messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 100;
        
        messagesEndRef.current.scrollIntoView({
          behavior: isNearBottom ? 'smooth' : 'auto',
          block: 'end',
        });
      }
    }, 50);
  }, []);

  useEffect(() => {
    const hasNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (hasNewMessage || streamingMessage) {
      scrollToBottom();
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages.length, streamingMessage, scrollToBottom]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  }, [input, onSendMessage]);

  const handleRetry = useCallback((retryContent) => {
    if (retryContent) {
      onSendMessage(retryContent);
    }
  }, [onSendMessage]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div 
        ref={messageListRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <MessageList 
          messages={messages}
          streamingMessage={streamingMessage}
          streamingReasoning={streamingReasoning}
          streamingStepType={streamingStepType}
          onRetry={handleRetry}
        />
        <div ref={messagesEndRef} className="h-0" />
      </div>
      <div className="p-3 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 text-sm border rounded-lg px-3 py-2 bg-gray-50 text-gray-800 border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入消息..."
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            发送
          </button>
        </form>
      </div>
    </div>
  );
}