/**
 * @file login.js
 * @description 封装百度小程序的登录流程，返回Promise对象
 *
 * 登录并初始化
 * 百度小程序登录流程参考：https://smartapp.baidu.com/docs/img/oauth.png
 * 此处主要考虑三个步骤：
 * 1. 用户登录；
 * 2. 获取用户标识；
 * 3. 获取用户基本信息；
 * 整体使用3个主要的Promise实现，保证代码的可读性
 *
 * @author jinzhan
 * @email steinitz@qq.com
 **/

/* global swan */
// 默认配置
const config = {
    modal: {
        title: '提示',
        cancelText: '游客模式',
        showCancel: true,
        cancelColor: '#007aff',
        confirmColor: '#007aff',
        confirmText: '立即登录',
    },
    errmsg: {
        '10004': '请先登录，以便获得更好的对战体验',
        'error': '获取用户登录信息失败'
    },
    user: {
        authSettingScope: 'userInfo',
        defaultUserName: '神秘用户',
        defaultUserAvatar: 'https://b.bdstatic.com/searchbox/mappconsole/image/20180718/1531896247869133.png',
    },
    setSessionApi: ''
};


/**
 * 登录逻辑
 * 1. 提示用户登录；
 * 2. 但同时提供游客模式；
 * 这里涉及到循环调用，所以单独抽出一个函数
 *
 * @param {Promise.resolve} resolve 透传loginPromise的resolve
 * @param {Promise.reject} reject 透传loginPromise的reject
 * **/
const login = (resolve, reject) => {
    const errmsg = config.errmsg;
    swan.login({
        success: res => {
            resolve({code: res.code});
        },
        fail: err => {
            /**
             * errCode
             * 10004: user not login
             * 10001: internal error
             * */
            const content = err && errmsg[err.errCode] || errmsg.error;
            swan.showModal({
                content,
                ...config.modal,
                success: res => {
                    res.confirm ? login(resolve, reject) : reject({});
                },
                fail: err => {
                    reject({});
                }
            });
        }
    });
};

/**
 * 登录的核心逻辑，缓存openid和token，并通过Promise透传
 * @return {Promise} 返回登录状态的Promise对象
 * */
const loginPromise = () => {
    return new Promise((resolve, reject) => {
        swan.checkSession({
            success: res => {
                // openid和token是登录用户的标识，详见后面的说明
                const openid = swan.getStorageSync('openid');
                const token = swan.getStorageSync('token');
                const isValid = openid && token;
                isValid ? resolve({openid, token}) : reject(true);
            },
            fail: err => {
                // 登录态无效
                reject(false);
            }
        });
    }).then(
        ({openid, token}) => Promise.resolve({openid, token}),
        () => new Promise((resolve, reject) => login(resolve, reject))
    );
};


/**
 * 获取openid和token：获取openid本身也是授权的过程，后端通过授权完成，返回openid给前端
 *    token是openid的合法性校验，这个逻辑由业务方后端开发完成，跟百度小程序没有关系
 *
 * @param {string} code code值，非必需，没有code则使用swanid
 * @param {string} openid 非必需，有了openid和token则直接resolve
 * @param {string} token 非必需，有了openid和token则直接resolve
 * @return {Promise} Promise对象
 * **/
const getOpenidAndToken = ({code, openid, token}) => {
    return new Promise((resolve, reject) => {
        const useOpenid = code || (openid && token);
        useOpenid ? resolve({code, openid, token, isLogin: true}) : swan.getSwanId({
            success: res => {
                resolve({swanid: res.data.swanid, isLogin: false});
            },
            fail: err => {
                swan.showToast({
                    title: '获取swanId失败，请重试'
                });
            }
        });
    }).then(({code, openid, token, swanid, isLogin}) => {
        return new Promise((resolve, reject) => {
            if (openid && token) {
                resolve({openid, token, isLogin});
                return;
            }
            const data = Object.assign({flag: 'bd'}, code ? {code} : {swanid});
            request({
                url: config.setSessionApi,
                method: 'POST',
                data,
                success: res => {
                    const openid = res.data.data.openid;
                    const token = res.data.data.token;
                    if (openid && token) {
                        resolve({openid, token, isLogin});
                        swan.setStorage({key: 'openid', data: openid});
                        swan.setStorage({key: 'token', data: token});
                    } else {
                        reject(false);
                    }
                },
                fail: err => {
                    reject(false);
                }
            });
        });
    });
};

/**
 * 登录状态，从swan.getUserInfo中获取用户信息
 * 包含：
 * 1. 授权弹窗逻辑；
 * 2. 授权禁用的默认昵称；
 *
 * 授权相关
 * scope.userInfo    swan.getUserInfo    用户信息
 * scope.userLocation    swan.getLocation, swan.chooseLocation    地理位置
 * scope.writePhotosAlbum    swan.saveImageToPhotosAlbum    保存到相册
 * scope.address    swan.chooseAddress    收货地址
 * scope.invoiceTitle    swan.chooseInvoiceTitle    发票抬头
 * scope.record    swan.getRecorderManager    录音功能
 * scope.camera    <camera/>    摄像头
 *
 * @param {string} openid，从上游的promise透传的openid
 * @param {string} token，从上游的promise透传的token
 * @param {boolean} isLogin 是否登录，游客帐号不需要登录
 * @return {Promise} 返回Promise对象
 * */

