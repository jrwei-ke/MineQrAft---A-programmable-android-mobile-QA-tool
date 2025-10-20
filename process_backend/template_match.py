import random
import cv2
import numpy as np

def preprocess_image(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply threshold to keep only bright regions
    _, bright_mask = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY)
    
    # Apply mask to original grayscale
    bright_only = cv2.bitwise_and(gray, gray, mask=bright_mask)
    
    # Optional: mild blur
    blurred = cv2.GaussianBlur(bright_only, (3, 3), 0)
    return blurred

# 精確匹配函數
def refined_template_matching(template, search_area):
    if template.shape[0] > search_area.shape[0] or template.shape[1] > search_area.shape[1]:
        print("Template size is larger than the image. Resizing the template...")
        return (None, None, None)
    result = cv2.matchTemplate(search_area, template, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(result)
    h, w = template.shape[:2]
    top_left = (max_loc[0], max_loc[1])
    bottom_right = (top_left[0] + w, top_left[1] + h)
    return (top_left, bottom_right, max_val)


def mixed_template_match(template_path, frame_path='../adb_backend/screenshots/screenshot.png'):
    frame = cv2.imread(frame_path)
    if frame is None:
        frame = cv2.imread('../adb_backend/screenshots/screenshot1.png')
    template = cv2.imread(template_path)
    if frame is None or template is None:
        return None
    # 預處理圖片
    top_left_global, bottom_right_global = None, None
    template_preprocessed = preprocess_image(template)
    frame_preprocessed = preprocess_image(frame)

    # 初始化 SIFT 檢測器
    sift = cv2.SIFT_create()

    # 提取模板和場景的特徵點和描述子
    kp1, des1 = sift.detectAndCompute(template_preprocessed, None)
    kp2, des2 = sift.detectAndCompute(frame_preprocessed, None)

    # 匹配特徵點
    bf = cv2.BFMatcher(cv2.NORM_L2, crossCheck=True)
    if des1 is None or des2 is None:
        return None
    matches = bf.match(des1, des2)

    # 按距離排序匹配結果
    matches = sorted(matches, key=lambda x: x.distance)

    # 獲取匹配點的位置
    if len(matches) > 1:
        matched_pts = np.float32([kp2[m.trainIdx].pt for m in matches[:]])  # 匹配點的場景位置

        # 計算匹配點的邊界框
        x_min, y_min = np.min(matched_pts, axis=0).astype(int)
        x_max, y_max = np.max(matched_pts, axis=0).astype(int)

        # 確保邊界框比模板大
        h, w = template_preprocessed.shape
        margin_x = int(w/2)  # 增加一定邊距
        margin_y = int(h/2)  # 增加一定邊距
        x_min = max(x_min - margin_x, 0)
        y_min = max(y_min - margin_y, 0)
        x_max = min(x_max + margin_x, frame.shape[1])
        y_max = min(y_max + margin_y, frame.shape[0])

        # 裁剪出搜索區域
        search_area = frame[y_min:y_max, x_min:x_max]

        # 在搜索區域內進行模板匹配
        top_left, bottom_right, confidence = refined_template_matching(template_preprocessed, preprocess_image(search_area))
        if top_left is None:
            return None
        # 調整坐標到全局範圍
        top_left_global = (top_left[0] + x_min, top_left[1] + y_min)
        bottom_right_global = (bottom_right[0] + x_min, bottom_right[1] + y_min)

        center = (int((top_left_global[0]+bottom_right_global[0])/2), int((top_left_global[1]+bottom_right_global[1])/2))
        
        if confidence < 0.75:
            # print("not found")
            return None
        #print(f"精確匹配信心值: {confidence}")
    else:
        print("沒有匹配到足夠的特徵點。")
        return None
    #print("found!")
    return center