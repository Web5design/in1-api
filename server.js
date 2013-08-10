var port = process.env.PORT || 4000,
    app = require('./app').init(port),
    utils = require('./utils'),
    conf = require('./conf'),
    request = require('request');
    
/* default route */
app.get('/', function(req,res){
    
    var urlToFetch = req.query["url"],
        apiKey = req.query["apiKey"],
        h = req.query.h,
        w = req.query.w;

    if (!urlToFetch) {
        console.log("show home page");
        res.render("index");
    }
    else {
        
        urlToFetch = utils.fixUrl(urlToFetch,req.headers.host);
        //img.getImage(req,res,urlToFetch,paidServiceParams(h,w,q,d,"browser",namedResolution,wxh));
    }
});

/* given a cached url, redirect to proxy image */
app.get('/cache', function(req,res,next){
    console.log("cached");
    
    var url = url;
    
     request.get({url:'https://api.parse.com/1/classes/Capture',json:true,qs:{where:JSON.stringify({url:url})},headers:{'X-Parse-Application-Id':conf.parse.appKey,'X-Parse-REST-API-Key':conf.parse.restKey}},function(e,r,b){
        if (b.results[0]) {
            var uuid =  b.results[0].uuid;
            res.redirect("/"+uuid);
        }
        else {
            next();
        }
    });
});

app.get('/:id/:size?', function(req,res,next){
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

