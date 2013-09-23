var port = process.env.PORT || 4000,
    app = require('./app').init(port),
    utils = require('./utils'),
    conf = require('./conf'),
    site = require('./site'),
    window = require('jsdom').jsdom().createWindow(),
    $ = require('jquery'),
    request = require('request'),
    everyauth = require('everyauth'),
    cronJob = require('cron').CronJob;

var ua = 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 Safari/537.36';
var hashTags = ["#tech","#startup","brands","#vc","#facebook","#webdev","#innovation","#webdeveloper","#customers","#technology","#some","#apps","#mobile","#html5","#branding","#startups","#beta","#rwd","#socialmedia","#webdesign","#tools","#smm"];

//in1
var oauth = 
    { consumer_key: conf.twit.consumerKey
    , consumer_secret: conf.twit.consumerSecret
    , token: "480346094-HIZrfb9w9D48WGWK6Ib21MxdWzbduRrMWhAi5ZoB"
    , token_secret: "D8iqNaFMnKeXnLhhQ9POebtiKgGOAmHAZE9qToSRSc"
};

var checkSource = new cronJob('*/5 * * * *', function(){
    
    var sources = app.locals.sources;
    
     console.log("checking....");
    
    if (typeof sources!="undefined" && sources.length>1) {
    
        console.log("check....");
    
        var rnd = Math.floor((Math.random()*(sources.length-1))); // get random index
        var rnd2 = Math.floor((Math.random()*(sources.length-1)));
        var arrOfSources = [];
        var results = [];
        var uniResults = [];
        
        arrOfSources.push(sources[rnd]);
        arrOfSources.push(sources[rnd2]);
        
        goTweets(0,arrOfSources,results,function(r){
            var arrOfNewResults = r;
            
            
                  console.log("go tweet"+arrOfNewResults.length);
    
            checkUni(0,arrOfNewResults,uniResults,function(r){
                var feedItems = [];
                
                for (var i in r) {
                
                    feedItems.push({                 // create a post obj for each result
                        "method": "POST",
                        "path": "/1/classes/Feed",
                        "body": r[i]
                    });
                
                }
                
                console.log("feed items count..."+feedItems.length);
                
                request.post({url:'https://api.parse.com/1/batch',json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
                    body:{requests:feedItems}}, function (e,r,b){
                    console.log("added batch posts to parse api..."+JSON.stringify(b));
                    
                });
                
            })
            
        });
        
        // save to feed stream
    
    
    }
    
}, function () {
    console.log("job completed.........");
}, 
true,
"America/Chicago");

function checkUni(i,arr,results,cb){
                   
    if (i<arr.length) {
    
        // exists?
        var whereClause = {"url":arr[i].url};
        request.get({url:'https://api.parse.com/1/classes/Feed',json:true,qs:{keys:"url",where:JSON.stringify(whereClause)},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
            
            //console.log("does exist?.."+b.results.length);
            
            if (typeof b.results!="undefined" && b.results.length>0){
                //arr[i].exists="1";
                //arr[i].image=b.results[0].image;
            }
            else if (b.results.length==0) {
                results.push(arr[i]); // it's new so add it
            }
            
            checkUni(i+1,arr,results,cb);
        });
    }
    else {
        // done! ---------------------------
        cb(results);
    }
}

function goTweets(i,arr,results,cb){
    
    var tweetsToFetch = 10;
    var reqUrl = 'https://api.twitter.com/1.1/statuses/user_timeline.json?';
    var sources=arr;
    //var results=[];
    var params = 
        {    
            /*include_entities:true,*/
            include_rts:false,
            count:tweetsToFetch
        };
    
    if (i<sources.length) {
    
        if (sources[i].type=="hashtag") {
            // search by hashtag
            reqUrl = 'https://api.twitter.com/1.1/search/tweets.json?';
            params.q = sources[i].twitter;
            params.result_type="recent";
        }
        else {
            // get by screen_name
            params.screen_name = sources[i].twitter;
            params.trim_user = 1;
        }
                
        reqUrl += require('querystring').stringify(params);
            
        var reqObj;
        reqObj = {url:encodeURI(reqUrl), oauth:oauth};
                
        //console.log("url---------------"+reqUrl);
                
        request.get(reqObj, function (e, r, body) {
            //console.log("request---------------------------------"+JSON.stringify(reqObj));
            //console.log("body---------------"+body.substring(0,600));
                    
            var objs,url,mentioned;
                    
            if (!e || typeof e == "undefined") {
                    
                objs = JSON.parse(body);
            
                if (typeof objs.statuses!="undefined"){ // search API results contains the results array inside 'statuses' object
                    objs = objs.statuses;
                }
                        
                for (var j=0;j<objs.length;j++) {
                    if (typeof objs[j].entities !="undefined" && objs[j].entities.urls.length>0){ // must have url
                                
                    url = objs[j].entities.urls[0].url;
                    var txt = objs[j].text.replace(/ *\[[^)]*\] */g,"");
                    if (typeof objs[j].entities !="undefined" && objs[j].entities.user_mentions.length>0){
                        mentioned = objs[j].entities.user_mentions[0].screen_name;
                    }
                        
                    results.push({account:sources[i].twitter,source:sources[i].name,sourceObj:sources[i].objectId,url:url,text:txt,mentioned:mentioned,rts:objs[j].retweet_count,id:objs[j].id});   
                                
                    }
                }
            }
            
            // next
            goTweets(i+1,arr,results,cb);
            
        }); // end request
        
    }
    else {
        
        // done!!
        cb(results);
        
    }
}


