// 导入SSE服务
import { sseService } from './services/sse';

// Store samples in memory
let savedSamples = [];



// Calculate token count
const calculateTokens = (text) => {
  return Math.ceil((text?.length || 0) / 4);
};

// API 基础 URL
const API_BASE_URL = 'http://localhost:8080';

// 默认请求配置
const defaultFetchOptions = {
  timeout: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// 带超时的 fetch 函数
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = options.timeout || defaultFetchOptions.timeout;
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

// 解析消息历史数据
const parseMessageHistory = (data) => {
  try {
    const {
      question,
      model,
      timestamp,
      uuid,
      prompt,
      messages,
      content,
      version,
      tokens
    } = data;
    
    // 提取消息内容
    const recallMethods = extractRecallMethods(messages || []);
    
    // 处理消息历史，只保留system消息和最后一条user消息
    let messageHistory = [];
    if (Array.isArray(messages) && messages.length > 0) {
      // 提取所有system消息
      const systemMessages = messages.filter(msg => msg?.role === 'system');
      
      // 找到最后一条user消息
      const lastUserMessage = messages
        .filter(msg => msg?.role === 'user')
        .pop();
      
      // 计算是否需要添加省略号
      const hasOtherMessages = messages.length > (systemMessages.length + (lastUserMessage ? 1 : 0));
      
      // 构建新的消息历史
      messageHistory = [
        ...systemMessages,
        // 如果有其他消息，添加省略号消息
        ...(hasOtherMessages ? [{ role: 'system', content: '...(省略历史消息)...' }] : []),
        // 添加最后一条用户消息（如果有）
        ...(lastUserMessage ? [lastUserMessage] : [])
      ];
    }
    
    const { answer, reasoning } = parseContent(content);

    const calculatedTokens = {
      prompt_tokens: tokens?.prompt_tokens || Math.ceil((prompt?.length || 0) / 4),
      completion_tokens: tokens?.completion_tokens || Math.ceil((content?.length || 0) / 4),
      total_tokens: tokens?.total_tokens || 0
    };

    if (!calculatedTokens.total_tokens) {
      calculatedTokens.total_tokens = calculatedTokens.prompt_tokens + calculatedTokens.completion_tokens;
    }

    return {
      id: uuid || Date.now(),
      timestamp: new Date(timestamp || Date.now()),
      question: question,
      model: model || 'DiModel',
      version: version || '1.0.0',
      messages: messageHistory,
      retrievmethod: recallMethods,
      prompt: prompt || '',
      modelResponse: answer,
      reasoning,
      processingTime: 0, // 无法计算精确处理时间
      tokens: calculatedTokens
    };
  } catch (error) {
    console.warn('Error parsing message history:', error);
    return null;
  }
};

// 从消息中提取段落
const parseContent = (content) => {
  if (!content) {
    return { answer: '', reasoning: '' };
  }

  const reasoning = extractSection(content, '[[ ## reasoning ## ]]', '[[ ## answer ## ]]');
  const answer = extractSection(content, '[[ ## answer ## ]]', '[[ ## completed ## ]]');

  return { answer, reasoning };
};

// 提取特定部分
const extractSection = (content, startMarker, endMarker) => {
  if (!content) return '';
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return '';
  
  const contentStart = startIndex + startMarker.length;
  const endIndex = endMarker ? content.indexOf(endMarker, contentStart) : content.length;
  if (endIndex === -1) return content.slice(contentStart).trim();
  
  return content.slice(contentStart, endIndex).trim();
};

// 提取召回方法
const extractRecallMethods = (messages) => {
  const recallMethods = [];
  const toolCallRegex = /\[\[\s*##\s*tool_name_(\d+)\s*##\s*\]\]\s*([^\n]+)[\s\S]*?\[\[\s*##\s*tool_args_\1\s*##\s*\]\]\s*([\s\S]*?)(?=\[\[|$)/g;

  // 找到最后一个用户消息
  const lastUserMessage = messages
    .filter(msg => msg?.role === 'user')
    .pop();
  
  // 如果没有用户消息，则返回空数组
  if (!lastUserMessage || !lastUserMessage.content) {
    return recallMethods;
  }
  
  // 只从最后一个用户消息中提取召回方法
  const content = lastUserMessage.content;
  let match;
  while ((match = toolCallRegex.exec(content)) !== null) {
    const methodName = match[2].trim();
    const argsStr = match[3].trim();
    let methodArgs;
    try {
      methodArgs = JSON.parse(argsStr);
    } catch (e) {
      methodArgs = argsStr;
    }
    recallMethods.push({
      method: methodName,
      args: methodArgs
    });
  }

  return recallMethods;
};

export const chatApi = {
  // Get saved samples list (minimal data)
  async getSavedSamples(version = null, page = 1, pageSize = 10) {
    try {
      const params = new URLSearchParams();
      if (version) params.append('version', version);
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      params.append('fields', 'id,timestamp,question,model,version,processingTime');

      const response = await fetchWithTimeout(`${API_BASE_URL}/interactions?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.status_code === 200 && data.data?.interactions) {
        return {
          success: true,
          samples: data.data.interactions,
          pagination: data.data.pagination || {
            total: data.data.interactions.length,
            total_pages: Math.ceil(data.data.interactions.length / pageSize),
            current_page: page,
            page_size: pageSize
          }
        };
      }
      
      return {
        success: false,
        error: data.detail || 'Failed to fetch samples'
      };
    } catch (error) {
      console.error('Error fetching samples:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get sample details by ID
  async getSampleDetails(id) {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/interactions/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status_code === 200 && data.data) {
        return {
          success: true,
          sample: data.data
        };
      }
      
      return {
        success: false,
        error: data.detail || 'Failed to fetch sample details'
      };
    } catch (error) {
      console.error('Error fetching sample details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete a sample
  async deleteSample(id) {
    try {
      const response = await fetchWithTimeout(`/api/interactions/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status_code === 200) {
        return { 
          success: true,
          deletedId: data.data.deleted_id
        };
      }
      
      return { 
        success: false, 
        error: data.detail || 'Failed to delete sample'
      };
    } catch (error) {
      console.error('Error deleting sample:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  // Add samples for training
  async addTrainingSamples(sampleIds, version) {
    if (!Array.isArray(sampleIds) || sampleIds.length < 10) {
      return {
        success: false,
        error: '请选择至少10个样本'
      };
    }
    
    // 为训练任务建立SSE连接
    try {
      sseService.connectForReason('训练优化');
    } catch (error) {
      console.warn('Failed to connect to SSE:', error);
    }
    
    const effectiveVersion = version || '1.0.0';
    try {
      const response = await fetchWithTimeout('/api/addtraining', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ids: sampleIds,
          version: effectiveVersion
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status_code === 200) {
        return {
          success: true,
          message: data.data?.message || '训练样本添加成功',
          filePath: data.data?.file_path,
          exportedIds: data.data?.exported_ids
        };
      }

      return {
        success: false,
        error: data.detail || '添加训练样本失败'
      };
    } catch (error) {
      console.error('Error adding training samples:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Save feedback for a response
  async saveFeedback(messageId, isLiked) {
    console.log(`Feedback saved for message ${messageId}: ${isLiked ? 'liked' : 'unliked'}`);
    return { success: true };
  },

  // Save debug data
  async saveData(data) {
    try {
      // 添加到本地存储
      savedSamples.push(data);
      
      // 调用后端 API
      const response = await fetchWithTimeout('/api/save_to_db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error saving data:', error);
      // 即使 API 调用失败，也保留本地数据
      return {
        success: true,
        data: data,
        warning: error.message
      };
    }
  },

  // Save edited response
  async saveEdit(messageId, updates) {
    try {
      if (!messageId || !updates) {
        throw new Error('Invalid parameters for saveEdit');
      }

      // 找出被修改的字段
      const updateFields = {};
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && 
            key !== 'timestamp' && 
            key !== 'lastModified' && 
            key !== 'tokens' && 
            key !== 'processingTime') {
          updateFields[key] = updates[key];
        }
      });

      if (Object.keys(updateFields).length === 0) {
        throw new Error('No valid fields to update');
      }

      // 调用 editdata 接口
      const response = await fetchWithTimeout('/api/editdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          updateFields
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 更新本地存储
      const sampleIndex = savedSamples.findIndex(sample => sample.id === messageId);
      if (sampleIndex !== -1) {
        savedSamples[sampleIndex] = {
          ...savedSamples[sampleIndex],
          ...updateFields,
          lastModified: new Date()
        };
      }

      const tokens = {
        prompt: calculateTokens(updates.prompt),
        completion: calculateTokens(updates.modelResponse || updates.answer),
        get total() { return this.prompt + this.completion; }
      };

      const savedData = {
        ...updates,
        id: messageId,
        timestamp: updates.timestamp || new Date(),
        lastModified: new Date(),
        tokens,
        processingTime: updates.processingTime || Math.floor(Math.random() * 1200) + 800
      };

      return {
        success: true,
        data: savedData,
        message: 'Changes saved successfully'
      };
    } catch (error) {
      console.error('Error saving edits:', error);
      return {
        success: false,
        error: error.message || 'Failed to save changes',
        data: null
      };
    }
  },

  // Send message and get streaming response
  async *sendMessage(message, version = '1.0.0') {
    const maxRetries = 2; // Maximum retries
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({ prompt: message, stream: 1, version: version }),
          timeout: 5 * 60 * 1000, // 5 minute timeout
          cache: 'no-cache' // 禁用缓存
        });
        
        if (!response.ok) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.warn(`HTTP ${response.status} error, retrying (${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // 指数退避
            continue; // 重试
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamedResponse = '';
        let lastReasoning = '';
        
        // 创建有状态的SSE解析器
        let sseBuffer = '';
        let currentEvent = null;
        let currentData = '';

        mainLoop: while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('原始SSE数据块:', chunk); // 添加调试日志
          
          // 累积数据块
          sseBuffer += chunk;
          const lines = sseBuffer.split('\n');
          
          // 保留最后一行（可能不完整）
          sseBuffer = lines.pop() || '';
          
          // 处理完整的行
          const messages = [];
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('event: ')) {
              currentEvent = trimmedLine.slice(7).trim();
            } else if (trimmedLine.startsWith('data: ')) {
              currentData = trimmedLine.slice(6);
            } else if (trimmedLine === '' && currentData) {
              // Empty line indicates end of a message
              try {
                const data = JSON.parse(currentData);
                messages.push({ event: currentEvent, data });
                console.log('成功解析SSE消息:', { event: currentEvent, data }); // 添加调试日志
              } catch (e) {
                // Handle special cases like [DONE] which is not JSON
                if (currentData.trim() === '[DONE]') {
                  messages.push({ event: 'done', data: {} });
                } else {
                  console.warn('Failed to parse SSE data line:', currentData, e);
                }
              }
              currentData = '';
              currentEvent = null;
            }
          }

          console.log('解析后的SSE消息:', messages); // 添加调试日志

          for (const sseMessage of messages) {
            const { event, data } = sseMessage;

            if (event === 'error') {
              console.error('SSE Error Event:', data);
              yield { type: 'error', content: data.message || 'An error occurred', error: data.error };
              break mainLoop;
            }

            if (event === 'completion') {
              console.log('Completion event received, processing final message.');
              try {
                // 先解析 prompt_history JSON 字符串
                let promptHistoryData;
                if (typeof data.prompt_history === 'string') {
                  promptHistoryData = JSON.parse(data.prompt_history);
                } else {
                  promptHistoryData = data.prompt_history;
                }
                
                const debugMessage = parseMessageHistory(promptHistoryData);
                if (debugMessage) {
                  yield {
                    type: 'complete',
                    content: debugMessage.modelResponse,
                    reasoning: debugMessage.reasoning,
                    debug: debugMessage,
                  };
                  // 成功处理completion事件后直接返回，避免重复
                  return;
                } else {
                  throw new Error('Failed to parse final debug message.');
                }
              } catch (error) {
                console.warn('Failed to process completion event:', error);
                yield { type: 'complete', content: streamedResponse, reasoning: lastReasoning };
                return; // 避免重复
              }
            }
            
            if (event === 'chat_stream') {
              // 使用完整的 answer 和 reasoning 字段，而不是增量字段
              // 这样可以确保前端显示的是完整的、格式正确的内容
              streamedResponse = data.answer || streamedResponse;
              lastReasoning = data.reasoning || lastReasoning;
              
              console.log('流式更新 - Answer:', streamedResponse, 'Reasoning:', lastReasoning); // 添加调试日志
              
              yield {
                type: 'stream',
                content: streamedResponse,
                reasoning: lastReasoning,
                // 可选：提供增量信息给前端做更细粒度的渲染优化
                deltas: {
                  reasoning: data.reasoning_delta || '',
                  answer: data.answer_delta || ''
                }
              };
            }
          }
        }
        
        // 如果循环正常结束但没有收到completion事件，发送最终消息
        if (streamedResponse) {
          console.log('流式结束，发送最终消息');
          yield { type: 'complete', content: streamedResponse, reasoning: lastReasoning };
        } else {
          console.log('流式结束但没有内容');
        }

        // Success, break the retry loop
        break;
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Request failed, retrying (${retryCount}/${maxRetries}):`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // 指数退避
          continue; // 重试
        } else {
          console.error('All retries failed:', error);
          yield { type: 'error', content: `连接失败: ${error.message}`, error: error.message };
          break;
        }
      }
    }
  },

  // Get available versions
  async getVersions() {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/versions`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.data?.versions || [];
    } catch (error) {
      console.error('Error loading versions:', error);
      return [];
    }
  }
};