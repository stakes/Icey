# Let's get it

env = process.env.NODE_ENV || 'development'
port = process.env.PORT || 3000

express = require 'express'
routes = require './routes'
mongoose = require 'mongoose'
mongooseauth = require 'mongoose-auth'
_ = require 'underscore'
redis_store = require('connect-redis')(express)
url = require 'url'
app = module.exports = express.createServer()
Schema = mongoose.Schema
ObjectId = mongoose.SchemaTypes.ObjectId

# Schemas/models
UserSchema = new Schema {}

UserSchema.plugin mongooseauth,
  everymodule:
    everyauth:
        User: -> return User
  github:
    everyauth:
      myHostname: process.env.APP_URL
      appId: process.env.GITHUB_APP_ID
      appSecret: process.env.GITHUB_APP_SECRET
      scope: 'user,repo'
      redirectPath: '/'
      moduleTimeout: 10000

mongoose.model 'User', UserSchema
mongoose.connect process.env.MONGODB_URL
User = mongoose.model 'User'

# Mongoose-auth
mongooseauth.helpExpress app

# Configuration

pub = "#{__dirname}/public"

app.configure 'development', ->
  app.use express.errorHandler
    dumpExceptions: true
    showStack: true

app.configure 'production', ->
  app.use express.errorHandler()
  redisUrl = url.parse process.env.REDISTOGO_URL
  redisAuth = redisUrl.auth.split ':'
  app.set 'redisHost', redisUrl.hostname
  app.set 'redisPort', redisUrl.port
  app.set 'redisDb', redisAuth[0]
  app.set 'redisPass', redisAuth[1]

app.configure ->
  app.set 'views', "#{__dirname}/views"
  app.set 'view engine', 'jade'
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use express.cookieParser()
  app.use express.session
    secret: 'icey'
    store: new redis_store
      host: app.set 'redisHost'
      port: app.set 'redisPort'
      db: app.set 'redisDb'
      pass: app.set 'redisPass'
  app.use mongooseauth.middleware()
  app.use express.static(pub)

app.helpers
  truncate: (str, len, suffix) ->
    if str.length > len
      r = str.substring 0, len
      s = if not suffix? then '...' else suffix
      return r + s
    else return str

app.dynamicHelpers
  issue_namespace: (req, res) ->
    return process.env.ICEY_NAMESPACE

# Routes

app.get '*', (req,res,next) ->
  if req.headers['x-forwarded-proto'] isnt 'https' and env is 'production'
    res.redirect "https://#{req.headers['host']}#{req.url}"
  else next()

app.get '/', routes.index
app.get '/login', routes.login
app.get '/projects', routes.showProjectsForAccount
app.get '/context/:account', routes.showProjectsForAccount
app.get '/context/:account/project/:owner/:project', routes.getSingleProject
app.post '/issue/new', routes.newIssue
app.get '/issue/:issue/update/:label/state/:state', routes.updateIssue

app.post '/authenticate', routes.authenticate
app.get '/issue/update/:user/:repo/:issue/:label/:key', routes.updateIssue
app.get '/issue/close/:user/:repo/:issue/:key', routes.closeIssue
app.post '/issues/reorder', routes.reorderIssues

# Server

app.listen port
console.log "Express server listening on port #{port} in #{app.settings.env} mode"