var job = new cronJob('*/12 * * * *', function(){
    
        var currentTime = new Date();
        var seconds = currentTime.getMinutes();
        var tId;
        var rnd = Math.floor((Math.random()*(hashTags.length-1))); // get random index
        var rnd2 = Math.floor((Math.random()*(25)));
    
        console.log("running cron............................................................."+seconds);
        
        if (rnd2%3===0){
        
            console.log("favorited...."+hashTags[rnd]);
            
            tweetsByTag(hashTags[rnd],function(e,b){
               
               var objs = JSON.parse(b);
               
               if (typeof objs.statuses[rnd]!="undefined") {
                   
                   //console.log(JSON.stringify(objs.statuses[rnd]));
               
                   tId = objs.statuses[rnd].id_str;
                   var sn = objs.statuses[rnd].user.screen_name;
                   
                   
                   doFavoriteTweet(tId,function(e,b){
                
                       console.log("favorited...."+tId);
                       
                       //doFollow(sn,function(e,b){
                    //        console.log("following...."+sn);
                      //  });
                   });
               
               }
                
            });
        }
        else if (rnd2%5===0){
        
            console.log("retweeting tag..."+hashTags[rnd]);
            
            tweetsByTag(hashTags[rnd],function(e,b){
               
               var objs = JSON.parse(b);
               
               if (objs.statuses[2].retweet_count>0 && objs.statuses[2].retweet_count<2) {
               
                   tId = objs.statuses[2].id_str;
                   
                   doReTweet(tId,function(e,b){
                
                       console.log("RT...."+tId);
                       
                   });
               
               }
                
            });
        }
        else if (rnd2%9===0){
            
            console.log("find users to follow by tag..."+hashTags[rnd]);
            
            usersByTag(hashTags[10],function(e,b){
               
               var objs = JSON.parse(b);
               
               if (objs[10].statuses_count>0 && objs[10].followers_count<objs[10].friends_count) {
               
                   tId = objs[10].screen_name;
                   
                   doFollow(tId,function(e,b){
                
                       console.log("following...."+tId);
                       
                   });
               
               }
                
            });
            
        }
        else {
        
        // check q
        var whereClause = {"posted":false};
        request.get({url:'https://api.parse.com/1/classes/Queue',json:true,qs:{where:JSON.stringify(whereClause)},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
                
            //console.log("does exist?.."+b.results.length);
            
            if (typeof b.results!="undefined" && b.results.length>0){
                
                var objId = b.results[0].objectId;
                doTweet(b.results[0].tweet,"CarolSkelly",function(e,b){
                    console.log("tweeted done..."+e+"------"+JSON.stringify(b));
                    
                    request.put({url:'https://api.parse.com/1/classes/Queue/'+objId,json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
                        body:{posted:true}}, function (e,r,b){
                        
                        if (typeof e!="undefined") {
                            console.log("update q error.."+JSON.stringify(e));
                        }
                    });
                    
                });
            }
            else {
                
                console.log("nothing in queue.");
            }
            
            
        });
        
        }
    
    }, function () {
        console.log("job completed.........");
    }, 
    true,
    "America/Chicago"
);

var usersById = {};
var nextUserId = 0;

function addUser (source, sourceUser) {
  var user;
  if (arguments.length === 1) { // password-based
    user = sourceUser = source;
    user.id = ++nextUserId;
    return usersById[nextUserId] = user;
  } else { // non-password-based
    user = usersById[++nextUserId] = {id: nextUserId};
    user[source] = sourceUser;
  }
  return user;
}

var usersByFbId = {};
var usersByTwitId = {};
var usersByLogin = {};

everyauth.everymodule
  .findUserById( function (id, callback) {
    callback(null, usersById[id]);
  });

everyauth
  .facebook
    .appId(conf.fb.appId)
    .appSecret(conf.fb.appSecret)
    .findOrCreateUser( function (session, accessToken, accessTokenExtra, fbUserMetadata) {
      return usersByFbId[fbUserMetadata.id] ||
        (usersByFbId[fbUserMetadata.id] = addUser('facebook', fbUserMetadata));
    })
    .redirectPath('/');

everyauth
  .twitter
    .consumerKey(conf.twit.consumerKey)
    .consumerSecret(conf.twit.consumerSecret)
    .findOrCreateUser( function (sess, accessToken, accessSecret, twitUser) {
        console.log("tweiiiiiii");
      return usersByTwitId[twitUser.id] || (usersByTwitId[twitUser.id] = addUser('twitter', twitUser));
    })
    .redirectPath('/');

everyauth
  .password
    .loginWith('email')
    .getLoginPath('/login')
    .postLoginPath('/login')
    .loginView('login')
//    .loginLocals({
//      title: 'Login'
//    })
//    .loginLocals(function (req, res) {
//      return {
//        title: 'Login'
//      }
//    })
    .loginLocals( function (req, res, done) {
      setTimeout( function () {
        done(null, {
          title: 'Async login'
        });
      }, 200);
    })
    .authenticate( function (login, password) {
      var errors = [];
      if (!login) errors.push('Missing login');
      if (!password) errors.push('Missing password');
      if (errors.length) return errors;
      var user = usersByLogin[login];
      if (!user) return ['Login failed'];
      if (user.password !== password) return ['Login failed'];
      return user;
    })

    .getRegisterPath('/register')
    .postRegisterPath('/register')
    .registerView('register')
//    .registerLocals({
//      title: 'Register'
//    })
//    .registerLocals(function (req, res) {
//      return {
//        title: 'Sync Register'
//      }
//    })
    .registerLocals( function (req, res, done) {
      setTimeout( function () {
        done(null, {
          title: 'Async Register'
        });
      }, 200);
    })
    .validateRegistration( function (newUserAttrs, errors) {
      var login = newUserAttrs.login;
      if (usersByLogin[login]) errors.push('Login already taken');
      return errors;
    })
    .registerUser( function (newUserAttrs) {
      var login = newUserAttrs[this.loginKey()];
      return usersByLogin[login] = addUser(newUserAttrs);
    })

    .loginSuccessRedirect('/')
    .registerSuccessRedirect('/');







/*---------------------- default route ----------------------*/

app.get('*', function(req,res,next){
    if (typeof app.locals.sources === "undefined"){
        site.sourcesMw(function(d){
            app.locals.sources=d;
            next();
        });
    }
    else {
        next();
    }
});
            
app.get('/hello', function(req,res){
   res.render("index");
});

app.get("/",function(req, res){
   
    request.get({url:'https://api.parse.com/1/classes/Post',json:true,qs:{limit:200,order:"-createdAt",include:"sourceObj"},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
        if (b.results) {
            
            request.get({url:'https://api.parse.com/1/classes/Feed',json:true,qs:{limit:200,order:"-createdAt"},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e1,r1,b1){
                
                request.get({url:'https://api.parse.com/1/classes/Queue',json:true,qs:{limit:200,order:"-createdAt"},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e2,r2,b2){
                
                    //if (f=="json") { 
                    //    res.send({results:b1.results,posts:b.results,queue:b2.results});
                    //} else {
                        res.render("index",{results:b1.results,posts:b.results,queue:b2.results});
                    //}
                
                });
                
            });
        }
        else {
            
            res.render("500",{error:"no results.."});
            
        }
    });
    
});

