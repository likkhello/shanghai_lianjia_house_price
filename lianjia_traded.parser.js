/*
  请求返回后，所有的处理都在这里。
  因为这个内容也比较多，所以专门分了这个文件
*/

var Mongo = require('./mongo');
var cheerio = require('cheerio');

function update(obj) {
  Mongo.chengjiao.findOneAndUpdate({
    house_id: obj.house_id
  }, obj, {
    upsert: true
  }, function(e, d) {
    console.log('更新成功...');
  });
}

function parser(e, res, body){
  var d = [];
  var re=/(\d+)/gi;
  var re1=/(:.*$)/gi;
  var house_name, sold_time, avr_price, floor, age, age_tmp, decoration, faceto, community_name, house_id = [];
  console.log('开始parse...');
  var $ = cheerio.load(body);
  house_name = $('.title-box').find('h1').attr('title');
  console.log(house_name);
    
    sold_time = $('.soldInfo').find('p').first().text();
    //console.log(sold_time);
    sold_price = $('.soldInfo').find('p').eq(1).text().match(re);
    if (sold_price == "" ) {
      sold_price = "";
    } else {
      sold_price= JSON.parse(sold_price);
    }
    //console.log(sold_price);

    avr_price = $('.aroundInfo').find('td').first().clone();
    avr_price.find(':nth-child(n)').remove();
    avr_price = avr_price.text().trim().match(re);
    if (avr_price == "" ) {
      avr_price = "";
    } else {
      avr_price= JSON.parse(avr_price);
    }

    //console.log(aver_price);

    floor = $('.aroundInfo').find('td').eq(1).clone();
    floor.find(':nth-child(n)').remove();
    floor = floor.text().trim();

    age = $('.aroundInfo').find('td').eq(2).clone();
    age.find(':nth-child(n)').remove();
    age_tmp = age.text().trim().match(re);
    if (age_tmp == "" ) {
      age_tmp = "";
      age = "";
    } else {
      age_tmp= JSON.parse(age_tmp);
      age = 2016 - age_tmp;
    }

    decoration = $('.aroundInfo').find('td').eq(3).clone();
    decoration.find(':nth-child(n)').remove();
    decoration = decoration.text().trim();

    faceto = $('.aroundInfo').find('td').eq(4).clone();
    faceto.find(':nth-child(n)').remove();
    faceto = faceto.text().trim();

    community_name = $('.name-xq').text();

    house_id = $('.aroundInfo').find('td').eq(7).clone();
    house_id.find(':nth-child(n)').remove();
    house_id = house_id.text().trim();

    var result = {
      house_name: house_name,
      sold_price: sold_price,
      sold_time: sold_time,
      avr_price: avr_price,
      floor: floor,
      age: age,
      decoration: decoration,
      faceto: faceto,
      community_name: community_name,
      house_id: house_id
    };
    console.log(result)
    update(result);
//  });
}

module.exports = parser;
