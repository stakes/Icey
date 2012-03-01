var https = require('https');
var _ = require('underscore');

// get projects for a user/organization
exports.getProjects = function(req, res, login, callback) {
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
      callback(body);
    });
    response.on('error', function(error) {
      console.log('Problem with request: ' + error.message);
    });
  });
  client.end();
};

// get organizations
exports.getOrganizations = function(req, res, callback) {
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
    });
  });
  client.end();
}