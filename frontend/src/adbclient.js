/**
 * 浏览器端ADB API客户端
 * 适用于React、Vue等前端框架
 */
class ADBClient {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
    }

    /**
     * 发送API请求的通用方法
     */
    async _request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            
            // 检查响应状态
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API请求失败: ${response.status} - ${errorText}`);
            }

            // 根据响应类型处理数据
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return response;
            }
        } catch (error) {
            console.error('API请求错误:', error);
            throw error;
        }
    }

    // === 设备管理 ===

    /**
     * 获取连接的设备列表
     */
    async getDevices() {
        return await this._request('/devices');
    }

    /**
     * 初始化设备连接
     */
    async initDevice(deviceId = null) {
        return await this._request('/init', {
            method: 'POST',
            body: JSON.stringify({ device_id: deviceId }),
        });
    }

    /**
     * 健康检查
     */
    async healthCheck() {
        return await this._request('/health');
    }

    // === 屏幕操作 ===

    /**
     * 获取屏幕尺寸
     */
    async getScreenSize() {
        return await this._request('/screen/size');
    }

    /**
     * 截图
     * @param {string} format - 'base64' 或 'binary'
     * @returns {Promise} base64格式返回数据对象，binary格式返回Blob
     */

    /**
     * 下载截图文件
     */
    async takeScreenshot(filename = "screenshot.png") {
        const response = await this._request('/screenshot', {
            method: 'POST',
            body: JSON.stringify({ filename: filename })
        });
        return response;
    }

    /**
     * 唤醒屏幕
     */
    async wakeScreen() {
        return await this._request('/screen/wake', { method: 'POST' });
    }

    /**
     * 解锁屏幕
     */
    async unlockScreen(direction = 'up') {
        return await this._request('/screen/unlock', {
            method: 'POST',
            body: JSON.stringify({ direction }),
        });
    }

    /**
     * 检查屏幕状态
     */
    async getScreenStatus() {
        return await this._request('/screen/status');
    }

    // === 输入操作 ===

    /**
     * 点击指定坐标
     */
    async click(x, y) {
        return await this._request('/input/click', {
            method: 'POST',
            body: JSON.stringify({ x, y }),
        });
    }

    /**
     * 滑动操作
     */
    async slide(x1, y1, x2, y2, durationMs = 300) {
        return await this._request('/input/slide', {
            method: 'POST',
            body: JSON.stringify({
                x1, y1, x2, y2, duration_ms: durationMs
            }),
        });
    }

    /**
     * 长按
     */
    async longPress(x, y, durationMs = 1000) {
        return await this._request('/input/long-press', {
            method: 'POST',
            body: JSON.stringify({ x, y, duration_ms: durationMs }),
        });
    }

    /**
     * 双击
     */
    async doubleTap(x, y) {
        return await this._request('/input/double-tap', {
            method: 'POST',
            body: JSON.stringify({ x, y }),
        });
    }

    /**
     * 输入文字
     */
    async inputText(text) {
        return await this._request('/input/text', {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
    }

    // === 导航操作 ===

    /**
     * 按主页键
     */
    async pressHome() {
        return await this._request('/navigation/home', { method: 'POST' });
    }

    /**
     * 按返回键
     */
    async pressBack() {
        return await this._request('/navigation/back', { method: 'POST' });
    }

    /**
     * 打开最近应用
     */
    async pressRecent() {
        return await this._request('/navigation/recent', { method: 'POST' });
    }

    // === 系统按键 ===

    /**
     * 按电源键
     */
    async pressPower() {
        return await this._request('/power/button', { method: 'POST' });
    }

    /**
     * 音量加
     */
    async volumeUp() {
        return await this._request('/volume/up', { method: 'POST' });
    }

    /**
     * 音量减
     */
    async volumeDown() {
        return await this._request('/volume/down', { method: 'POST' });
    }

    // === 应用管理 ===

    /**
     * 打开应用
     */
    async openApp(packageName, activity = null) {
        const data = { package_name: packageName };
        if (activity) data.activity = activity;
        
        return await this._request('/app/open', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * 关闭所有应用
     */
    async closeAllApps() {
        return await this._request('/app/close', { method: 'POST' });
    }

    /**
     * 获取当前应用
     */
    async getCurrentApp() {
        return await this._request('/app/current');
    }

    /**
     * 用Chrome打开URL
     */
    async openUrl(url) {
        return await this._request('/browser/open', {
            method: 'POST',
            body: JSON.stringify({ url }),
        });
    }

    // === 状态检查 ===

    /**
     * 检查键盘状态
     */
    async getKeyboardStatus() {
        return await this._request('/keyboard/status');
    }

    // === 便捷方法 ===

    /**
     * 向上滑动
     */
    async swipeUp(duration = 300) {
        const screenSize = await this.getScreenSize();
        const centerX = screenSize.width / 2;
        const startY = screenSize.height * 0.8;
        const endY = screenSize.height * 0.2;
        
        return await this.slide(centerX, startY, centerX, endY, duration);
    }

    /**
     * 向下滑动
     */
    async swipeDown(duration = 300) {
        const screenSize = await this.getScreenSize();
        const centerX = screenSize.width / 2;
        const startY = screenSize.height * 0.2;
        const endY = screenSize.height * 0.8;
        
        return await this.slide(centerX, startY, centerX, endY, duration);
    }

    /**
     * 向左滑动
     */
    async swipeLeft(duration = 300) {
        const screenSize = await this.getScreenSize();
        const centerY = screenSize.height / 2;
        const startX = screenSize.width * 0.8;
        const endX = screenSize.width * 0.2;
        
        return await this.slide(startX, centerY, endX, centerY, duration);
    }

    /**
     * 向右滑动
     */
    async swipeRight(duration = 300) {
        const screenSize = await this.getScreenSize();
        const centerY = screenSize.height / 2;
        const startX = screenSize.width * 0.2;
        const endX = screenSize.width * 0.8;
        
        return await this.slide(startX, centerY, endX, centerY, duration);
    }

    /**
     * 点击屏幕中央
     */
    async clickCenter() {
        const screenSize = await this.getScreenSize();
        const centerX = screenSize.width / 2;
        const centerY = screenSize.height / 2;
        
        return await this.click(centerX, centerY);
    }

    /**
     * 批量操作
     * @param {Array} operations - 操作数组，每个操作包含 {type, params, delay}
     */
    async batchOperations(operations) {
        const results = [];
        
        for (const op of operations) {
            try {
                let result;
                
                switch (op.type) {
                    case 'click':
                        result = await this.click(...op.params);
                        break;
                    case 'slide':
                        result = await this.slide(...op.params);
                        break;
                    case 'input':
                        result = await this.inputText(op.params[0]);
                        break;
                    case 'wait':
                        await new Promise(resolve => setTimeout(resolve, op.params[0]));
                        result = { message: `Waited ${op.params[0]}ms` };
                        break;
                    default:
                        throw new Error(`Unknown operation type: ${op.type}`);
                }
                
                results.push({ success: true, result });
                
                // 操作间延迟
                if (op.delay) {
                    await new Promise(resolve => setTimeout(resolve, op.delay));
                }
                
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }
}

// 默认导出
export default ADBClient;

// 也支持命名导出
export { ADBClient };