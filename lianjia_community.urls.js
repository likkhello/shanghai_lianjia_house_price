/*
  批量获取需要爬取的url
*/
//

var request = require('request');
var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var superagent = require('superagent');
var async = require('async');
var url = require('url');
var eventproxy = require('eventproxy');
var ep = eventproxy();
//var jQuery = require('jQuery');


var urlBase = 'http://sh.lianjia.com';
var urlXiaoqu = urlBase + '/xiaoqu';


function findALLURL($) {
  var hrefs = [];
  var url, urlFull;
  console.log("hello world2");
  $('#filter-options').find('a').each(function(i, node) {
    url = $(node).attr('href');
    urlFull = urlBase +  url;
    hrefs.push(urlFull);
  });
  hrefs = filterUrl(hrefs);
  console.log(hrefs);
  return hrefs;
}


function filterUrl(arr) {
  var newArr = [];
  for (var i = 0; i < arr.length; i++) {
    var url = arr[i];
    if (!url || url.indexOf('xiaoqu') === -1) continue;
    if (url.indexOf('/j') === -1) {
    newArr.push(url);
    }
  }
  return newArr;
}

function genURLs(arr) {
  var newArr = [];
  var url, newUrl;
  for (var i = 0; i <= arr.length; i++) {
    url = arr[i];
    if (!url) continue;
    for (var j = 0; j < 160; j++) {
      newUrl = url + 'd' + j;
      newArr.push(newUrl);
    }
  }
  return newArr;
}

var SubUrlAll = [];
function NewBaseUrlAll() {
  var urls = [];
  console.log("hello world1");
  request.get(urlXiaoqu, function(e, res, body) {
    console.log("进入");
    if (!e && res.statusCode == 200) {
      var $ = cheerio.load(body);
      console.log("执行");
      var urls0 = findALLURL($);
      var BaseUrls = genURLs(urls0);
      //爬取子链接
      urls = get_SubUrls(BaseUrls);
    } else console.log("错误");
  });
  return urls;
}

NewBaseUrlAll();

function unique(array){
    var n = [];//临时数组
    for(var i = 0;i < array.length; i++){
        if(n.indexOf(array[i]) == -1) n.push(array[i]);
    }
    return n;
}

function get_SubUrls(arr) {
  var SubUrlAll = [];
  var concurrencyCount = 0;

  //uniq BaseUrls
  var BaseUrls = unique(arr);

  console.log(BaseUrls);
  var result = [];
  var result1 = [];
  //BaseUrls.forEach(function (page) {
    var fetchUrl = function (myurl, callback) {
    concurrencyCount++;
    console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', myurl);
    superagent.get(myurl).end(function (err, sres) {
            // 常规的错误处理
        if (err) {
            //console.log('错误');
            callback(err, myurl + ' error happened!');
        }
        concurrencyCount--;
          // 提取链接
        var $ = cheerio.load(sres.text);
        $('.list-wrap').find('li').each(function(i, node){
              node = $(node);
              var infoNode = node.find('.info-panel');
              var Infoh2 = infoNode.find('h2').find('a');
              var SubUrl = Infoh2.attr('href')
              //console.log(SubUrl);
              SubUrlAll.push(SubUrl);
              console.log('get SubUrlAll successful!\n', SubUrlAll);
              ep.emit('get_sub_link', 'successful');
            });
        result = 1;
        callback(null, result);
    }); //superagent
  }; //fetchUrl

  async.mapLimit(BaseUrls, 5, function (myurl, callback) {
          fetchUrl(myurl, callback);
      }, function (err, result) {
          fs.appendFile(__dirname + '/lianjia_community_SubUrls.txt', SubUrlAll, function () {
              console.log('=========== SubUrls: ===========\n', SubUrlAll);
          });
      });

  /*ep.after('get_sub_link', BaseUrls.length, function () {
      //console.log(BaseUrls);
      console.log(SubUrlAll);
      console.log('抓取结束')
  });*/
  return SubUrlAll;
}
