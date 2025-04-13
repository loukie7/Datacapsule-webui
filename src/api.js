// WebSocket连接状态常量
const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

// 导入WebSocket服务
import { websocketService } from './services/websocket';

// Store samples in memory
let savedSamples = [];

// Parse SSE data
const parseSSEData = (chunk) => {
  try {
    // 特殊处理[DONE]消息
    if (chunk === 'data: [DONE]') {
      return { done: true };
    }
    
    const lines = chunk.split('\n');
    const parsedMessages = [];
    let currentData = '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        if (currentData) {
          try {
            // 尝试解析为JSON
            const parsed = JSON.parse(currentData);
            
            // 如果包含prompt_history字段，尝试直接解析它
            if (parsed.prompt_history) {
              try {
                parsed.prompt_history = JSON.parse(parsed.prompt_history);
              } catch (e) {
                console.warn('Failed to parse prompt_history:', e);
                // 保持原样如果解析失败
              }
            }
            
            parsedMessages.push(parsed);
          } catch (e) {
            console.warn('Failed to parse message:', currentData, e);
          }
          currentData = '';
        }
        currentData = line.slice(6);
      } else if (line.trim() && currentData) {
        currentData += line;
      }
    }

    if (currentData) {
      try {
        // 尝试解析最后的buffer
        const parsed = JSON.parse(currentData);
        
        // 如果包含prompt_history字段，尝试直接解析它
        if (parsed.prompt_history) {
          try {
            parsed.prompt_history = JSON.parse(parsed.prompt_history);
          } catch (e) {
            console.warn('Failed to parse prompt_history from last buffer:', e);
            // 保持原样如果解析失败
          }
        }
        
        parsedMessages.push(parsed);
      } catch (e) {
        console.warn('Failed to parse final message:', currentData, e);
      }
    }

    return parsedMessages[0] || null;
  } catch (e) {
    console.error('Error parsing SSE data:', e, chunk);
    return null;
  }
};

// Calculate token count
const calculateTokens = (text) => {
  return Math.ceil((text?.length || 0) / 4);
};

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

