var github = require('../lib/github');

exports.index = function(req, res){
  res.render('index', { title: 'FUCKYEAH' });
};

exports.authenticate = function(req, res) {
    gh = github
    gh.authenticate(req.body.username, req.body.apikey);
    gh.getUserApi().show(req.body.username, function(err, info) {
        gh.getRepoApi().getUserRepos(req.body.username, function(err, resp) {
          var responseObj = {infoobj: info, repos: resp};
          res.send(responseObj);
        });
    });
};