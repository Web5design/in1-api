var port = process.env.PORT || 4000,
    app = require('./app').init(port),
    utils = require('./utils'),
    conf = require('./conf'),
    window = require('jsdom').jsdom().createWindow(),
    $ = require('jquery'),
    request = require('request');
    
/* default route */
app.get('/hello', function(req,res){
   res.render("index");
});

app.get("/",function(req, res){
   
    //console.log("b:"+req.body.status);
	//console.log("user:"+JSON.stringify(req.user));
	//console.log("tw:"+JSON.stringify(req.session));
	//if (req.user.loggedInWith.indexOf("twitter")!=-1) {
    
    var results = [];
    var accounts = ["thenextweb","medium","mashable","techcrunch","sixrevisions"];
    
    request.get({url:'https://api.parse.com/1/classes/Post',json:true,qs:{limit:200,order:"-createdAt"},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
        if (b.results) {
            res.render("index",{results:results,posts:b.results});
        }
        else {
            //next();
            res.render("index",{results:results});
        }
    });
    
});

app.get("/feed",function(req, res){
   
    var results = [];
    //var accounts = ["thenextweb","medium","mashable","techcrunch","sixrevisions","noupe","bootply"];
    var accounts = ["carolskelly"];
    
    var q = req.query["q"];
    var f = req.query["format"];
    var lastId = (req.query["lastId"])||0;
    
    function checkUni(i){
                   
        if (i<results.length) {
        
            // exists?
            var whereClause = {"origUrl":results[i].url};
            request.get({url:'https://api.parse.com/1/classes/Post',json:true,qs:{keys:"origUrl,url",where:JSON.stringify(whereClause)},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
                
                //console.log("EXISTING-----------------------------------------------"+b.results.length);
                
                if (typeof b.results!="undefined" && b.results.length>0){
                    results[i].exists="1";
                }
                
                checkUni(i+1);
            });
        }
        else {
            // done!
            
            request.get({url:'https://api.parse.com/1/classes/Post',json:true,qs:{limit:200,order:"-createdAt"},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
                if (b.results) {
                    if (f=="json") { 
                        res.send({results:results,posts:b.results});
                    } else {
                        res.render("index",{results:results,posts:b.results});
                    }
                }
                else {
                    if (f=="json") {
                        res.send({results:results,posts:[]});
                    } else {
                        res.render("index",{results:results,posts:[]});
                    }
                }
            });
            
        }
    }
    
    function getTweets(i){
        var reqUrl = 'https://api.twitter.com/1.1/statuses/user_timeline.json?';
        if (i<accounts.length) {
            var oauth = 
                { consumer_key: conf.twit.consumerKey
                , consumer_secret: conf.twit.consumerSecret
                , token: "480346094-HIZrfb9w9D48WGWK6Ib21MxdWzbduRrMWhAi5ZoB"
                , token_secret: "D8iqNaFMnKeXnLhhQ9POebtiKgGOAmHAZE9qToSRSc"
            };
            var params = 
            {    
                include_entities:true,
                screen_name:accounts[i],
                count:5,
                trim_user:1
            };	
            
            console.log("since id...---------------------------------------------------....."+lastId);
            
            if (lastId>0) {
                params.since_id=lastId; // only get latest
                //params.max_id=lastId+20;
                console.log("added since id.....................");
            }
            
            reqUrl += require('querystring').stringify(params);
        
            var reqObj;
            reqObj = {url:encodeURI(reqUrl), oauth:oauth};
            
            request.get(reqObj, function (e, r, body) {
                console.log("request---------------------------------"+JSON.stringify(reqObj));
                //console.log("body---------------"+body.substring(0,200));
                
                var objs,url,mentioned;
                
                if (!e || typeof e == "undefined") {
                    
                    objs = JSON.parse(body);
                    
                    for (var j=0;j<objs.length;j++) {
                        if (typeof objs[j].entities !="undefined" && objs[j].entities.urls.length>0){ // must have url
                            
                            url = objs[j].entities.urls[0].url;
                            var txt = objs[j].text.replace(/ *\[[^)]*\] */g,"");
                            if (typeof objs[j].entities !="undefined" && objs[j].entities.user_mentions.length>0){
                                mentioned = objs[j].entities.user_mentions[0].screen_name;
                            }
                            
                            results.push({account:accounts[i],url:url,text:txt,mentioned:mentioned,rts:objs[j].retweet_count,id:objs[j].id});   
                            
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
    
    setTimeout(getTweets(0),5000);
    
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
		
		request({url:sURL,followRedirect:true,maxRedirects:2}, function (error, response, body) {
		
			if (typeof body!="undefined") {
                
                var resolvedUri = response.request.uri;
                var baseUrl = resolvedUri.protocol+"//"+resolvedUri.hostname;
                
                var metaObj = harvestMeta(body,baseUrl);
                title = metaObj.title.replace(/ *\[[^)]*\] */g,"");
                desc = metaObj.desc;
                rss = metaObj.rss;
                image = metaObj.image;
                
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
		
		request({url:sURL,followRedirect:true,maxRedirects:2}, function (error, response, body) {
		
			if (typeof body!="undefined") {
                
                var resolvedUri = response.request.uri;
                var baseUrl = resolvedUri.protocol+"//"+resolvedUri.hostname;
                resolved = baseUrl+""+resolvedUri.pathname;   
                
                var metaObj = harvestMeta(body,baseUrl);
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
                        if (r.statusCode!=500){
                            images.push(r.request.uri.href);
                        }
                        res.json({title:title,resolved:resolved,image:image,images:images,icon:icon,logo:logo});  
                   });
                }
                else {
                    res.json({title:title,resolved:resolved,image:image,images:images,icon:icon,logo:logo});                    
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
    
    console.log("fetch..");
    var URL = require('url');
    var urls = req.body["urls"];
    var results = [];
    
    console.log(urls);
    
    if( typeof urls === 'string' ) {
        urls = [urls];
    }
    
    function checkUni(i){
                   
        if (i<results.length) {
        
            // exists?
            var whereClause = {"origUrl":results[i].requested};
            request.get({url:'https://api.parse.com/1/classes/Post',json:true,qs:{keys:"origUrl,url",where:JSON.stringify(whereClause)},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
                
                //console.log("EXISTING-----------------------------------------------"+b.results.length);
                
                if (typeof b.results!="undefined" && b.results.length>0){
                    results[i].exists="1";
                }
                else {
                    results[i].exists="0";
                }
                
                checkUni(i+1);
            });
        }
        else {
            // done!
            
            var postRequests = [];
            for(var k=0; k<results.length; ++k) {
                if (results[k].exists==="0"){
                    postRequests.push({
                        "method": "POST",
                        "path": "/1/classes/Post",
                        "body": {
                            "url": results[k].resolved,
                            "title": results[k].title,
                            "desc": results[k].desc,
                            "images": results[k].images,
                            "origUrl": results[k].requested
                        }
                    });
                }
            }
        
            request.post({url:'https://api.parse.com/1/batch',json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey},
                body:{requests:postRequests}}, function (e,r,b){
                console.log("Adding batch to parse api...");
                res.locals.msg={"success":"Perfect. Now you can login."};
                res.json({ok:b});    
            });
        }
    }
    
    function getUrls(i){
        //var reqUrl = 'https://api.twitter.com/1.1/statuses/user_timeline.json?';
        if (i<urls.length) {
    
                    var sURL = unescape(utils.fixUrl(urls[i]));
                    request({url:sURL,followRedirect:true,maxRedirects:2}, function (error, response, body) {
                        //console.log("--------------------------------------"+sURL);

                        if (typeof body!="undefined") {
                           
                            var resolvedUri = response.request.uri;
                            var baseUrl = resolvedUri.protocol+"//"+resolvedUri.hostname;
                            var metaObj = harvestMeta(body,baseUrl);
                            var images = harvestImages(body,baseUrl).images;
                            var title = metaObj.title.replace(/ *\[[^)]*\] */g,"");
                            var desc = metaObj.desc;
                            
                            var resolved = resolvedUri.protocol+"//"+resolvedUri.hostname+""+resolvedUri.pathname;
                            results.push({requested:urls[i],title:title,desc:desc,images:images,resolved:resolved});  
                            
                            getUrls(i+1);
                            
                            //res.json({title:title,desc:desc,resolved:response.request.uri.pathname,images:images,tags:tags,tw:tw,facebook:fb,youtube:yt,linkedin:li,rss:rss,pinterest:pin});
                        }
                        else {
                            //res.json({error:'problem harvesting:'+url});
                        }
                    });
        }
        else {
            checkUni(0);
        }
    }
    
    setTimeout(getUrls(0),7000); 
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


///

var harvestMeta = function(body,baseUrl){
    
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
    var $h;
    
    console.log("harvest meta..");
    
    if (headMatches.length>0) { // head
        
        var head = headMatches[1].replace(/\n/g," ");
        $h = $("<form>"+head+"</form>");
        
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
                title = $item.attr("content");
                titleFound=1;
            }
            else if (property=="og:description") {
                desc = $item.attr("content");
                descFound=1;
            }
        });	

        console.log("title......");
        
        var matches = body.match(/<title>\s*(.+?)\s*<\/title>/);
        if (matches) {
            title = matches[1];
        }
        
        icon = $h.find('link[rel="shortcut icon"],link[rel=apple-touch-icon-precomposed]').attr('href');
        if (icon && icon.indexOf('//')==-1) { // prepend baseurl for relative images						
            icon = baseUrl+icon;
        }
        
        image = $h.find('link[rel="image_src"]').attr('href');
        if (image.length>0 && image.indexOf('//')==-1) {
            image = baseUrl+image;
            imgFound=1;
        }
                
        if (imgFound===0){
            image = $h.find('meta[name="twitter:image"]').attr('content');
            if (image.length>0 && image.indexOf('//')==-1) {
                image = baseUrl+image;
                imgFound=1;
            }       
        }
        
		$.each($h.find('meta[name=description]'),function(idx,item){
            console.log("meta desc..");         
			desc = $(item).attr("content");
		});
        
        $.each($h.find('meta[name=keywords]'),function(idx,item){
            tags.push($(item).attr("content"));
        });
        
        $.each($h.find('link[type="application/rss+xml"]'),function(idx,item){
            var rssUrl = $(item).attr("href");
            rss = rssUrl;
        });
    }
    
    var retObj = {};
    retObj.title = title;
    retObj.desc = desc;
    retObj.tags = tags;
    retObj.image = image;
    retObj.icon = icon;
    retObj.logo = logo;
    retObj.rss = rss;
    
    return retObj;
}

var harvestImages = function(body,baseUrl){
    
    var URL = require('url');
    var images=[];
    var bodyPattern = /<body[^>]*>((.|[\n\r])*)<\/body>/im;
    var bodyMatches = bodyPattern.exec(body);
    var strict = true;
    
    console.log("harvest images..");
    
    var $h;
                            
        if (bodyMatches.length>0) { // body
        
            $h = $("<form>"+bodyMatches[1].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"")+"</form>");
            
            var logo = $h.find('img[class*="logo"],img[src*="logo"]').attr('src');
            if (logo && logo.indexOf('//')==-1) {
                logo = baseUrl+logo;
            }
            
            //var imgs = $h.find('img[src*=".png"],img[src*=".jpg"],img[src*=".jpeg"]');
            var imgs = $h.find('img[src*="cdn"],img[src*="cloudfront"],img[src*="aws"]');
            $.each(imgs,function(idx,item){
                var src=$(item).attr("src").replace("\t","");
                if (src.indexOf('//')!=-1) { // exclude relative images
                    var w=$(item).attr("width");
                    var h=$(item).attr("height");
                    //if (w>270) {
                        images.push(src);
                    //}
                }
            });
        }
        
        var retObj = {};
        retObj.images = images;
        retObj.logo = logo;

        return retObj;
}

var harvestSocial = function(body,baseUrl){
    
        var URL = require('url');
        var tw,fb,rss,li,pin,yt,gp;
        var bodyPattern = /<body[^>]*>((.|[\n\r])*)<\/body>/im;
        var bodyMatches = bodyPattern.exec(body);
        
        var $h;
                            
        if (bodyMatches.length>0) { // body
        
            //console.log("body--------------------------------"+bodyMatches[1].substring(0,500));
        
            $h = $("<form>"+bodyMatches[1].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"")+"</form>");
            
            // find social usernames
			$.each($h.find('a[href*="twitter.com"]:not(a[href*="status"],a[href*="share"])'),function(idx,item){
                
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
			});
			
			$.each($h.find('a[href*="facebook.com/"]:not(a[href*="developers"]):lt(1)'),function(idx,item){
                var fbPagesUrl = $(item).attr("href");
                fbPagesUrl = URL.parse(fbPagesUrl);
                fb = fbPagesUrl.pathname;
				//fb = fb.replace("/pages","");
                fb = fb.replace("/","");
            });
			
			$.each($h.find('a[href*="linkedin.com/"]:lt(1)'),function(idx,item){
                var liUrl = $(item).attr("href");
                liUrl = URL.parse(liUrl);
                li = liUrl.pathname;
            });

            $.each($h.find('a[href*="feeds.feedburner.com"]:lt(1),a:contains("rss")'),function(idx,item){
                var rssUrl = $(item).attr("href");
                rss = rssUrl;
            });

			$.each($h.find('a[href*="pinterest.com/"]:not([href*="pin/create"])'),function(idx,item){
                var pinUrl = $(item).attr("href");
                pinUrl = URL.parse(pinUrl);
                pin = pinUrl.pathname;
            });
			
			$.each($h.find('a[href*="youtube.com/user/"]'),function(idx,item){
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
}

