const dgram = require('dgram');
const express = require('express');
const app = express();
const path = require('path');

const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist'))); // 静的ファイルを提供

// ドローンごとの情報を管理するマップ
const drones = new Map();

// ドローンのデフォルトポート
const TELLO_PORT = 8889;
const TELLO_STATE_PORT = 8890;

// ドローンからのステータスデータを受信するためのUDPサーバーソケット（共有）
const udpServer = dgram.createSocket('udp4');

// ステータスデータの受信
udpServer.on('message', (msg, rinfo) => {
    const droneIP = rinfo.address;
    const stateString = msg.toString();
    const stateArray = stateString.trim().split(';');
    let state = {};
    stateArray.forEach(item => {
        const [key, value] = item.split(':');
        if (key && value) {
            state[key] = parseFloat(value);
        }
    });

    // ドローンのステータスを更新
    let drone = drones.get(droneIP);
    if (drone) {
        drone.latestState = state;
    } else {
        // 新しいドローンの場合、情報を作成
        drone = {
            udpClient: null,
            latestState: state,
        };
        drones.set(droneIP, drone);
    }
});

// ステータスサーバーの設定
udpServer.bind(TELLO_STATE_PORT, () => {
    console.log(`UDP Server listening on port ${TELLO_STATE_PORT}`);
});

// UDPソケットでデータを送信するPromise関数
function sendUdpMessage(socket, message, port, address) {
    return new Promise((resolve, reject) => {
        socket.send(message, port, address, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// コマンド受信エンドポイント
app.post('/send-command', async (req, res) => {
    const command = req.body.command;
    const droneIP = req.headers['drone-ip'];

    if (!droneIP) {
        return res.status(400).send('ドローンのIPアドレスが指定されていません');
    }

    console.log(`Sending command to ${droneIP}: ${command}`);

    // ドローンの情報を取得または作成
    let drone = drones.get(droneIP);
    if (!drone) {
        try {
            drone = await createDrone(droneIP);
            drones.set(droneIP, drone);
        } catch (err) {
            console.error(`Failed to initialize drone at ${droneIP}:`, err);
            return res.status(500).send('ドローンの初期化に失敗しました');
        }
    }

    try {
        // コマンドをドローンに送信
        await sendUdpMessage(drone.udpClient, command, TELLO_PORT, droneIP);
        // 速度がゼロになるまでポーリング
        await checkDroneStopped(drone, droneIP);
        res.send('OK');
    } catch (err) {
        console.error(`Error handling command for drone at ${droneIP}:`, err);
        res.status(500).send('ドローンの操作中にエラーが発生しました');
    }
});

// ドローンオブジェクトを作成する関数
async function createDrone(droneIP) {
    // ドローンごとのUDPクライアントソケット
    const udpClient = dgram.createSocket('udp4');

    try {
        // ドローンをコマンドモードに設定
        await sendUdpMessage(udpClient, 'command', TELLO_PORT, droneIP);
        console.log(`Tello at ${droneIP} is in command mode`);

        // ステータスストリームを有効化
        await sendUdpMessage(udpClient, 'streamon', TELLO_PORT, droneIP);
        console.log(`Status stream for Tello at ${droneIP} is on`);
    } catch (err) {
        console.error(`Failed to initialize Tello at ${droneIP}:`, err);
        throw err;
    }

    return {
        udpClient,
        latestState: {},
    };
}

// ドローンの停止をチェックする関数
function checkDroneStopped(drone, droneIP) {
    return new Promise((resolve, reject) => {
        const interval = 100; // 0.1秒ごとにチェック
        const timeout = 30000; // 最大30秒待機
        let elapsed = 0;

        const timer = setInterval(() => {
            // vx, vy, vzの速度がすべてゼロかチェック
            const { vgx = 0, vgy = 0, vgz = 0 } = drone.latestState;
            const speed = Math.sqrt(vgx * vgx + vgy * vgy + vgz * vgz);
            console.log(`Current speed of drone at ${droneIP}: ${speed}`);

            if (speed === 0) {
                clearInterval(timer);
                resolve();
            } else if (elapsed >= timeout) {
                clearInterval(timer);
                reject('Timeout: ドローンが停止しませんでした');
            }

            elapsed += interval;
        }, interval);
    });
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
