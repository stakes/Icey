https = require 'https'
icey = require '../lib/icey'
_ = require 'underscore'
env = process.env.NODE_ENV || 'development'

exports.index = (req, res) ->
  return res.redirect '/projects' if req.loggedIn
  res.render 'login',
    title: 'Icey'
    layout: 'landing_layout'

exports.login = (req, res) ->
  return res.redirect '/' unless req.session.auth?
  res.render 'login', title: 'Icey | Log in with GitHub'

exports.showProjectsForAccount = (req, res) ->
  return res.redirect '/' unless req.session.auth?
  acct = req.user.github.login
  acct = req.params.account if req.params.acct?

  icey.getProjects req, res, acct, (projects) ->
    # now get organizations and pass render response as a callback
    icey.getOrganizations req, res, (organizations) ->
      responseObj =
        title: "Icey | #{acct}"
        repos: icey.onlyProjectsWithIssues true, projects
        otherRepos: icey.onlyProjectsWithIssues false, projects
        orgs: organizations
        context: acct
      res.render 'index', responseObj

exports.getSingleProject = (req, res) ->
  return res.redirect '/' unless req.session.auth?
  acct = req.user.github.login
  acct = req.params.account if req.params.acct?

  icey.getProjects req, res, acct, (projects) ->
    # now get organizations for that user
    icey.getOrganizations req, res, (organizations) ->
      # and now the get the issues for the selected project
      icey.getAllIssues req, res, acct, req.params.owner, (open, closed, github_id) ->
        console.log github_id

        backlog = _.filter open, (issue) ->
          labelnames = _.map issue.labels, (label) -> return String label.name
          label = "backlog#{process.env.ICEY_NAMESPACE}"
          return _.include labelnames, label

        current = _.filter open, (issue) ->
          labelnames = _.map issue.labels, (label) -> return String label.name
          label = "current#{process.env.ICEY_NAMESPACE}"
          return _.include labelnames, label

        icebox = _.reject open, (issue) ->
          return _.include(backlog, issue) || _.include(current, issue)

        responseObj =
          title: "Icey | #{req.params.project}"
          project_id: github_id
          repos: icey.onlyProjectsWithIssues true, projects
          orgs: organizations
          context: acct
          openissues: open
          iceboxissues: icebox
          currentissues: current
          backlogissues: backlog
          closedissues: closed
          project: req.params.project

        res.render 'project', responseObj

exports.reorderIssues = (req, res) ->
  return res.redirect '/' unless req.session.auth?
  acct = req.user.github.login
  acct = req.params.account if req.params.acct?

  icey.updateIssuesOrder req, res, (error) ->
    if error? then console.log "Error from GitHub: #{error}" else res.send 'OK'

exports.newIssue = (req, res) ->
  return res.redirect '/' unless req.session.auth?
  acct = req.session.context

  icey.createNewIssue req, res, acct, (error) ->
    if error? then console.log "Error from GitHub: #{error}"
    else
      url = "/context/#{req.body.context}/project/#{req.session.owner}/#{req.body.repo}"
      res.redirect url

exports.updateIssue = (req, res) ->
  icey.updateIssue req, res, req.params.issue, req.params.label, req.params.state, (error, resp) ->
    if error? then console.log "Error from GitHub: #{error}" else res.send 'OK'