const getAuthPromise = ({openid, token, isLogin}) => {
    const scope = config.user.authSettingScope.replace(/^scope\./, '');
    const scopeMapMethod = {
        userInfo: 'getUserInfo',
        userLocation: '',
        writePhotosAlbum: 'saveImageToPhotosAlbum',
        address: 'chooseAddress',
        invoiceTitle: 'chooseInvoiceTitle',
        record: 'getRecorderManager',
        camera: ''
    };
    const method = scopeMapMethod[scope];
    const authSettingScope = 'scope.' + scope;
    const user = config.user;
    return new Promise((resolve, reject) => {
        // 获取用户信息
        isLogin ? swan.getSetting({
            success: res => {
                res.authSetting[authSettingScope] ? resolve({openid, token}) : swan.authorize({
                    scope: authSettingScope,
                    success: res => {
                        resolve({openid, token, isLogin});
                    },
                    fail: err => {
                        // 打开用户授权信息页面
                        swan.showModal({
                            title: '提示',
                            content: '获取授权信息失败，请同意授权以使用相关功能。',
                            cancelColor: config.modal.cancelColor,
                            confirmColor: config.modal.confirmColor,
                            confirmText: '去授权',
                            success: res => {
                                res.confirm ? swan.openSetting({
                                    success: res => {
                                        res.authSetting[authSettingScope] ? resolve({
                                            openid,
                                            token
                                        }) : reject({openid, token, isLogin});
                                    },
                                    fail: err => {

                                    }
                                }) : reject({openid, token, isLogin});
                            },
                            fail: res => {
                                reject({openid, token, isLogin});
                            }
                        });
                    }
                });
            },
            fail: err => {
                reject({openid, token});
            }
        }) : reject({openid, token});
    }).then(({openid, token}) => {
        return new Promise((resolve, reject) => {
            method ? swan[method]({
                success: res => {
                    console.log({
                        method,
                        res
                    });
                    // 兼容返回的不同数据格式
                    const info = res[scope] || res;
                    resolve({
                        ...info,
                        openid,
                        token,
                        isLogin
                    });
                },
                fail: err => {
                    resolve({
                        openid,
                        token,
                        nickName: user.defaultUserName,
                        avatarUrl: user.defaultUserAvatar,
                        isLogin
                    });
                }
            }) : resolve({
                openid,
                token,
                nickName: user.defaultUserName,
                avatarUrl: user.defaultUserAvatar,
                isLogin
            });
        });
    }, ({openid, token}) => Promise.resolve({
        openid,
        token,
        isLogin,
        nickName: user.defaultUserName,
        avatarUrl: user.defaultUserAvatar
    }));
};

/**
 * 对「登录逻辑」及 「获取用户授权逻辑」的简化
 * demo:
 *    import login from 'some-path/login';
 *    login({setSessionApi:'someUrl'}).then(data => doSomethingWidthData(data));
 *
 * @param {Object} option 必需, 自定义配置
 * @param {string} option.setSessionApi 必需，请求授权的api，需要后端返回json
 * 参考：https://smartapp.baidu.com/docs/develop/server/oauth/
 * api请求的response数据格式为：
 *  {
 *      "data": {
 *          "openid": "XXXX", // 登录用户的唯一标识
 *          "token": "XXXX"  // 对openid的校验 （注意：此处逻辑为业务方自行实现）
 *      }
 *  }
 *      option.errmsg 非必需，针对swan.login返回错误码的提示
 *      option.modal 非必需，swan.login是fail状态的弹窗swan.showModal各种配置
 *      option.modal.title 非必需，swan.login是fail状态时候的弹窗，swan.showModal的配置
 *      option.modal.cancelText 非必需，swan.login是fail状态时候的弹窗，swan.showModal的配置
 *      option.modal.showCancel 非必需，swan.login是fail状态时候的弹窗，swan.showModal的配置
 *      option.modal.cancelColor 非必需，swan.login是fail状态时候的弹窗，swan.showModal的配置
 *      option.modal.confirmColor 非必需，swan.login是fail状态时候的弹窗，swan.showModal的配置
 *      option.modal.confirmText 非必需，swan.login是fail状态时候的弹窗，swan.showModal的配置
 *      option.user 非必需，用户的默认信息
 *      option.user.authSettingScope 非必需，用户授权的类型，默认值：scope.userInfo
 *      option.user.defaultUserName 非必需，默认用户名，默认值：神秘用户
 *      option.user.defaultUserAvatar 非必需，默认用户名头像
 * @return {Promise} 返回Promise对象，方便使用.then(data => {doSomething(data)})
 * */
export default option => {
    if(!option.setSessionApi) {
        throw new Error('你尚未配置setSessionApi');
    }
    // 初始化默认配置
    config.setSessionApi = option.setSessionApi;
    option.modal && Object.assign(config.modal, option.modal);
    option.user && Object.assign(config.user, option.user);
    option.errmsg && Object.assign(config.errmsg, option.errmsg);
    return loginPromise().then(getOpenidAndToken, getOpenidAndToken)
        .then(getAuthPromise, () => swan.showToast({title: '请求用户授权出现异常，请重试'}));
};
