import { toast } from 'react-hot-toast';

class SSEService {
  constructor() {
    this.callbacks = new Set();
    this.eventSource = null;
    this.currentMessageId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000;
    this.trainingCallbacks = new Set(); // 添加训练状态回调集合
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
    this.reconnectAttempts = 0;
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
}

// Only export once
export const sseService = new SSEService(); 