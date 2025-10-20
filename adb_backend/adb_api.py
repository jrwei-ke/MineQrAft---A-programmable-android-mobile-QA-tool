from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import io
from PIL import Image
import uvicorn
import asyncio
import logging
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager  # 添加这行

# 假設你的ADB控制器代碼在同一目錄下的 adb_controller.py 文件中
from adb_controller import ADBController

# 配置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 全局变量
adb_controller: Optional[ADBController] = None
background_task = None

async def auto_update_screenshot():
    """每5秒自动更新截图的后台任务"""
    while True:
        try:
            if adb_controller:
                import os
                
                filename = "screenshot.png"
                screenshots_dir = os.path.join(os.getcwd(), 'screenshots')
                os.makedirs(screenshots_dir, exist_ok=True)
                
                # 添加超时和取消检查
                screenshot_array = adb_controller.screenshot_numpy()
                if screenshot_array is not None:
                    img = Image.fromarray(screenshot_array)
                    saved_path = os.path.join(screenshots_dir, filename)
                    img.save(saved_path)
                    print(f"Auto-updated screenshot")
            
                # 使用可中断的sleep
                await asyncio.sleep(0.5)

                filename = "screenshot1.png"
                screenshots_dir = os.path.join(os.getcwd(), 'screenshots')
                
                # 添加超时和取消检查
                screenshot_array = adb_controller.screenshot_numpy()
                if screenshot_array is not None:
                    img = Image.fromarray(screenshot_array)
                    saved_path = os.path.join(screenshots_dir, filename)
                    img.save(saved_path)
                    print(f"Auto-updated screenshot")
            
                # 使用可中断的sleep
                await asyncio.sleep(0.5)
            
        except asyncio.CancelledError:
            print("Screenshot task cancelled")
            break  # 正确退出循环
        except Exception as e:
            print(f"Auto-update error: {e}")
            try:
                await asyncio.sleep(1)
            except asyncio.CancelledError:
                break

@asynccontextmanager
async def lifespan(app: FastAPI):
    global background_task, adb_controller
    
    # 启动
    try:
        adb_controller = ADBController()
        logger.info("ADB Controller initialized successfully")
        
        background_task = asyncio.create_task(auto_update_screenshot())
        print("Started auto-screenshot update task")
    except Exception as e:
        logger.error(f"Failed to initialize: {e}")
    
    yield
    
    # 关闭
    print("Shutting down...")
    if background_task:
        background_task.cancel()
        try:
            await asyncio.wait_for(background_task, timeout=2.0)
        except asyncio.TimeoutError:
            print("Task cancellation timed out")
        except asyncio.CancelledError:
            print("Task cancelled successfully")
    print("Shutdown complete")

# 創建FastAPI應用
app = FastAPI(
    title="ADB Controller API",
    description="Android設備控制API - 基於ADB的手機自動化操作",
    version="1.0.0",
    lifespan=lifespan
)

app.mount("/screenshots", StaticFiles(directory="screenshots"), name="screenshots")

# 添加CORS中間件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 請求模型定義
class DeviceConfig(BaseModel):
    device_id: Optional[str] = None

class ClickRequest(BaseModel):
    x: int
    y: int