app.get("/feed",function(req, res){
   
    var results = [];
    var sources = [];
    
    var q = req.query["q"];
    var f = req.query["format"];
    var lastId = (req.query["lastId"])||0;
    var tweetsToFetch=4;
    
    function checkUni(i){
                   
        if (i<results.length) {
        
            // exists?
            var whereClause = {"origUrl":results[i].url};
            request.get({url:'https://api.parse.com/1/classes/Post',json:true,qs:{keys:"origUrl,image",where:JSON.stringify(whereClause)},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
                
                //console.log("does exist?.."+b.results.length);
                
                if (typeof b.results!="undefined" && b.results.length>0){
                    results[i].exists="1";
                    results[i].image=b.results[0].image;
                }
                
                checkUni(i+1);
            });
        }
        else {
            // done! ---------------------------
            
            request.get({url:'https://api.parse.com/1/classes/Post',json:true,qs:{limit:200,order:"-createdAt",include:"sourceObj"},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e2,r2,b2){
                if (b2.results) {
                    
                    //request.get({url:'https://api.parse.com/1/classes/Source',json:true,qs:{limit:200,order:"-createdAt"},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e3,r3,b3){
                        
                        request.get({url:'https://api.parse.com/1/classes/Queue',json:true,qs:{limit:200,order:"-createdAt"},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e4,r4,b4){
                        
                            if (f=="json") { 
                                res.send({results:results,posts:b2.results,queue:b4.results});
                            } else {
                                res.render("index",{results:results,posts:b2.results,queue:b4.results});
                            }
                        
                        });
                        
                    //});
                }
                else {
                    
                    res.render("500",{error:"no results.."});
                    
                }
                
            });
            
        }
    }
    
    function getTweets(i){
        var reqUrl = 'https://api.twitter.com/1.1/statuses/user_timeline.json?';
        var oauth = 
                { consumer_key: conf.twit.consumerKey
                , consumer_secret: conf.twit.consumerSecret
                , token: "480346094-HIZrfb9w9D48WGWK6Ib21MxdWzbduRrMWhAi5ZoB"
                , token_secret: "D8iqNaFMnKeXnLhhQ9POebtiKgGOAmHAZE9qToSRSc"
            };
        var params = 
            {    
                /*include_entities:true,*/
                count:tweetsToFetch
            };
        
        if (i<sources.length) {
            
            if (sources[i].type=="hashtag") {
                // search by hashtag
                reqUrl = 'https://api.twitter.com/1.1/search/tweets.json?';
                params.q = sources[i].twitter;
                params.result_type="recent";
            }
            else {
                // get by screen_name
                params.screen_name = sources[i].twitter;
                params.trim_user = 1;
            }
            
            if (lastId>0) {
                params.since_id=lastId; // only get latest
                //params.max_id=lastId+20;
                //console.log("added since id.....................");
            }
            
            reqUrl += require('querystring').stringify(params);
        
            var reqObj;
            reqObj = {url:encodeURI(reqUrl), oauth:oauth};
            
            //console.log("url---------------"+reqUrl);
            
            request.get(reqObj, function (e, r, body) {
                //console.log("request---------------------------------"+JSON.stringify(reqObj));
                //console.log("body---------------"+body.substring(0,600));
                
                var objs,url,mentioned;
                
                if (!e || typeof e == "undefined") {
                    
                    objs = JSON.parse(body);
                    
                    if (typeof objs.statuses!="undefined"){ // search API results contains the results array inside 'statuses' object
                        objs = objs.statuses;
                    }
                    
                    for (var j=0;j<objs.length;j++) {
                        if (typeof objs[j].entities !="undefined" && objs[j].entities.urls.length>0){ // must have url
                            
                            url = objs[j].entities.urls[0].url;
                            var txt = objs[j].text.replace(/ *\[[^)]*\] */g,"");
                            if (typeof objs[j].entities !="undefined" && objs[j].entities.user_mentions.length>0){
                                mentioned = objs[j].entities.user_mentions[0].screen_name;
                            }
                            
                            results.push({account:sources[i].twitter,source:sources[i].name,sourceObj:sources[i].objectId,url:url,text:txt,mentioned:mentioned,rts:objs[j].retweet_count,id:objs[j].id});   
                            
                        }
                    }
                    
                }
                else {
                    //res.json({error:e});
                }
                
                getTweets(i+1);
                
            });
        }
        else {
            //res.json({ok:results});
            checkUni(0);
        }
    }
    
    request.get({url:'https://api.parse.com/1/classes/Source',json:true,qs:{limit:200,order:"-createdAt"},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
        if (b.results) {
            
            //var accounts = ["thenextweb","medium","mashable","techcrunch","sixrevisions","noupemag","geekwire"];
            sources = b.results;
            
            console.log(JSON.stringify(sources));
            
            setTimeout(getTweets(0),5000);
        }
        else {
            //next();
            res.json({error:"no results"});
        }
    });
    
});

// get metadata, images and social accounts from a url
app.get('/harvest', function(req,res){ 

    var URL = require('url');
    
    var url = req.query.url,
    title,
    desc,
	image,
	images=[],
	tags=[],
    tw,fb,rss,li,pin,yt,gp,
    resolved;
	
	if (url) {
	
		var sURL = unescape(utils.fixUrl(url));
		
		request({url:sURL,followRedirect:true,maxRedirects:3,headers:{'user-agent':ua}}, function (error, response, body) {
		
			if (typeof body!="undefined") {
                
                var resolvedUri = response.request.uri;
                var baseUrl = resolvedUri.protocol+"//"+resolvedUri.hostname;
                
                console.log("received body---"+body.substring(0,500));
                
                var metaObj = harvestMeta(body,baseUrl);
                
                if (typeof metaObj!="undefined") {
                
                    title = metaObj.title.replace(/ *\[[^)]*\] */g,"");
                    desc = metaObj.desc;
                    rss = metaObj.rss;
                    image = metaObj.image;
                    tags = metaObj.tags;
                    
                    images = harvestImages(body,baseUrl).images;
                    
                    var socialObj = harvestSocial(body,baseUrl);
                    fb = socialObj.fb;
                    tw = socialObj.tw;
                    li = socialObj.li;
                    yt = socialObj.yt;
                    pin = socialObj.pin;
                    
                    resolved = resolvedUri.protocol+"//"+resolvedUri.hostname+""+resolvedUri.pathname;         
                    
                    res.json({title:title,desc:desc,resolved:resolved,images:images,image:image,tags:tags,tw:tw,facebook:fb,youtube:yt,linkedin:li,rss:rss,pinterest:pin});
                    
                }
                else {
                    
                    res.json({error:'no parseable body was contained in the response:'+url});
                    
                }
			}
			else {
				res.json({error:'problem harvesting:'+url});
			}
		});	
	}
	else {
		res.json({error:'url is required'});
	}
});

