const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const express = require('express')
const sassMiddleware = require('node-sass-middleware')

module.exports = app => {
  // view engine setup
  app.set('views', path.join(path.join(__dirname, '../routes'), 'views'))
  app.set('view engine', 'pug')

  // Sass config
  app.use(
    sassMiddleware({
      src: path.join(path.join(__dirname, '../routes'), 'views'),
      dest: path.join(path.join(__dirname, '../public'), 'static'),
      debug: true,
      prefix: '/static'
    })
  )

  app.use(logger('dev'))
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(express.static(path.join(path.join(__dirname, '../'), 'public')))
}