class SlideRequest(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int
    duration_ms: int = 300

class TextRequest(BaseModel):
    text: str

class UnlockRequest(BaseModel):
    direction: str = "up"

class UrlRequest(BaseModel):
    url: str

class AppRequest(BaseModel):
    package_name: str
    activity: Optional[str] = None

class LongPressRequest(BaseModel):
    x: int
    y: int
    duration_ms: int = 1000

class DoubleTapRequest(BaseModel):
    x: int
    y: int


@app.on_event("startup")
async def startup_event():
    """應用啟動時初始化ADB控制器"""
    global adb_controller
    try:
        adb_controller = ADBController()
        logger.info("ADB Controller initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize ADB Controller: {e}")


@app.get("/")
async def root():
    """API根端點"""
    return {
        "message": "ADB Controller API is running",
        "docs": "/docs",
        "openapi": "/openapi.json"
    }


@app.post("/init")
async def initialize_device(config: DeviceConfig):
    """初始化或重新配置設備連接"""
    global adb_controller
    try:
        adb_controller = ADBController(device_id=config.device_id)
        return {"message": "Device initialized successfully", "device_id": config.device_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize device: {str(e)}")

@app.get("/devices")
async def get_devices():
    """獲取連接的設備列表"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        devices = adb_controller.get_devices()
        return {"devices": devices, "count": len(devices)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/screen/size")
async def get_screen_size():
    """獲取屏幕尺寸"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        width, height = adb_controller.get_screen_size()
        return {"width": width, "height": height}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/input/click")
async def click(request: ClickRequest):
    """點擊指定坐標"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.click([request.x, request.y])
        return {"message": f"Clicked at ({request.x}, {request.y})"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/input/slide")
async def slide(request: SlideRequest):
    """滑動手勢"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.slide(request.x1, request.y1, request.x2, request.y2, request.duration_ms)
        return {
            "message": f"Slide from ({request.x1}, {request.y1}) to ({request.x2}, {request.y2})",
            "duration_ms": request.duration_ms
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/input/text")
async def input_text(request: TextRequest):
    """輸入文字"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.text(request.text)
        return {"message": f"Text input: {request.text}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/input/long-press")
async def long_press(request: LongPressRequest):
    """長按操作"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.long_press(request.x, request.y, request.duration_ms)
        return {
            "message": f"Long press at ({request.x}, {request.y})",
            "duration_ms": request.duration_ms
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/input/double-tap")
async def double_tap(request: DoubleTapRequest):
    """雙擊操作"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.double_tap(request.x, request.y)
        return {"message": f"Double tap at ({request.x}, {request.y})"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/screen/unlock")
async def unlock_screen():
    """解鎖屏幕"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        if not adb_controller.is_screen_on():
            adb_controller.unlock_screen_slide('up')
        return {"message": f"Screen unlocked with up slide"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/screen/wake")
async def wake_screen():
    """喚醒屏幕"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        if not adb_controller.is_screen_on():
            adb_controller.wake_screen()
            return {"message": "Screen woken up"}
        else:
            return {"message": "Screen already up"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/screen/status")
async def get_screen_status():
    """獲取屏幕狀態"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        is_on = adb_controller.is_screen_on()
        return {"screen_on": is_on}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/keyboard/status")
async def get_keyboard_status():
    """檢查鍵盤是否顯示"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        is_shown = adb_controller.is_keyboard_shown()
        return {"keyboard_shown": is_shown}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/navigation/home")
async def press_home():
    """按主頁鍵"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.press_home()
        return {"message": "Home button pressed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/navigation/back")
async def press_back():
    """按返回鍵"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.press_back()
        return {"message": "Back button pressed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/navigation/recent")
async def press_recent():
    """打開最近應用"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.press_recent_apps()
        return {"message": "Recent apps opened"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/power/button")
async def press_power():
    """按電源鍵"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.press_power()
        return {"message": "Power button pressed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/volume/up")
async def volume_up():
    """音量加"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.volume_up()
        return {"message": "Volume up pressed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/volume/down")
async def volume_down():
    """音量減"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.volume_down()
        return {"message": "Volume down pressed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/screenshot")
async def save_screenshot_to_local():
    """GET方式保存截图并覆盖文件"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        import os
        
        filename = "screenshot.png"
        
        # 創建build目錄
        build_dir = os.path.join(os.getcwd(), 'build')
        os.makedirs(build_dir, exist_ok=True)
        
        # 獲取截圖並保存
        screenshot_array = adb_controller.screenshot_numpy()
        if screenshot_array is None:
            raise HTTPException(status_code=500, detail="Failed to capture screenshot")
        
        img = Image.fromarray(screenshot_array)
        saved_path = os.path.join(build_dir, filename)
        img.save(saved_path)
        
        return {"message": "Screenshot updated"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/app/open")
async def open_app(request: AppRequest):
    """打開應用"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.open_app(request.package_name, request.activity)
        return {
            "message": f"App opened: {request.package_name}",
            "activity": request.activity
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/app/close")
async def close_all_apps():
    """關閉所有應用"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.close_app()
        return {"message": "All apps closed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/app/current")
async def get_current_app():
    """獲取當前前台應用"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        current_app = adb_controller.get_current_app()
        return {"current_app": current_app}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/browser/open")
async def open_chrome_with_url(request: UrlRequest):
    """用Chrome打開URL"""
    try:
        if not adb_controller:
            raise HTTPException(status_code=400, detail="ADB Controller not initialized")
        
        adb_controller.open_chrome_with_url(request.url)
        return {"message": f"Chrome opened with URL: {request.url}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """健康檢查端點"""
    try:
        if not adb_controller:
            return {"status": "unhealthy", "message": "ADB Controller not initialized"}
        
        # 嘗試獲取設備列表來測試連接
        devices = adb_controller.get_devices()
        
        return {
            "status": "healthy",
            "adb_initialized": True,
            "connected_devices": len(devices),
            "devices": devices
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
    

# API使用示例的端點
@app.get("/examples")
async def get_api_examples():
    """獲取API使用示例"""
    examples = {
        "基本操作": {
            "獲取設備列表": "GET /devices",
            "獲取屏幕尺寸": "GET /screen/size",
            "點擊": "POST /input/click {'x': 500, 'y': 800}",
            "滑動": "POST /input/slide {'x1': 100, 'y1': 500, 'x2': 100, 'y2': 200, 'duration_ms': 300}",
            "輸入文字": "POST /input/text {'text': 'Hello World'}",
        },
        "屏幕控制": {
            "喚醒屏幕": "POST /screen/wake",
            "解鎖屏幕": "POST /screen/unlock {'direction': 'up'}",
            "截圖": "GET /screenshot?format=base64",
            "檢查屏幕狀態": "GET /screen/status"
        },
        "導航操作": {
            "主頁": "POST /navigation/home",
            "返回": "POST /navigation/back",
            "最近應用": "POST /navigation/recent"
        },
        "應用管理": {
            "打開應用": "POST /app/open {'package_name': 'com.android.chrome'}",
            "關閉所有應用": "POST /app/close",
            "獲取當前應用": "GET /app/current"
        }
    }
    
    return {
        "message": "ADB Controller API使用示例",
        "base_url": "http://localhost:8000",
        "documentation": "/docs",
        "examples": examples
    }


if __name__ == "__main__":
    # 運行API服務器
    uvicorn.run(
        "adb_api:app",  # 假設這個文件名為 main.py
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
