/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import {blocks} from './blocks/text';
import './blocks/MQABlocks';  // 引入自訂區塊
import {forBlock} from './generators/javascript';
import {javascriptGenerator} from 'blockly/javascript';
import {save, load} from './serialization';
import {toolbox} from './toolbox';
import './index.css';
import { ADBClient } from './adbclient';

// Register the blocks and generator with Blockly
Blockly.common.defineBlocks(blocks);
Object.assign(javascriptGenerator.forBlock, forBlock);

let client;

// Set up UI elements and inject Blockly
const codeDiv = document.getElementById('generatedCode').firstChild; //程式碼範例
const outputDiv = document.getElementById('output'); //程式碼範例
const blocklyDiv = document.getElementById('blocklyDiv');
const ws = Blockly.inject(blocklyDiv, {toolbox, trashcan: false});


// 取得輸入框和按鈕的元素 Leo
const filenameInput = document.getElementById('filenameInput');
const saveButton = document.getElementById('saveButton');
const openButton = document.getElementById('openButton');
const fileInput = document.getElementById('fileInput');
const ADB_API_BASE = 'http://localhost:8000';
const EXECUTOR_API_BASE = 'http://localhost:8001';

// // 監聽按鈕點擊事件
// saveButton.addEventListener('click', () => {
//   const filename = filenameInput.value || 'my_blocks.json'; // 建議使用 .json 檔名
  
//   // 從 Blockly 工作區序列化資料，得到一個 JavaScript 物件
//   const workspaceState = Blockly.serialization.workspaces.save(ws);
  
//   // 使用 JSON.stringify 將物件轉換為字串
//   const data = JSON.stringify(workspaceState, null, 2); // null, 2 讓格式更易於閱讀

//   // 使用 download 函數來下載檔案
//   download(filename, data);
//   console.log('save at：' + filename);
// });



function download(filename, data) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  
  // 暫時添加到DOM並觸發點擊
  document.body.appendChild(link);
  link.click();
  
  // 清理
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



saveButton.addEventListener('click', () => {
  let filename = filenameInput.value;
  
  // 檢查檔名是否為空，如果是則設定預設值
  if (!filename) {
    filename = 'my_blocks';
  }

  // 檢查檔名是否以 .json 結尾，如果不是則加上
  if (!filename.endsWith('.json')) {
    filename += '.json';
  }

  const workspaceState = Blockly.serialization.workspaces.save(ws);
  const data = JSON.stringify(workspaceState, null, 2);
  
  download(filename, data);
  console.log('save at：' + filename);
});

openButton.addEventListener('click', () => {
  // This programmatically clicks the hidden file input element
  fileInput.click();
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0]; // 取得使用者選擇的第一個檔案
  if (!file) {
    return; // 如果沒有選擇檔案，則退出
  }

  const reader = new FileReader(); // 建立一個檔案讀取器
  reader.onload = (e) => {
    try {
      const contents = e.target.result; // 取得檔案內容
      const workspaceState = JSON.parse(contents); // 將內容解析為 JSON 物件
      Blockly.serialization.workspaces.load(workspaceState, ws); // 使用 Blockly 載入區塊資料
      console.log('script load！');
      runCode(); // 載入後執行程式碼
    } catch (error) {
      console.error('load error:', error);
      alert('load error check');
    }
  };

  reader.readAsText(file); // 以文字格式讀取檔案內容
});











