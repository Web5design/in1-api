
module.exports.getUuid = function() {
  var uuid = '';
  for (var i = 0; i < 32; i++) {
    uuid += Math.floor(Math.random() * 16).toString(16);
  }
  return uuid;
};

module.exports.fixUrl = function(url,host) {
 
    if (typeof url=="undefined") {
        return;
    }
  
    if (url.substring(0,2)=='//') {
        // for urls that start with '//'
        url = "http:" + url;
    }
    else if (url.indexOf('/')===0) {
        // for urls that start with '/' = local
        url = "http://" + host + url;
	}
    else if (url.indexOf('http')===-1) {
        // for urls that start with '/' = local
        url = "http://" + url;
	}
  
    return url;
};