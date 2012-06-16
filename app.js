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
  , github = require('./lib/github')
  , redis_store = require('connect-redis')(express);
var app = module.exports = express.createServer();
var Schema = mongoose.Schema;
var ObjectId = mongoose.SchemaTypes.ObjectId;



// Schemas/models
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
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({secret: 'stakes', store: new redis_store }));
  // app.use(app.router);
  app.use(mongooseauth.middleware());
  app.use(express.static(pub));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.dynamicHelpers({ 
  issue_namespace: function(req, res) { 
    return config.application_vars.namespace; 
  } 
});






// Routes


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
