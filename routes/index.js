var github = require('../lib/github');

exports.index = function(req, res){
  res.render('index', { title: 'IcedOut' });
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

exports.getProject = function(req, res) {
  var gh = github;
  gh.authenticate(req.params.user, req.params.key);
  gh.getIssueApi().getList(req.params.user, req.params.id, 'closed', function(err, inf) {
    var closed = inf;
    gh.getIssueApi().getList(req.params.user, req.params.id, 'open', function(err, info) {
      gh.getRepoApi().getUserRepos(req.params.user, function(err, resp) {
        var responseObj = { title: 'IcedOut | '+req.params.id, user: req.params.user, key: req.params.key, pname: req.params.id, openissues: info, closedissues: closed, repos: resp};
        console.log(responseObj)
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