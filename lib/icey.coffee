https = require 'https'
querystring = require 'querystring'
Project = require '../models/projects'
_ = require 'underscore'
env = process.env.NODE_ENV || 'development'
columns = ['icebox', 'backlog', 'current', 'completed']

# get projects for a user/organization
exports.getProjects = (req, res, login, callback) ->

  options =
    host: "api.github.com"
    method: "GET"

  # I'm either using it as myself...
  if login isnt req.user.github.login
    options.path = "/orgs/#{login}/repos?access_token=#{req.session.auth.github.accessToken}"
  else # or in the context of an organization
    options.path = "/user/repos?access_token=#{req.session.auth.github.accessToken}"

  client = makeGenericRequest options, callback
  client.end()

# get organizations
exports.getOrganizations = (req, res, callback) ->

  options =
    host: "api.github.com"
    path: "/user/orgs?access_token=#{req.session.auth.github.accessToken}"
    method: "GET"

  client = makeGenericRequest options, callback
  client.end()

# get all issues - called for a single project view
exports.getAllIssues = (req, res, context, owner, callback) ->

  req.session.owner = owner
  req.session.context = context
  req.session.project = req.params.project

  options =
    host: 'api.github.com'
    method: 'GET'
    path: "/repos/#{req.session.owner}/#{req.session.project}/issues?access_token=#{req.session.auth.github.accessToken}"

  client = https.request options, (response) ->
    open = ''
    response.setEncoding 'UTF8'

    response.on 'data', (chunk) -> open += chunk

    response.on 'error', (error) -> console.log "Problem with request: #{error.message}"

    response.on 'end', ->
      open = JSON.parse open
      options.path = "#{options.path}&state=closed"
      innerClient = https.request options, (innerResponse) ->
        closed = ''
        innerResponse.setEncoding 'UTF8'

        innerResponse.on 'data', (chunk) -> closed += chunk

        innerResponse.on 'end', ->
          closed = JSON.parse closed
          checkProject req.session.owner, req.session.project, req.session.auth.github.accessToken, (project_obj) ->
            syncIssues project_obj, open, closed
            open = _.sortBy open, (issue) -> return issue.order
            # TODO: this is super naive and needs to warn the user
            checkLabels req.session.context, req.session.project, req.session
            callback open, closed, project_obj.github_id

      innerClient.on 'error', (error) -> console.log "Problem with request: #{error.message}"

      innerClient.end()

  client.end()

# separate out projects that contain issues
exports.onlyProjectsWithIssues = (isIssues, projects) ->
  retArray = []

  for project in projects
    if project.open_issues > 0 and isIssues is true
      retArray.push project
    else if project.open_issues is 0 and isIssues is false
      retArray.push project

  return retArray

# create a new issue
exports.createNewIssue = (req, res, context, callback) ->
  post_data = JSON.stringify
    'title': req.body.title
    'body': req.body.desc

  options =
    host: 'api.github.com'
    method: 'POST'
    path: "/repos/#{req.session.owner}/#{req.session.project}/issues"
    headers:
      'Content-Type': 'application/x-www-form-urlencoded'
      'Content-Length': post_data.length
      'Authorization': "token #{req.session.auth.github.accessToken}"

  client = https.request options, (response) ->
    res = ''
    response.setEncoding 'UTF8'
    response.on 'data', (chunk) -> res += chunk
    response.on 'end', ->
      res = JSON.parse res
      # success
      if res.message? then callback res.message else callback null

  client.on 'error', (error) -> console.log "Problem with request: #{error.message}"

  client.write post_data
  client.end()

# update issues order in our db
exports.updateIssuesOrder = (req, res, callback) ->
  pid = req.body.github_id
  orderedissues = JSON.parse req.body.issues
  project_obj = Project.findOne {'github_id': pid}, (error, pobj) ->
    unless error
      _.each orderedissues, (val, key) ->
        i = _.find pobj.issues, (obj) -> return obj.github_id is key
        i.order = val if i?
      pobj.save()

  console.log project_obj

  callback()

# update an issue's label
exports.updateIssue = (req, res, issue, label, state, callback) ->
  post_data = "[\"#{label}\"]"

  options =
    host: 'api.github.com'
    method: 'POST'
    path: "/repos/#{req.session.owner}/#{req.session.project}/issues/#{issue}/labels"
    headers:
      'Content-Type': 'application/x-www-form-urlencoded'
      'Content-Length': post_data.length
      'Authorization': "token #{req.session.auth.github.accessToken}"

  client = https.request options, (response) ->
    res = ''
    response.setEncoding 'UTF8'
    response.on 'data', (chunk) -> res += chunk
    response.on 'end', ->
      res = JSON.parse res
      # success
      if res.message?
        # remove existing labels that are in our namespace
        for lbl in res
          ns = process.env.ICEY_NAMESPACE
          ind = ns.length
          existing_label = lbl.name
          if existing_label.substr -ind is ns and existing_label isnt label
            removeIssueLabel req, res, issue, existing_label
        # close or reopen
        updateIssueState req, res, issue, state
      else callback res.message, res

  client.on 'error', (error) -> console.log "Problem with request: #{error.message}"

  client.write post_data
  client.end()

