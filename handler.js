const { Main, Bsrh } = require('./router');

exports.register = function (server, options, next) {
  const prefix = options.prefix ? options.prefix : '';

  server.register([
    { plugin: Main, routes: { prefix: `${prefix}/base` } },
    { plugin: Bsrh, routes: { prefix: `${prefix}/bsrh` } },
  ])
};

exports.name = 'yuntun-api-merchantli';
exports.multiple = 'true';