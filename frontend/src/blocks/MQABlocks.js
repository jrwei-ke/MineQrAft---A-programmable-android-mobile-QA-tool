// src/blocks/templateBlocks.js
import * as Blockly from 'blockly';
import {javascriptGenerator} from 'blockly/javascript';

// 在區塊外部載入模板 - 使用同步的方式
let templateOptions = [['Loading...', 'loading']];
let isLoaded = false;
let clickObjectOptions = [['Loading...', 'loading']];
let isClickLoaded = false;

// 載入模板的函數
function loadTemplates() {
  fetch('/templates.json') //templates 清單 Leo
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load templates');
      }
      return response.json();
    })
    .then(templates => {
      if (templates.length === 0) {
        templateOptions = [['empty', 'empty']];
      } else {
        templateOptions = templates.map(t => [t.name, t.id]);
      }
      isLoaded = true;
      console.log('Templates loaded:', templateOptions);
      
      // 更新所有已存在的 find_template 區塊
      updateAllDropdowns();
    })
    .catch(error => {
      console.error('Error loading templates:', error);
      templateOptions = [['empty', 'empty']];
      isLoaded = true;
    });
}
function loadClickObjects() {
  fetch('/objects.json') // Assumes a new file for click options
    .then(response => response.json())
    .then(objects => {
      clickObjectOptions = objects.map(obj => [obj.name, obj.id]);
      isClickLoaded = true;
      console.log('Click objects loaded:', clickObjectOptions);
      // You may need a separate function to update these dropdowns
      updateAllDropdowns();
    })
    .catch(error => {
      console.error('Error loading click objects:', error);
      clickObjectOptions = [['empty', 'empty']];
      isClickLoaded = true;
    });
}

// 更新所有下拉選單的函數
function updateAllDropdowns() {
  if (Blockly.getMainWorkspace()) {
    const blocks = Blockly.getMainWorkspace().getAllBlocks();
    blocks.forEach(block => {
      // 處理 find_template 區塊
      if (block.type === 'find_template') {
        const dropdown = block.getField('TEMPLATE');
        if (dropdown) {
          dropdown.menuGenerator_ = templateOptions;
          const currentValue = dropdown.getValue();
          const validValues = templateOptions.map(opt => opt[1]);
          if (!validValues.includes(currentValue) && templateOptions.length > 0) {
            dropdown.setValue(templateOptions[0][1]);
          }
        }
      } 
      
      // 新增的部分：處理 click_object 區塊
      else if (block.type === 'click_object') {
        const dropdown = block.getField('CLICK_OBJECT_ID'); // 這裡的欄位名稱必須與你的區塊定義一致
        if (dropdown) {
          // 使用專屬的選項列表
          dropdown.menuGenerator_ = clickObjectOptions;
          const currentValue = dropdown.getValue();
          const validValues = clickObjectOptions.map(opt => opt[1]);
          if (!validValues.includes(currentValue) && clickObjectOptions.length > 0) {
            dropdown.setValue(clickObjectOptions[0][1]);
          }
        }
      }
    });
  }
}

// 初始化時載入模板
loadTemplates();
loadClickObjects();

// find_template Leo------
Blockly.Blocks['find_template'] = {
  init: function() {
    // 使用函數來提供選項，這樣可以動態更新
    const dropdown = new Blockly.FieldDropdown(() => {
      return templateOptions;
    });
    
    // 將 appendDummyInput 替換為 appendField，避免產生任何右側街口。
    this.appendDummyInput()
        .appendField("find template")
        .appendField(dropdown, 'TEMPLATE');
    
    // 新增上下街口
    this.setPreviousStatement(true, null); // 前一個街口 (連接上方的區塊)
    this.setNextStatement(true, null);     // 後一個街口 (連接下方的區塊)
    this.setColour(230);
    this.setTooltip("Find a template and return its coordinates");
    
    // 如果模板還沒載入完成，在區塊創建後更新
    if (isLoaded && templateOptions[0][0] !== 'Loading...') {
      dropdown.setValue(templateOptions[0][1]);
    }
  }
};

// 定義 JavaScript 程式碼生成器
javascriptGenerator.forBlock['find_template'] = function(block) {
  const templateId = block.getFieldValue('TEMPLATE');
  
  if (templateId === 'empty' || templateId === 'loading') {
    // Return a single code string, ending with a semicolon and newline.
    return `find_template(null);\n`;
  }
  
  // Return a single code string, ending with a semicolon and newline.
  const code = `find_template('${templateId}');\n`;
  
  // The generator for a statement block should return only a string, not an array.
  return code;
};
//find_template Leo------

