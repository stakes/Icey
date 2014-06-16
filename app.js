// Let's get it

var env = process.env.NODE_ENV || 'development';
var port = process.env.PORT || 3000;

var express = require('express')
  , routes = require('./routes')
  , config_file = require('yaml-config')
  , config = config_file.readConfig('config/config.yaml', env)
  , mongoose = require('mongoose')
  , mongooseauth = require('mongoose-auth')
  , _ = require('underscore')
  , redis_store = require('connect-redis')(express)
  , url = require('url');
var app = module.exports = express.createServer();
var Schema = mongoose.Schema;
var ObjectId = mongoose.SchemaTypes.ObjectId;



// Schemas/modelsyc
var UserSchema = new Schema({}); 
var User;

UserSchema.plugin(mongooseauth, {
  everymodule: {
    everyauth: {
        User: function () {
          return User;
        }
    }
  },
  github: {
    everyauth: {
        myHostname: config.github.hostUri
      , appId: config.github.appId
      , appSecret: config.github.appSecret
      , scope: 'user,repo'
      , redirectPath: '/'
      , moduleTimeout: 10000
      , customHeaders: {'User-Agent': 'icey.herokuapp.com'}
    }
  }
})

mongoose.model('User', UserSchema);
mongoose.connect(config.db.uri);
User = mongoose.model('User');




// Mongoose-auth
mongooseauth.helpExpress(app);




// Configuration

var pub = __dirname + '/public';

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
  var redisUrl = url.parse(process.env.REDISTOGO_URL),
      redisAuth = redisUrl.auth.split(':');  
  app.set('redisHost', redisUrl.hostname);
  app.set('redisPort', redisUrl.port);
  app.set('redisDb', redisAuth[0]);
  app.set('redisPass', redisAuth[1]);
});

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: 'icey', 
    store: new redis_store({
      host: app.set('redisHost'),
      port: app.set('redisPort'),
      db: app.set('redisDb'),
      pass: app.set('redisPass')
    }) 
  }));
  // app.use(app.router);
  app.use(mongooseauth.middleware());
  app.use(express.static(pub));
});



app.helpers({
  truncate: function(str, len, suffix) {
    if (str.length > len) {
      var r, s;
      r = str.substring(0, len);
      s = typeof suffix !== 'undefined' ? suffix : '...';    
      return r + s;
    } else {
      return str;
    }
  }
});

app.dynamicHelpers({ 
  issue_namespace: function(req, res) { 
    return config.application_vars.namespace; 
  }
});






// Routes


app.get('*', function (req,res,next) {
  if (req.headers['x-forwarded-proto']!='https' && env != 'development') {
    res.redirect('https://icey.herokuapp.com'+req.url);
  } else {
    next();
  };
});

app.get('/', routes.index);
app.get('/login', routes.login);
app.get('/projects', routes.showProjectsForAccount);
app.get('/context/:account', routes.showProjectsForAccount);
app.get('/context/:account/project/:owner/:project', routes.getSingleProject);
app.post('/issue/new', routes.newIssue);
app.get('/issue/:issue/update/:label/state/:state', routes.updateIssue);


app.post('/authenticate', routes.authenticate);
app.get('/issue/update/:user/:repo/:issue/:label/:key', routes.updateIssue);
app.get('/issue/close/:user/:repo/:issue/:key', routes.closeIssue);
app.post('/issues/reorder', routes.reorderIssues);



// Server

app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
