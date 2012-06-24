var https = require('https')
, querystring = require('querystring')
, Project = require('../models/project.js')
, _ = require('underscore')
, env = process.env.NODE_ENV || 'development'
, config_file = require('../node_modules/yaml-config')
, config = config_file.readConfig('config/config.yaml', env);

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

// get all issues - called for a single project view
exports.getAllIssues = function(req, res, context, owner, callback) {
  
  req.session.owner = owner;
  req.session.context = context;
  req.session.project = req.params.project;
  
  var options = {
      host: 'api.github.com'
    , method: 'GET'
    , path: '/repos/'+req.session.owner+'/'+req.session.project+'/issues?access_token=' + req.session.auth.github.accessToken
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
          checkProject(req.session.owner, req.session.project, req.session.auth.github.accessToken, function(project_obj) {
            syncIssues(project_obj, open, closed);
            open = _.sortBy(open, function(issue) {
              return issue.order;
            })
            // TODO: this is super naive and needs to warn the user
            checkLabels(req.session.context, req.session.project, req.session);
            callback(open, closed, project_obj.github_id);
          });
        });
        response.on('error', function(error) {
          console.log('Problem with request: ' + error.message);
        });
      });
      client.end();
    });
  });
  client.on('error', function(error) {
    console.log('Problem with request:' + error.message);
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
    , path: '/repos/'+req.session.owner+'/'+req.session.project+'/issues'
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
  });
  client.on('error', function(error) {
    console.log('Problem with request:' + error.message);
  });
  client.write(post_data);
  client.end();
}

// update issues order in our db
exports.updateIssuesOrder = function(req, res, callback) {
  pid = req.body.github_id;
  orderedissues = JSON.parse(req.body.issues);
  project_obj = Project.findOne({'github_id': pid}, function(error, pobj) {
    if (!error) {
      _.each(orderedissues, function(val, key) {
        i = _.find(pobj.issues, function(obj) {
          return obj.github_id === key;
        });
        if (i!=undefined) { i.order = val }
      });
      pobj.save();
    }
  });
  console.log(project_obj)
  callback();
};

// update an issue's label
exports.updateIssue = function(req, res, issue, label, state, callback) {
  var post_data = '["'+label+'"]';
  var options = {
      host: 'api.github.com'
    , method: 'POST'
    , path: '/repos/'+req.session.owner+'/'+req.session.project+'/issues/'+issue+'/labels'
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
      res += chunk;
    });
    response.on('end', function() {
      res = JSON.parse(res);
      // success
      if (res.message == 'undefined' || res.message == null) {
        // remove existing labels that are in our namespace
        _.each(res, function(val, key) {
          var ns = config.application_vars.namespace
            , ind = ns.length
            , existing_label = val.name
          if (existing_label.substr(-ind) === ns && existing_label != label) {
            removeIssueLabel(req, res, issue, existing_label);
          }
        });
        // close or reopen
        updateIssueState(req, res, issue, state);
      } else {
        callback(res.message, res);
      }
    });
  });
  client.on('error', function(error) {
    console.log('Problem with request:' + error.message);
  });
  client.write(post_data);
  client.end();
};



// private methods //

var updateIssueState = function(req, res, issue, state, callback) {
  var post_data = '{"state": "'+state+'"}';
  var options = {
      host: 'api.github.com'
    , method: 'POST'
    , path: '/repos/'+req.session.owner+'/'+req.session.project+'/issues/'+issue
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
      res += chunk; 
    });
    response.on('end', function() {
      res = JSON.parse(res);
      // TODO: check for success/fail
    });
  });
  client.on('error', function(error) {
    console.log('Problem with request:' + error.message);
  });
  client.write(post_data);
  client.end();
}