// get images from a url
app.get('/harvestImages', function(req,res){ 
    
    console.log("/harvestImages..");

    var URL = require('url');
    
    var url = req.query.url,
    title,
	icon,
    logo,
    image,
	images=[],
    resolved;
	
	if (url) {
	
		var sURL = unescape(utils.fixUrl(url));
		
		request({url:sURL,followRedirect:true,maxRedirects:3}, function (error, response, body) {
            console.log("request error "+sURL+".. "+error);
			if (typeof body!="undefined") {
                
                console.log("body is.."+body.substring(0,500));
                
                var resolvedUri = response.request.uri;
                var baseUrl = resolvedUri.protocol+"//"+resolvedUri.hostname;
                resolved = baseUrl+""+resolvedUri.pathname;   
                
                var metaObj = harvestMeta(body,baseUrl);
                
                if (typeof metaObj != "undefined") {
                
                    title = metaObj.title.replace(/ *\[[^)]*\] */g,"");
                    icon = metaObj.icon;
                    logo = metaObj.logo;
                    image = metaObj.image; //primary image from head
                    
                    var imgsObj = harvestImages(body,baseUrl);
                    images = imgsObj.images;
                    if (typeof imgsObj.logo!="undefined") {
                        logo = imgsObj.logo;
                    }
                    
                    if (images.length===0) {
                        // go get a screenshot
                        console.log("getting shot.."+resolved);
                        loadShots(resolved,function(e,r,b){
                            //console.log("got shot.."+JSON.stringify(r));
                            //if (r.statusCode!=500){
                                images.push(r.request.uri.href);
                            //}
                            res.json({title:title,resolved:resolved,image:image,images:images,icon:icon,logo:logo});  
                       });
                    }
                    else {
                        res.json({title:title,resolved:resolved,image:image,images:images,icon:icon,logo:logo});                    
                    }
                
                }
                else {
                    res.json({error:'no parseable response:'+url});
                }
			}
			else {
				res.json({error:'problem harvesting images:'+url});
			}
		});	
	}
	else {
		res.json({error:'url is required'});
	}
});

app.post("/fetch",function(req, res){
    
    console.log("/fetch................................");
    
    var URL = require('url');
    var items = req.body;
    var urls = [];
    var imgs = [];
    var sources = [];
    var results = [];
    
    var uids = req.body["uid"];
    
    if( typeof uids === 'string' ) {
        uids = [uids];
    }
    
    
    // create arrays from form inputs
    for (var i in uids) {
        urls.push(req.body["url"+uids[i]]);
        imgs.push(req.body["image"+uids[i]]);
        sources.push(req.body["source"+uids[i]]);
    }
    
    console.log(JSON.stringify(req.body));
    
    if (typeof uids=="undefined" || uids.length===0) {
        res.json({error:'nothing selected to save'});
        return;
    }
    
    var postRequests=[];
    
    function checkExisting(i){ // determine if url has already been posted
                   
        if (i<results.length) {
        
            // exists?
            var whereClause = {"origUrl":results[i].requested};
            request.get({url:'https://api.parse.com/1/classes/Post',json:true,qs:{keys:"origUrl,url",where:JSON.stringify(whereClause)},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
                
                console.log("EXISTING..............."+b.results.length);
                
                if (typeof b.results!="undefined" && b.results.length>0){
                    results[i].exists="1";
                }
                else {
                    results[i].exists="0";
                }
                
                checkExisting(i+1);
            });
        }
        else {
            // done with checkExisting ------
            
             console.log("done with check exisint..............."+results.length);
            
            var q=[];
            for(var k=0; k<results.length; ++k) {
                if (results[k].exists==="0"){
                    
                    postRequests.push({                 // create a post obj for each result
                        "method": "POST",
                        "path": "/1/classes/Post",
                        "body": {
                            "url": results[k].resolved,
                            "title": results[k].title,
                            "desc": results[k].desc,
                            "image": results[k].image,
                            "origUrl": results[k].requested,
                            "source": results[k].source,
                            "sourceObj":{"__type": "Pointer","className":"Source","objectId":results[k].sourceObj},
                            "tags": results[k].tags,
                            "tw": results[k].tw,
                            "shares":1
                        }
                    });
                    q.push(                             // create a queue obj for each result
                        {
                        "method": "POST",
                        "path": "/1/classes/Queue",
                        "body":{
                            posted:false,
                            tweet:results[k].title.substring(0,110) + " " + results[k].requested + " #"+((results[k].tags[0])||"tech")
                            }
                        }
                    );
                }
            }
        
            generateSnap(0,function(){ // determine if we need to copy image from remote to CDN
            
                console.log("generating snaps complete...............");
                
                request.post({url:'https://api.parse.com/1/batch',json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
                    body:{requests:postRequests}}, function (e,r,b){
                    console.log("added batch posts to parse api..."+JSON.stringify(b));
                    
                    res.locals.msg={"success":"Items posted."};
                    
                    request.post({url:'https://api.parse.com/1/batch',json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
                        body:{requests:q}}, function (e,r,b){
                        console.log("wrote queue to parse.."+e);
                        
                        if (e) {
                            res.json({error:"no write batch",status:-1});
                        }
                        else {
                            res.json({status:1}); 
                        }
                    });
            
                }); 
                
            });
        
        }
    }
    
    function generateSnap(i,cb){ // capture image from url
        
        if (i<postRequests.length) {
            
            console.log("generating snap..............."+i);
                
    
            // generate snap
            if (postRequests[i].body.image.indexOf(conf.screenshots.apiUrl)===-1) { // only copy the image if the image url doesn't contain the CDN baseurl
        
                saveImage(postRequests[i].body.image,function(e,r,b){
                    
                    console.log("saving image-------------------"+postRequests[i].body.image);
                    postRequests[i].body.image = r.request.uri.href;
                    generateSnap(i+1,cb);
                    
                });
            
            }
            else {
                
                console.log("no image save required..");
                generateSnap(i+1,cb);
                
            }
            
            
            //generateSnap(i+1,cb);
                
        }
        else {
            // done
            
            console.log("done all image saves..");
            
            cb();
            
        }
    }
    
    function getUrls(i){ // harvest metadata and images from each url ---------------------------------------
        
        if (i<urls.length) {
    
                    var sURL = unescape(utils.fixUrl(urls[i]));
                    request({url:sURL,followRedirect:true,maxRedirects:3}, function (error, response, body) {
                        
                        console.log("-------------------"+sURL);
                        
                        if (typeof body!="undefined") {
                        
                            var resolvedUri = response.request.uri;
                            var baseUrl = resolvedUri.protocol+"//"+resolvedUri.hostname;
                            var resolved = baseUrl+""+resolvedUri.pathname;
                            
                            var metaObj = harvestMeta(body,baseUrl);
                            var socObj = harvestSocial(body,baseUrl);
                            //var images = harvestImages(body,baseUrl).images;
                            
                            if (typeof metaObj !== "undefined") {
                            
                                var images=[];
                                var title = metaObj.title.replace(/ *\[[^)]*\] */g,"");
                                var desc = metaObj.desc;
                                var tags = metaObj.tags;
                                var tw = socObj.tw;
    
                                
                                //var source = req.body["source"+i];
                                var source = resolvedUri.hostname.replace("www.","");
                                
                                results.push({requested:urls[i],source:source,sourceObj:sources[i],title:title,desc:desc,image:imgs[i],images:images,tags:tags,tw:tw,resolved:resolved});  
                            
                            }
                            
                            getUrls(i+1);
                            
                            //res.json({title:title,desc:desc,resolved:response.request.uri.pathname,images:images,tags:tags,tw:tw,facebook:fb,youtube:yt,linkedin:li,rss:rss,pinterest:pin});
                        }
                        else {
                            //res.json({error:'problem harvesting:'+url});
                            
                            console.log("stuck here??");
                            
                        }
                    });
        }
        else {
            // done getting urls
            
           checkExisting(0);
        }
    }
    
    setTimeout(getUrls(0),3000); 
});