// 手機截圖處理功能 - 完整版本
document.addEventListener('DOMContentLoaded', function() {
  const loadScreenshotButton = document.getElementById('loadScreenshotButton');
  const hiddenDisplayButton = document.getElementById('hiddenDisplayButton');
  const phoneScreenshot = document.getElementById('phoneScreenshot');
  const noScreenshotText = document.getElementById('noScreenshotText');
  const selectionBox = document.getElementById('selectionBox');
  const imageContainer = document.getElementById('imageContainer');
  const clickCoordsText = document.getElementById('clickCoordsText');
  const selectionCoordsText = document.getElementById('selectionCoordsText');
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  const cropSection = document.getElementById('cropSection');
  const cropButton = document.getElementById('cropButton');
  const templateNameInput = document.getElementById('templateNameInput');
  const cropStatus = document.getElementById('cropStatus');

  let isSelecting = false;
  let startX, startY;
  let currentMode = 'click';
  let selectionCoords = null; // 儲存當前框選座標



  function getImageCoordinates(event) {
    const rect = phoneScreenshot.getBoundingClientRect();
    const scaleX = phoneScreenshot.naturalWidth / phoneScreenshot.clientWidth;
    const scaleY = phoneScreenshot.naturalHeight / phoneScreenshot.clientHeight;
    
    const x = Math.round((event.clientX - rect.left) * scaleX);
    const y = Math.round((event.clientY - rect.top) * scaleY);
    
    return { x, y };
  }

  // 監聽模式變更
  modeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      currentMode = this.value;
      phoneScreenshot.className = currentMode + '-mode';
      // 清除選擇框
      selectionBox.style.display = 'none';
      // 隱藏裁切區域
      cropSection.style.display = 'none';
      selectionCoords = null;
    });
  });

  loadScreenshotButton.onclick = function() {
    
    const imageUrl = `http://localhost:8000/screenshots/screenshot.png?${Date.now()}`;
    phoneScreenshot.crossOrigin = 'anonymous';
    
    phoneScreenshot.onload = function() {
        this.style.display = 'block';
        this.style.visibility = 'visible';
        noScreenshotText.style.display = 'none';
        console.log('图片加载完成，可以裁切');
    };
    
    phoneScreenshot.src = imageUrl;
    return false;
};

  // 點擊事件處理
  phoneScreenshot.addEventListener('click', function(e) {
    if (currentMode === 'click') {
        const coords = getImageCoordinates(e);
        clickCoordsText.textContent = `X: ${coords.x}, Y: ${coords.y}`;
        console.log('點擊座標:', coords);
        
        
        fetch(`http://localhost:8000/input/click`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                x: coords.x,
                y: coords.y
            })
        })
        .then(response => response.json())
        .then(result => {
            console.log('设备点击成功:', result.message);
            // 可选：显示成功提示
            clickCoordsText.textContent += ` (已执行)`;
        })
        .catch(error => {
            console.error('设备点击失败:', error);
            // 可选：显示错误提示
            clickCoordsText.textContent += ` (执行失败)`;
        });
    }
  });

  // 滑鼠按下事件 - 開始框選
  phoneScreenshot.addEventListener('mousedown', function(e) {
    if (currentMode === 'select') {
      isSelecting = true;
      const coords = getImageCoordinates(e);
      startX = coords.x;
      startY = coords.y;
      
      // 設置選擇框的初始位置（相對於圖片顯示尺寸）
      const rect = phoneScreenshot.getBoundingClientRect();
      const containerRect = imageContainer.getBoundingClientRect();
      
      selectionBox.style.left = (e.clientX - containerRect.left) + 'px';
      selectionBox.style.top = (e.clientY - containerRect.top) + 'px';
      selectionBox.style.width = '0px';
      selectionBox.style.height = '0px';
      selectionBox.style.display = 'block';
      
      e.preventDefault();
    }
  });

  // 滑鼠移動事件 - 更新框選
  phoneScreenshot.addEventListener('mousemove', function(e) {
    if (isSelecting && currentMode === 'select') {
      const containerRect = imageContainer.getBoundingClientRect();
      const currentX = e.clientX - containerRect.left;
      const currentY = e.clientY - containerRect.top;
      
      const rect = phoneScreenshot.getBoundingClientRect();
      const startDisplayX = selectionBox.offsetLeft;
      const startDisplayY = selectionBox.offsetTop;
      
      const width = Math.abs(currentX - startDisplayX);
      const height = Math.abs(currentY - startDisplayY);
      
      selectionBox.style.width = width + 'px';
      selectionBox.style.height = height + 'px';
      
      if (currentX < startDisplayX) {
        selectionBox.style.left = currentX + 'px';
      }
      if (currentY < startDisplayY) {
        selectionBox.style.top = currentY + 'px';
      }
    }
  });

  // 滑鼠放開事件 - 完成框選
  phoneScreenshot.addEventListener('mouseup', function(e) {
    if (isSelecting && currentMode === 'select') {
      isSelecting = false;
      
      const endCoords = getImageCoordinates(e);
      
      // 計算左上角和右下角座標
      const leftX = Math.min(startX, endCoords.x);
      const rightX = Math.max(startX, endCoords.x);
      const topY = Math.min(startY, endCoords.y);
      const bottomY = Math.max(startY, endCoords.y);
      
      // 儲存框選座標
      selectionCoords = {
        leftTop: { x: leftX, y: topY }, 
        rightBottom: { x: rightX, y: bottomY }
      };
      
      selectionCoordsText.textContent = `左上: (${leftX}, ${topY}), 右下: (${rightX}, ${bottomY})`;
      console.log('框選座標:', selectionCoords);
      
      // 顯示裁切功能區域
      cropSection.style.display = 'block';
      cropStatus.textContent = '';
      cropStatus.className = '';
    }
  });

  // 滑鼠離開圖片區域時停止框選
  phoneScreenshot.addEventListener('mouseleave', function() {
    if (isSelecting) {
      isSelecting = false;
      selectionBox.style.display = 'none';
    }
  });

  // 防止右鍵選單
  phoneScreenshot.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });

  // 裁切功能
  cropButton.addEventListener('click', function() {
    const templateName = templateNameInput.value.trim();
    
    if (!templateName) {
      cropStatus.textContent = '請輸入模板名稱';
      cropStatus.className = 'error';
      return;
    }
    
    if (!selectionCoords) {
      cropStatus.textContent = '請先框選區域';
      cropStatus.className = 'error';
      return;
    }
    
    // 檢查檔名是否合法
    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(templateName)) {
      cropStatus.textContent = '檔名包含非法字元';
      cropStatus.className = 'error';
      return;
    }
    
    cropButton.disabled = true;
    cropStatus.textContent = '正在處理...';
    cropStatus.className = 'info';
    
    // 執行裁切
    cropImageArea(selectionCoords, templateName);
  });

  // 裁切圖片區域的函數
  function cropImageArea(coords, filename) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 計算裁切區域的寬高
    const width = coords.rightBottom.x - coords.leftTop.x;
    const height = coords.rightBottom.y - coords.leftTop.y;
    
    if (width <= 0 || height <= 0) {
      cropStatus.textContent = '選擇區域無效';
      cropStatus.className = 'error';
      cropButton.disabled = false;
      return;
    }
    
    // 設置canvas尺寸
    canvas.width = width;
    canvas.height = height;
    
    // 等待圖片載入完成後進行裁切
    if (phoneScreenshot.complete) {
      performCrop();
    } else {
      phoneScreenshot.onload = performCrop;
    }
    
    

    function performCrop() {
      try {
        // 在canvas上繪製裁切的圖片區域
        ctx.drawImage(
          phoneScreenshot,
          coords.leftTop.x, coords.leftTop.y, width, height,
          0, 0, width, height
        );
        
        // 將canvas轉換為base64，確保格式正確
        const base64Data = canvas.toDataURL('image/png');
        
        // 調試：打印 base64 數據的前100個字符
        console.log('Base64 data preview:', base64Data.substring(0, 100));
        
        // 驗證 base64 數據格式
        if (!base64Data || !base64Data.startsWith('data:image/')) {
          throw new Error('無法生成有效的圖片數據');
        }
        
        // 發送到後端保存
        saveCroppedTemplate(base64Data, filename);
        
      } catch (error) {
        console.error('裁切錯誤:', error);
        cropStatus.textContent = '裁切失敗: ' + error.message;
        cropStatus.className = 'error';
        cropButton.disabled = false;
      }
    }

    // 新增：保存裁切模板到後端的函數
    async function saveCroppedTemplate(base64Data, filename) {
      try {
        cropButton.disabled = true;
        cropStatus.textContent = '正在保存模板...';
        cropStatus.className = 'info';
        
        const response = await fetch('http://localhost:8001/templates/save-cropped', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: filename,
            image_data: base64Data
          })
        });
        
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
          } catch (parseError) {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        cropStatus.textContent = result.message;
        cropStatus.className = 'success';
        
        // 清空輸入框
        templateNameInput.value = '';
        
        console.log(`裁切完成: ${result.filename}, 路徑: ${result.path}`);
        
      } catch (error) {
        console.error('保存模板失敗:', error);
        cropStatus.textContent = '保存失敗: ' + error.message;
        cropStatus.className = 'error';
      } finally {
        cropButton.disabled = false;
      }
    }
    
  }

  // 輸入框Enter鍵觸發裁切
  templateNameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      cropButton.click();
    }
  });
});












