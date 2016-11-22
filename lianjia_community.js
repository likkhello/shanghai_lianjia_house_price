/*
调用已产生的subUrls, 使用线程池爬取数据
*/

var request = require('request');
var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
//var getURLs = require('./lianjia_community.urls');
var Pool = require('./lianjia_community.pool');
var iconv = require('iconv-lite');
var urlBase = 'http://sh.lianjia.com';

var SubUrlAll = [] ;

var urls = [];
fs.readFile(__dirname + '/lianjia_community_SubUrls.txt', {flag: 'r+', encoding: 'utf8'}, function(err, data) {
    if(err) {
    	console.log("error");
   	}
    urls = data.toString().split(",");
    for(i in urls) {
    	urls[i] = urlBase + urls[i];
        console.log(urls[i]);
        if(i == urls.length) break;
    }
    console.log('Read URL successful');
	console.log(urls.length);
	console.log(urls);
	new Pool(urls).query();
});

//getURLs(function(urls){
//  new Pool(urls).query();
//});
//
