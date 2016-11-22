/*
  请求返回后，所有的处理都在这里。
  因为这个内容也比较多，所以专门分了这个文件
*/

var Mongo = require('./mongo');
var cheerio = require('cheerio');

function update(obj) {
  Mongo.community.findOneAndUpdate({
    community_name: obj.community_name
  }, obj, {
    upsert: true
  }, function(e, d) {
    console.log('Update successful...');
  });
}

function parser(e, res, body){
  var d = [];
  var re=/(\d+)/gi;
  var xiaoqu, lat, lng, community_name, aver_price, building_count, house_count, age_tmp, age = [];
  console.log('开始parse...');
  var $ = cheerio.load(body);
  xiaoqu = $('#actshowMap_xiaoqu').attr('xiaoqu');
  console.log(xiaoqu);
    if (xiaoqu == "") {
      lat = "";
      lng = ""; 
      community_name = "";
    } else {
    xiaoqu = xiaoqu.replace(/\'/g, '"');//展示的数据不是标准的json, 处理成标准的json，json要双引号 ['aa'] => ["aa"]
    xiaoqu = JSON.parse(xiaoqu);
    lat = xiaoqu[1];
    lng = xiaoqu[0];
    community_name = xiaoqu[2];
    }

    avr_price = $('.priceInfo').find('.p').text();
    if (avr_price == "") {
      avr_price = "";
    } else {
      avr_price = JSON.parse(avr_price); //JSON.parse can't prase ""
    }

    $('.other').each(function (index) { 
      d[index] = $(this).text(); 
    });
    //var building_type = d[0].trim();
    //var develop_company = d[4].trim();

    /*if (d[5] === undefined) {
    building_count = "";
    } else {*/
      building_count = d[5].trim().match(re); //trim can't input null
    //}

    /*if (d[6] === undefined) {
      house_count = "";
    } else {*/
      house_count = d[6].trim().match(re);
    //}
    /*console.log(building_type);
    console.log(age);
    //console.log(develop_company);
    console.log(building_count);
    console.log(house_count);*/

    age_tmp = d[1].trim().match(re);
    if (age_tmp == "" ) {
      age_tmp = "";
      age = "";
    } else {
      age_tmp= JSON.parse(age_tmp);
      age = 2016 - age_tmp;
    }

    building_count = JSON.parse(building_count);
    house_count = JSON.parse(house_count);
    /*building_type = JSON.parse(building_type);
    develop_company= JSON.parse(develop_company);
    */

    var result = {
      community_name: community_name,
      avr_price: avr_price,
      lat: lat,
      lng: lng,
      age: age,
      building_count: building_count,
      house_count: house_count
    };
    console.log(result)
    update(result);
//  });
}

module.exports = parser;
