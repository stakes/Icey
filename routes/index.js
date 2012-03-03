var https = require('https');
var github = require('../lib/github');
var icey = require('../lib/icey')
var _ = require('underscore');

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
    acct = req.params.account
  };
  icey.getProjects(req, res, acct, function(projects) {
    // now get organizations for that user
    icey.getOrganizations(req, res, function(organizations) {
      // and now the get the issues for the selected project
      icey.getAllIssues(req, res, acct, function(open, closed) {
        var responseObj = { 
            title: 'Icey'
          , repos: icey.onlyProjectsWithIssues(true, projects)
          , orgs: organizations
          , context: acct
          , openissues: open
          , closedissues: closed
        };
        res.render('project', responseObj);
      });
    });
  });
}





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

exports.updateIssue = function(req, res) {
  var gh = github;
  gh.authenticate(req.params.user, req.params.key);
  gh.getIssueApi().addIssueLabel(req.params.user, req.params.repo, req.params.issue, req.params.label, function(err, info) {
    res.send(info)
  });
};

exports.closeIssue = function(req, res) {
  var gh = github;
  gh.authenticate(req.params.user, req.params.key);
  gh.getIssueApi().closeIssue(req.params.user, req.params.repo, req.params.issue, function(err, info) {
    res.send(info)
  });
};