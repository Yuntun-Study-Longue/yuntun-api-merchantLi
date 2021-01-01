const {
RD_HOST, RD_PORT, RD_PASSWD,
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWD,
MAIN_ACCESS_KEY_ID, MAIN_ACCESS_KEY_SECRET, OSS_BUCKET_NAME
} = process.env;
const Redis = require('ioredis');
const OSS= require('ali-oss');

exports.register = function (server, options, next) {
    // 初始化 redis
    const session = new Redis(`redis://:${RD_PASSWD}@${RD_HOST}:${RD_PORT}/4`);

    // 初始化 mongo
    const db = require('monk')(`${DB_USER}:${DB_PASSWD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

    // 初始化 alioss
    const alioss = new OSS({
        accessKeyId: MAIN_ACCESS_KEY_ID,
        accessKeySecret: MAIN_ACCESS_KEY_SECRET,
        internal: false,
        region: 'oss-cn-beijing',
        bucket: OSS_BUCKET_NAME,
    });

    // 工具库
    server.expose('utils', {
        alioss,
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
}
exports.name = 'global-static';
exports.multiple = false;