app.post("/blog",function(req, res){
    
    console.log("/blog................................");
    
    var URL = require('url');
    var items = req.body;
    
    var p = {};
    p.title = "5 Great Typography Resources";
    p.desc = "Get in a little type in your life with these fives awesome tools and resources for typography.";
    p.posts = ["o1cg8LBMtC","k3Qe6wVpkH"];
    p.tags = ["typography","dev","web-design"];
    
    request.post({url:'https://api.parse.com/1/classes/Blog',json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
        body:p}, function (e,r,b){
        console.log("wrote blog to parse....."+JSON.stringify(b));
        
        if (e) {
            res.json({error:"no write"});
        }
        else {
            var objectId = b.objectId;
            var q = {
                posted:false,
                tweet:p.title.substring(0,110) + " http://www.techvisually.com/b/ " + objectId + "#"+p.tags[0]
            }

            request.post({url:'https://api.parse.com/1/classes/Queue',json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
                body:q}, function (e,r,b){
                console.log("wrote q to parse....."+JSON.stringify(b));
                
                if (e) {
                    res.json({error:"no write"});
                }
                else {
                    //var objectId = b.objectId;
                    res.json({status:1});   
                }
            });
        }
    });
    
});

app.get("/b/:id",function(req, res){
    
    console.log("get /blog..");
    
    res.json({error:"no results"});
    
});


app.get('/posts', function(req,res){
    
    //request.get({url:'https://api.parse.com/1/classes/Post',json:true,qs:{where:JSON.stringify({url:url})},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
    request.get({url:'https://api.parse.com/1/classes/Post',json:true,qs:{limit:200,order:"-createdAt"},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
        if (b.results) {
            res.json({results:b.results});
        }
        else {
            //next();
            res.json({error:"no results"});
        }
    });
    
});

app.get('/sources', function(req,res){
    /*
    request.get({url:'https://api.parse.com/1/classes/Source',json:true,qs:{limit:200,order:"-createdAt"},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
        if (b.results) {
            res.json({results:b.results});
        }
        else {
            //next();
            res.json({error:"no results"});
        }
    });
    */
    res.json(app.locals.sources);
});

app.post("/post",function(req, res){
    
    console.log("post /post..");
    
    var p = req.body;
    p.shares = parseInt(p.shares);
    
    //TODO: copy pulled image to CDN
    
    //get source from url
    var resolvedUri = p.url;
    p.source = resolvedUri.hostname;
    
    request.post({url:'https://api.parse.com/1/classes/Post',json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
        body:p}, function (e,r,b){
        console.log("wrote post to parse....."+JSON.stringify(b));
        
        if (e) {
            res.json({error:"no write"});
        }
        else {
            //var objectId = b.objectId;
            var q = {
                posted:false,
                tweet:p.title.substring(0,110) + " " + p.url + " #"+((p.tags[0])||"tech")
            }

            request.post({url:'https://api.parse.com/1/classes/Queue',json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
                body:q}, function (e,r,b){
                console.log("wrote q to parse....."+JSON.stringify(b));
                
                if (e) {
                    res.json({error:"no write"});
                }
                else {
                    //var objectId = b.objectId;
                    res.json({status:1});   
                }
            });
        }
    });
    
});

app.put("/post/:id",function(req, res){
    
    console.log("put /post..");
    
    var p = req.body;
    var id = req.params.id;
    
    request.put({url:'https://api.parse.com/1/classes/Post/'+id,json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
        body:p}, function (e,r,b){
        console.log("wrote post to parse....."+e);
        
        if (e) {
            res.json({error:"no write"});
        }
        else {
            var objectId = b.objectId;
            res.json(objectId);      
        }
        
    });
    
});

app.put("/q/:id",function(req, res){
    
    console.log("put /q..");
    
    var q = req.body;
    var id = req.params.id;
    
    if (q.posted&&q.posted==="false"){
        q.posted=false;
    }
    
    
    console.log("putting .."+JSON.stringify(q));
    
    request.put({url:'https://api.parse.com/1/classes/Queue/'+id,json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
        body:q}, function (e,r,b){
        console.log("wrote q to parse....."+e);
        
        if (e) {
            res.json({error:"no write"});
        }
        else {
            var objectId = b.objectId;
            res.json(objectId);      
        }
        
    });
    
});

