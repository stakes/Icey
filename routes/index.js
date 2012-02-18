var github = require('../lib/github');

exports.index = function(req, res){
  res.render('index', { title: 'FUCKYEAH' });
};

exports.authenticate = function(req, res) {
    github.authenticate(req.body.username, req.body.apikey);
    github.getUserApi().show(req.body.username, function(err, info) {
        res.send(info);
    });
};