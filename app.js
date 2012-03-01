// Let's get it

var env = process.env.NODE_ENV || 'development';
var port = process.env.PORT || 3000;

var express = require('express')
  , routes = require('./routes')
  , config_file = require('yaml-config')
  , config = config_file.readConfig('config/config.yaml', env)
  , mongoose = require('mongoose')
  , mongooseauth = require('mongoose-auth')
  , github = require('./lib/github');
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
    }
  }
})

mongoose.model('User', UserSchema);
mongoose.connect(config.db.uri);
User = mongoose.model('User');




// Mongoose-auth
mongooseauth.helpExpress(app);



// Everyauth
// everyauth.helpExpress(app);
// everyauth.debug = true;
// everyauth.github
//   .appId(config.github.appId)
//   .appSecret(config.github.appSecret)
//   .scope('user,repo')
//   .findOrCreateUser( function (session, accessToken, accessTokenExtra, ghUser) {
//       session.uid = ghUser.id
//       session.oauth = accessToken
//       return ghUser.id
//   })
//   .redirectPath('/');
//   
// everyauth.everymodule.handleLogout(function(req, res) {
//   req.logout();
//   req.session.uid = null;
//   res.writeHead(303, { 'Location': this.logoutRedirectPath() });
//   res.end();
// });
// everyauth.everymodule.logoutPath('/logout');
// everyauth.everymodule.logoutRedirectPath('/');




// Configuration

var pub = __dirname + '/public';
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({secret: 'stakes'}));
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




// Routes


app.get('/', routes.index);
app.get('/login', routes.login);
app.get('/projects', routes.showProjectsForAccount);
app.get('/orgs/:account', routes.showProjectsForAccount);
app.post('/authenticate', routes.authenticate);
app.get('/project/:user/:id/:key', routes.getSingleProject);
app.get('/issue/update/:user/:repo/:issue/:label/:key', routes.updateIssue);
app.get('/issue/close/:user/:repo/:issue/:key', routes.closeIssue);




// Server

app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
