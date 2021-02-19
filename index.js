'use strict'

const { readFileSync } = require('fs')
const { join } = require('path')

module.exports.script = readFileSync(join(__dirname, 'transaction.lua'))