// This function resets the code and output divs, shows the
// generated code from the workspace, and evals the code.
// In a real application, you probably shouldn't use `eval`.
const runCode = () => {
  const code = javascriptGenerator.workspaceToCode(ws);
  codeDiv.innerText = code; //程式碼範例

  outputDiv.innerHTML = ''; //程式碼範例

  eval(code);
};

// Load the initial state from storage and run the code.
load(ws);
runCode();

// Every time the workspace changes state, save the changes to storage.
ws.addChangeListener((e) => {
  // UI events are things like scrolling, zooming, etc.
  // No need to save after one of these.
  if (e.isUiEvent) return;
  save(ws);
});

// Whenever the workspace changes meaningfully, run the code again.
ws.addChangeListener((e) => {
  // Don't run the code when the workspace finishes loading; we're
  // already running it once when the application starts.
  // Don't run the code during drags; we might have invalid state.
  if (
    e.isUiEvent ||
    e.type == Blockly.Events.FINISHED_LOADING ||
    ws.isDragging()
  ) {
    return;
  }
  runCode();
});

// Add this to your main JavaScript file (e.g., src/index.js)

/**
 * Finds a template's coordinates.
 * @param {string} templateId The ID of the template to find.
 * @return {object|null} The coordinates of the template, or null if not found.
 */
