# swan webSocket

基于swan的webSocket的封装

## Usage

相关api参考了 `socket.io-client`的写法

```
import io from './swan-websocket';
const socket = io('wss://domain');

socket.on('connect', function(){});
socket.on('event', function(data){});
socket.on('disconnect', function(){});

socket.emit('leave', {
    name: 'XiaoMing',
    time: 'JustNow'
});

```
