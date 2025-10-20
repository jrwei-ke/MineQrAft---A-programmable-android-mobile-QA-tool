from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from PIL import Image
from template_match import mixed_template_match
from ocr import OCRProcessor
from pathlib import Path
import uvicorn
import os
import io
import base64
import shutil
import json
import re
import asyncio
import json
import requests
import logging
import time


# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title="Blockly Script Executor API",
    description="执行Blockly生成的脚本代码",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ocr_text = OCRProcessor(lang='ch', fx = 0.5, threshold=0.7)

# ADB API服务器地址（你的手机操作API）
ADB_API_BASE = "http://localhost:8000"

# 请求模型
class ScriptRequest(BaseModel):
    code: str
    
class ExecutionResult(BaseModel):
    success: bool
    results: List[Dict[str, Any]]
    total_functions: int
    successful_functions: int
    errors: List[str]

class CroppedTemplateRequest(BaseModel):
    filename: str
    image_data: str

@app.get("/")
async def root():
    """API根端点"""
    return {
        "message": "Blockly Script Executor API is running",
        "docs": "/docs",
        "adb_api": ADB_API_BASE
    }

@app.post("/execute", response_model=ExecutionResult)
async def execute_blockly_script(request: ScriptRequest):
    """执行Blockly生成的脚本"""
    try:
        executor = BlocklyScriptExecutor()
        result = await executor.execute(request.code)
        return result
        
    except Exception as e:
        logger.error(f"Script execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Script execution failed: {str(e)}")

@app.get("/health")
async def health_check():
    """健康检查"""
    try:
        # 检查ADB API是否可达
        response = requests.get(f"{ADB_API_BASE}/health", timeout=5)
        adb_status = response.status_code == 200
    except:
        adb_status = False
    
    return {
        "status": "healthy",
        "adb_api_connected": adb_status,
        "adb_api_url": ADB_API_BASE
    }
@app.post("/templates/save-cropped")
async def save_cropped_template(request: CroppedTemplateRequest):
    """保存裁切後的模板圖片（接收 base64 數據）"""
    try:
        # 處理 base64 數據
        image_data = request.image_data
        filename = request.filename
        
        print(f"Received filename: {filename}")
        print(f"Image data preview: {image_data[:50]}...")
        
        # 檢查數據格式
        if not image_data:
            raise HTTPException(status_code=400, detail="圖片數據為空")
        
        if image_data.startswith('data:image'):
            # 移除 data:image/png;base64, 前綴
            try:
                image_data = image_data.split(',')[1]
            except IndexError:
                raise HTTPException(status_code=400, detail="無效的 data URL 格式")
        
        # 解碼 base64 數據
        try:
            # 確保 base64 字符串長度是4的倍數
            missing_padding = len(image_data) % 4
            if missing_padding:
                image_data += '=' * (4 - missing_padding)
                
            image_bytes = base64.b64decode(image_data)
            print(f"Decoded image size: {len(image_bytes)} bytes")
            
        except Exception as e:
            print(f"Base64 decode error: {e}")
            raise HTTPException(status_code=400, detail=f"無效的 base64 圖片數據: {str(e)}")
        
        # 驗證圖片數據
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img.verify()  # 驗證圖片完整性
            print(f"Image verified: {img.format}, {img.size}")
        except Exception as e:
            print(f"Image verification error: {e}")
            raise HTTPException(status_code=400, detail=f"無效的圖片數據: {str(e)}")
        
        # 創建 templates 目錄
        templates_dir = os.path.join(os.getcwd(), 'templates')
        os.makedirs(templates_dir, exist_ok=True)
        
        # 處理文件名
        if not filename.lower().endswith('.png'):
            filename += '.png'
        
        file_path = os.path.join(templates_dir, filename)
        
        # 如果文件已存在，添加時間戳
        if os.path.exists(file_path):
            filename_without_ext = filename.rsplit('.', 1)[0]
            filename = f"{filename_without_ext}_.png"
            file_path = os.path.join(templates_dir, filename)
        
        # 保存文件
        with open(file_path, "wb") as f:
            f.write(image_bytes)
        
        print(f"File saved to: {file_path}")
         # 確保文件路徑存在
        json_Path = '../frontend/build/templates.json'
        json_file = Path(json_Path)
        
        # 讀取現有的 JSON 文件，如果不存在則創建空列表
        if json_file.exists():
            with open(json_file, 'r', encoding='utf-8') as f:
                try:
                    templates_data = json.load(f)
                    if not isinstance(templates_data, list):
                        templates_data = []
                except json.JSONDecodeError:
                    templates_data = []
        else:
            templates_data = []
        
        # 創建新的模板條目
        new_template = {
            "id": filename,  # 移除副檔名作為 ID
            "name": filename.rsplit('.', 1)[0]
        }
        
        # 檢查是否已存在相同的模板（基於 ID）
        existing_ids = [template.get('id') for template in templates_data if isinstance(template, dict)]
        
        if new_template['id'] not in existing_ids:
            templates_data.append(new_template)
            
            # 寫回 JSON 文件
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(templates_data, f, ensure_ascii=False, indent=2)
            
            print(f"Added template '{filename}'")
        else:
            print(f"Template '{filename}' already exists")
        
        return {
            "message": f"模板 '{filename}' 已成功保存",
            "filename": filename,
            "path": f"templates/{filename}",
            "size_bytes": len(image_bytes)
        }
        
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"保存模板時發生錯誤: {str(e)}")

