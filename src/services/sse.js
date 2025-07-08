import { toast } from 'react-hot-toast';

/**
 * SSE服务 - 按需连接策略
 * 
 * 连接策略：
 * - 根据具体使用场景按需建立连接：
 *   - 聊天对话时：connectForReason('聊天对话')
 *   - 训练优化时：connectForReason('训练优化') 
 *   - 版本切换时：connectForReason('版本切换')
 *   - 样本管理页面：connectForReason('样本管理')
 * 
 * 智能断开机制：
 * - 跟踪所有连接原因
 * - 当所有连接原因都被移除后，30秒内无活动自动断开
 * - 接收到SSE消息时重置断开定时器
 */

class SSEService {
  constructor() {
    this.callbacks = new Set();
    this.eventSource = null;
    this.currentMessageId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000;
    this.trainingCallbacks = new Set(); // 添加训练状态回调集合
    this.connectionReasons = new Set(); // 跟踪连接原因
    this.autoDisconnectTimer = null; // 自动断开定时器
    this.autoDisconnectDelay = 60000; // 30秒无活动后自动断开
  }

  connect() {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    if (this.eventSource) {
      this.eventSource.close();
    }

    this.currentMessageId = Date.now();

    try {
      // 从环境变量中获取 SSE 地址
      const sseUrl = import.meta.env.VITE_SSE_URL || 'http://localhost:8080/events';
      console.log('Connecting to SSE:', sseUrl);
      
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        console.log('SSE connected successfully');
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received SSE message:', data);
          // 重置自动断开定时器（有活动）
          this.resetAutoDisconnectTimer();
        } catch (error) {
          console.warn('Error parsing SSE message:', error);
        }
      };

