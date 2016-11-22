/*
 调用已产生的subUrl, 使用线程池爬取数据
*/

var request = require('request');
var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
//var getURLs = require('./lianjia_traded.urls');
var Pool = require('./lianjia_traded.pool');
var iconv = require('iconv-lite');
var urlBase = 'http://sh.lianjia.com';

var urls = [];
fs.readFile(__dirname + '/Chengjiao_SubUrls.txt', {flag: 'r+', encoding: 'utf8'}, function(err, data) {
    if(err) {
    	console.log("error");
   	}
    urls = data.toString().split(",");
    for(i in urls) {
    	urls[i] = urlBase + urls[i];
        console.log(urls[i]);
        if(i == urls.length) break;
    }
    console.log('读取成功');
	console.log(urls.length);
	console.log(urls);
	new Pool(urls).query();
});

//process.exit();

//getURLs(function(urls){
//  new Pool(urls).query();
//});
//
