var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/house');

var Community = require('./models/community');
var Chengjiao = require('./models/chengjiao');

module.exports = {
  community: Community,
  chengjiao: Chengjiao
};