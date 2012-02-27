var https = require('https');
var github = require('../lib/github');

exports.index = function(req, res){
  if (req.session && req.session.uid) {
	    return res.redirect('/projects');
	}
	res.render('login', { title: 'Icey' });
};

exports.login = function(req, res){
  res.render('login', { title: 'Icey | Log in with Github' });
}

exports.getProjects = function(req, res) {
  var options = {
    host: "api.github.com",
  	path: '/user/repos?access_token=' + req.session.oauth,
  	method: "GET"
  };
  console.log('making request with')
  console.log(options)
  var client = https.request(options, function(response) {
    var body = [];
    response.setEncoding('UTF8');
    response.on('data', function(chunk) {
      body.push(chunk);
    });
    response.on('end', function() {
      body.join('');
      body = JSON.parse(body);
      console.log(body)
      var responseObj = { title: 'Icey', repos: body};
      res.render('project', responseObj);
    });
    response.on('error', function(error) {
      console.log('Problem with request: ' + error.message);
    })
  });
  client.end();
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