import { toast } from 'react-hot-toast';

class WebSocketService {
  constructor() {
    this.callbacks = new Set();
    this.ws = null;
    this.currentMessageId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000;
    this.trainingCallbacks = new Set(); // 添加训练状态回调集合
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.ws) {
      this.ws.close();
    }

    this.currentMessageId = Date.now();

    try {
      // 从环境变量中获取WebSocket地址
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
      console.log('Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // 处理版本更新消息
          if (data.type === 'version_update' && data.data) {
            this.handleVersionUpdate(data.data);
            
            // 如果是训练完成的版本更新，通知训练完成
            if (data.data.training_ids) {
              this.notifyTrainingCompleted(data.data);
            }
            return;
          }
          
          // 处理训练状态更新消息
          if (data.type === 'training_status' && data.data) {
            this.handleTrainingStatus(data.data);
            return;
          }
          
          // 处理优化状态更新消息
          if (data.type === 'optimization_status' && data.data) {
            this.handleOptimizationStatus(data.data);
            return;
          }
          
          // 移除对prompt_history的处理，因为这些数据现在通过SSE流获取
        } catch (error) {
          console.warn('Error processing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('WebSocket error:', error);
        this.handleConnectionError();
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.handleConnectionError();
      };
    } catch (error) {
      console.warn('Error creating WebSocket:', error);
      this.handleConnectionError();
    }
  }

  handleConnectionError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.warn('Max reconnection attempts reached');
      this.showConnectionErrorAlert();
    }
  }

  showConnectionErrorAlert() {
    toast.error('无法连接到 WebSocket 服务器，请稍后再试。');
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
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
export const websocketService = new WebSocketService();