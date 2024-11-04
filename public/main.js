// main.js

// BlocklyとJavaScriptジェネレーターをインポート
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// 日本語のメッセージをインポート
import 'blockly/msg/ja';

// Blocklyのワークスペースを初期化
const workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('toolbox'),
    scrollbars: true,
    trashcan: true,
    media: 'blockly/media/'
});

// カスタムブロックの定義とジェネレーター

// 離陸ブロック
Blockly.Blocks['takeoff'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("離陸");
        this.setPreviousStatement(false, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip("ドローンを離陸させます");
    }
};

// JavaScriptジェネレーターの定義
javascriptGenerator.forBlock['takeoff'] = function (block) {
    var code = "sendCommand('takeoff');\n";
    return code;
};

// 着陸ブロック
Blockly.Blocks['land'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("着陸");
        this.setPreviousStatement(true, null);
        this.setNextStatement(false, null);
        this.setColour(160);
        this.setTooltip("ドローンを着陸させます");
    }
};

javascriptGenerator.forBlock['land'] = function (block) {
    var code = "sendCommand('land');\n";
    return code;
};

// 移動系コマンドのブロック定義（前進、後退、左、右、上昇、下降）
const moveCommands = ['forward', 'back', 'left', 'right', 'up', 'down'];
moveCommands.forEach(function (command) {
    console.log(`adding command: ${command}`);
    Blockly.Blocks[command] = {
        init: function () {
            this.appendValueInput("DISTANCE")
                .setCheck("Number")
                .appendField(command === 'forward' ? '前進' :
                    command === 'back' ? '後退' :
                        command === 'left' ? '左移動' :
                            command === 'right' ? '右移動' :
                                command === 'up' ? '上昇' :
                                    '下降');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip("ドローンを" + (command === 'forward' ? '前進' :
                command === 'back' ? '後退' :
                    command === 'left' ? '左移動' :
                        command === 'right' ? '右移動' :
                            command === 'up' ? '上昇' : '下降') + "させます");
        }
    };

    javascriptGenerator.forBlock[command] = function (block) {
        var value_distance = javascriptGenerator.valueToCode(block, 'DISTANCE', javascriptGenerator.ORDER_ATOMIC);
        var code = "sendCommand('" + command + " ' + " + value_distance + ");\n";
        return code;
    };
});

// 回転系コマンドのブロック定義（右旋回、左旋回）
const rotateCommands = ['cw', 'ccw'];
rotateCommands.forEach(function (command) {
    Blockly.Blocks[command] = {
        init: function () {
            this.appendValueInput("ANGLE")
                .setCheck("Number")
                .appendField(command === 'cw' ? '右旋回' : '左旋回');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip("ドローンを" + (command === 'cw' ? '右' : '左') + "に回転させます");
        }
    };

    javascriptGenerator.forBlock[command] = function (block) {
        var value_angle = javascriptGenerator.valueToCode(block, 'ANGLE', javascriptGenerator.ORDER_ATOMIC);
        var code = "sendCommand('" + command + " ' + " + value_angle + ");\n";
        return code;
    };
});

// コードを実行する関数
async function runCode() {
    console.log("Run code");
    console.log(javascriptGenerator)
    var code = javascriptGenerator.workspaceToCode(workspace);
    document.getElementById('generatedCode').innerText = code;
    let sn = parseInt(document.getElementById('ipaddr').value);
    assert(sn >= 1 && sn <= 254);
    try {
        code.split('\n').forEach(async (cmd) => {
            if (window.stopCode) {
                window.stopCode = false;
                await sendCommand('land', `192.168.10.${sn}`);
                throw new Error("緊急停止");
            }
            await sendCommand(cmd, `192.168.10.${sn}`);
        });
    } catch (err) {
        alert("エラー発生。先生にお知らせください。");
    }
}

// サーバーにコマンドを送信する関数
async function sendCommand(command, ipaddr) {
    response = await fetch('/send-command', {
        method: 'POST',
        headers: {
            'ip-address': ipaddr,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command: command })
    });
    let data = response.text();
    console.log(data);
}

window.runCode = runCode;