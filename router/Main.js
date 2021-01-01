const Joi = require('joi');

function register (server, options, next) {
  let Main = Object.create({
    RD_EXPIRES: 7200,
    MP_WX_HOST: 'https://mp.weixin.qq.com',
    WX_HOST: 'https://api.weixin.qq.com',
    utils: server.plugins['global-static'].utils,
    session: server.plugins['global-static'].session,
    collections: server.plugins['global-static'].collections,
  });
  Main = Object.assign( Main, {})
  server.route([
    // 测试get
    {
      method: 'GET',
      path: '/fetchsth',
      config: {
        cors: true,
        handler: async (request, h) => {
          return h.response('ok thx');
        },
        description: '测试get方法',
        tags: ['api', 'bsfusion'],
        notes: 'fetchsth',
      }
    },
    // 测试数据库获取 POST
    {
      method: 'POST',
      path: '/uploadsth',
      config: {
        cors: true,
        handler: async (request, h) => {
          const { bsfusion } = Main.collections;
          const result = await bsfusion.find({});

          return h.response(result);
        },
        description: '测试post方法',
        tags: ['api', 'bsfusion'],
        notes: 'uploadsth',
      }
    },
    // 测试 Redis 存储
    {
      method: 'PUT',
      path: '/session',
      config: {
          cors: true,
          handler: async (request, h) => {
              const { key, value } = request.query;
              const result = await Main.session.set(key, value);
              return h.response(result)
          },
          description: '测试post方法',
          tags: ['api', 'bsfusion'],
          notes: 'session',
          validate: {
              query: Joi.object().keys({
                  key: Joi.string().required(),
                  value: Joi.string().required(),
              }).unknown()
          }
      }
    },
    // 测试 Redis 获取
    {
        method: 'GET',
        path: '/session',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { key, value } = request.query;
                const result = await Main.session.get(key);
                return h.response(result)
            },
            description: '测试 Redis 获取',
            tags: ['api', 'bsfusion'],
            notes: 'session',
            validate: {
                query: Joi.object().keys({
                    key: Joi.string().required(),
                }).unknown()
            }
        }
    }
  ])
}

exports.plugin = {
  name: 'api-main',
  multiple: false,
  register
}