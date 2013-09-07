var request = require('request'),
     conf = require('./conf');

exports.sourcesMw = function(cb){
    request.get({url:'https://api.parse.com/1/classes/Source',json:true,limit:200,order:"-createdAt",headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
        cb(b.results);
    });
};