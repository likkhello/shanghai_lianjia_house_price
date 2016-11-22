/*
  pool的模型
*/

var request = require('request');
var fs = require('fs');
//

var Mongo = require('./mongo');

var poolCount = 6;
var timeout = 2000;

var parser = require('./lianjia_community.parser');

function Pool(urls){
  this.urls = urls;
  console.log(urls.length);
  this.reset();
  this.init();
}


Pool.prototype = {
  reset: function(){
    this.spiderIndex = 0;
    this.queryingIndex = 0;
  },
  init: function(){
    this.querying = [];
  },
  done: function(){
    console.log('大功告成..');
    process.exit();
  },
  process: function(e, res, body){
    if (!e && res.statusCode == 200) {
      parser(e, res, body);
      return this.onProcessed();
    } else {
      console.log('错误');
      return this.onProcessed();
    }
  },
  onProcessed: function(){
    this.queryingIndex--;
    setTimeout(function(){
      this.query();
    }.bind(this), timeout);
  },
  query: function(){
    if (this.queryingIndex > poolCount) return;
    var url = this.urls[this.spiderIndex];
    console.log(this.urls.length + "&" + this.spiderIndex);
    if(this.spiderIndex >= this.urls.length) return this.done();
    request.get(url, function(e, res, body){
      console.log(url);
      this.process(e, res, body);
    }.bind(this));
    this.spiderIndex = this.spiderIndex + 1;
    this.queryingIndex = this.queryingIndex + 1;
    console.log(this.spiderIndex + '|' + this.queryingIndex);
    if(this.queryingIndex < poolCount) this.query();
  }
};

module.exports = Pool;
