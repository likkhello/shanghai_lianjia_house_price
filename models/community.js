"use strict";
var mongoose = require("mongoose"),
  Schema = mongoose.Schema,
  Model = new Schema({
    community_name: String,
    avr_price: Number,
    lat: Number,
    lng: Number,
    age: Number,
    building_count: Number,
    house_count: Number
  });

Model.index({
  community_name: 1
});

module.exports = mongoose.model("community", Model);