app.post("/source",function(req, res){
    
    console.log("post /source..");
    
    var source = req.body;
    
    request.post({url:'https://api.parse.com/1/classes/Source',json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
        body:source}, function (e,r,b){
        console.log("wrote to parse....."+e);
        
        if (e) {
            res.json({error:"no write"});
        }
        else {
            var objectId = b.objectId;
            res.json(objectId);      
        }
    });
    
});

/* given a cached url, redirect to proxy image */
app.get('/cache', function(req,res){
    console.log("cached");
    var url = url;
    
    request.get({url:'https://api.parse.com/1/classes/Capture',json:true,qs:{where:JSON.stringify({url:url})},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
        if (b.results[0]) {
            var uuid =  b.results[0].uuid;
            res.redirect("/"+uuid);
        }
        else {
            //next();
        }
    });
});

app.get('/preview', function(req, res){
    res.render('preview');
});

app.get('/api', function(req, res){
    res.render('api');
});

app.get('/login', function(req, res){
    res.render('login');
});

app.post('/', function(req, res){
    res.render('login');
});

app.get('/testauth', function(req, res){
    
    
    // Twitter OAuth
    var qs = require('querystring')
      , oauth =
        { callback: 'http://in1-api.herokuapp.com/'
        , consumer_key: conf.twitter.consumer_key
        , consumer_secret: conf.twitter.consumer_secret
        }
      , url = 'https://api.twitter.com/oauth/request_token'
      ;
      
    
    request.post({url:url, oauth:oauth, json:true}, function (e, r, body) {
      // Ideally, you would take the body in the response
      // and construct a URL that a user clicks on (like a sign in button).
      // The verifier is only available in the response after a user has
      // verified with twitter that they are authorizing your app.
      
      
      //res.json({foo:body});
      
      var access_token = qs.parse(body)
        , oauth =
          { consumer_key: conf.twitter.consumer_key
          , consumer_secret: conf.twitter.consumer_secret
          , token: access_token.oauth_token
          , verifier: access_token.oauth_token_secret
          }
        , url = 'https://api.twitter.com/oauth/access_token'
        ;
    
      request.post({url:url, oauth:oauth}, function (e, r, body) {
        var perm_token = qs.parse(body)
          , oauth =
            { consumer_key: conf.twitter.consumer_key
            , consumer_secret: conf.twitter.consumer_secret
            , token: perm_token.oauth_token
            , token_secret: perm_token.oauth_token_secret
            }
          , url = 'https://api.twitter.com/1.1/users/show.json?'
          , params =
            { screen_name: perm_token.screen_name
            , user_id: perm_token.user_id
            }
          ;
        url += qs.stringify(params)
        request.get({url:url, oauth:oauth, json:true}, function (e, r, user) {
          res.json({user:user});
        })
      })

    })
    
    
    
});

app.get('/proxy', function(req, res){
    if (req.param("purl")) {
        request(unescape(req.param("purl")), function (error, response, body) {
			if (!error && response.statusCode == 200) {
				res.send(body);
			}
			else {
				res.json({error:"Bad URL request."});
			}
		});
	}
    else {
        res.json({error:"URL is required."});
    }
});

/* The 404 Route (ALWAYS Keep this as the last route) */
app.get('/*', function(req, res){
    res.render('404.ejs');
});




/* functions ------------------------------------------------------------------ */

function harvestMeta(body,baseUrl) {
    
    var title,
        desc,
        icon,
        logo,
        image,
        tags=[],
        rss,
        titleFound=0,
        descFound=0,
        imgFound=0,
        logoFound=0;
    
    var headPattern = /<head[^>]*>((.|[\n\r])*)<\/head>/im;
    var headMatches = headPattern.exec(body);
    var $h,$b;
    
    console.log("harvest meta..");
    
    if (headMatches!==null && headMatches.length>0) { // head
        
        var head = headMatches[1].replace(/\n/g," ");
        $h = $("<form>"+head+"</form>");
        $b = $("<form>"+body+"</form>");
        
        // find opengraph
        $.each($h.find('meta[property^="og:"]'),function(idx,item){
            
            console.log("meta og......");                    
            
            var $item = $(item);
            var property = $item.attr("property");
            
            if (property=="og:image") {
                logo = $item.attr("content");
                logoFound=1;
            }
            else if (property=="og:title") {
                title = $("<div/>").html($item.attr("content")).text();
                titleFound=1;
            }
            else if (property=="og:description") {
                desc = $("<div/>").html($item.attr("content")).text();
                descFound=1;
            }
        });	

        console.log("title......");
        
        var matches = body.match(/<title>\s*(.+?)\s*<\/title>/);
        if (matches) {
            title = $("<div/>").html(matches[1]).text(); // decode escaped HTML
        }
        
        icon = $h.find('link[rel="shortcut icon"],link[rel=apple-touch-icon-precomposed]').attr('href');
        if (icon && icon.indexOf('//')==-1) { // prepend baseurl for relative images						
            icon = baseUrl+icon;
        }
        
        image = $h.find('link[rel="image_src"]').attr('href');
        if (typeof image!="undefined" && image.length>0 && image.indexOf('//')==-1) {
            image = baseUrl+image;
            //imgFound=1;
        }
                
        if (imgFound===0){
            image = $h.find('meta[name="twitter:image"],meta[property="og:image"]').attr('content');
            if (image && image.indexOf('//')==-1) {
                image = baseUrl+image;
                imgFound=1;
            }       
        }
        
		$.each($h.find('meta[name=description]'),function(idx,item){
            console.log("meta desc..");         
			desc = $("<div/>").html($(item).attr("content")).text();
		});
		
        
        // tags - keywords
        $.each($h.find('meta[name=keywords]'),function(idx,item){
            var tagArr = $(item).attr("content").split(",");
            for (var i in tagArr){
                if (tagArr[i].length<20){ //any tag over 20 chars is tooo long
                    tags.push($.trim(tagArr[i]).toLowerCase());
                }
            }
        });
        
        $.each($b.find('a[href*="/tag"],a[href*="/category/"]'),function(idx,item){
            if ($(item).text().length<20){ //any tag over 20 chars is tooo long
                tags.push($(item).text().toLowerCase());
            }
        });
        
        // rss
        $.each($h.find('link[type="application/rss+xml"]'),function(idx,item){
            var rssUrl = $(item).attr("href");
            rss = rssUrl;
        });
    }
    else {
        
        return; // no head or body ! -- return null
    }
    
    var retObj = {};
    retObj.title = title;
    retObj.desc = desc;
    retObj.tags = tags;
    retObj.image = image;
    retObj.icon = icon;
    retObj.logo = logo;
    retObj.rss = rss;
    
    console.log("/done harvestMeta..");
    
    return retObj;
}

