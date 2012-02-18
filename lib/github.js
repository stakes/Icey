var GitHubApi = require("github").GitHubApi;
var github = new GitHubApi(true);

module.exports = github;