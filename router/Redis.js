//连接redis
const port = '6379'
const host = '127.0.0.1'
const redis = require('redis')
const client = redis.createClient(port,host)
//redis连接成功
client.on('connect',()=>console.log('redis连接成功'))
//redis连接错误
client.on('error',err=>{   
    console.log(err);
}) 
const Global = {};
//使用Global来提供Redis的_proto_
let Redis = Object.create(Global);
//把第二个对象上的可枚举属性的值传给Redis
Redis = Object.assign( Redis, {
    MODULE_NAME: 'redis',
    RD_EXPIRES: 7200,
    routers: [
      //增 POST 获取接口请求参数
      {
        method: 'POST',
        path: `/redis/post_params/{param_name}`,
        config: {
          handler: async (request, h)=> {
            const { query, params, payload } = request;
            const {param_name} = params
            const {post_key} = payload
            console.log(param_name,typeof(param_name))//键
            console.log(post_key,typeof post_key)//值
            //将客户端传过来的数据存放到数据库中
            const postResult = await collection.find({[param_name]:post_key})
            console.log(postResult)
            if(postResult.length < 1){
              const insertResult = await collection.insert({[param_name]:post_key})
              console.log(insertResult)
              console.log(insertResult['_id'])
              const id = insertResult['_id']
              queryObj.push({
                [param_name]:id
              })
              console.log(queryObj)
              return h.response('已添加')
            }else{
              return h.response('此条数据已拥有')
            }
          },
          description: 'POST获取接口请求参数',
          tags: ['api'],
          notes: '使用方式，一些特殊备注',
          validate: {
            payload: Joi.object().keys({
              post_key: Joi.string().required(),
            }),
            params: Joi.object().keys({
              param_name: Joi.string().required(),
            }),
          }
        }
      },
      //删
      {
        method:'DELETE',
        path:`/redis/delete_params/{param_name}`,
        config: {
          handler: async (request, h)=> {
            const { query, params, payload } = request;
            console.log(query)
            console.log(params)
            console.log(payload)
            const {param_name} = params//键
            const {post_key} = payload//值
            console.log(param_name,post_key)
            //删除数据库中的某条数据
            // const deleteResult = await collection.find({[param_name]:post_key})
            // if(deleteResult.length >= 1){
            //   await collection.remove({[param_name]:post_key})
            //   return h.response('已删除')
            // }else{
            //   return h.response('并无此条数据')
            // }
          },
          description: 'DELETE获取接口请求参数',
          tags: ['api'],
          notes: '使用方式，一些特殊备注',
          validate: {
            payload: Joi.object().keys({
              post_key: Joi.string().required(),
            }),
            params: Joi.object().keys({
              param_name: Joi.string().required(),
            }),
          }
        }
      },
      //改
      {
        method:'PUT',
        path:`/redis/put_params/{param_name}`,
        config:{
          handler:async (request,h)=>{
            const {query,params,payload} = request
            //从数据库中查找数据并返回
            const {param_name} = params//键
            const {post_key} = payload//值
            console.log(param_name)
            console.log(post_key)
            console.log(queryObj)
            const wantId = queryObj.map((item,index)=>{
              console.log(item,index)
              if(item[param_name]){
                return item[param_name]
              }
            })
            console.log(wantId)
            const putResult = await collection.find({_id:ObjectId(wantId[0])})
            console.log(putResult)
            if(putResult.length >= 1){
              await collection.update(putResult,{$set:{param_name:post_key}})
              return h.response('修改成功')
            }else{
              return h.response('不存在这条数据')
            }
          },
        description:'获取接口请求参数',
        tags:['api'],
        notes:'使用方式，一些特殊备注',
        validate:{
          payload:Joi.object().keys({
            post_key:Joi.string().required()
          }),
          params:Joi.object().keys({
            param_name:Joi.string().required()
          })
        }
        }
      },
      //查 get获取接口请求参数 
      {
        method:'GET',
        path:`/redis/get_params/{param_name}`,
        config:{
          handler:async (request,h)=>{
            const {query,params,payload} = request
            console.log(query)
            console.log(params)
            console.log(payload)
            //从数据库中查找数据并返回
            const {param_name} = params//键
            const {post_key} = query//值
            console.log(param_name,post_key)
            const getResult = await(collection.find({[param_name]:post_key}))
            if(getResult.length >= 1){
              return h.response(JSON.stringify(getResult))
            }else{
              return h.response('并无此条数据')
            }        
          },
        description:'获取接口请求参数',
        tags:['api'],
        notes:'使用方式，一些特殊备注',
        validate:{
          query:Joi.object().keys({
            post_key:Joi.string().required()
          }),
          params:Joi.object().keys({
            param_name:Joi.string().required()
          })
        }
        }
      },
    
    ]
});
module.exports = {
    Redis
}