var https = require('https');
var github = require('../lib/github');

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

// first get projects
exports.showProjectsForAccount = function(req, res, login) {
  if (typeof(req.session.auth)=='undefined') {
    return res.redirect('/');
  };
  var acct = req.user.github.login;
  if (typeof(req.params.account)!='undefined') {
    acct = req.params.account
  };
  getProjects(req, res, acct);
};

// get projects for a user/organization
var getProjects = function(req, res, login) {
  var options = {
    host: "api.github.com",
  	method: "GET"
  };
  // i'm either using it as myself...
  if (login!=req.user.github.login) {
    options.path = '/orgs/'+login+'/repos?access_token=' + req.session.auth.github.accessToken;
  // or in the context of an organization.
  } else {
    options.path = '/user/repos?access_token=' + req.session.auth.github.accessToken;
  };
  var client = https.request(options, function(response) {
    var body = '';
    response.setEncoding('UTF8');
    response.on('data', function(chunk) {
      body += chunk
    });
    response.on('end', function() {
      body = JSON.parse(body)
      var responseObj = { title: 'Icey', repos: body};
      // now get organizations and pass render response as a callback
      getOrganizations(req, res, function(content) {
        responseObj.orgs = content;
        responseObj.context = login;
        res.render('project', responseObj);
      });
    });
    response.on('error', function(error) {
      console.log('Problem with request: ' + error.message);
    });
  });
  client.end();
};
// get organizations
var getOrganizations = function(req, res, callback) {
  var options = {
    host: "api.github.com",
  	path: '/user/orgs?access_token=' + req.session.auth.github.accessToken,
  	method: "GET"
  };
  var client = https.request(options, function(response) {
    var body = '';
    response.setEncoding('UTF8');
    response.on('data', function(chunk) {
      body += chunk
    });
    response.on('end', function() {
      body = JSON.parse(body);
      callback(body);
    });
    response.on('error', function(error) {
      console.log('Problem with request: ' + error.message);
    })
  });
  client.end();
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

exports.getSingleProject = function(req, res) {
  var gh = github;
  gh.authenticate(req.params.user, req.params.key);
  gh.getIssueApi().getList(req.params.user, req.params.id, 'closed', function(err, inf) {
    var closed = inf;
    gh.getIssueApi().getList(req.params.user, req.params.id, 'open', function(err, info) {
      gh.getRepoApi().getUserRepos(req.params.user, function(err, resp) {
        var responseObj = { title: 'Icey | '+req.params.id, user: req.params.user, key: req.params.key, pname: req.params.id, openissues: info, closedissues: closed, repos: resp};
        res.render('project', responseObj);
      });
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