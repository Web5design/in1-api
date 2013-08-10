var port = process.env.PORT || 4000,
    app = require('./app').init(port),
    utils = require('./utils'),
    conf = require('./conf'),
    window = require('jsdom').jsdom().createWindow(),
    $ = require('jquery'),
    request = require('request');
    
/* default route */
app.get('/', function(req,res){
   res.render("index");
});

// get basic media and social media data from a url
app.get('/harvest', function(req,res){ 

    var URL = require('url');
    
    var url = req.query.url,
    title,
	desc,
	image,
	images=[],
	tags=[],
	tw,fb,rss,li,pin,yt,
	titleFound=0,
	descFound=0,
	imgFound=0;
	
	if (url) {
	
		var sURL = unescape(utils.fixUrl(url));
		
		request({url:sURL,followRedirect:true,maxRedirects:1}, function (error, response, body) {
		
			if (!error) {
				var $h = $("<form>"+body+"</form>");
                
                console.log("body----------------------------------"+$h.html());
				
				// find opengraph
				$.each($h.find('meta[property^="og:"]'),function(idx,item){
                    
                    console.log("meta og......");                    
                    
					var $item = $(item);
					var property = $item.attr("property");
					
					if (property=="og:image") {
						image = $item.attr("content");
						//if (imgSrc.indexOf('//')==-1) { // prepend baseurl for relative images						
						//	imgSrc=baseUrl+imgSrc;
						//}
						images.push(image);
						imgFound = 1;
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
				
				if (titleFound===0)
				{
                    console.log("title......");                    
                    
                    
					//var matches = body.match(/<title>\s*(.+?)<\/title>/);
					var matches = body.match(/<title>\s*(.+?)\s*<\/title>/);
					if (matches) {
						title = matches[1];
					}
				}
				
				if (imgFound===0) {
					image = $h.find('link[rel="image_src"],link[rel="apple-touch-icon"],link[rel="shortcut icon"]').attr('href');
					if (image && image.indexOf('//')==-1) { // prepend baseurl for relative images						
						image = baseUrl+image;
					}
					images.push(image);
					imgFound = 1;
				}
				
				if (descFound===0)
				{
                    console.log("meta desc......");              
                    
                    
                    
					$.each($h.find('meta[name=description]'),function(idx,item){
                        console.log("meta desc..");         
						desc = $(item).attr("content");
					});
				}

				$.each($h.find('meta[name=keywords]'),function(idx,item){
				    tags.push($(item).attr("content"));
				});
				
				// find images
				//oURL = URL.parse(sURL);
				var baseUrl = response.request.uri.href;
				
				var imgs = $h.find('img[src$="png"],img[src$="jpg"]');
				$.each(imgs,function(idx,item){
					var src=$(item).attr("src");
					//console.log("image src:"+src);
					//src = imgs[i].getAttribute("src");
					if (src.indexOf('//')==-1) { // prepend baseurl for relative images						
						src=baseUrl+src;
						//console.log("image src put http:"+src);
					}
					images.push(src);
				});
				
				// find social usernames
				$.each($h.find('a[href*="twitter.com/"]:not(a[href*="status"])'),function(idx,item){
                    
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
				
				$.each($h.find('a[href*="feeds.feedburner.com"]:lt(1)'),function(idx,item){
					var rssUrl = $(item).attr("href");
					//rssUrl = URL.parse(rssUrl);
					//rss = rssUrl.pathname;
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

				//TODO: google+
	
				$h = null;
				res.json({title:title,desc:desc,images:images,tags:tags,tw:tw,facebook:fb,youtube:yt,linkedin:li,rss:rss,pinterest:pin});
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

app.get('/fff/:id/:size?', function(req,res){
    console.log("imageshack proxy");
    
    var id = req.params.id;
    var size = req.params.size||'full'; //mini,thumb,mobile,large,full
    
    request.get({url:'https://api.parse.com/1/classes/Capture/'+id,json:true,headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
        if (b) {
            var item = b;
            request({url:item.link}).pipe(res);
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