function find_template(templateId) {
  return;
}

function find_text(words) {
  return;
}

function wait(time) {
  return;
}

function click(x, y) {
  return;
}

function click_object(object) {
  return;
}

function slide(x0, y0, x1, y1) {
  return;
}

function text(words) {
  return;
}

function main_script() {
  return;
}

function go_url(){
  return;
}

function check_template(templateId){
  return;
}

function check_text(templateId){
  return;
}








//blockly part








// Blockly脚本执行器 - 前端部分
// 添加到你的index.js文件中


// 创建执行按钮和结果显示区域
// 修改 createExecutorUI 函数
function createExecutorUI() {
    const outputPane = document.getElementById('outputPane');
    
    // 创建回归初始按钮
    const resetButton = document.createElement('button');
    resetButton.id = 'resetDeviceButton';
    resetButton.textContent = '🏠 回歸初始';
    resetButton.style.cssText = `
        background-color: #FF9800;
        color: white;
        border: none;
        padding: 10px 20px;
        font-size: 14px;
        cursor: pointer;
        border-radius: 4px;
        margin: 10px 5px;
    `;
    
    // 创建重复次数输入
    const repeatContainer = document.createElement('div');
    repeatContainer.style.cssText = `
        display: inline-block;
        margin: 10px 5px;
        vertical-align: top;
    `;
    
    const repeatLabel = document.createElement('label');
    repeatLabel.textContent = '執行次數: ';
    repeatLabel.style.cssText = `
        font-size: 14px;
        margin-right: 5px;
    `;
    
    const repeatInput = document.createElement('input');
    repeatInput.id = 'repeatCountInput';
    repeatInput.type = 'number';
    repeatInput.value = '1';
    repeatInput.min = '1';
    repeatInput.max = '100';
    repeatInput.style.cssText = `
        width: 60px;
        padding: 5px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 14px;
    `;
    
    repeatContainer.appendChild(repeatLabel);
    repeatContainer.appendChild(repeatInput);
    
    // 创建执行按钮
    const executeButton = document.createElement('button');
    executeButton.id = 'executeScriptButton';
    executeButton.textContent = '▶️ 執行腳本';
    executeButton.style.cssText = `
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 10px 20px;
        font-size: 14px;
        cursor: pointer;
        border-radius: 4px;
        margin: 10px 5px;
    `;
    
    // 创建停止按钮
    const stopButton = document.createElement('button');
    stopButton.id = 'stopScriptButton';
    stopButton.textContent = '⏹️ 停止';
    stopButton.disabled = true;
    stopButton.style.cssText = `
        background-color: #f44336;
        color: white;
        border: none;
        padding: 10px 20px;
        font-size: 14px;
        cursor: pointer;
        border-radius: 4px;
        margin: 10px 5px;
        opacity: 0.5;
    `;
    
    // 状态和结果显示区域
    const statusDiv = document.createElement('div');
    statusDiv.id = 'executionStatus';
    statusDiv.style.cssText = `
        margin: 10px 0;
        padding: 5px;
        font-size: 14px;
    `;
    
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'executionResults';
    resultsDiv.style.cssText = `
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 10px;
        margin: 10px 0;
        max-height: 400px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 12px;
    `;
    
    // 按顺序添加元素
    outputPane.appendChild(resetButton);
    outputPane.appendChild(repeatContainer);
    outputPane.appendChild(executeButton);
    outputPane.appendChild(stopButton);
    outputPane.appendChild(statusDiv);
    outputPane.appendChild(resultsDiv);
    
    return { resetButton, repeatInput, executeButton, stopButton, statusDiv, resultsDiv };
}