      // 监听特定事件类型
      this.eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('SSE connection confirmed:', data.message);
      });

      this.eventSource.addEventListener('heartbeat', (event) => {
        // 心跳消息，用于保持连接
        const data = JSON.parse(event.data);
        console.log('SSE heartbeat:', new Date(data.timestamp * 1000));
      });

      this.eventSource.addEventListener('version_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleVersionUpdate(data);
          
          // 如果是训练完成的版本更新，通知训练完成
          if (data.training_ids) {
            this.notifyTrainingCompleted(data);
          }
        } catch (error) {
          console.warn('Error processing version_update event:', error);
        }
      });

      this.eventSource.addEventListener('optimization_status', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleOptimizationStatus(data);
        } catch (error) {
          console.warn('Error processing optimization_status event:', error);
        }
      });

      this.eventSource.addEventListener('optimization_created', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Optimization task created:', data);
          // 可以添加特殊处理逻辑
        } catch (error) {
          console.warn('Error processing optimization_created event:', error);
        }
      });

      this.eventSource.addEventListener('optimization_failed', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleOptimizationStatus({
            ...data,
            status: 'failed'
          });
        } catch (error) {
          console.warn('Error processing optimization_failed event:', error);
        }
      });

      this.eventSource.addEventListener('training_status', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleTrainingStatus(data);
        } catch (error) {
          console.warn('Error processing training_status event:', error);
        }
      });

      // 监听聊天流式数据
      this.eventSource.addEventListener('chat_stream', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('接收到 chat_stream 事件:', data);
          this.handleChatStream(data);
        } catch (error) {
          console.warn('Error processing chat_stream event:', error);
        }
      });

      // 监听聊天完成事件
      this.eventSource.addEventListener('completion', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('接收到 completion 事件:', data);
          this.handleChatCompletion(data);
        } catch (error) {
          console.warn('Error processing completion event:', error);
        }
      });

      this.eventSource.onerror = (error) => {
        console.warn('SSE error:', error);
        this.handleConnectionError();
      };

    } catch (error) {
      console.warn('Error creating SSE connection:', error);
      this.handleConnectionError();
    }
  }

  handleConnectionError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting SSE... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.warn('Max SSE reconnection attempts reached');
      this.showConnectionErrorAlert();
    }
  }

  showConnectionErrorAlert() {
    toast.error('无法连接到 SSE 服务器，请稍后再试。');
  }

  handleVersionUpdate(data) {
    try {
      const { old_version, new_version, description, message, training_ids } = data;
      
      // 解码Unicode编码的中文字符
      const decodedDescription = description ? decodeURIComponent(JSON.parse(`"${description}"`)) : '';
      const decodedMessage = message ? decodeURIComponent(JSON.parse(`"${message}"`)) : '';
      
      // 构建提示消息
      let toastMessage = `${decodedMessage || '版本已更新'}: ${old_version} → ${new_version}`;
      if (training_ids) {
        toastMessage = `训练优化完成: ${old_version} → ${new_version}`;
      }
      
      // 显示toast提示
      toast.success(toastMessage, {
        duration: 5000,
        style: {
          maxWidth: '500px',
        },
        description: decodedDescription,
      });
      
      // 触发版本更新回调
      this.callbacks.forEach(callback => {
        if (typeof callback === 'function') {
          callback({
            type: 'version_update',
            data: {
              ...data,
              description: decodedDescription,
              message: decodedMessage
            }
          });
        }
      });
      
      console.log('Version update received:', {
        old_version,
        new_version,
        description: decodedDescription,
        message: decodedMessage,
        training_ids
      });
    } catch (error) {
      console.error('Error handling version update:', error);
    }
  }
  
  // 添加处理训练状态的方法
  handleTrainingStatus(data) {
    try {
      const { status, message } = data;
      
      // 解码消息（如果有）
      const decodedMessage = message ? decodeURIComponent(JSON.parse(`"${message}"`)) : '';
      
      console.log('Training status update:', {
        status,
        message: decodedMessage
      });
      
      // 通知所有训练状态回调
      this.trainingCallbacks.forEach(callback => {
        if (typeof callback === 'function') {
          callback({
            type: 'training_status',
            status,
            message: decodedMessage
          });
        }
      });
      
      // 如果训练失败，显示错误提示
      if (status === 'failed') {
        toast.error(`训练优化失败: ${decodedMessage || '未知错误'}`);
        this.notifyTrainingCompleted({ error: decodedMessage });
      }
    } catch (error) {
      console.error('Error handling training status:', error);
    }
  }
  
  // 通知训练完成
  notifyTrainingCompleted(data) {
    this.trainingCallbacks.forEach(callback => {
      if (typeof callback === 'function') {
        callback({
          type: 'training_completed',
          data
        });
      }
    });
    
    // 训练完成后移除训练相关的连接原因
    this.removeConnectionReason('训练优化');
  }
  
  // 添加训练状态监听方法
  onTrainingStatus(callback) {
    this.trainingCallbacks.add(callback);
    return () => {
      this.trainingCallbacks.delete(callback);
    };
  }

  simulateDebugMessage() {
    const debugMessage = {
      id: this.currentMessageId,
      timestamp: new Date(),
      question: "Sample question",
      model: "DiModel",
      version: "1.0.0",
      messages: [
        {
          role: "user",
          content: "Sample question"
        },
        {
          role: "assistant",
          content: "[[ ## reasoning ## ]]Sample reasoning[[ ## answer ## ]]Sample answer[[ ## completed ## ]]"
        }
      ],
      retrievmethod: [],
      prompt: "Sample prompt",
      modelResponse: "Sample answer",
      reasoning: "Sample reasoning",
      processingTime: 1000,
      tokens: {
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80
      }
    };

    this.callbacks.forEach(callback => callback(debugMessage));
  }

  onMessage(callback) {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.disconnect();
      }
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.callbacks.clear();
    this.trainingCallbacks.clear();
    this.connectionReasons.clear();
    this.reconnectAttempts = 0;
    
    // 清除自动断开定时器
    if (this.autoDisconnectTimer) {
      clearTimeout(this.autoDisconnectTimer);
      this.autoDisconnectTimer = null;
    }
  }
  
  // 添加处理优化状态的方法
  handleOptimizationStatus(data) {
    try {
      const { task_id, status, progress, message } = data;
      
      // 解码消息（如果有）
      const decodedMessage = message ? decodeURIComponent(JSON.parse(`"${message}"`)) : '';
      
      console.log('Optimization status update:', {
        task_id,
        status,
        progress,
        message: decodedMessage
      });
      
      // 通知所有训练状态回调
      this.trainingCallbacks.forEach(callback => {
        if (typeof callback === 'function') {
          callback({
            type: 'optimization_status',
            task_id,
            status,
            progress,
            message: decodedMessage
          });
        }
      });
      
      // 如果优化失败，显示错误提示
      if (status === 'failed') {
        toast.error(`训练优化失败: ${decodedMessage || '未知错误'}`);
        this.notifyTrainingCompleted({ error: decodedMessage });
      }
    } catch (error) {
      console.error('Error handling optimization status:', error);
    }
  }

  // 智能连接 - 根据使用场景连接
  connectForReason(reason) {
    console.log(`SSE连接请求: ${reason}`);
    this.connectionReasons.add(reason);
    this.connect();
    this.resetAutoDisconnectTimer();
  }

  // 移除连接原因，如果没有其他原因则考虑断开
  removeConnectionReason(reason) {
    this.connectionReasons.delete(reason);
    console.log(`移除SSE连接原因: ${reason}, 剩余原因: ${Array.from(this.connectionReasons)}`);
    
    if (this.connectionReasons.size === 0) {
      this.scheduleAutoDisconnect();
    }
  }

  // 重置自动断开定时器
  resetAutoDisconnectTimer() {
    if (this.autoDisconnectTimer) {
      clearTimeout(this.autoDisconnectTimer);
    }
    this.scheduleAutoDisconnect();
  }

  // 安排自动断开
  scheduleAutoDisconnect() {
    if (this.autoDisconnectTimer) {
      clearTimeout(this.autoDisconnectTimer);
    }
    
    // 只有在没有连接原因时才安排自动断开
    if (this.connectionReasons.size === 0) {
      this.autoDisconnectTimer = setTimeout(() => {
        console.log('SSE空闲超时，自动断开连接');
        this.disconnect();
      }, this.autoDisconnectDelay);
    }
  }

  // 处理聊天流式数据
  handleChatStream(data) {
    try {
      console.log('处理聊天流式数据:', data);
      
      // 通知所有聊天回调
      this.callbacks.forEach(callback => {
        if (typeof callback === 'function') {
          callback({
            type: 'chat_stream',
            data: {
              reasoning: data.reasoning || '',
              answer: data.answer || '',
              step_type: data.step_type || 'unknown',
              tool_calls: data.tool_calls || []
            }
          });
        }
      });
    } catch (error) {
      console.error('Error handling chat stream:', error);
    }
  }

  // 处理聊天完成事件
  handleChatCompletion(data) {
    try {
      console.log('处理聊天完成事件:', data);
      
      // 通知所有聊天回调
      this.callbacks.forEach(callback => {
        if (typeof callback === 'function') {
          callback({
            type: 'chat_completion',
            data: data
          });
        }
      });
      
      // 聊天完成后移除聊天相关的连接原因
      this.removeConnectionReason('聊天对话');
    } catch (error) {
      console.error('Error handling chat completion:', error);
    }
  }
}

// Only export once
export const sseService = new SSEService(); 