// 解析WebSocket消息
const parseWebSocketMessage = (data) => {
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
    console.warn('Error parsing WebSocket message:', error);
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

      const response = await fetchWithTimeout(`/api/interactions?${params.toString()}`);
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
      const response = await fetchWithTimeout(`/api/interactions/${id}`);
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
    
    // 检查WebSocket是否连接，如果未连接则发起连接
    try {
      if (!websocketService.ws || websocketService.ws.readyState !== WS_OPEN) {
        console.log('WebSocket not connected, connecting...');
        websocketService.connect();
      }
    } catch (error) {
      console.warn('Failed to connect to WebSocket:', error);
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
    const maxRetries = 2; // 最大重试次数
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        // 增加超时时间到5分钟，适应长时间推理需求
        const response = await fetchWithTimeout('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: message,
            stream: 1,
            version: version
          }),
          timeout: 5 * 60 * 1000 // 5分钟超时
        });

        // 如果服务器返回500错误，尝试重试
        if (response.status === 500) {
          retryCount++;
          if (retryCount <= maxRetries) {
            const waitTime = 2000 * retryCount; // 递增等待时间
            console.warn(`服务器返回500错误，${waitTime/1000}秒后进行第${retryCount}次重试...`);
            yield {
              type: 'progress',
              content: `服务器处理请求时遇到问题，正在重试(${retryCount}/${maxRetries})...`,
              retrying: true
            };
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }

        if (!response.ok) {
          // 尝试获取详细错误信息
          let errorDetail = '';
          try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorData.message || '';
          } catch (e) {
            // 无法解析JSON，使用状态文本
            errorDetail = response.statusText;
          }
          
          throw new Error(`HTTP error! status: ${response.status}, detail: ${errorDetail}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamedResponse = '';
        let lastReasoning = '';
        let lastActivityTime = Date.now();
        let promptHistory = null; // 存储最后接收到的完整prompt_history
        
        // 设置心跳检测，每30秒检查一次是否有新数据
        const heartbeatInterval = 30 * 1000; // 30秒
        const maxInactiveTime = 10 * 60 * 1000; // 10分钟无活动则超时，增加容忍度
        
        // 创建一个变量来跟踪是否需要发送进度更新
        let needsProgressUpdate = false;
        let progressUpdateData = null;
        let lastProgressTime = 0;
        
        // 创建心跳检测定时器
        const heartbeatTimer = setInterval(() => {
          const inactiveTime = Date.now() - lastActivityTime;
          console.log(`Heartbeat check: ${inactiveTime / 1000}s since last activity`);
          
          // 如果超过心跳间隔时间，且距离上次进度更新至少15秒，则标记需要发送进度更新
          const now = Date.now();
          if (inactiveTime > heartbeatInterval && (now - lastProgressTime) > 15000) {
            needsProgressUpdate = true;
            lastProgressTime = now;
            progressUpdateData = {
              type: 'progress',
              content: streamedResponse || '正在处理您的请求...',
              reasoning: lastReasoning,
              inactiveTime: inactiveTime
            };
          }
          
          // 如果超过最大不活动时间，则认为连接已超时
          if (inactiveTime > maxInactiveTime) {
            clearInterval(heartbeatTimer);
            // 不要在这里抛出错误，而是设置一个标志
            needsProgressUpdate = true;
            progressUpdateData = {
              type: 'error',
              content: `Error: 连接超时，服务器${maxInactiveTime/60000}分钟内没有响应`,
              timeout: true
            };
          }
        }, heartbeatInterval);

        let timeoutDetected = false;
        let readerClosed = false;
        
        try {
          while (!timeoutDetected && !readerClosed) {
            // 检查是否需要发送进度更新
            if (needsProgressUpdate) {
              needsProgressUpdate = false;
              yield progressUpdateData;
              
              // 如果是超时错误，跳出循环
              if (progressUpdateData.timeout) {
                timeoutDetected = true;
                // 确保关闭reader
                try {
                  await reader.cancel("Operation timed out");
                  readerClosed = true;
                } catch (e) {
                  console.warn("Error cancelling reader:", e);
                }
                break;
              }
            }
            
            // 使用Promise.race添加读取超时
            const readTimeout = new Promise((_, reject) => {
              const timeoutId = setTimeout(() => {
                clearTimeout(timeoutId);
                reject(new Error('Read operation timeout'));
              }, 60000);
              return () => clearTimeout(timeoutId);
            });
            
            let readResult;
            try {
              readResult = await Promise.race([
                reader.read(),
                readTimeout
              ]);
            } catch (error) {
              console.warn('Read operation timed out, retrying...', error);
              // 更新活动时间以防触发心跳超时
              lastActivityTime = Date.now();
              continue;
            }
            
            const { value, done } = readResult;
            if (done) {
              readerClosed = true;
              break;
            }
            
            // 更新最后活动时间
            lastActivityTime = Date.now();
            
            buffer += decoder.decode(value, { stream: true });
            
            const messages = buffer.split('\n\n');
            buffer = messages.pop() || '';
            
            for (const message of messages) {
              if (!message.trim()) continue;
              
              const parsed = parseSSEData(message);
              if (parsed) {
                // 处理完成标记
                if (parsed.done) {
                  console.log('接收到完成标记');
                  continue;
                }
                
                // 检查是否是完整的prompt_history消息
                if (parsed.prompt_history) {
                  try {
                    // parseSSEData已经将prompt_history解析为对象，直接使用
                    promptHistory = parsed.prompt_history;
                    console.log('接收到完整的prompt_history消息');
                    // 不立即处理，等待所有流处理完成后统一处理
                    continue; // 不作为实时消息向外传递
                  } catch (e) {
                    console.warn('处理prompt_history失败:', e);
                  }
                }
                
                lastReasoning = parsed.reasoning || lastReasoning;
                streamedResponse = parsed.answer || streamedResponse;
                
                yield {
                  type: 'stream',
                  content: streamedResponse,
                  reasoning: lastReasoning
                };
              }
            }
          }

          if (buffer.trim() && !timeoutDetected) {
            const parsed = parseSSEData(buffer);
            if (parsed) {
              // 处理完成标记
              if (parsed.done) {
                console.log('从最后buffer中接收到完成标记');
              } 
              // 检查最后的buffer中是否包含完整消息
              else if (parsed.prompt_history) {
                try {
                  // parseSSEData已经将prompt_history解析为对象，直接使用
                  promptHistory = parsed.prompt_history;
                  console.log('从最后的buffer中接收到完整的prompt_history消息');
                } catch (e) {
                  console.warn('处理最后的prompt_history失败:', e);
                }
              } else {
                lastReasoning = parsed.reasoning || lastReasoning;
                streamedResponse = parsed.answer || streamedResponse;
              }
            }
          }
          
          if (!timeoutDetected) {
            // 如果接收到了完整的prompt_history，使用其中的信息构建完整的调试消息
            if (promptHistory) {
              try {
                // 尝试创建调试消息
                let debugMessage;
                
                // 如果promptHistory已经具有所有需要的字段，直接使用它作为基础
                if (typeof promptHistory === 'object' && promptHistory.question) {
                  const rawDebugMessage = {
                    id: promptHistory.uuid || Date.now(),
                    timestamp: new Date(promptHistory.timestamp || Date.now()),
                    question: promptHistory.question,
                    model: promptHistory.model || 'DiModel',
                    version: promptHistory.version || '1.0.0',
                    messages: [], // 消息历史将经过处理
                    retrievmethod: [], // 稍后处理
                    prompt: promptHistory.prompt || '',
                    modelResponse: '',
                    reasoning: '',
                    processingTime: 0,
                    tokens: promptHistory.tokens || {
                      prompt_tokens: 0,
                      completion_tokens: 0,
                      total_tokens: 0
                    }
                  };
                  
                  // 正确处理消息历史，只保留system消息和最后一条user消息
                  if (Array.isArray(promptHistory.messages)) {
                    // 提取所有system消息
                    const systemMessages = promptHistory.messages.filter(msg => msg?.role === 'system');
                    
                    // 找到最后一条user消息
                    const lastUserMessage = promptHistory.messages
                      .filter(msg => msg?.role === 'user')
                      .pop();
                    
                    // 计算是否需要添加省略号
                    const hasOtherMessages = promptHistory.messages.length > 
                      (systemMessages.length + (lastUserMessage ? 1 : 0));
                    
                    // 构建新的消息历史
                    rawDebugMessage.messages = [
                      ...systemMessages,
                      // 如果有其他消息，添加省略号消息
                      ...(hasOtherMessages ? [{ role: 'system', content: '...(省略历史消息)...' }] : []),
                      // 添加最后一条用户消息（如果有）
                      ...(lastUserMessage ? [lastUserMessage] : [])
                    ];
                  }
                  
                  // 处理content字段，提取reasoning和answer
                  if (promptHistory.content) {
                    const { answer, reasoning } = parseContent(promptHistory.content);
                    rawDebugMessage.modelResponse = answer;
                    rawDebugMessage.reasoning = reasoning;
                  }
                  
                  // 处理召回方法
                  if (Array.isArray(promptHistory.messages)) {
                    rawDebugMessage.retrievmethod = extractRecallMethods(promptHistory.messages);
                  }
                  
                  debugMessage = rawDebugMessage;
                } else {
                  // 如果结构不符合预期，使用parseWebSocketMessage
                  debugMessage = parseWebSocketMessage(promptHistory);
                }
                
                if (debugMessage) {
                  console.log('成功创建调试消息:', debugMessage);
                  yield {
                    type: 'complete',
                    content: debugMessage.modelResponse || streamedResponse,
                    reasoning: debugMessage.reasoning || lastReasoning,
                    debug: debugMessage // 传递完整debug信息
                  };
                } else {
                  throw new Error('调试消息创建结果为空');
                }
              } catch (error) {
                console.warn('创建调试消息失败，使用流消息作为最终结果:', error);
                yield {
                  type: 'complete',
                  content: streamedResponse,
                  reasoning: lastReasoning,
                  parseError: error.message
                };
              }
            } else {
              // 如果没有接收到完整消息，使用流式消息中的最终状态
              yield {
                type: 'complete',
                content: streamedResponse,
                reasoning: lastReasoning
              };
            }
          } else {
            // 确保在超时情况下也返回一个最终状态
            yield {
              type: 'error',
              content: `连接超时，服务器${maxInactiveTime/60000}分钟内没有响应。已获取的内容：${streamedResponse || '无'}`,
              reasoning: lastReasoning,
              timeout: true
            };
          }
          
          // 成功完成或超时处理完成，跳出重试循环
          break;
        } catch (innerError) {
          console.error('Error during streaming:', innerError);
          // 在内部出错时也要确保关闭reader
          try {
            if (!readerClosed) {
              await reader.cancel("Error during streaming");
              readerClosed = true;
            }
          } catch (e) {
            console.warn("Error cancelling reader:", e);
          }
          
          // 如果已经有部分响应，则返回部分响应
          if (streamedResponse) {
            yield {
              type: 'error',
              content: `处理过程中出错，但已获取部分内容：${streamedResponse}`,
              reasoning: lastReasoning,
              error: innerError.message
            };
            break;
          } else {
            // 否则抛出错误，进入外部catch块进行重试逻辑
            throw innerError;
          }
        } finally {
          // 清除心跳检测定时器
          clearInterval(heartbeatTimer);
          
          // 确保reader被关闭
          if (!readerClosed) {
            try {
              await reader.cancel("Operation completed or failed");
            } catch (e) {
              console.warn("Error cancelling reader in finally block:", e);
            }
          }
        }
      } catch (error) {
        console.error(`Error in sendMessage (attempt ${retryCount+1}/${maxRetries+1}):`, error);
        
        // 如果还有重试机会，则重试
        if (retryCount < maxRetries) {
          retryCount++;
          const waitTime = 2000 * retryCount;
          console.warn(`${waitTime/1000}秒后进行第${retryCount}次重试...`);
          yield {
            type: 'progress',
            content: `请求出错，正在重试(${retryCount}/${maxRetries})...`,
            error: error.message,
            retrying: true
          };
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // 已达到最大重试次数，返回错误
          yield {
            type: 'error',
            content: `Error: ${error.message}`,
            retries: retryCount
          };
          break;
        }
      }
    }
  },

  // Get available versions
  async getVersions() {
    try {
      const response = await fetchWithTimeout('/api/versions');
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