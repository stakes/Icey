var https = require('https')
, github = require('../lib/github')
, icey = require('../lib/icey')
, _ = require('underscore')
, env = process.env.NODE_ENV || 'development'
, config_file = require('../node_modules/yaml-config')
, config = config_file.readConfig('config/config.yaml', env);

exports.index = function(req, res){
  if (req.loggedIn) {
	    return res.redirect('/projects');
	}
	res.render('login', { title: 'Icey' });
};

exports.login = function(req, res){
  if (typeof(req.session.auth)=='undefined') {
    return res.redirect('/');
  };
  res.render('login', { title: 'Icey | Log in with Github' });
}

exports.showProjectsForAccount = function(req, res) {
  if (typeof(req.session.auth)=='undefined') {
    return res.redirect('/');
  };
  var acct = req.user.github.login;
  if (typeof(req.params.account)!='undefined') {
    acct = req.params.account
  };
  icey.getProjects(req, res, acct, function(projects) {
    // now get organizations and pass render response as a callback
    icey.getOrganizations(req, res, function(organizations) {
      var responseObj = { 
          title: 'Icey'
        , repos: icey.onlyProjectsWithIssues(true, projects)
        , otherRepos: icey.onlyProjectsWithIssues(false, projects)
        , orgs: organizations
        , context: acct
      };
      res.render('index', responseObj);
    });
  });
};

exports.getSingleProject = function(req, res) {
  if (typeof(req.session.auth)=='undefined') {
    return res.redirect('/');
  };
  var acct = req.user.github.login;
  if (typeof(req.params.account)!='undefined') {
    acct = req.params.account;
  };
  icey.getProjects(req, res, acct, function(projects) {
    // now get organizations for that user
    icey.getOrganizations(req, res, function(organizations) {
      // and now the get the issues for the selected project
      icey.getAllIssues(req, res, acct, function(open, closed) {
        var backlog, current, icebox;
        backlog = _.filter(open, function(issue) {
          var labelnames = _.map(issue.labels, function(label) { return String(label.name) })
          label = 'backlog'+config.application_vars.namespace;
          return _.include(labelnames, label)
        });
        current = _.filter(open, function(issue) {
          var labelnames = _.map(issue.labels, function(label) { return String(label.name) })
          label = 'current'+config.application_vars.namespace;
          return _.include(labelnames, label)
        });
        icebox = _.reject(open, function(issue) {
          return (_.include(backlog, issue) || _.include(current, issue))
        })
        var responseObj = { 
            title: 'Icey'
          , repos: icey.onlyProjectsWithIssues(true, projects)
          , orgs: organizations
          , context: acct
          , openissues: open
          , iceboxissues: icebox
          , currentissues: current
          , backlogissues: backlog
          , closedissues: closed
          , project: req.params.project
        };
        res.render('project', responseObj);
      });
    });
  });
}

exports.newIssue = function(req, res) {
  if (typeof(req.session.auth)=='undefined') {
    return res.redirect('/');
  };
  var acct = req.user.github.login;
  if (typeof(req.params.account)!='undefined') {
    acct = req.params.account
  };
  icey.createNewIssue(req, res, acct, function(error) {
    if (error == 'undefined' || error == null) {
      var url = '/context/'+req.body.context+'/project/'+req.body.repo;
      res.redirect(url)
    } else {
      console.log('error from github: '+error)
    }
  }); 
};

exports.updateIssue = function(req, res) {
  icey.updateIssue(req, res, req.params.issue, req.params.label, req.params.state, function(error, resp) {
    if (error) {
      console.log(error);
    } else {
      console.log(resp);
    }
  });
};

exports.authenticate = function(req, res) {
    var gh = github
    gh.authenticate(req.body.username, req.body.apikey);
    gh.getUserApi().show(req.body.username, function(err, info) {
        gh.getRepoApi().getUserRepos(req.body.username, function(err, resp) {
          var responseObj = {infoobj: info, repos: resp};
          res.send(responseObj);
        });
    });
};

exports.closeIssue = function(req, res) {
  var gh = github;
  gh.authenticate(req.params.user, req.params.key);
  gh.getIssueApi().closeIssue(req.params.user, req.params.repo, req.params.issue, function(err, info) {
    res.send(info)
  });
};