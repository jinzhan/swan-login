/**
 * 一个简单的获取sessionKey的后端服务
 * */
const Koa = require('koa2');
const request = require('koa2-request');
const bodyParser = require('koa-bodyparser');
const config = require('config');
const router = require('koa-router')();
const md5 = require('md5');
const app = new Koa();
const getSessionKeyByCodeApi = 'https://openapi.baidu.com/nalogin/getSessionKeyByCode';
app.use(bodyParser());
app.use(router.routes());

const getOpenId = async(ctx, next) => {
    const code = ctx.request.body.code || ctx.request.query.code;
    const response = await request(getSessionKeyByCodeApi, {
        method: 'POST',
        form: {
            client_id: config.get('client_id'),
            sk: config.get('sk'),
            code
        }
    });

    console.log({
        responseBody: response.body
    });

    const body = JSON.parse(response.body);

    if(!body.openid) {
        console.log('获取openid失败');
        ctx.body = JSON.stringify({errno: 1});
        return;
    }

    // 对openid进行加密
    const openid = md5(body.openid);

    // 加强对openid的校验
    const output = {
        openid,
        token: md5('token:' + openid)
    };
    ctx.body = JSON.stringify(output);
};

router.get('/get_openid', getOpenId)
    .post('/get_openid', getOpenId)
    .all('*', (ctx, next) => {
        const query = ctx.request.url.split('?')[1];
        ctx.redirect('/get_openid' + (query ? `?${query}` : ''));
        ctx.status = 302;
    });

app.listen(3001);

console.log('app.listen 3001 ...');