// remove a label from an issue
var removeIssueLabel = function(req, res, issue, label) {
  var options = {
      host: 'api.github.com'
    , method: 'DELETE'
    , path: '/repos/'+req.session.owner+'/'+req.session.project+'/issues/'+issue+'/labels/'+label
    , headers: {
        'Content-Length': '0'
      , 'Authorization': 'token '+req.session.auth.github.accessToken
    }
  };
  var client = https.request(options, function(response) {
    var res = '';
    response.setEncoding('UTF8');
    response.on('data', function(chunk) {
      res += chunk;
    });
    response.on('end', function() {
      res = JSON.parse(res);
    });
  });
  client.on('error', function(error) {
    console.log('Problem with request:' + error.message);
  });
  client.end();
};

// initialize issue labels, if you need em
var checkProject = function(context, project, token, callback) {
  var options = {
      host: 'api.github.com'
    , method: 'GET'
    , path: '/repos/'+context+'/'+project+'?access_token='+token
  };
  var client = https.request(options, function(response) {
    var res = '';
    response.setEncoding('UTF8');
    response.on('data', function(chunk) {
      res += chunk;
    });
    response.on('end', function() {
      res = JSON.parse(res);
      Project.findOne({'github_id': res.id}, function(error, result) {
        if (result === null) {
          initProject(res.id, context, project, callback);
        } else {
          callback(result);
        };
      });
    });
  });
  client.on('error', function(error) {
    console.log('Problem with request:' + error.message);
  });
  client.end();
};

var checkLabels = function(proj_context, proj_name, session) {
  var options = {
      host: 'api.github.com'
    , method: 'GET'
    , path: '/repos/'+proj_context+'/'+proj_name+'/labels'
  }
  var client = https.request(options, function(response) {
    var res = '';
    response.setEncoding('UTF8');
    response.on('data', function(chunk) {
      res += chunk;
    });
    response.on('end', function() {
      res = JSON.parse(res);
      a = []
      // for each label, make sure it exists and if not create it
      _.each(res, function(val, key) {
        if (val != 'Not Found') {
          var ns = config.application_vars.namespace
            , ind = ns.length
            , existing_label = val.name
          if (existing_label.substr(-ind) === ns) {
            a.push(existing_label)
          };
        };
      });
      if (a.length != 4) createMissingLabels(a, session)
    });
  });
  client.on('error', function(error) {
    console.log('Problem with request:' + error.message);
  });
  client.end();
};

var createMissingLabels = function(labelArray, session) {
  _.each(config.application_vars.columns, function(val, key) {
    var name = val+config.application_vars.namespace;
    if (!_.include(labelArray, name)) {
      createSingleLabel(name, session);
    }
  });
};

var createSingleLabel = function(name, session) {
  var post_data = JSON.stringify({
      'name': name
    , 'color': 'ffffff'
  });
  var options = {
      host: 'api.github.com'
    , method: 'POST'
    , path: '/repos/'+session.context+'/'+session.project+'/labels'
    , headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length,
      'Authorization': 'token '+session.auth.github.accessToken
    }
  };
  var client = https.request(options, function(response) {  
    var res = '';
    response.setEncoding('UTF8');
    response.on('data', function(chunk) {
      res += chunk;
    });
    response.on('end', function() {
      res = JSON.parse(res);
    });
    
  });
  client.on('error', function(error) {
    console.log('Problem with request: ' + error.message);
  });
  client.write(post_data);
  client.end();
};


var initProject = function(proj_id, proj_context, proj_name, callback) {
  new Project({github_name: proj_name, github_id: proj_id}).save();
  var result = Project.findOne({'github_id': proj_id}, function(error, result) {
    callback(result);
  });
};

var syncIssues = function(project_obj, openissues, closedissues) {
  _.each(openissues, function(issue) {
    var saved_issue = _.find(project_obj.issues, function(val) {
      return Number(val.github_id) === Number(issue.id);
    });
    if (saved_issue === undefined) {
      project_obj.issues.push({
          github_id: issue.id
        , order: 0
      });
      issue.order = 0;
    } else {
      issue.order = saved_issue.order;
    }
  });
  project_obj.save();
};