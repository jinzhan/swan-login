# 百度小程序登录

## Usage

### 配置login参数

1. 在lib目录，提供了login的封装；返回Promise对象；
2. 调用login需要配置setSessionApi参数；
3. 根据登录后需要的相关授权，配置：user.authSettingScope参数，该项的默认值为`scope.userInfo`;


## server端配置

提供以下2种demo

### 1.node服务器

1. 进入login-demo-node文件夹；
2. 在config中配置好client_id和sk；
3. 执行npm start，启动getSessionKey的api，一个简单的获取sessionKey的后端服务；
4. 把测试地址`http://localhost:3001/get_openid`配置到js的login方法的setSessionApi参数里面

### 2.php服务器

1. 进入login-demo-php文件夹；
2. 配置好client_id和sk；
3. 执行 php -S localhost:5000;
4. 把测试地址`http://localhost:5000/get_openid.php`配置到js的login方法的setSessionApi参数里面


## 注意

1. 把测试地址配置到js的login方法的setSessionApi参数里面；
2. 以上仅支持开发者工具中调试使用；线上运行必须是https域名，并且在开发者后台配置为合法域名；

## update

### 优化了登录流程（08-14）

百度小程序优化了登录流程，未获取openid之前，也能获取到用户信息，新增demo：/logo-demo2。

#### 示例：

```
    swan.login({
        success: res => {
            swan.authorize({
                scope: 'scope.userInfo',
                success:  res => {
                    swan.getUserInfo({
                        success: res => {
                            console.log({res});
    
                            swan.showModal({
                                content: '用户名: ' + res.userInfo.nickName
                            });
                        },
                        fail: err => console.log({err})
                    });
                }
            });
    
        }
    });
        
```