function harvestImages(body,baseUrl){
    
    var URL = require('url');
    var images=[];
    var bodyPattern = /<body[^>]*>((.|[\n\r])*)<\/body>/im;
    var bodyMatches = bodyPattern.exec(body);
    var strict = true;
    
    console.log("harvest images..");
    
    var $h;
                            
        if (bodyMatches!==null && bodyMatches.length>0) { // body
        
            $h = $("<form>"+bodyMatches[1].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"")+"</form>");
            
            var logo = $h.find('img[class*="logo"],img[src*="logo"]').attr('src');
            if (logo && logo.indexOf('//')==-1) {
                logo = baseUrl+logo;
            }
            
            //var imgs = $h.find('img[src*=".png"],img[src*=".jpg"],img[src*=".jpeg"]');
            var imgs = $h.find('img[src*="cdn"],img[src*="main"],img[src*="cloudfront"],img[src*="aws"]'); // typical CDN images
            if (imgs.length>0){
                $.each(imgs,function(idx,item){
                    var src=$(item).attr("src").replace("\t","");
                    if (src.indexOf('//')!=-1 || src.indexOf('?')!=-1) { // exclude relative images && images with '?' in path
                        images.push(src);
                    }
                });
            }
            else {
                imgs = $h.find('img[src*="wp-content"]'); // typical wordpress images
                $.each(imgs,function(idx,item){
                    var src=$(item).attr("src");
                    if (src.indexOf('//')!=-1) { // exclude relative images
                        var w=$(item).attr("width");
                        if (w>300) {
                            images.push(src);
                        }
                    }
                });
            }
        }
        else {
            
            return; // no body in HTML!
            
        }
        
        var retObj = {};
        retObj.images = images;
        retObj.logo = logo;

        return retObj;
}

function harvestSocial(body,baseUrl){
    
        var URL = require('url');
        var tw,fb,rss,li,pin,yt,gp;
        var twFound = 0;
        
        var bodyPattern = /<body[^>]*>((.|[\n\r])*)<\/body>/im;
        var bodyMatches = bodyPattern.exec(body);
        
        var headPattern = /<head[^>]*>((.|[\n\r])*)<\/head>/im;
        var headMatches = headPattern.exec(body);
        
        var $h,$b;
        
        if (headMatches!==null && headMatches.length>0) { // head
            var head = headMatches[1].replace(/\n/g," ");
            $h = $("<form>"+head+"</form>");
        }
        else {
            
            return;
            
        }
                            
        if (bodyMatches!==null && bodyMatches.length>0) { // body
        
            //console.log("body--------------------------------"+bodyMatches[1].substring(0,500));
        
            $b = $("<form>"+bodyMatches[1].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"")+"</form>");
            
            // find social usernames
			$.each($b.find('a[href*="twitter.com"]:not(a[href*="status"],a[href*="share"])'),function(idx,item){
                
                console.log("twitter found......");  
                
				var twUrl = $(item).attr("href").replace('/#!','');
				twUrl = URL.parse(twUrl,true,true);
				if (twUrl.query && twUrl.query.via){
					tw = twUrl.query.via;
				}
				else if (twUrl.query && twUrl.query.screen_name){
					tw = twUrl.query.screen_name;
				}
				else {
					tw = twUrl.pathname;
				}
				//console.log("tw------"+twUrl.query.via);
				if (tw==="" || tw === null || typeof tw === "undefined") {
					tw = "in1_";
				}
                tw = "@"+tw.replace("/","");
                
                twFound==1;
			});
			
			if (twFound===0 && typeof $h!="undefined"){
                $.each($h.find('meta[name="twitter:site"],meta[name="twitter:creator"]'),function(idx,item){
                    tw = $(item).attr("content");
                    twFound=1;
                });
			}
			
			$.each($b.find('a[href*="facebook.com/"]:not(a[href*="developers"]):lt(1)'),function(idx,item){
                var fbPagesUrl = $(item).attr("href");
                fbPagesUrl = URL.parse(fbPagesUrl);
                fb = fbPagesUrl.pathname;
				//fb = fb.replace("/pages","");
                fb = fb.replace("/","");
            });
			
			$.each($b.find('a[href*="linkedin.com/"]:lt(1)'),function(idx,item){
                var liUrl = $(item).attr("href");
                liUrl = URL.parse(liUrl);
                li = liUrl.pathname;
            });

            $.each($b.find('a[href*="feeds.feedburner.com"]:lt(1),a:contains("rss")'),function(idx,item){
                var rssUrl = $(item).attr("href");
                rss = rssUrl;
            });

			$.each($b.find('a[href*="pinterest.com/"]:not([href*="pin/create"])'),function(idx,item){
                var pinUrl = $(item).attr("href");
                pinUrl = URL.parse(pinUrl);
                pin = pinUrl.pathname;
            });
			
			$.each($b.find('a[href*="youtube.com/user/"]'),function(idx,item){
                var ytUrl = $(item).attr("href");
                ytUrl = URL.parse(ytUrl);
                yt = ytUrl.pathname;
                yt = yt.replace("/user","");
			}); 

        }
        
        var retObj = {};
        retObj.yt = yt;
        retObj.li = li;
        retObj.fb = fb;
        retObj.tw = tw;
        retObj.pin = pin;
        retObj.rss = rss;
        
        return retObj;
}

var loadShots = function(getUrl,cb){
    request.get({url:conf.screenshots.apiUrl,json:true,qs:{url:getUrl,size:'large'}},function(e,r,b){
        cb(e,r,b);
    });
};

var saveImage = function(imgUrl,cb){
    request.get({url:conf.screenshots.apiUrl,json:true,qs:{imgurl:imgUrl}},function(e,r,b){
        cb(e,r,b);
    });
};



/* twitter api ---------------------------------------------------------------------------- */

