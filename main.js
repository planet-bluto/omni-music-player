require('dotenv').config()
global.print = console.log
global.path = require('path')
global.fs = require('fs')
global.Readable = require('node:stream').Readable
global.SoundCloud = require("scdl-core").SoundCloud
global.ytdl = require('bluto-dl')
global.bcfetch = require('bandcamp-fetch')
global.fetch = require('node-fetch')
global.streamToBuffer = require('fast-stream-to-buffer')
require("./arrayLib.js")

// Server //
global.express = require('express')
global.app = express()
global.httpserver = require('http').createServer(app);
global.Server = require('socket.io').Server


// Scripts //
SoundCloud.connect().then(() => {
	require("./web_worker.js")
	// require("./test.js")
})