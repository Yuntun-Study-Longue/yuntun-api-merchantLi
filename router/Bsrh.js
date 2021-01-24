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
  Main = Object.assign( Main, server.methods, {
    getRandomRemark: (TIMESTAMP)=> {
        const EIN = ['A', 'L', 'C', 'H', 'S'];
        const ZWEI= ['T', 'S', 'H', 'E', 'R'];
        const DREI= ['M', 'E', 'I', 'V', 'A'];
        const data= TIMESTAMP.toString().match(/\d{3}(\d{3})(\d{4})/i);
        const prefix= data[1];
        const subfix= data[2];
        const PreName= prefix.split('').map( one => {
            const ix= ~~one%EIN.length;
            return EIN[ix];
        }).join('');
        return `${PreName}${subfix}`
    },
    contentFill:async function(type,arrList,rules_summary_list){
        //arrList是某次活动的所有客户
        let columnName = [];
        let abc = null;
        let smalldata = null;
        let abcc = null;
        let indes = -1;
        if(type === 'all'){
            abc = arrList.map(item => {
                return item.group_list.map(con => {
                    smalldata = {...item,...con}
                    delete smalldata.group_list
                    columnName = Object.keys(smalldata)
                    return Object.values(smalldata)
                })
            })
        }else{
            abcc = rules_summary_list.sort().map( (item,index)=>{
                return {names:`${item}人团`,data_lists:arrList.filter(con => con.group_list.length < (rules_summary_list[index+1] || 1000) && con.group_list.length >= item)}
            } )
            abcc.map((item,index)=>{
                if(parseInt(item.names) === parseInt(type)){
                    indes = index
                }
            })
            if(indes === -1){
                console.log(`不存在${type}人团`);
                return {code:-1,msg:'数据为空'};
            }
            let bigArr = abcc[indes].data_lists
            abc = bigArr.map(item=>{
                return item.group_list.map(con =>{
                    smalldata = {...item,...con}
                    delete smalldata.group_list
                    columnName = Object.keys(smalldata)
                    return Object.values(smalldata)
                })
            })
        }
        //填入表格的数据
        let excell_data = []
        abc.forEach(item=>{
            excell_data.push(item)
            excell_data.push([[]])
        });
        //改变键名
        let acd = [{_id:'标志'},{name:'姓名'},{phone:'手机号码'},{age:'年龄'},{area:'地点'},{class:'班级'},{type:'类型'},{count_type:'团队类型'},{max_count:'人数上限'},{allow_old_join
            :'是否允许老生加入'},{action_id:'活动代码'},{group_num:'组编'},{id_type:'身份'},{join_time:'加入时间'}];
        let coluName = []
        //替换键名
        columnName.map((item,index)=>{
            if(item === Object.keys(acd[index])[0]){
                coluName.push(Object.values(acd[index])[0])
            }
        })
        return [
            coluName,
            ...excell_data.reduce((pre,next)=>pre.concat(next), [])
        ]
    },
    start:async function(type,collection,xlsx,action_id){
        //找到某一次活动的所有客户资料
        const data = await collection.find({action_id:action_id})
        if(data.length >= 1){
            console.log('获取成功');
        }else{
            console.log('数据为空');
            return {code:-1,msg:'数据为空'};
        }
        //找到某次活动的所有团队类型
        const rules_summary_list = await collection.distinct('count_type',{})
        //返回数据库里的所有数据
        let result = await this.contentFill(type,data,rules_summary_list)
        if(result.length <= 1){
            return {code:-1,msg:'数据为空'};
        }
        if(result.code === -1){
            return {code:-1,msg:`不存在${type}人团`}
        }
        const options = {'!cols':[{wch:27},{wch:10},{wch:15},{wch:7},{wch:30},{wch:15},{wch:7},{wch:8},{wch:8},{wch:17},{wch:26},{wch:10},{wch:10},{wch:22}]}
        //表格里的数据   
        let buffer = xlsx.build([{name:'sheetOne',data:result}],options) 
        let ress = Main.utils.tempfile('.xlsx')
        Main.utils.fs.writeFileSync(ress,buffer);
        let aad = Main.utils.fs.existsSync(ress);
        if(aad){
            return this.put(ress)
        }else{
            return {code:-1,msg:'表格创建失败'}
        }
    },
    put: async function(ress){
        try {
            let randTime = new Date().getMilliseconds
            let poke = Main.utils.md5(randTime)
            let result = await Main.utils.alioss.put(`${poke}-xlsx`, ress);
            return {code:0,msg:'表格创建成功',data:result.url}
          } catch (e) {
            return {code:1,msg:'表格创建失败'}
          }
    }
  })
  server.route([
    // 活动修改接口
    {
        method: 'POST',
        path: '/update_action/{action_id}',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { bsfusion_activity } = Main.collections;
                try {
                    const { n } = await bsfusion_activity.update({ _id: request.params.action_id }, { $set: request.payload });
                    console.log('ok there')
                    if (n) {
                        return h.response({code: 0, msg: '更新成功'})
                    }
                    return h.response({code: -1, msg: '更新异常'})
                } catch(e) {
                    console.log( e.toString(), request.params.action_id )
                    return h.response({ code: -9, msg: '系统错误'})
                }
            },
            description: '修改活动',
            tags: ['api', 'bsfusion'],
            notes: 'update_action',
            validate: {
                payload: Joi.object().keys({
                    action_headpic: Joi.string().default('http://www.ubaby.vip/steamjourney/public/upload/1-1555325276.jpg').description('活动主图').required(),
                    action_title: Joi.string().default('科睿机器人店庆大回馈新老会员优惠活动开始啦！').description('活动主题').required(),
                    action_corp: Joi.string().default('科睿机器人').description('活动主办方-公司名').required(),
                    corp_phone: Joi.string().default('13544153419').description('主办方电话').required(),
                    corp_wx_qrcode: Joi.string().default('#').description('主办方微信').required(),
                    action_addr: Joi.string().default('科睿新洲分校；科睿景田分校').description('主办方地址').required(),
                    action_duration_time: Joi.string().default('2019-04-15 ～ 2019-04-20').description('活动时间').required(),
                    action_count_type: Joi.number().integer().description('count取值必为action_rules中的一项').default(3).required(),
                    action_max_members_count: Joi.number().integer().description('团上限人数').min(0).default(10).required(),
                    action_total_members: Joi.number().integer().default(100).description('召集人数').required(),
                    action_allow_old_join: Joi.boolean().default(true).description('允许老生参团').required(),
                    action_state: Joi.boolean().default(true).description('活动状态').required(),
                    action_rules: Joi.array().items(Joi.object().keys({
                        count: Joi.number().integer().min(0).default(1),
                        price: Joi.number().integer().min(0).default(2400),
                    })),
                    share_options: Joi.object().keys({
                        title: Joi.string().default('云吞提示-未设置分享信息'),
                        logo: Joi.string().default('#'),
                        content: Joi.string().default('请联系活动管理员'),
                    }),
                    action_areas: Joi.array().items(Joi.string().required().default('景田校区')),
                    action_classes: Joi.array().items(Joi.string().required().default('BAB班级')),
                    action_detailpic: Joi.string().default('http://www.ubaby.vip/steamjourney/public/upload/1-1555325276.jpg').description('活动详情图').required(),
                    action_spreadpic: Joi.string().default('http://www.ubaby.vip/steamjourney/public/upload/1-1555325276.jpg').description('海报分享图').required(),
                    poster_options: Joi.object().keys({
                        w:Joi.string().default('100').description('二维码宽度'),
                        x:Joi.number().integer().default(0).description('二维码定位的x轴位置'),
                        y:Joi.number().integer().default(0).description('二维码定位的y轴位置'),
                        fontColor:Joi.string().default('black').description('扫描二维码文字的颜色')
                    })
                }),
                params: Joi.object().keys({
                    action_id: Joi.string().required()
                })
            }
        }
    },
    // 活动创建接口
    {
        method: 'POST',
        path: '/create_action',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { bsfusion_activity } = Main.collections;
                const result = await bsfusion_activity.count(request.payload);
                if (result) return h.response({ code: -1, msg: '活动已存在'})
                const { _id } = await bsfusion_activity.insert({ ...request.payload, create_time: new Date().toLocaleString() })
                return h.response({ code: 0, msg: '活动新增成功', data: {action_id: _id}});
            },
            description: '创建活动，并返回活动标识',
            tags: ['api', 'bsfusion'],
            notes: 'create_action',
            validate: {
                payload: Joi.object().keys({
                    action_headpic: Joi.string().default('http://www.ubaby.vip/steamjourney/public/upload/1-1555325276.jpg').description('活动主图').required(),
                    action_title: Joi.string().default('科睿机器人店庆大回馈新老会员优惠活动开始啦！').description('活动主题').required(),
                    action_corp: Joi.string().default('科睿机器人').description('活动主办方-公司名').required(),
                    corp_phone: Joi.string().default('13544153419').description('主办方电话').required(),
                    corp_wx_qrcode: Joi.string().default('#').description('主办方微信').required(),
                    action_addr: Joi.string().default('科睿新洲分校；科睿景田分校').description('主办方地址').required(),
                    action_duration_time: Joi.string().default('2019-04-15 ～ 2019-04-20').description('活动时间').required(),
                    action_count_type: Joi.number().integer().description('count取值必为action_rules中的一项').default(3).required(),
                    action_max_members_count: Joi.number().integer().description('团上限人数').min(0).default(10).required(),
                    action_total_members: Joi.number().integer().default(100).description('召集人数').required(),
                    action_allow_old_join: Joi.boolean().default(true).description('允许老生参团').required(),
                    action_state: Joi.boolean().default(true).description('活动状态').required(),
                    action_rules: Joi.array().items(Joi.object().keys({
                        count: Joi.number().integer().min(0).default(1),
                        price: Joi.number().integer().min(0).default(2400),
                    })),
                    share_options: Joi.object().keys({
                        title: Joi.string().default('云吞提示-未设置分享信息'),
                        logo: Joi.string().default('#'),
                        content: Joi.string().default('请联系活动管理员'),
                    }),
                    action_areas: Joi.array().items(Joi.string().required().default('景田校区')),
                    action_classes: Joi.array().items(Joi.string().required().default('BAB班级')),
                    action_detailpic: Joi.string().default('http://www.ubaby.vip/steamjourney/public/upload/1-1555325276.jpg').description('活动详情图').required(),
                    action_spreadpic: Joi.string().default('http://www.ubaby.vip/steamjourney/public/upload/1-1555325276.jpg').description('海报分享图').required(),
                    poster_options: Joi.object().keys({
                        w:Joi.string().default('100').description('二维码宽度'),
                        x:Joi.number().integer().default(0).description('二维码定位的x轴位置'),
                        y:Joi.number().integer().default(0).description('二维码定位的y轴位置'),
                        fontColor:Joi.string().default('black').description('扫描二维码文字的颜色')
                    })
                })
            }
        }
    },
    // 获取全部活动详情接口
    {
        method: 'GET',
        path: '/fetch_action/all',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { bsfusion_activity, bsfusion } = Main.collections;
                const result = await bsfusion_activity.find({})
                const all_action_data = await bsfusion.find({})
                // const rules_summary_list = await bsfusion.distinct('count_type', {});

                const analysis_info = result.map( item => {
                    const rules_summary_list = item.action_rules.map(rule => rule.count);
                    const data_list = all_action_data.filter( group => group.action_id == item._id && group.group_list.length );
                    const current_group_count = data_list.length;
                    const total_count = data_list.reduce((prev, next) => { return prev += next.group_list.length }, 0);
                    const rules_count = rules_summary_list.sort().map( (type, index) => `${type}人团： 满足条件共${data_list.filter(group => group.group_list.length < (rules_summary_list[index + 1] || 1000) && group.group_list.length >= type).length}，未满足${data_list.filter(group => group.count_type == type && group.group_list.length < type).length}` );

                    return { ...item, current_group_count, total_count, rules_count }
                });


                if (result) return h.response({code: 0, data: analysis_info, msg: 'success'});
                return h.response({ code: -1, msg: 'fail' })
            },
            description: '获取全部活动详情接口',
            tags: ['api', 'bsfusion'],
            notes: 'fetch_action/all',
        }
    },
    // 根据活动id获取团列表接口
    {
        method: 'GET',
        path: '/fetch_group_analysis_list/{action_id}',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { action_id } = request.params;
                const { bsfusion_activity, bsfusion } = Main.collections;
                const current_action = await bsfusion_activity.findOne({ _id: action_id });
                const all_action_data = await bsfusion.find({ action_id });
                const rules_summary_list = current_action.action_rules.map(rule => rule.count);

                let result = rules_summary_list.sort().map( (rule, index) => {
                    return { name: `${rule}人团`, data_list: all_action_data.filter( item => item.group_list.length < (rules_summary_list[index + 1] || 1000) && item.group_list.length >= rule ) }
                })
                result.push({ name: '全部数据', data_list: all_action_data.filter(item => item.group_list.length) });

                if (result) return h.response({code: 0, data: result, msg: 'success'});
                return h.response({ code: -1, msg: 'fail' })
            },
            description: '根据活动id获取团列表接口',
            tags: ['api', 'bsfusion'],
            notes: 'fetch_group_analysis_list',
            validate: {
                params: Joi.object().keys({
                    action_id: Joi.string().required()
                }),
            }
        }
    },
    // 根据活动id获取活动详情接口
    {
        method: 'GET',
        path: '/fetch_action/{action_id}',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { bsfusion_activity } = Main.collections;
                const result = await bsfusion_activity.findOne({ _id: request.params.action_id})
                if (result) return h.response({code: 0, data: result, msg: 'success'});
                return h.response({ code: -1, msg: 'fail' })
            },
            description: '根据活动id获取活动详情接口',
            tags: ['api', 'bsfusion'],
            notes: 'fetch_action',
            validate: {
                params: Joi.object().keys({
                    action_id: Joi.string()
                })
            }
        }
    },
    // 团长开团接口
    {
        method: 'POST',
        path: '/push_action/{action_id}',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { bsfusion, bsfusion_activity } = Main.collections;
                const { action_id } = request.params;
                const result = await bsfusion.find({ action_id });

                let isExist = result.some(item => item.group_list.some(mem => mem.phone === request.payload.phone));
                if (isExist) 
                    return h.response({ code: -1, msg: '手机号已存在'});

                isExist = result.some(item => item.group_list.some(mem => mem.name === request.payload.name));
                if (isExist) 
                    return h.response({ code: -1, msg: '姓名已存在'});
                
                const isActivityExist = await bsfusion_activity.count({ _id: action_id });
                if (!isActivityExist) return h.response({code: -1, msg: '活动异常'})

                const group_num = Main.getRandomRemark(new Date().getTime());
                const groupData = { ...request.payload, action_id, group_num, group_list: [{...request.payload, id_type: '团长', join_time: new Date().toLocaleString()}] };
                const {_id} = await bsfusion.insert(groupData);
                if (!_id) return h.response({ code: -1, msg: '开团失败'});
                return h.response({ code: 0, data: {gourp_id: _id}, msg: 'success' });
            },
            description: '团长开团，提交团长信息，并生成团标识返回',
            tags: ['api', 'bsfusion'],
            notes: 'push_action',
            validate: {
                payload: Joi.object().keys({
                    name: Joi.string().description('姓名').required(),
                    phone: Joi.string().description('手机号').required(),
                    age: Joi.string().description('年龄').required(),
                    area: Joi.string().description('校区').required(),
                    class: Joi.string().description('班级').required(),
                    type: Joi.string().description('类型').required(),
                    count_type: Joi.number().integer().description('X人团 - count取值必为action_rules中的一项').default(3).required(),
                    max_count: Joi.number().integer().description('团上限人数').min(0).required(),
                    allow_old_join: Joi.boolean().description('允许老生参团').required()
                }),
                params: {
                    action_id: Joi.string().required(), 
                }
            }
        }
    },
    // 获取全团信息接口
    {
        method: 'GET',
        path: '/fetch_group_list/{action_id}',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { bsfusion } = Main.collections;
                const { key } = request.query;
                const { action_id } = request.params;
                let result;
                if (!key) result = await bsfusion.find({ action_id });
                else result = (await bsfusion.find({ action_id })).filter(item => item.group_list.some(mem => mem.name.indexOf(key) > -1  || mem.phone.indexOf(key) > -1 ))
                // else result = await bsfusion.find({ action_id, $or: [ {name: { $regex: key, $options: 'i' }}, {phone: { $regex: key, $options: 'i' } } ] });

                const total_member_count = result.reduce((prev, next) => prev += next.group_list.length, 0 );
                const new_member_count = result.reduce((prev, next) => prev += next.group_list.filter(group => group.type === '新生').length, 0 )

                return h.response({code:0, msg:'success', data: { group_info_list: result, total_member_count,  new_member_count } })
            },
            description: '获取全团信息接口',
            tags: ['api', 'bsfusion'],
            notes: 'fetch_group_info',
            validate: {
                query: Joi.object().keys({
                    key: Joi.string(),
                }),
                params: Joi.object().keys({
                    action_id: Joi.string().required()
                })
            }
        }
    },
    // 根据团id获取该团信息接口
    {
        method: 'GET',
        path: '/fetch_group_info/{group_id}',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { bsfusion } = Main.collections;
                const result = await bsfusion.findOne({ _id: request.params.group_id})
                if (result) return h.response({code: 0, data: result, msg: 'success'});
                return h.response({ code: -1, msg: 'fail' })
            },
            description: '根据团id获取该团信息接口',
            tags: ['api', 'bsfusion'],
            notes: 'fetch_group_info',
            validate: {
                params: Joi.object().keys({
                    group_id: Joi.string().required()
                })
            }
        }
    },
    // 验证手机号是否存在
    {
        method: 'GET',
        path: '/verify_phone/{action_id}',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { action_id } = request.params;
                const { phone } = request.query;
                const { bsfusion } = Main.collections;
                const result = await bsfusion.find({ action_id });
                const isExist = result.some(item => item.group_list.some(mem => mem.phone === phone));
                if (!isExist) 
                    return h.response({ code: 0, msg: '可以新增'});
                return h.response({ code: -1, msg: '已存在' })
            },
            description: '验证手机号是否存在',
            tags: ['api', 'bsfusion'],
            notes: 'verify_phone',
            validate: {
                query: Joi.object().keys({
                    phone: Joi.string().description('手机号').required(),
                }),
                params: {
                    action_id: Joi.string().required(), 
                }
            }
        }
    },
    // 验证姓名是否存在
    {
        method: 'GET',
        path: '/verify_name/{action_id}',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { action_id } = request.params;
                const { name } = request.query;
                const { bsfusion } = Main.collections;
                const result = await bsfusion.find({ action_id });
                const isExist = result.some(item => item.group_list.some(mem => mem.name === name));
                if (!isExist) 
                    return h.response({ code: 0, msg: '可以新增'});
                return h.response({ code: -1, msg: '已存在' })
            },
            description: '验证姓名是否存在',
            tags: ['api', 'bsfusion'],
            notes: 'verify_name',
            validate: {
                query: Joi.object().keys({
                    name: Joi.string().description('姓名').required(),
                }),
                params: {
                    action_id: Joi.string().required(), 
                }
            }
        }
    },
    // 团员入团接口
    {
        method: 'POST',
        path: '/join_action/{action_id}/{group_id}',
        config: {
            cors: true,
            handler: async (request, h) => {
                const { group_id, action_id } = request.params;
                const { name, phone, type } = request.payload;
                const { bsfusion } = Main.collections;
                const result = await bsfusion.findOne({ _id: group_id, action_id });

                if (result) {
                    const { group_list, max_count, allow_old_join } = result
                    if ( group_list.some( item => item.phone === phone ) ) {
                        return h.response({ code: -1, msg: '该手机号已存在'});
                    }
                    else if ( group_list.some( item => item.name === name ) ) {
                        return h.response({ code: -1, msg: '姓名已存在'});
                    }
                    else if (group_list.some( item => item.type === '老生' ) && type === '老生') {
                        if (!allow_old_join) return h.response({ code: -2, msg: '团报模式是老生带新生，您是老生，系统将引导您去开团' })
                    }
                    else if ( group_list.length + 1 > max_count ) {
                        return h.response({ code: -3, msg: '该团已满员，请加入其他团或开新团' })
                    }
                    const groupData = { ...result, group_list: [ ...group_list, {...request.payload, id_type: '团员', join_time: new Date().toLocaleString()}] };
                    const {n} = await bsfusion.update({ _id: group_id }, { $set: groupData });
                    if (n) return h.response({code: 0, msg: '加入成功', data: groupData});
                }
                return h.response({code: -1, msg: `入团失败`})
            },
            description: '团员根据团标识入团，返回团员列表信息',
            tags: ['api', 'bsfusion'],
            notes: 'join_action',
            validate: {
                payload: Joi.object().keys({
                    name: Joi.string().description('姓名').required(),
                    phone: Joi.string().description('手机号').required(),
                    age: Joi.string().description('年龄').required(),
                    area: Joi.string().description('校区').required(),
                    class: Joi.string().description('班级').required(),
                    type: Joi.string().description('类型').required(),
                }),
                params: {
                    action_id: Joi.string().required(), 
                    group_id: Joi.string().required()
                }
            }
        }
    },
    // 团员根据手机号退团接口
    {
      method: 'POST',
      path: '/quit_action/{action_id}/{group_id}',
      config: {
          cors: true,
          handler: async (request, h) => {
              const { group_id, action_id } = request.params;
              const { phone, type } = request.payload;
              const { bsfusion } = Main.collections;
              const result = await bsfusion.findOne({ _id: group_id, action_id });

              if (result) {
                const { group_list } = result
                const groupData = { ...result, group_list: group_list.filter((item) => item.phone != request.payload.phone ) };
                const {n} = await bsfusion.update({ _id: group_id }, { $set: groupData });
                if (n) return h.response({code: 0, msg: '退团成功', data: groupData});
              }
              return h.response({code: -1, msg: `退团失败`})
          },
          description: '团员根据活动id,团id,手机号退团，返回执行状态',
          tags: ['api', 'bsfusion'],
          notes: 'quit_action',
          validate: {
                payload: Joi.object().keys({
                  phone: Joi.string().description('手机号').required(),
                }),
                params: {
                  action_id: Joi.string().required(), 
                  group_id: Joi.string().required()
                }
            }
        }
    },
    {
        method: 'GET',
        path: '/data_to_excell/{action_id}/{type}',
        config: {
            cors: true,
            handler:async (request,h)=>{
                const {type,action_id} = request.params;
                //配置monk连接数据库
                const { bsfusion: collection } = Main.collections
                //引入数据导出模块
                const {xlsx} = Main.utils;
                let final = await Main.start(type,collection,xlsx,action_id)
                return h.response(final)
            },
            description: '将数据库里的信息导出为excell',
            tags: ['api', 'bsfusion'],
            notes: '/data_to_excell',
            validate: {
                params: {
                    type: Joi.string().required(),
                    action_id:Joi.string().required()
                }
            }
        }
    },
    // 本地图片上传到oss
    {
        method: 'POST',
        path: `/upload_file`,
        config: {
            auth: false,
            cors: {
                origin: ['*'],
                additionalHeaders: ['cache-control', 'x-requested-with']
            },
            handler: async (request, h)=> {
                const {file, type, file: { hapi: { filename } } } = request.payload;
                const filepath = await Main.loadSourceByStream(file, filename);
                const result = await Main.uploadFile( filepath );
                process.nextTick( ()=> Main.rmLocal( filepath ) );
                return h.response(result);
            },
            plugins: {
                'hapi-swagger': {
                    payloadType: 'form'
                }
            },
            description: '本地图片上传到oss',
            tags: ['api', 'bsfusion'],
            notes: 'upload_file',
            validate: {
                payload: Joi.object().keys({
                    file: Joi.any().required()
                        .meta({ swaggerType: 'file' })
                        .description('其他类型的素材文件'),
                }).unknown()
            },
            payload: {
                maxBytes: 209715200,
                parse: true,
                output: 'stream'
            },
        }
    }
  ])
}

exports.plugin = {
  name: 'api-bsrh',
  multiple: false,
  register
}