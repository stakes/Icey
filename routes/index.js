var https = require('https')
, icey = require('../lib/icey')
, _ = require('underscore')
, env = process.env.NODE_ENV || 'development'
, config_file = require('../node_modules/yaml-config')
, config = config_file.readConfig('config/config.yaml', env);

exports.index = function(req, res){
  if (req.loggedIn) {
	    return res.redirect('/projects');
	}
	res.render('login', { title: 'Icey', layout: 'landing_layout' });
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
          title: 'Icey | '+acct
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
      icey.getAllIssues(req, res, acct, req.params.owner, function(open, closed, github_id) {
        console.log(github_id)
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
            title: 'Icey | '+req.params.project
          , project_id: github_id
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

exports.reorderIssues = function(req, res) {
  if (typeof(req.session.auth)=='undefined') {
    return res.redirect('/');
  };
  var acct = req.user.github.login;
  if (typeof(req.params.account)!='undefined') {
    acct = req.params.account;
  };
  icey.updateIssuesOrder(req, res, function(error) {
    if (error == 'undefined' || error == null) {
      res.send('OK');
    } else {
      console.log('error from github: '+error)
    }
  })
};

exports.newIssue = function(req, res) {
  if (typeof(req.session.auth)=='undefined') {
    return res.redirect('/');
  };
  acct = req.session.context
  icey.createNewIssue(req, res, acct, function(error) {
    if (error == 'undefined' || error == null) {
      var url = '/context/'+req.body.context+'/project/'+req.session.owner+'/'+req.body.repo;
      res.redirect(url)
    } else {
      console.log('error from github: '+error)
    }
  }); 
};

exports.updateIssue = function(req, res) {
  icey.updateIssue(req, res, req.params.issue, req.params.label, req.params.state, function(error, resp) {
    if (error) {
      console.log('error from github: '+error);
    } else {
      res.send('OK');
    }
  });
};