Blockly.Blocks['find_text'] = {
  init: function() {
    // 建立一個文字輸入欄位，預設值為 'google'
    const textInput = new Blockly.FieldTextInput('google');

    this.appendDummyInput()
        .appendField("find text:")
        .appendField(textInput, 'TEXT_VALUE');
    
    // 設定區塊為上下連接的指令區塊
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    
    this.setColour(230); // 選擇一個不同的顏色
    this.setTooltip("A block for find text.");
  }
};
javascriptGenerator.forBlock['find_text'] = function(block) {
  // 取得使用者輸入的文字
  const textValue = block.getFieldValue('TEXT_VALUE');

  // 生成 JavaScript 程式碼，將輸入文字用引號包起來
  // 使用 JSON.stringify 以確保特殊字元被正確跳脫
  const code = `find_text(${JSON.stringify(textValue)});\n`;
  
  return code;
};


Blockly.Blocks['wait_time'] = {
  init: function() {
    // 建立一個數字輸入欄位，預設值為 1000
    const numberField = new Blockly.FieldNumber(1000, 0); // 1000 毫秒，最小為 0

    this.appendDummyInput()
        .appendField("wait")
        .appendField(numberField, 'TIME_MS')
        .appendField("ms");
    
    // 設定區塊為上下連接的指令區塊
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    
    this.setColour(50); // 選擇一個不同的顏色以區分
    this.setTooltip("Wait for a specified duration in milliseconds.");
  }
};

// Define JavaScript code generator for 'wait_time'
javascriptGenerator.forBlock['wait_time'] = function(block) {
  const timeMs = block.getFieldValue('TIME_MS');
  const code = `wait(${timeMs});\n`;
  return code;
};


Blockly.Blocks['click'] = {
  init: function() {
    // 建立 X 和 Y 的數字輸入欄位
    const xField = new Blockly.FieldNumber(0);
    const yField = new Blockly.FieldNumber(0);
    
    this.appendDummyInput()
        .appendField("click at X:")
        .appendField(xField, 'X_COORD')
        .appendField("Y:")
        .appendField(yField, 'Y_COORD');
    
    // 設定區塊為上下連接的指令區塊
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    
    this.setColour(100); // 選擇一個不同的顏色
    this.setTooltip("Simulate a mouse click at specified coordinates.");
  }
};

javascriptGenerator.forBlock['click'] = function(block) {
  // 取得 X 和 Y 座標的值
  const x = block.getFieldValue('X_COORD');
  const y = block.getFieldValue('Y_COORD');
  
  // 生成 JavaScript 程式碼
  const code = `click(${x}, ${y});\n`;
  
  return code;
};


Blockly.Blocks['slide'] = {
  init: function() {
    // 建立 X 和 Y 的數字輸入欄位
    const xField = new Blockly.FieldNumber(0);
    const yField = new Blockly.FieldNumber(0);
    const x1Field = new Blockly.FieldNumber(0);
    const y1Field = new Blockly.FieldNumber(0);
    
    this.appendDummyInput()
        .appendField("slide X0:")
        .appendField(xField, 'X0_COORD')
        .appendField("Y0:")
        .appendField(yField, 'Y0_COORD')
        .appendField("to X1:")
        .appendField(x1Field, 'X1_COORD')
        .appendField("Y1:")
        .appendField(y1Field, 'Y1_COORD');
    
    // 設定區塊為上下連接的指令區塊
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    
    this.setColour(100); // 選擇一個不同的顏色
    this.setTooltip("Simulate a mouse click at specified coordinates.");
  }
};


javascriptGenerator.forBlock['slide'] = function(block) {
  // Get the X and Y coordinates.
  const x0 = block.getFieldValue('X0_COORD');
  const y0 = block.getFieldValue('Y0_COORD');
  const x1 = block.getFieldValue('X1_COORD');
  const y1 = block.getFieldValue('Y1_COORD');

  // Generate valid JavaScript code.
  // Pass the coordinates as four separate arguments.
  const code = `slide(${x0}, ${y0}, ${x1}, ${y1});\n`;

  // Return the code string.
  return code;
};

Blockly.Blocks['text_input'] = {
  init: function() {
    // 建立一個文字輸入欄位，預設值為 'Hello World'
    const textInput = new Blockly.FieldTextInput('Hello World');

    this.appendDummyInput()
        .appendField("texting:")
        .appendField(textInput, 'TEXT_VALUE');
    
    // 設定區塊為上下連接的指令區塊
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    
    this.setColour(50); // 選擇一個不同的顏色
    this.setTooltip("A block for entering text or numbers.");
  }
};
javascriptGenerator.forBlock['text_input'] = function(block) {
  // 取得使用者輸入的文字
  const textValue = block.getFieldValue('TEXT_VALUE');

  // 生成 JavaScript 程式碼，將輸入文字用引號包起來
  // 使用 JSON.stringify 以確保特殊字元被正確跳脫
  const code = `text(${JSON.stringify(textValue)});\n`;
  
  return code;
};

// click_object Leo------
Blockly.Blocks['click_object'] = {
  init: function() {
    // 使用函數來提供選項，這樣可以動態更新
    const dropdown = new Blockly.FieldDropdown(() => {
      return clickObjectOptions;
    });
    
    this.appendDummyInput()
        .appendField("click:")
        .appendField(dropdown, 'object');
    
    // 新增上下街口
    this.setPreviousStatement(true, null); // 前一個街口 (連接上方的區塊)
    this.setNextStatement(true, null);     // 後一個街口 (連接下方的區塊)
    this.setColour(100);
    this.setTooltip("Click object");
    
    // 如果模板還沒載入完成，在區塊創建後更新
    if (isLoaded && templateOptions[0][0] !== 'Loading...') {
      dropdown.setValue(templateOptions[0][1]);
    }
  }
};

