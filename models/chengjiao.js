"use strict";
var mongoose = require("mongoose"),
  Schema = mongoose.Schema,
  Model = new Schema({
    house_name: String,
    sold_price: Number,
    sold_time: String,
    avr_price: Number,
    floor: String,
    age: Number,
    decoration: String,
    faceto: String,
    community_name: String,
    house_id: String
  });

Model.index({
  house_id: 1
});

module.exports = mongoose.model("chengjiao", Model);