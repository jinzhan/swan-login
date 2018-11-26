<?php
//服务端已知参数
const CLIENT_ID = '';
const SK = '';
const URL = 'https://openapi.baidu.com/nalogin/getSessionKeyByCode';
//客户端传递的参数
$code = $_GET['code'] || $_POST['code'];

$arrRet = getSessionKey($code);
if ($arrRet === false) {
    echo json_encode(
        array(
            'errno' => 1000,
            'errmsg' => 'fail',
            'data' => (object)array(),
        )
    );
} else {
    $token = saveSesionKey($arrRet['openid'], $arrRet['session_key']);
    echo json_encode(
        array(
            'errno' => 1000,
            'errmsg' => 'success',
            'data' => array(
                'openid' => $arrRet['openid'],
                'token' => $token,
            ),
        )
    );
}

/**
 * 根据code换取openid和session_key
 * @param $code
 * @return array|bool
 */
function getSessionKey($code)
{
    $post_data = array(
        'client_id' => CLIENT_ID,
        'code' => $code,
        'sk' => SK,
    );
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, URL);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $output = curl_exec($ch);
    curl_close($ch);
    if ($output === false) {
        return false;
    }
    $arr_res = json_decode($output, true);
    if ($arr_res['errno'] != 0) {
        return false;
    }
    $ret = array(
        'openid' => $arr_res['openid'],
        'session_key' => $arr_res['session_key'],
    );
    return $ret;
}

/**
 * 生成token，token关联了openid和session_key,server端可以根据token反查到openid和session_key
 * @param $openid
 * @param $session_key
 * @return string
 */
function generateToken($openid, $session_key)
{
    return md5($openid . $session_key);
}

/**
 * 保存session_key
 * @param $openid
 * @param $session_key
 * @return string
 */
function saveSesionKey($openid, $session_key)
{
    //用户自定义建立关联关系
    $token = generateToken($openid, $session_key);
    return $token;
}