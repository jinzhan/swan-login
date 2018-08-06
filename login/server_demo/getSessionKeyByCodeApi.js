const Koa = require('koa2');
const request = require('koa2-request');
const bodyParser = require('koa-bodyparser');
const router = require('koa-router')();
const md5 = require('md5');
const app = new Koa();
app.use(bodyParser());


// 小程序的client_id和sk
const CLIENT_ID = '';
const SK = '';

app.use(async(ctx, next) => {
    console.log(`ctx.request.url: ${ctx.request.url}`);
    const code = ctx.request.body.code || ctx.request.query.code;
    const response = await request('https://openapi.baidu.com/nalogin/getSessionKeyByCode', {
        method: 'POST',
        form: {
            client_id: CLIENT_ID,
            sk: SK,
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

    const openid = md5(body.openid);

    // 加强对openid的校验
    const output = {
    	openid,
    	token: md5('token:' + openid)
    };
    ctx.body = JSON.stringify(output);
});

app.listen(3000);
