import cv2
from paddleocr import PaddleOCR
import numpy as np
import re
import time
from typing import List, Optional, Tuple


class OCRProcessor:
    def __init__(self, lang='en', fx = 0.5, threshold=0.7, use_angle_cls=False):
        """
        初始化 OCR 處理器 - 預加載模型以提升性能
        :param lang: 語言模型 (默認 'en')
        :param threshold: OCR 結果的可信度閾值 (默認 0.7)
        :param use_angle_cls: 是否使用角度分類器 (默認 True)
        :param use_gpu: 是否使用 GPU 加速 (默認 False)
        """
        self.lang = lang
        self.threshold = threshold
        self.use_angle_cls = use_angle_cls
        self.fx = fx
        self.path = '../adb_backend/screenshots/screenshot.png'
        self.path1 = '../adb_backend/screenshots/screenshot1.png'
        
        # 預加載 OCR 模型
        print("Loading OCR model...")
        start_time = time.time()
        self.ocr = PaddleOCR(
            lang=self.lang,
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False
        )
        load_time = time.time() - start_time
        print(f"OCR model loaded in {load_time:.2f} seconds")
        
        # 預熱模型 - 用小圖像進行一次推理
        self._warmup_model()
    
    def _warmup_model(self):
        """
        預熱模型以提升首次推理速度
        """
        print("Warming up OCR model...")
        # 創建一個小的測試圖像
        dummy_image = np.ones((100, 100, 3), dtype=np.uint8) * 255
        try:
            self.ocr.ocr(dummy_image)
            print("OCR model warmed up successfully")
        except Exception as e:
            print(f"Warmup failed: {e}")
    
    def __del__(self):
        """
        析構函數 - 清理資源
        """
        if hasattr(self, 'ocr'):
            del self.ocr

    def preprocess_image(self, image):
        # 轉為灰階圖像 (保持原始邏輯)
        #gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        if self.fx is not 1:
            image = cv2.resize(image, None, fx=self.fx, fy=self.fx, interpolation=cv2.INTER_AREA)
        return image
    
    def interpot(self, coords):
        # Get average of each column
        x_coords = [coords[0], coords[2]]  
        y_coords = [coords[1], coords[3]]  

        avg_x = sum(x_coords) / len(x_coords)
        avg_y = sum(y_coords) / len(y_coords)

        return [int(avg_x), int(avg_y)]
        
    def mask_ocr(self, mask=None):
        image = cv2.imread(self.path)
        if image is None:
            image = cv2.imread(self.path1)
        
        if mask is not None:
            try:
                image[mask['y0']:mask['y1'], mask['x0']:mask['x1']] = [0, 0, 0]
            except:
                print("illegal mask")
        image = self.preprocess_image(image)
        result = self.ocr.ocr(image)
        if result[0] is not None:
            line = result[0]
            print('ok')
            return line
        else:
            return None
        
    def re_ocr(self, result, goal):
        if result is None:
            return None
        for text, coords in zip(result['rec_texts'], result['rec_boxes']):
            if re.search(goal, text):
                print(f"table: {text}")
                goal_pt = self.interpot(coords)
                return [pt / self.fx for pt in goal_pt]
        return None
   
    def get_model_info(self):
        """
        獲取模型信息
        """
        return {
            'language': self.lang,
            'threshold': self.threshold,
            'use_angle_cls': self.use_angle_cls,
            'model_loaded': hasattr(self, 'ocr')
        }


if __name__ == "__main__":
    # 創建 OCR 處理器實例 - 模型會在初始化時預加載
    fx = 0.5
    processor = OCRProcessor(lang='ch', fx = 0.5, threshold=0.7)
    # 顯示模型信息
    print("Model info:", processor.get_model_info())
    
    # 現在所有後續的 OCR 操作都會使用預加載的模型，速度更快
    # 示例：處理圖像
    image = cv2.imread('../adb_backend/screenshots/screenshot.png')
    if image is not None:
        # 各種 OCR 操作都會使用預加載的模型
        result = processor.mask_ocr(image)
        texts = result['rec_texts']
        bboxes = result['rec_boxes']
        bboxes = bboxes/fx
        
        print(f'texts:{texts}')
        print(f'bboxes:{bboxes}')
        [print(x) for x in bboxes[0]]
        
        # Create a copy of the image to draw on
        image_with_boxes = image.copy()
        print(image.shape)
        
        # Draw bounding boxes in format [x1, x2, y1, y2]
        for i, bbox in enumerate(bboxes):
            x1, y1, x2, y2 = map(int, bbox)
            
            # Draw the bounding box rectangle
            cv2.rectangle(image_with_boxes, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Add text label if available
            if i < len(texts):
                # Put text near the top-left corner of the bounding box
                cv2.putText(image_with_boxes, texts[i], (x1, y1-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
        
        # Display the image with bounding boxes
        cv2.imshow('OCR Results', image_with_boxes)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        
    else:
        print("Could not load test image")