@app.post("/reset-device")
async def reset_device():
    """重置设备到初始状态"""
    try:
        reset_actions = [
            {'method': 'POST', 'endpoint': '/app/close', 'description': '关闭所有应用'},
            {'method': 'POST', 'endpoint': '/navigation/home', 'description': '回到主页'},
        ]
        
        results = []
        executor = BlocklyScriptExecutor()
        
        for action in reset_actions:
            try:
                result = await executor.call_adb_api(
                    action['method'], 
                    action['endpoint']
                )
                results.append({
                    'action': action['description'],
                    'success': True,
                    'result': result
                })
                
                # 操作间延迟
                await asyncio.sleep(1)
                
            except Exception as e:
                results.append({
                    'action': action['description'],
                    'success': False,
                    'error': str(e)
                })
        
        successful_count = sum(1 for r in results if r['success'])
        
        return {
            'success': successful_count == len(results),
            'results': results,
            'message': f'重置完成: {successful_count}/{len(results)} 成功'
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重置设备失败: {str(e)}")

class BlocklyScriptExecutor:
    """Blockly脚本执行器"""
    
    def __init__(self):
        self.results = []
        self.errors = []
        self.templateId = ''
        self.templatePos = [0,0]
        self.OcrPos = [0,0]
        
    async def execute(self, code: str) -> ExecutionResult:
        """执行代码"""
        self.results = []
        self.errors = []
        
        logger.info(f"Executing script: {code}")
        
        # 解析函数调用
        function_calls = self.parse_function_calls(code)
        
        logger.info(f"Found {len(function_calls)} function calls")
        
        # 执行每个函数调用
        for func_name, args in function_calls:
            try:
                result = await self.execute_function(func_name, args)
                self.results.append({
                    "function": func_name,
                    "args": args,
                    "result": result,
                    "success": True
                })
                logger.info(f"Executed {func_name}({args}) -> {result}")
                
            except Exception as e:
                error_msg = f"Function {func_name}({args}) failed: {str(e)}"
                self.errors.append(error_msg)
                self.results.append({
                    "function": func_name,
                    "args": args,
                    "error": str(e),
                    "success": False
                })
                logger.error(error_msg)
        
        successful_count = sum(1 for r in self.results if r.get("success", False))
        
        return ExecutionResult(
            success=len(self.errors) == 0,
            results=self.results,
            total_functions=len(function_calls),
            successful_functions=successful_count,
            errors=self.errors
        )
    
    def parse_function_calls(self, code: str) -> List[tuple]:
        """解析代码中的函数调用"""
        # 匹配函数调用的正则表达式
        pattern = r'(\w+)\s*\((.*?)\)\s*;'
        matches = re.findall(pattern, code, re.MULTILINE)
        
        function_calls = []
        for func_name, args_str in matches:
            if func_name not in ['function', 'while', 'if', 'for']:  # 排除控制结构
                args = self.parse_arguments(args_str)
                function_calls.append((func_name, args))
                
        return function_calls
    
    def parse_arguments(self, args_str: str) -> List[Any]:
        """解析函数参数"""
        if not args_str.strip():
            return []
            
        args = []
        # 分割参数，处理字符串中的逗号
        current_arg = ""
        in_string = False
        quote_char = None
        
        for char in args_str:
            if char in ['"', "'"] and not in_string:
                in_string = True
                quote_char = char
                current_arg += char
            elif char == quote_char and in_string:
                in_string = False
                quote_char = None
                current_arg += char
            elif char == ',' and not in_string:
                if current_arg.strip():
                    args.append(self.convert_argument(current_arg.strip()))
                current_arg = ""
            else:
                current_arg += char
        
        # 处理最后一个参数
        if current_arg.strip():
            args.append(self.convert_argument(current_arg.strip()))
            
        return args
    
    def convert_argument(self, arg: str) -> Any:
        """转换参数类型"""
        arg = arg.strip()
        
        # 字符串
        if (arg.startswith('"') and arg.endswith('"')) or (arg.startswith("'") and arg.endswith("'")):
            return arg[1:-1]
        
        # null
        if arg.lower() == 'null' or arg.lower() == 'none':
            return None
        
        # 布尔值
        if arg.lower() == 'true':
            return True
        if arg.lower() == 'false':
            return False
        
        # 数字
        if arg.isdigit() or (arg.startswith('-') and arg[1:].isdigit()):
            return int(arg)
        
        try:
            return float(arg)
        except ValueError:
            pass
        
        # 其他情况返回字符串
        return arg
    
    async def execute_function(self, func_name: str, args: List[Any]) -> str:
        """执行具体函数"""
        
        if func_name == 'click':
            return await self.call_adb_api('POST', '/input/click', {
                'x': int(args[0]) if len(args) > 0 else 0,
                'y': int(args[1]) if len(args) > 1 else 0
            })
            
        elif func_name == 'slide':
            return await self.call_adb_api('POST', '/input/slide', {
                'x1': int(args[0]) if len(args) > 0 else 0,
                'y1': int(args[1]) if len(args) > 1 else 0,
                'x2': int(args[2]) if len(args) > 2 else 0,
                'y2': int(args[3]) if len(args) > 3 else 0,
                'duration_ms': int(args[4]) if len(args) > 4 else 300
            })
            
        elif func_name == 'text':
            return await self.call_adb_api('POST', '/input/text', {
                'text': str(args[0]) if len(args) > 0 else ''
            })
            
        elif func_name == 'wait':
            duration_ms = int(args[0]) if len(args) > 0 else 1000
            await asyncio.sleep(duration_ms / 1000)
            return f"Waited {duration_ms}ms"
            
        elif func_name == 'go_url':
            return await self.call_adb_api('POST', '/browser/open', {
                'url': str(args[0]) if len(args) > 0 else ''
            })
            
        elif func_name == 'press_home':
            return await self.call_adb_api('POST', '/navigation/home')
            
        elif func_name == 'press_back':
            return await self.call_adb_api('POST', '/navigation/back')
            
        elif func_name == 'long_press':
            return await self.call_adb_api('POST', '/input/long-press', {
                'x': int(args[0]) if len(args) > 0 else 0,
                'y': int(args[1]) if len(args) > 1 else 0,
                'duration_ms': int(args[2]) if len(args) > 2 else 1000
            })
            
        elif func_name == 'double_tap':
            return await self.call_adb_api('POST', '/input/double-tap', {
                'x': int(args[0]) if len(args) > 0 else 0,
                'y': int(args[1]) if len(args) > 1 else 0
            })
        
        elif func_name == 'find_template':
            path = 'templates/'+args[0]
            self.templatePos = mixed_template_match(path)
            return f'pos at x:{self.templatePos[0]} y:{self.templatePos[1]}'
        
        elif func_name == 'find_text':
            goal = args[0]
            result = ocr_text.mask_ocr()
            self.OcrPos = ocr_text.re_ocr(result, goal)
            return f'text:{self.OcrPos}'
            
        elif func_name == 'click_object':
            obj = args[0]
            print(obj)
            if obj == 'template':
                if self.templatePos == [0,0]:
                    return f"Template  {obj}"
                else:
                    return await self.call_adb_api('POST', '/input/click', {
                    'x': int(self.templatePos[0]),
                    'y': int(self.templatePos[1])
                })
            elif obj == 'text':
                if self.OcrPos == [0,0]:
                    return f"Template  {obj}"
                else:
                    return await self.call_adb_api('POST', '/input/click', {
                    'x': int(self.OcrPos[0]),
                    'y': int(self.OcrPos[1])
                })
            elif obj == 'home':
                return await self.call_adb_api('POST', '/navigation/home')
            elif obj == 'last_page':
                return await self.call_adb_api('POST', '/navigation/back')
            else:
                return "loading"
            
        elif func_name == 'check_template':
            path = 'templates/'+args[0]
            pos_temp = None
            time.sleep(0.25)
            while pos_temp is None:
                pos_temp = mixed_template_match(path)
                time.sleep(0.25)
            self.templatePos = pos_temp
            return f'pos at x:{self.templatePos[0]} y:{self.templatePos[1]}'

        elif func_name == 'check_text':
            goal = args[0]
            pos_temp = None
            time.sleep(0.25)
            try:
                while pos_temp is None:
                    result = ocr_text.mask_ocr()
                    pos_temp = ocr_text.re_ocr(result, goal)
                    time.sleep(0.25)
            except Exception as e:
                print(f"Exception in loop: {e}")
                return None  # This would cause the None return
            self.OcrPos = pos_temp
            return f'text:{self.OcrPos}'
            
        else:
            raise Exception(f"Unknown function: {func_name}")

    async def call_adb_api(self, method: str, endpoint: str, data: Optional[Dict] = None) -> str:
        """调用ADB API"""
        import aiohttp
        
        url = f"{ADB_API_BASE}{endpoint}"
        
        try:
            async with aiohttp.ClientSession() as session:
                if method.upper() == 'POST':
                    async with session.post(url, json=data if data else {}) as response:
                        if response.status == 200:
                            result = await response.json()
                            return result.get('message', 'Success')
                        else:
                            error_text = await response.text()
                            raise Exception(f"API call failed: {response.status} - {error_text}")
                elif method.upper() == 'GET':
                    async with session.get(url) as response:
                        if response.status == 200:
                            result = await response.json()
                            return result.get('message', 'Success')
                        else:
                            error_text = await response.text()
                            raise Exception(f"API call failed: {response.status} - {error_text}")
        except aiohttp.ClientError as e:
            raise Exception(f"Network error: {str(e)}")

if __name__ == "__main__":
    # 运行API服务器
    uvicorn.run(
        "api:app",  # 假设文件名为 blockly_executor.py
        host="0.0.0.0",
        port=8001,  # 不同端口，避免冲突
        reload=True,
        log_level="info"
    )