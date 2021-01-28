require('dotenv').config();
const Hapi = require('hapi');
const laabr = require('laabr');
const Inert = require('inert');
const Vision = require('vision');
const Good = require('good');
const HapiSwagger = require('hapi-swagger');
const Susie = require('susie');
const Nes = require('nes');
const LunaMethods = require('luna-methods');

const Path = require('path');
const { Main } = require('./router');

const { SERVER_PORT, SERVER_HOST } = process.env;


const start = async () => {
  const server = Hapi.server({
      port: SERVER_PORT || 3000, 
      host: SERVER_HOST || 'localhost',
      routes: {cors: true},
  });

  const options = {
    pathPrefixSize: 1,
    basePath: `/`,
    jsonPath: `/webcore/swagger.json`,
    swaggerUIPath: `/webcore/swaggerui/`,
    documentationPath: `/doc/documentation`,
    info: {
      'title': `${process.env.npm_package_name} API Documentation`,
      'version': process.env.npm_package_version,
    }
  };
  await server.register([
    { plugin: Inert },
    { plugin: Vision },
    { plugin: LunaMethods },
    { plugin: Susie },
    { plugin: Nes },
    { plugin: laabr.plugin, options: {indent: 0 } },
    { plugin: HapiSwagger, options },
    { plugin: require('./global') },
    { plugin: require('./handler') }
  ]);

  // 静态文件路由
  server.route([
    {
      method: "GET",
      path: "/{param*}",
      handler: {
        directory: { path: Path.join(__dirname, "./public") }
      }
    }
  ])

  await server.start();
  console.log(`Listening on //${SERVER_HOST}:${SERVER_PORT}`)
}
start();



