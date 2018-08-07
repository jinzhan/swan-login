/**
 * @file 针对百度小程序，基于swan core的webSocket封装
 * 
 * 相关api参考了 `socket.io-client`的写法
 * import io from './swan-websocket';
 * const socket = io('wss://domain');
 * socket.on('connect', function(){});
 * socket.on('event', function(data){});
 * socket.on('disconnect', function(){});
 * socket.emit('leave', {
 *   name: 'XiaoMing',
 *   time: 'JustNow'
 * });
 *
 * @author jinzhan
 * @mail steinitz@qq.com
 ***/

/* global swan */
/** socket.io 协议常量 **/
const packets = {
    // non-ws
    open: 0,
    // non-ws
    close: 1,
    ping: 2,
    pong: 3,
    message: 4,
    upgrade: 5,
    noop: 6
};
const events = {
    CONNECT: 0,
    DISCONNECT: 1,
    EVENT: 2,
    ACK: 3,
    ERROR: 4,
    BINARY_EVENT: 5,
    BINARY_ACK: 6
};

const PING_INTERVAL = 2000;

const noop = () => false;

class SwanSocketIO {

    /**
     * 构造函数
     *
     * @param {string} url wss地地址
     * @param {Object} option 相关参数
     * @param {Function} option.success  成功的回调
     * @param {Function} option.fail  fail的回调
     * @param {Object} option.params 额外的参数
     * @param {number} option.pingInterval ping的时间间隔
     * */
    constructor(url, option = {}) {
        this.events = this.events || {};

        this.pingInterval = option.pingInterval || PING_INTERVAL;

        const separator = ~url.indexOf('?') ? '&' : '?';

        const params = {
            EIO: 3,
            transport: 'websocket'
        };

        option.params && Object.assign(params, option.params);

        const paramArr = [];

        for (const p in params) {
            paramArr.push(`${p}=${params[p]}`);
        }

        const api = url + separator + paramArr.join('&');

        this.init(api).then(
            option.success && option.success(),
            option.fail && option.fail
        );
    }

    init(url) {
        return new Promise((resolve, reject) => {
            const socketTask = swan.connectSocket({
                url,
                success: res => {
                    // success
                }
            });

            this.socketTask = socketTask;

            swan.onSocketOpen(response => {
                this.isConnected = true;
                this.trigger('connect');
                resolve(response);
            });

            swan.onSocketError(error => {
                if (this.isConnected) {
                    this.trigger('error', new Error(error));
                } else {
                    reject(error);
                }
            });

            /**
             * 这样跑不起来，为什么？要改成下面的形式：
             * swan.onSocketMessage(message => {
             *     this.handleMessage(message);
             * });
             * */
            socketTask.onMessage(message => {
                this.handleMessage(message);
            });

            swan.onSocketClose(result => {
                if (this.isConnected) {
                    this.trigger('error', new Error('The websocket was closed by server'));
                } else {
                    this.trigger('close');
                }
                this.isConnected = false;
            });
        });
    }

    trigger(type, ...args) {
        if (!this.events) {
            this.events = {};
        }

        if (type === 'error') {
            if (!Array.isArray(this.events.error) || !this.events.error.length) {
                if (args[0] instanceof Error) {
                    throw args[0];
                } else {
                    throw TypeError('Uncaught, unspecified "error" event.');
                }
            }
        }

        const handler = this.events[type];

        switch (typeof handler) {
            case 'undefined':
                return false;

            case 'function':
                handler.apply(this, args);
                break;

            case 'object':
                // array
                Array.isArray(handler) && handler.forEach(item => {
                    item.apply(this, args);
                });
                break;
        }
        return true;
    }

    on(type, listener) {
        if (typeof listener !== 'function') {
            throw TypeError('listener must be a function');
        }

        if (!this.events) {
            this.events = {};
        }

        if (!this.events[type]) {
            this.events[type] = listener;
        } else if (Array.isArray(this.events[type])) {
            this.events[type].push(listener);
        } else {
            this.events[type] = [this.events[type], listener];
        }
        return this;
    }


    ping() {
        setTimeout(() => {
            if (!this.isConnected) {
                return;
            }
            swan.sendSocketMessage({
                data: [packets.ping, 'probe'].join('')
            });
        }, this.pingInterval);
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                this.isConnected = false;
                swan.onSocketClose(resolve);
                swan.closeSocket();
            } else {
                reject(new Error('socket is not connected'));
            }
        });
    }

    /**
     * 向server发送消息
     *
     * @param {string} type 事件名称
     * @param {...string|Object} params 变长参数，一般应该是对象或者字符串
     * */
    emit(type, ...params) {
        const data = [type, ...params];
        swan.sendSocketMessage({
            data: [packets.message, events.EVENT, JSON.stringify(data)].join('')
        });
    }

    handleMessage({data}) {
        const [match, packet, event, content] = /^(\d)(\d?)(.*)$/.exec(data);

        if (+packet === packets.pong || !content) {
            this.ping();
            return;
        }

        if (+event !== events.EVENT) {
            return;
        }

        if (+packet !== packets.message) {
            return;
        }

        const pack = JSON.parse(content);

        if (!pack) {
            return;
        }

        const [type, ...params] = pack;
        this.trigger(type, ...params);
    }
}

export default (url, option) => {
    return new SwanSocketIO(url, option);
};
