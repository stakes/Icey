mongoose = require 'mongoose'
Schema = mongoose.Schema
ObjectId = Schema.ObjectId

issueSchema = new Schema
  github_id: String
  order:     Number

projectSchema = new Schema
  github_name: String
  github_id:   String
  issues:      [issueSchema]

module.exports = mongoose.model 'Project', projectSchema
