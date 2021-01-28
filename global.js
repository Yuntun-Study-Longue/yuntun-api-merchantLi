const {
RD_HOST, RD_PORT, RD_PASSWD,
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWD,
} = process.env;
const Redis = require('ioredis');

exports.register = function (server, options, next) {
    // 初始化 redis
    const session = new Redis(`redis://:${RD_PASSWD}@${RD_HOST}:${RD_PORT}/4`);

    // 初始化 mongo
    const db = require('monk')(`${DB_USER}:${DB_PASSWD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

    // ioredis 集群缓存
    server.expose('session', session);
    // monk 集群存储
    server.expose('collections', {
        wxusers: db.get('wxusers'),
        bsfusion: db.get('bsfusion_data'),
        bsfusion_activity: db.get('bsfusion_activity'),
    });
}
exports.name = 'global-static';
exports.multiple = false;