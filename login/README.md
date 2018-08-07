# 小程序登录demo说明

## Usage

### 配置login参数

1. 在lib目录，提供了login的封装；返回Promise对象；
2. 调用login需要配置setSessionApi参数，跟进登录后需要的相关授权，需要配置：user.authSettingScope参数，默认值为scope.userInfo


## server端配置

### node服务器

1. 进入login-demo-node文件夹；
2. 在config中配置好client_id和sk；
3. 执行npm start，启动getSessionKey的api，一个简单的获取sessionKey的后端服务；
4. 访问：http://localhost:3000/get_openid

## 最后

1. 把测试地址配置到js的login方法的setSessionApi参数里面；