// 脚本执行器类
// 在类定义之前添加常量


class BlocklyScriptExecutor {
    constructor() {
        this.isExecuting = false;
        this.shouldStop = false;
    }

    async execute(code) {
      const url = `${EXECUTOR_API_BASE}/execute`;
      console.log('尝试连接:', url);
      
      try {
          const response = await fetch(url, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code: code })
          });
          
          console.log('响应状态:', response.status);
          console.log('响应URL:', response.url);
          console.log('响应类型:', response.headers.get('content-type'));
          
          const text = await response.text();
          console.log('原始响应内容:', text.substring(0, 200));
          
          if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
              throw new Error('收到HTML页面而不是JSON，请检查API服务是否在8001端口运行');
          }
          
          return JSON.parse(text);
          
      } catch (error) {
          console.error('请求失败:', error);
          throw error;
      }
  }

    async executeWithRepeat(code, repeatCount = 1) {
        if (this.isExecuting) {
            throw new Error('脚本正在执行中');
        }
        
        this.isExecuting = true;
        this.shouldStop = false;
        const allResults = [];
        
        try {
            for (let i = 1; i <= repeatCount; i++) {
                if (this.shouldStop) {
                    allResults.push({
                        iteration: i,
                        status: 'stopped',
                        message: '用户停止执行'
                    });
                    break;
                }
                
                // 每次执行前先回归初始状态
                const resetResult = await this.resetDevice();
                
                // 执行脚本
                const scriptResult = await this.execute(code);
                
                allResults.push({
                    iteration: i,
                    status: 'completed',
                    resetResult,
                    scriptResult
                });
                
                // 如果不是最后一次，等待一会再继续
                if (i < repeatCount && !this.shouldStop) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        } finally {
            this.isExecuting = false;
            this.shouldStop = false;
        }
        
        return {
            totalIterations: repeatCount,
            completedIterations: allResults.filter(r => r.status === 'completed').length,
            results: allResults
        };
    }
    
    async resetDevice() {
        console.log('开始重置设备');
        const resetActions = [
            //{ method: 'POST', endpoint: '/screen/unlock' },
            { method: 'POST', endpoint: '/app/close' },
            { method: 'POST', endpoint: '/navigation/home' }
        ];
        
        const results = [];
        for (const action of resetActions) {
            try {
                const result = await this.callAdbApi(action.method, action.endpoint);
                results.push({ action: action.endpoint, result, success: true });
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                results.push({ action: action.endpoint, error: error.message, success: false });
            }
        }
        return results;
    }
    
    async callAdbApi(method, endpoint, data = null) {
        const response = await fetch(`${ADB_API_BASE}${endpoint}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
        
        return await response.json();
    }
    
    stop() {
        this.shouldStop = true;
    }
}

// 测试创建实例
const executor = new BlocklyScriptExecutor();
console.log('BlocklyScriptExecutor 创建成功');

// 结果显示器
class ExecutionResultDisplay {
    constructor(resultsDiv, statusDiv) {
        this.resultsDiv = resultsDiv;
        this.statusDiv = statusDiv;
    }
    
    showStatus(message, type = 'info') {
        const colors = {
            'info': '#2196F3',
            'success': '#4CAF50',
            'error': '#f44336',
            'warning': '#FF9800'
        };
        
        this.statusDiv.textContent = message;
        this.statusDiv.style.color = colors[type] || colors.info;
    }
    
    showResults(executionResult) {
        this.resultsDiv.innerHTML = '';
        
        // 显示总体结果
        const summary = document.createElement('div');
        summary.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
            padding: 5px;
            background-color: ${executionResult.success ? '#e8f5e8' : '#ffe8e8'};
            border-radius: 3px;
        `;
        
        summary.innerHTML = `
            📊 執行結果: ${executionResult.successful_functions}/${executionResult.total_functions} 成功
            ${executionResult.success ? '✅' : '❌'}
        `;
        
        this.resultsDiv.appendChild(summary);
        
        // 显示每个函数的执行结果
        executionResult.results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.style.cssText = `
                margin: 5px 0;
                padding: 8px;
                border-left: 3px solid ${result.success ? '#4CAF50' : '#f44336'};
                background-color: ${result.success ? '#f0f8f0' : '#fff0f0'};
            `;
            
            const functionCall = `${result.function}(${result.args.map(arg => 
                typeof arg === 'string' ? `"${arg}"` : String(arg)
            ).join(', ')})`;
            
            resultItem.innerHTML = `
                <div style="font-weight: bold;">${index + 1}. ${functionCall}</div>
                <div style="color: ${result.success ? '#2e7d32' : '#c62828'}; font-size: 11px; margin-top: 3px;">
                    ${result.success ? `✅ ${result.result}` : `❌ ${result.error}`}
                </div>
            `;
            
            this.resultsDiv.appendChild(resultItem);
        });
        
        // 显示错误汇总
        if (executionResult.errors && executionResult.errors.length > 0) {
            const errorsDiv = document.createElement('div');
            errorsDiv.style.cssText = `
                margin-top: 10px;
                padding: 8px;
                background-color: #ffe8e8;
                border-radius: 3px;
            `;
            
            errorsDiv.innerHTML = `
                <div style="font-weight: bold; color: #c62828;">❌ 錯誤:</div>
                ${executionResult.errors.map(error => `<div style="font-size: 11px; margin: 2px 0;">• ${error}</div>`).join('')}
            `;
            
            this.resultsDiv.appendChild(errorsDiv);
        }
    }
    
    clear() {
        this.resultsDiv.innerHTML = '<div style="color: #666;">等待結果...</div>';
        this.statusDiv.textContent = '';
    }
  showRepeatResults(repeatResult) {
    this.resultsDiv.innerHTML = '';
    
    // 显示总体统计
    const summary = document.createElement('div');
    summary.style.cssText = `
        font-weight: bold;
        margin-bottom: 15px;
        padding: 10px;
        background-color: #e3f2fd;
        border-radius: 5px;
    `;
    
    summary.innerHTML = `
        📊 重複執行統計: ${repeatResult.completedIterations}/${repeatResult.totalIterations} 次完成
    `;
    
    this.resultsDiv.appendChild(summary);
    
    // 显示每次执行的结果
    repeatResult.results.forEach((iteration, index) => {
        const iterationDiv = document.createElement('div');
        iterationDiv.style.cssText = `
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: ${iteration.status === 'completed' ? '#f9fff9' : '#fff9f9'};
        `;
        
        iterationDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">
                第 ${iteration.iteration} 次执行 ${iteration.status === 'completed' ? '✅' : '❌'}
            </div>
            ${iteration.status === 'stopped' ? 
                `<div style="color: #ff9800;">${iteration.message}</div>` :
                `<div style="font-size: 12px;">
                    脚本结果: ${iteration.scriptResult.successful_functions}/${iteration.scriptResult.total_functions} 成功
                </div>`
            }
        `;
        
        this.resultsDiv.appendChild(iterationDiv);
    });
  }
}

// 初始化执行器
function initializeBlocklyExecutor() {
    const { resetButton, repeatInput, executeButton, stopButton, statusDiv, resultsDiv } = createExecutorUI();
    
    const executor = new BlocklyScriptExecutor();
    const display = new ExecutionResultDisplay(resultsDiv, statusDiv);
    
    // 回归初始按钮事件
    resetButton.addEventListener('click', async function() {
        resetButton.disabled = true;
        resetButton.textContent = '🔄 重置中...';
        display.showStatus('正在回歸初始狀態...', 'info');
        
        try {
            const results = await executor.resetDevice();
            const successful = results.filter(r => r.success).length;
            
            display.showStatus(`回歸完成 (${successful}/${results.length})`, 'success');
            
            // 显示重置结果
            resultsDiv.innerHTML = results.map(r => 
                `<div style="color: ${r.success ? 'green' : 'red'}">
                    ${r.success ? '✅' : '❌'} ${r.action}: ${r.result || r.error}
                </div>`
            ).join('');
            
        } catch (error) {
            display.showStatus('回歸失败: ' + error.message, 'error');
        } finally {
            resetButton.disabled = false;
            resetButton.textContent = '🏠 回歸初始狀態';
        }
    });
    
    // 执行按钮事件（支持重复）
    executeButton.addEventListener('click', async function() {
        const code = javascriptGenerator.workspaceToCode(ws);
        const repeatCount = parseInt(repeatInput.value) || 1;
        
        if (!code.trim()) {
            display.showStatus('沒有可執行的腳本', 'warning');
            return;
        }
        
        // 更新UI状态
        executeButton.disabled = true;
        resetButton.disabled = true;
        stopButton.disabled = false;
        repeatInput.disabled = true;
        executeButton.textContent = `⏳ 執行中 (0/${repeatCount})`;
        stopButton.style.opacity = '1';
        display.clear();
        
        try {
            if (repeatCount === 1) {
                // 单次执行
                display.showStatus('正在執行脚本...', 'info');
                const result = await executor.execute(code);
                display.showResults(result);
                display.showStatus(
                    result.success ? '脚本執行完成' : '有錯誤', 
                    result.success ? 'success' : 'warning'
                );
            } else {
                // 重复执行
                display.showStatus(`批次執行開始 ${repeatCount} 次...`, 'info');
                
                const repeatResult = await executor.executeWithRepeat(code, repeatCount);
                
                // 显示重复执行结果
                display.showRepeatResults(repeatResult);
                display.showStatus(
                    `批次完成: ${repeatResult.completedIterations}/${repeatResult.totalIterations}`,
                    repeatResult.completedIterations === repeatResult.totalIterations ? 'success' : 'warning'
                );
            }
            
        } catch (error) {
            display.showStatus(`執行失敗: ${error.message}`, 'error');
            resultsDiv.innerHTML = `<div style="color: #c62828;">❌ ${error.message}</div>`;
        } finally {
            // 恢复UI状态
            executeButton.disabled = false;
            resetButton.disabled = false;
            stopButton.disabled = true;
            repeatInput.disabled = false;
            executeButton.textContent = '▶️ 腳本執行';
            stopButton.style.opacity = '0.5';
        }
    });
    
    // 停止按钮事件
    stopButton.addEventListener('click', function() {
        executor.stop();
        display.showStatus('正在停止...', 'warning');
    });
}

// 检查执行器健康状态
async function checkExecutorHealth(executor, display) {
    try {
        const health = await executor.checkHealth();
        
        if (health.status === 'healthy') {
            display.showStatus(
                `✅ 執行就緒 ${health.adb_api_connected ? '(ADB已連接)' : '(ADB未連接)'}`, 
                'success'
            );
        } else {
            display.showStatus('⚠️ 服務異常', 'warning');
        }
    } catch (error) {
        display.showStatus('❌ 無法連接後端端口 (端口8001)', 'error');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 等待其他组件初始化完成
    setTimeout(() => {
        if (typeof ws !== 'undefined' && typeof javascriptGenerator !== 'undefined') {
            initializeBlocklyExecutor();
        } else {
            console.warn('Blockly workspace或未就緒');
        }
    }, 1000);
});

// 导出给全局使用
window.BlocklyExecutor = {
    initializeBlocklyExecutor,
    checkExecutorHealth,
    EXECUTOR_API_BASE
};