#
# private methods
#

updateIssueState = (req, res, issue, state, callback) ->
  post_data = JSON.stringify state: state
  options =
    host: 'api.github.com'
    method: 'POST'
    path:"/repos/#{req.session.owner}/#{req.session.project}/issues/#{issue}"
    headers:
      'Content-Type': 'application/x-www-form-urlencoded'
      'Content-Length': post_data.length
      'Authorization': "token #{req.session.auth.github.accessToken}"

  client = makeUtilityRequest options

  client.on 'error', (error) -> console.log "Problem with request: #{error.message}"

  client.write post_data
  client.end()

# remove a label from an issue
removeIssueLabel = (req, res, issue, label) ->
  options =
    host: 'api.github.com'
    method: 'DELETE'
    path: "/repos/#{req.session.owner}/#{req.session.project}/issues/#{issue}/labels/#{label}"
    headers:
      'Content-Length': '0'
      'Authorization': "token #{req.session.auth.github.accessToken}"

  client = makeUtilityRequest options

  client.on 'error', (error) -> console.log "Problem with request: #{error.message}"

  client.write post_data
  client.end()

# initialize issue labels, if you need em
checkProject = (context, project, token, callback) ->
  options =
    host: 'api.github.com'
    method: 'GET'
    path: "/repos/#{context}/#{project}?access_token=#{token}"

  client = https.request options, (response) ->
    res = ''
    response.setEncoding 'UTF8'
    response.on 'data', (chunk) -> res += chunk
    response.on 'end', ->
      res = JSON.parse res
      Project.findOne {'github_id': res.id}, (error, result) ->
        if result is null
          initProject res.id, context, project, callback
        else callback result

  client.on 'error', (error) -> console.log "Problem with request: #{error.message}"
  client.end()

checkLabels = (proj_context, proj_name, session) ->
  options =
    host: 'api.github.com'
    method: 'GET'
    path: "/repos/#{proj_context}/#{proj_name}/labels"

  client = https.request options, (response) ->
    res = ''
    response.setEncoding 'UTF8'

    response.on 'data', (chunk) -> res += chunk

    response.on 'end', ->
      res = JSON.parse res
      a = []
      # for each label, make sure it exists and if not create it
      for lbl in res
        unless lbl is 'Not Found'
          ns = process.env.ICEY_NAMESPACE
          ind = ns.length
          existing_label = lbl.name
          a.push existing_label if existing_label.substr -ind is ns
      createMissingLabels a, session unless a.length is 4

  client.on 'error', (error) -> console.log "Problem with request: #{error.message}"
  client.end()

createMissingLabels = (labelArray, session) ->
  for column in columns
    name = column + process.env.ICEY_NAMESPACE
    createSingleLabel name, session unless !_.include labelArray, name

createSingleLabel = (name, session) ->
  post_data = JSON.stringify
    'name': name
    'color': 'ffffff'

  options =
    host: 'api.github.com'
    method: 'POST'
    path: "/repos/#{session.context}/#{session.project}/labels"
    headers:
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length,
      'Authorization': "token #{req.session.auth.github.accessToken}"

  client = makeUtilityRequest options
  client.on 'error', (error) -> console.log "Problem with request: #{error.message}"

  client.write post_data
  client.end()

initProject = (proj_id, proj_context, proj_name, callback) ->
  new Project(github_name: proj_name, github_id: proj_id).save()
  result = Project.findOne 'github_id': proj_id, (error, result) -> callback result

syncIssues = (project_obj, openissues, closedissues) ->
  for issue in openissues
    saved_issue = _.find project_obj.issues, (val) ->
      return Number val.github_id is Number issue.id

    if not saved_issue?
      project_obj.issues.push
        github_id: issue.id
        order: 0
      issue.order = 0
    else issue.order = saved_issue.order
  project_obj.save()

makeGenericRequest = (uri, callback) ->
  https.request uri, (response) ->
    body = ''
    response.setEncoding 'UTF8'

    response.on 'data', (chunk) -> body += chunk

    response.on 'end',  ->
      body = JSON.parse body
      callback body

    response.on 'error', (error) ->
      console.log "Problem with request: #{error.message}"

makeUtilityRequest = (uri) ->
  https.request uri, (response) ->
    res = ''
    response.setEncoding 'UTF8'
    response.on 'data', (chunk) -> res += chunk
    response.on 'end', -> res = JSON.parse res
