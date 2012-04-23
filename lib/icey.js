var https = require('https');
var querystring = require('querystring');
var _ = require('underscore');

// get projects for a user/organization
exports.getProjects = function(req, res, login, callback) {
  var options = {
      host: "api.github.com"
  	, method: "GET"
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
      host: "api.github.com"
    , path: '/user/orgs?access_token=' + req.session.auth.github.accessToken
  	, method: "GET"
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
};

// get all issues
exports.getAllIssues = function(req, res, context, callback) {
  var options = {
      host: 'api.github.com'
    , method: 'GET'
    , path: '/repos/'+context+'/'+req.params.project+'/issues?access_token=' + req.session.auth.github.accessToken
  };
  var client = https.request(options, function(response) {
    var open = '';
    response.setEncoding('UTF8');
    response.on('data', function(chunk) {
      open += chunk
    });
    response.on('end', function() {
      open = JSON.parse(open);
      options.path = options.path+'&state=closed'
      client = https.request(options, function(response) {
        var closed = '';
        response.setEncoding('UTF8');
        response.on('data', function(chunk) {
          closed += chunk
        });
        response.on('end', function() {
          closed = JSON.parse(closed);
          callback(open, closed);
        });
        response.on('error', function(error) {
          console.log('Problem with request: ' + error.message);
        });
      });
      client.end();
    });
    response.on('error', function(error) {
      console.log('Problem with request: ' + error.message);
    });
  });
  client.end();
};

// separate out projects that contain issues
exports.onlyProjectsWithIssues = function(isIssues, projects) {
  var retArray = new Array();
  for (i in projects) {
    if (projects[i].open_issues > 0 && isIssues==true) {
      retArray.push(projects[i]); 
    } else if (projects[i].open_issues==0 && isIssues==false){
      retArray.push(projects[i]);
    }
  };
  return retArray
}

// create a new issue
exports.createNewIssue = function(req, res, context, callback) {
  var post_data = JSON.stringify({
          'title': req.body.title
        , 'body': req.body.desc
  });
  var options = {
      host: 'api.github.com'
    , method: 'POST'
    , path: '/repos/'+context+'/'+req.body.repo+'/issues'
    , headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length,
      'Authorization': 'token '+req.session.auth.github.accessToken
    }
  };
  var client = https.request(options, function(response) {
    var res = '';
    response.setEncoding('UTF8');
    response.on('data', function(chunk) {
      res += chunk
    });
    response.on('end', function() {
      res = JSON.parse(res);
      // success
      if (res.message == 'undefined' || res.message == null) {
        callback(null);
      } else {
        callback(res.message);
      }
    });
    response.on('error', function(error) {
      console.log('Problem with request: ' + error.message);
    });
  });
  client.write(post_data);
  client.end();
}

// update an issue's label
exports.updateIssueLabel = function(req, res, issue, label, callback) {
  var post_data = '["'+label+'"]';
  var options = {
      host: 'api.github.com'
    , method: 'POST'
    , path: '/repos/stakes/Stylistic/issues/'+issue+'/labels'
    , headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      , 'Content-Length': post_data.length
      , 'Authorization': 'token '+req.session.auth.github.accessToken
    }
  };
  var client = https.request(options, function(response) {
    var res = '';
    response.setEncoding('UTF8');
    response.on('data', function(chunk) {
      res += chunk
    });
    response.on('end', function() {
      res = JSON.parse(res);
      // success
      if (res.message == 'undefined' || res.message == null) {
        callback(null, res);
      } else {
        callback(res.message, res);
      }
    });
    response.on('error', function(error) {
      console.log('Problem with request: ' + error.message);
    });
  });
  client.write(post_data);
  client.end();
};

// remove a label from an issue
exports.removeIssueLabel = function() {
  
};