// 定義 JavaScript 程式碼生成器
javascriptGenerator.forBlock['click_object'] = function(block) {
  const object = block.getFieldValue('object');
  // Return a single code string, ending with a semicolon and newline.
  const code = `click_object('${object}');\n`;
  
  // The generator for a statement block should return only a string, not an array.
  return code;
};

Blockly.Blocks['main_script'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("🟢 Start");
        
    this.appendStatementInput("DO") // 這裡的 "DO" 是巢狀輸入的名稱
        .setCheck(null);
        
    this.setColour(310);
    this.setTooltip("The main script to be executed.");
  }
};

javascriptGenerator.forBlock['main_script'] = function(block) {
  // 取得巢狀輸入 "DO" 中的所有區塊程式碼
  const statements = javascriptGenerator.statementToCode(block, 'DO');
  
  // 將程式碼包裹在一個函數中
  const code = `
function start() {
${statements}}`;
  return code;
};

Blockly.Blocks['go_url'] = {
  init: function() {
    // 建立一個文字輸入欄位，預設值為 'Hello World'
    const textInput = new Blockly.FieldTextInput('www.google.com');

    this.appendDummyInput()
        .appendField("go to url:")
        .appendField(textInput, 'TEXT_VALUE');
    
    // 設定區塊為上下連接的指令區塊
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    
    this.setColour(50); // 選擇一個不同的顏色
    this.setTooltip("A block for entering website.");
  }
};
javascriptGenerator.forBlock['go_url'] = function(block) {
  // 取得使用者輸入的文字
  const textValue = block.getFieldValue('TEXT_VALUE');

  // 生成 JavaScript 程式碼，將輸入文字用引號包起來
  // 使用 JSON.stringify 以確保特殊字元被正確跳脫
  const code = `go_url(${JSON.stringify(textValue)});\n`;
  
  return code;
};



Blockly.Blocks['check_template'] = {
  init: function() {
    const dropdown = new Blockly.FieldDropdown(() => {
      return templateOptions;
    });
    this.appendDummyInput()
        .appendField("check template:")
        .appendField(dropdown, 'TEMPLATE');

    this.setPreviousStatement(true, null); // 前一個街口 (連接上方的區塊)
    this.setNextStatement(true, null);     // 後一個街口 (連接下方的區塊)
    this.setColour(170);
    this.setTooltip("Check template shown on screen or not");
    // 如果模板還沒載入完成，在區塊創建後更新
    if (isLoaded && templateOptions[0][0] !== 'True') {
      dropdown.setValue(templateOptions[0][1]);
    }
  }
};

javascriptGenerator.forBlock['check_template'] = function(block) {
  const templateId = block.getFieldValue('TEMPLATE');
  
  if (templateId === 'empty' || templateId === 'loading') {
    // Return a single code string, ending with a semicolon and newline.
    return `find_template(null);\n`;
  }
  
  // Return a single code string, ending with a semicolon and newline.
  const code = `check_template('${templateId}');\n`;
  
  // The generator for a statement block should return only a string, not an array.
  return code;
};

//   const templateId = block.getFieldValue('TEMPLATE');
  
//   // 取得巢狀輸入 "DO" 中的所有區塊程式碼
  
//   let code = '';
  
//   // 檢查模板 ID 是否有效
//   if (templateId === 'empty' || templateId === 'True') {
//     // 這裡生成一個無限迴圈，因為無法檢查空值
//     code = `check_template`;
//   } else {
//     // 當模板不存在時，持續執行內部區塊
//     code = `while (find_template('${templateId}')) {
// ${statements}}
// `;
//   }
//   return code;
// };



Blockly.Blocks['check_text'] = {
  init: function() {
    const textInput = new Blockly.FieldTextInput('Hello World');

    this.appendDummyInput()
        .appendField("check text:")
        .appendField(textInput, 'TEXT_VALUE');
    this.setPreviousStatement(true, null); // 前一個街口 (連接上方的區塊)
    this.setNextStatement(true, null);     // 後一個街口 (連接下方的區塊)
    this.setColour(170);
    this.setTooltip("Check text shown on screen or not");
  }
};

javascriptGenerator.forBlock['check_text'] = function(block) {
  // 取得使用者輸入的文字
  const textValue = block.getFieldValue('TEXT_VALUE');

  // 生成 JavaScript 程式碼，將輸入文字用引號包起來
  // 使用 JSON.stringify 以確保特殊字元被正確跳脫
  const code = `check_text(${JSON.stringify(textValue)});\n`;
  return code;
}
// 每 5 秒重新載入一次模板（選擇性功能）
// setInterval(loadTemplates, 5000);