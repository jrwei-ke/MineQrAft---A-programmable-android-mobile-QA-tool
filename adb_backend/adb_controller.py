import subprocess
import time
from typing import Optional, Tuple, List
import re
import io
from datetime import datetime 
import numpy as np
from PIL import Image


class ADBController:
    """Android Debug Bridge (ADB) Controller for device automation"""
    
    def __init__(self, device_id: Optional[str] = None):
        """
        Initialize ADB Controller
        
        Args:
            device_id: Specific device ID for multiple devices (optional)
        """
        self.device_id = device_id
        self.base_cmd = ['adb']
        
        if device_id:
            self.base_cmd.extend(['-s', device_id])
    
    def _execute_command(self, command: List[str]) -> str:
        """
        Execute ADB command
        
        Args:
            command: Command parts to execute
            
        Returns:
            Command output as string
        """
        try:
            full_cmd = self.base_cmd + command
            result = subprocess.run(
                full_cmd,
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            print(f"Command failed: {e}")
            return ""
    
    def get_devices(self) -> List[str]:
        """Get list of connected devices"""
        output = self._execute_command(['devices'])
        devices = []
        for line in output.split('\n')[1:]:
            if '\tdevice' in line:
                devices.append(line.split('\t')[0])
        return devices
    
    def get_screen_size(self) -> Tuple[int, int]:
        """
        Get device screen dimensions
        
        Returns:
            Tuple of (width, height)
        """
        output = self._execute_command(['shell', 'wm', 'size'])
        match = re.search(r'Physical size: (\d+)x(\d+)', output)
        if match:
            return int(match.group(1)), int(match.group(2))
        return 1080, 1920  # Default fallback
    
    def click(self, coords: List[int]) -> None:
        """
        Perform a tap/click at specified coordinates
        
        Args:
            coords: [x, y] coordinates as list or tuple
        """
        x, y = coords
        self._execute_command(['shell', 'input', 'tap', str(x), str(y)])
    
    def slide(self, x1: int, y1: int, x2: int, y2: int, 
              duration_ms: int = 300) -> None:
        """
        Perform swipe/slide gesture
        
        Args:
            x1: Starting X coordinate
            y1: Starting Y coordinate
            x2: Ending X coordinate
            y2: Ending Y coordinate
            duration_ms: Swipe duration in milliseconds
        """
        self._execute_command([
            'shell', 'input', 'swipe',
            str(x1), str(y1), str(x2), str(y2), str(duration_ms)
        ])
    
    def text(self, text: str) -> None:
        """
        Input text (requires text field to be focused)
        
        Args:
            text: Text to input (spaces will be escaped)
        """
        # Escape spaces and special characters
        escaped_text = text.replace(' ', '%s').replace('&', '\\&')
        escaped_text = escaped_text.replace('(', '\\(').replace(')', '\\)')
        escaped_text = escaped_text.replace('<', '\\<').replace('>', '\\>')
        escaped_text = escaped_text.replace('|', '\\|').replace(';', '\\;')
        escaped_text = escaped_text.replace('*', '\\*').replace('?', '\\?')
        escaped_text = escaped_text.replace('"', '\\"').replace("'", "\\'")
        
        self._execute_command(['shell', 'input', 'text', escaped_text])
    
    def unlock_screen_slide(self, direction: str = 'up') -> None:
        """
        Unlock screen with slide gesture
        
        Args:
            direction: Slide direction ('up', 'down', 'left', 'right')
        """
        width, height = self.get_screen_size()
        
        # Calculate swipe coordinates based on direction
        directions = {
            'up': (width // 2, height * 3 // 4, width // 2, height // 4),
            'down': (width // 2, height // 4, width // 2, height * 3 // 4),
            'left': (width * 3 // 4, height // 2, width // 4, height // 2),
            'right': (width // 4, height // 2, width * 3 // 4, height // 2)
        }
        
        if direction.lower() in directions:
            coords = directions[direction.lower()]
            # Wake up screen first
            self.wake_screen()
            time.sleep(0.5)
            # Perform unlock swipe
            self.slide(*coords, duration_ms=500)
        else:
            print(f"Invalid direction: {direction}")
    
    def open_chrome_with_url(self, url: str) -> None:
        # Make sure URL has protocol
        if not url.startswith('http://') and not url.startswith('https://'):
            url = 'https://' + url
        
        self._execute_command([
            'shell', 'am', 'start', 
            '-a', 'android.intent.action.VIEW',
            '-d', f'"{url}"',
            'com.android.chrome'
        ])
    
    def wake_screen(self) -> None:
        """Wake up device screen"""
        self._execute_command(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP'])
    
    def press_home(self) -> None:
        """Press home button"""
        self._execute_command(['shell', 'input', 'keyevent', 'KEYCODE_HOME'])
    
    def press_back(self) -> None:
        """Press back button (last page)"""
        self._execute_command(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
    
    def press_last_page(self) -> None:
        """Alias for press_back - navigate to previous page"""
        self.press_back()
    
    def close_app(self, package_name: Optional[str] = None) -> None:
        """
        Close all apps by clicking Clear All button in recent apps
        
        Args:
            package_name: Ignored - always closes all apps
        """
        width, height = self.get_screen_size()
        
        # Open recent apps menu
        self.press_recent_apps()
        time.sleep(1.5)
        
        # Click 'Clear all' button - adjust coordinates for your device
        # Most common position is bottom center
        self.click([width // 2, 1840])
        time.sleep(0.5)
        
        # Return to home screen
        self.press_home()
    
    def get_current_app(self) -> Optional[str]:
        """Get current foreground app package name"""
        output = self._execute_command([
            'shell', 'dumpsys', 'window', 'windows'
        ])
        
        # Look for mCurrentFocus or mFocusedApp
        for line in output.split('\n'):
            if 'mCurrentFocus' in line or 'mFocusedApp' in line:
                match = re.search(r'([a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+)/', line)
                if match:
                    return match.group(1)
        return None
    
    def press_recent_apps(self) -> None:
        """Open recent apps menu"""
        self._execute_command(['shell', 'input', 'keyevent', 'KEYCODE_APP_SWITCH'])
    
    def press_power(self) -> None:
        """Press power button"""
        self._execute_command(['shell', 'input', 'keyevent', 'KEYCODE_POWER'])
    
    def volume_up(self) -> None:
        """Press volume up button"""
        self._execute_command(['shell', 'input', 'keyevent', 'KEYCODE_VOLUME_UP'])
    
    def volume_down(self) -> None:
        """Press volume down button"""
        self._execute_command(['shell', 'input', 'keyevent', 'KEYCODE_VOLUME_DOWN'])
    
    def screenshot(self, filename: str = 'screenshot.png', 
                   local_path: str = '.') -> None:
        """
        Take screenshot and save to local machine
        
        Args:
            filename: Screenshot filename
            local_path: Local directory to save screenshot
        """
        device_path = f'/sdcard/{filename}'
        local_file = f'{local_path}/{filename}'
        
        # Take screenshot on device
        self._execute_command(['shell', 'screencap', '-p', device_path])
        # Pull to local machine
        self._execute_command(['pull', device_path, local_file])
        # Clean up device
        self._execute_command(['shell', 'rm', device_path])
        print(f"Screenshot saved to {local_file}")

    def screenshot_numpy(self) -> np.ndarray:
        """
        Take screenshot and return as numpy array
        
        Returns:
            numpy.ndarray: Screenshot as RGB numpy array with shape (height, width, 3)
                          Returns None if screenshot fails
        """
        try:
            # Capture screenshot directly to stdout as PNG
            full_cmd = self.base_cmd + ['shell', 'screencap', '-p']
            result = subprocess.run(
                full_cmd,
                capture_output=True,
                check=True
            )
            
            # Check if we got data
            if not result.stdout:
                print("Screenshot failed: No data received")
                return None
            
            # Convert bytes to PIL Image
            img = Image.open(io.BytesIO(result.stdout))
            
            # Convert to RGB if necessary (remove alpha channel if present)
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Convert to numpy array
            img_array = np.array(img)
            
            # Verify the shape is correct
            if len(img_array.shape) != 3:
                print(f"Unexpected image shape: {img_array.shape}")
                return None
                
            return img_array
            
        except subprocess.CalledProcessError as e:
            print(f"Screenshot failed: {e}")
            return None
        except Exception as e:
            print(f"Error processing screenshot: {e}")
            return None
    
    def is_screen_on(self) -> bool:
        """Check if screen is on"""
        output = self._execute_command(['shell', 'dumpsys', 'power'])
        return 'mWakefulness=Awake' in output
    
    def open_app(self, package_name: str, activity: Optional[str] = None) -> None:
        """
        Open app by package name
        
        Args:
            package_name: App package name
            activity: Specific activity to launch (optional)
        """
        if activity:
            component = f'{package_name}/{activity}'
        else:
            # Use monkey to launch main activity
            self._execute_command([
                'shell', 'monkey', '-p', package_name, 
                '-c', 'android.intent.category.LAUNCHER', '1'
            ])
            return
        
        self._execute_command([
            'shell', 'am', 'start', '-n', component
        ])
    
    def long_press(self, x: int, y: int, duration_ms: int = 1000) -> None:
        """
        Perform long press at coordinates
        
        Args:
            x: X coordinate
            y: Y coordinate
            duration_ms: Press duration in milliseconds
        """
        self.slide(x, y, x, y, duration_ms)
    
    def double_tap(self, x: int, y: int) -> None:
        """
        Perform double tap at coordinates
        
        Args:
            x: X coordinate
            y: Y coordinate
        """
        self.click([x, y])
        time.sleep(0.05)
        self.click([x, y])

    def is_keyboard_shown(self) -> bool:
        """
        Check if the soft keyboard is currently visible
        
        Returns:
            bool: True if keyboard is shown, False otherwise
        """
        try:
            # Method 1: Check input method visibility
            output = self._execute_command(['shell', 'dumpsys', 'input_method'])
            
            # Look for indicators that keyboard is visible
            visible_indicators = [
                'mInputShown=true',
                'mShowRequested=true',
                'mIsInputViewShown=true'
            ]
            
            for indicator in visible_indicators:
                if indicator in output:
                    return True
            
            # Method 2: Alternative check using window focus
            window_output = self._execute_command(['shell', 'dumpsys', 'window', 'InputMethod'])
            if 'mHasSurface=true' in window_output and 'shown=true' in window_output:
                return True
            
            return False
            
        except Exception as e:
            print(f"Error checking keyboard status: {e}")
            return False


# Example usage
if __name__ == "__main__":
    # Initialize controller
    adb = ADBController()
    
    # Get connected devices
    devices = adb.get_devices()
    print(f"Connected devices: {devices}")
    
    if devices:
        # Example operations
        # Wake and unlock screen
        adb.wake_screen()
        time.sleep(1)
        adb.unlock_screen_slide('up')
        
        # Navigate home
        adb.press_home()
        time.sleep(1)
        
        # Click at center of screen
        width, height = adb.get_screen_size()
        adb.click([width // 2, height // 2])
        
        # Swipe example
        adb.slide(100, 500, 100, 200, 300)
        
        # Type text (if text field is focused)
        # adb.text("Hello World")
        
        # Go back
        adb.press_last_page()
        
        # Take screenshot
        # adb.screenshot('test_screenshot.png')
        
        print("ADB operations completed")
