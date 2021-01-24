const {
RD_HOST, RD_PORT, RD_PASSWD,
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWD,
MAIN_ACCESS_KEY_ID, MAIN_ACCESS_KEY_SECRET, OSS_BUCKET_NAME
} = process.env;
const Redis = require('ioredis');
const OSS= require('ali-oss');
const AlipopCore = require('@alicloud/pop-core');

exports.register = function (server, options, next) {
    // 初始化 redis
    const session = new Redis(`redis://:${RD_PASSWD}@${RD_HOST}:${RD_PORT}/4`);

    // 初始化 mongo
    const db = require('monk')(`${DB_USER}:${DB_PASSWD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

    // 初始化 alioss
    const alioss = {
        ['Region-beijing']: new OSS({
            accessKeyId: MAIN_ACCESS_KEY_ID,
            accessKeySecret: MAIN_ACCESS_KEY_SECRET,
            internal: false,
            region: 'oss-cn-beijing',
            bucket: 'yuntun-web',
        }),
        ['Region-shanghai']: new OSS({
            accessKeyId: MAIN_ACCESS_KEY_ID,
            accessKeySecret: MAIN_ACCESS_KEY_SECRET,
            internal: false,
            region: 'oss-cn-shanghai',
            bucket: 'yuntun-avatar',
        })
    }

    const aliclient = override_option => new AlipopCore({
        accessKeyId: process.env.MAIN_ACCESS_KEY_ID,
        accessKeySecret: process.env.MAIN_ACCESS_KEY_SECRET,
        endpoint: `https://facebody.cn-shanghai.aliyuncs.com`,
        apiVersion: '2019-12-30',
        ...override_option
    });

    // 工具库
    server.expose('utils', {
        alioss,
        aliclient,
        co: require('co'),
        superagent: require('superagent'),
        moment: require('moment'),
        crypto: require('crypto'),
        xml2js: require('xml2js'),
        request: require('request'),
        stream: require('stream'),
        Promise: require('bluebird'),
        tempfile: require('tempfile'),
        tmpdir: require('os').tmpdir,
        fs: require('fs'),
        path: require('path'),
        util: require('util'),
        execa: require('execa'),
        dot: require('dot-object'),
        xlsx: require('node-xlsx'),
        md5: require('md5')
    });
    // ioredis 集群缓存
    server.expose('session', session);
    // monk 集群存储
    server.expose('collections', {
        wxusers: db.get('wxusers'),
        bsfusion: db.get('bsfusion_data'),
        bsfusion_activity: db.get('bsfusion_activity'),
    });
    server.method('GClientIP', (REQUEST)=> (
        REQUEST['headers']['x-real-ip']||
        REQUEST['headers']['x-forwarded-for'] ||
        '127.0.0.1'
    ));
    server.method('rmLocal', function(FILE_PATH) {
        const { fs } = this.utils;
        if ( fs.existsSync(FILE_PATH) ) fs.unlinkSync(FILE_PATH);
    })
    server.method('loadSourceByStream', async function(STREAM, FILE_NAME) {
        const { tmpdir, path, fs } = this.utils;
        const filepath = path.resolve(tmpdir(), FILE_NAME);
        const fileStream = fs.createWriteStream(filepath);
        STREAM.pipe(fileStream);
        return new Promise( (resolve, reject)=> {
            fileStream.on('finish', ()=> resolve(filepath) );
        });
    })
    server.method('uploadFile', async function(localFile) {
        const { Promise, co, alioss, md5 } = this.utils;
        const timestamp = new Date().getTime();
        const key = md5(localFile + timestamp);

        return new Promise( (resolve, reject)=> {
            co(function*(){
            const result = yield alioss['Region-beijing'].put(key, localFile);
            yield alioss['Region-beijing'].putACL(key, 'public-read');

            if (result.url) {
                resolve({ code: 0, data: { ali_url: result.url } });
            } else resolve({ code: -1, msg: '上传失败' });
            })
        });
    })
}
exports.name = 'global-static';
exports.multiple = false;