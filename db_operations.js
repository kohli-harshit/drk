const mongodb = require('mongodb')
const moment = require('moment')

// DB URLs
const devUrl = 'mongodb://mongodbtrigger:password@ds161580.mlab.com:61580/mongodbtrigger'
const prodUrl = 'mongodb://localhost:27017/history'

// ENV Vars
const url = process.env.NODE_ENV === "production" ? prodUrl : devUrl