function tweetsByTag(tag,cb){
    var reqUrl = 'https://api.twitter.com/1.1/search/tweets.json?';
    //@in1_
    var oauth = 
            { consumer_key: conf.twit.consumerKey
            , consumer_secret: conf.twit.consumerSecret
            , token: "480346094-HIZrfb9w9D48WGWK6Ib21MxdWzbduRrMWhAi5ZoB"
            , token_secret: "D8iqNaFMnKeXnLhhQ9POebtiKgGOAmHAZE9qToSRSc"
        };
    var params = 
        {    
            /*include_entities:true,*/
            count:20,
            lang:"en"
        };
        
    // search by hashtag
    params.q = tag;
    params.result_type="recent";
        
    reqUrl += require('querystring').stringify(params);
    
    var reqObj;
    reqObj = {url:encodeURI(reqUrl), oauth:oauth};
        
    //console.log("url---------------"+reqUrl);
    
    request.get(reqObj, function (e, r, body) {
        //console.log("request---------------------------------"+JSON.stringify(reqObj));
        //console.log("body---------------"+body.substring(0,600));
        
        cb(e,body);
    });
}

function usersByTag(tag,cb){
    var reqUrl = 'https://api.twitter.com/1.1/users/search.json?';
    //@in1_
    var oauth = 
            { consumer_key: conf.twit.consumerKey
            , consumer_secret: conf.twit.consumerSecret
            , token: "480346094-HIZrfb9w9D48WGWK6Ib21MxdWzbduRrMWhAi5ZoB"
            , token_secret: "D8iqNaFMnKeXnLhhQ9POebtiKgGOAmHAZE9qToSRSc"
        };
    var params = 
        {    
            include_entities:false,
            page:40,
            count:20
        };
        
    // search by hashtag
    params.q = tag;
   
    reqUrl += require('querystring').stringify(params);
    
    var reqObj;
    reqObj = {url:encodeURI(reqUrl), oauth:oauth};
        
    //console.log("url---------------"+reqUrl);
    
    request.get(reqObj, function (e, r, body) {
        //console.log("request---------------------------------"+JSON.stringify(reqObj));
        //console.log("body---------------"+body.substring(0,600));
        
        console.log("user search..");
        
        cb(e,body);
    });
}

function doFavoriteTweet(tweetId,cb){

    //if (1===1) {
        //@TechVisually
		var oauth = 
			{ consumer_key: 'm2o21P9EUIQS4Va0nzTFA'
            , consumer_secret: 'WnkFtgCH5bBBVkqzLKycoRF4C2QQYgWGD1o8Fe3o0'
            , token: '1731403982-fVgDAKshexoEUpJqDTOqjWyzrPMIIZ4kRIsGNbD'
            , token_secret: '6DzLLA5P5St6jrkEn4mgEgkkIMVlNcu0vt1LXxIw0'
            }
        , url = 'https://api.twitter.com/1.1/favorites/create.json?'
        , params = 
			{ 
                id: tweetId
			};
			
		url += require('querystring').stringify(params)
		request.post({url:url, oauth:oauth, json:true}, function (e, r, body) {
			console.log(e);
			//console.log("twitter fav--------------"+JSON.stringify(body));
			cb(e,body);
		})
	//}
    
};

function doFollow(screen_name,cb){
    
    //if (1===1) {
    
    console.log("following--------------"+screen_name);
        //@TechVisually
		var oauth = 
			{ consumer_key: 'm2o21P9EUIQS4Va0nzTFA'
            , consumer_secret: 'WnkFtgCH5bBBVkqzLKycoRF4C2QQYgWGD1o8Fe3o0'
            , token: '1731403982-fVgDAKshexoEUpJqDTOqjWyzrPMIIZ4kRIsGNbD'
            , token_secret: '6DzLLA5P5St6jrkEn4mgEgkkIMVlNcu0vt1LXxIw0'
            }
        , url = 'https://api.twitter.com/1.1/friendships/create.json?'
        , params = 
			{ 
				//status: req.body.status + " via http://in1.com"
                follow: true,
                screen_name: screen_name
			};

		url += require('querystring').stringify(params);
		request.post({url:url, oauth:oauth, json:true}, function (e, r, body) {
			console.log(e);
			console.log("twitter followed--------------"+JSON.stringify(body));
			cb(e,body);
		})
		
	//}
    
};


function doReTweet(tweetId,cb){
    
    //if (1===1) {
        //@TechVisually
		var oauth = 
			{ consumer_key: 'm2o21P9EUIQS4Va0nzTFA'
            , consumer_secret: 'WnkFtgCH5bBBVkqzLKycoRF4C2QQYgWGD1o8Fe3o0'
            , token: '1731403982-fVgDAKshexoEUpJqDTOqjWyzrPMIIZ4kRIsGNbD'
            , token_secret: '6DzLLA5P5St6jrkEn4mgEgkkIMVlNcu0vt1LXxIw0'
            }
        ,
        url = 'https://api.twitter.com/1.1/statuses/retweet/'+tweetId+'.json?';

		request.post({url:url, oauth:oauth, json:true}, function (e, r, body) {
			console.log(e);
			//console.log("twitter RT--------------"+JSON.stringify(body));
			cb(e,body);
		})
		
	//}
    
};

function doTweet(msg,screen_name,cb){
    
    if (1===1) {
        
        /*
        var oauth = 
			{ consumer_key: conf.twit.consumerKey
            , consumer_secret: conf.twit.consumerSecret
            , token: '480346094-HIZrfb9w9D48WGWK6Ib21MxdWzbduRrMWhAi5ZoB'
            , token_secret: 'D8iqNaFMnKeXnLhhQ9POebtiKgGOAmHAZE9qToSRSc'
            }
	    */
	
        var status = msg;
        //@TechVisually
		var oauth = 
			{ consumer_key: 'm2o21P9EUIQS4Va0nzTFA'
            , consumer_secret: 'WnkFtgCH5bBBVkqzLKycoRF4C2QQYgWGD1o8Fe3o0'
            , token: '1731403982-fVgDAKshexoEUpJqDTOqjWyzrPMIIZ4kRIsGNbD'
            , token_secret: '6DzLLA5P5St6jrkEn4mgEgkkIMVlNcu0vt1LXxIw0'
            }
        , url = 'https://api.twitter.com/1.1/statuses/update.json?'
        , params = 
			{ 
				//status: req.body.status + " via http://in1.com"
                status: status,
                via: "@TechVisually"
			};
			
		url += require('querystring').stringify(params)
		request.post({url:url, oauth:oauth, json:true}, function (e, r, body) {
			console.log(e);
			console.log("twitter--------------"+body);
			cb(e,body);
		})
	}
    
};
