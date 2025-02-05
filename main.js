global.print = console.log

const NodeCache = require( "node-cache" )
const bufferCache = new NodeCache( { stdTTL: 100, checkperiod: 120 } )

require('dotenv').config()
var { OmniCore, fetchLibrary } = require("./omni_core.js")
var { getStream } = OmniCore
var {SuperOmniParser, OmniParser, MultiLoader} = require('omni-parser')
var omni_parse = OmniParser()
var path = require("path")
const streamToBuffer = require('fast-stream-to-buffer')
var Readable = require('node:stream').Readable
var fs = require("node:fs/promises")

OmniCore.app.get("/mediastart", async (req, res) => {
  var thisURL = req.query.url
  if (thisURL != "") {
    var cached = bufferCache.has(thisURL)

    if (!cached) {
      var {stream, mode, start, end} = await getStream(thisURL, req.headers.range)
      switch (mode) {
        // case "REMOTE":
        //   res.redirect(thisURL)
        // break;
        // case "BC":
        //   res.redirect(stream)
        // break;
        default:
          stream.pipe(res)
      }
    } else {
      var buf = bufferCache.get(thisURL)
      bufferCache.set(thisURL, buf, 60000 * 5) // 5 minute cache
      res.send(buf)
    }
    
  }
})

OmniCore.app.get("/media", async (req, res) => {
  var thisURL = req.query.url
  if (thisURL != "") {
    var {stream, mode, start, end} = await getStream(thisURL, req.headers.range)

    // res.set('Content-Type', 'audio/wav')
    // res.writeHead(200, { 'Content-Length': song_length, 'Content-Type': 'audio/mpeg' })  
    // stream.pipe(res)

    print(start, end)

    end = parseInt(end, 10)
    var chunksize = (end-start)+1
    var total = chunksize

	res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + total)
	res.set('Accept-Ranges', 'bytes')
	res.set('Content-Length', chunksize)
	res.set('Content-Type', 'audio/mpeg')

    switch (mode) {
      // case "YT":
      //   stream.pipe(res)
      // break;
      // case "REMOTE":
      //   res.redirect(thisURL)
      // break;
      // case "BC":
      //   res.redirect(stream)
      // break;
      default:
        var cached = bufferCache.has(thisURL)

        if (cached) {
          var buf = bufferCache.get(thisURL)
        } else {
          var buf = await (new Promise((res, rej) => {
            streamToBuffer(stream, (err, this_buf) => {
              res(this_buf)
            })
          }))
        }

        total = buf.length
        end = end ? parseInt(end, 10) : total
        chunksize = (end-start)+1

        bufferCache.set(thisURL, buf, 60000 * 5) // 5 minute cache
        res.send(buf)
    }
  }
})

const ffmpeg = require('fluent-ffmpeg');

OmniCore.app.get("/download/:id.mp3", async (req, res) => {
  let track = await omni_parse(req.params.id)

  if (track == null) { res() }
  var thisURL = track.url
  if (thisURL != "") {
    var {stream, mode, start, end} = await getStream(thisURL, req.headers.range)

    // res.set('Content-Type', 'audio/wav')
    // res.writeHead(200, { 'Content-Length': song_length, 'Content-Type': 'audio/mpeg' })  
    // stream

  //   print(start, end)

  //   end = parseInt(end, 10)
  //   var chunksize = (end-start)+1
  //   var total = chunksize

	// res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + total)
	// res.set('Accept-Ranges', 'bytes')
	// res.set('Content-Length', chunksize)
	// res.set('Content-Type', 'audio/mpeg')

  print("DOWNLOADING??")
  ffmpeg(stream)
  .outputFormat('mp3')
  .pipe(res)

  // .pipe(res)

    // switch (mode) {
    //   // case "YT":
    //   //   stream.pipe(res)
    //   // break;
    //   // case "REMOTE":
    //   //   res.redirect(thisURL)
    //   // break;
    //   // case "BC":
    //   //   res.redirect(stream)
    //   // break;
    //   default:
    //     var cached = bufferCache.has(thisURL)

    //     if (cached) {
    //       var buf = bufferCache.get(thisURL)
    //     } else {
    //       var buf = await (new Promise((res, rej) => {
    //         streamToBuffer(stream, (err, this_buf) => {
    //           res(this_buf)
    //         })
    //       }))
    //     }

    //     total = buf.length
    //     end = end ? parseInt(end, 10) : total
    //     chunksize = (end-start)+1

    //     bufferCache.set(thisURL, buf, 60000 * 5) // 5 minute cache
    //     res.send(buf)
    // }
  }
})

//// Start HTTP Server ////
const {BluDB, REPLBuilder, JSONBuilder} = require("bludb")
const DB = new BluDB(
	JSONBuilder(),
	// REPLBuilder(process.env["REPLIT_DB_URL"]),
)
DB.default({users: []}, "GLOBAL")
DB.fetch("GLOBAL").then(GlobalDB => {
	print("- Global init'd")
})

global.DB = DB
// DB.default({id: "", username: ""}, (db_key) => db_key.startsWith("users/"))

OmniCore.start()

//////////////////////////////
// Console Commands
//////////////////////////////
const readline = require('node:readline')
var prompt = require('prompt')
const { stdin: input, stdout: output } = require('node:process')
// const { OmniParser } = require("omni-parser")
const rl = readline.createInterface({ input, output })
var cmds = {}
var mains = []
rl.on("line", input => {
	var args = input.split(" ")
	var cmd = args.shift()

	cmds[cmd]?.func(...args)
})

function command(name, aliases, args, desc, func) {
	cmds[name] = {args, desc, aliases, func}
	mains.push(name)
	aliases.forEach(alias => {
		cmds[alias] = {args, desc, aliases, func}
	})
}

command("ping", [], [], "Prints 'pong!'", () => {
	print("pong!")
})

command("help", [], ["<?command>"], "A list of commands OR get help on a specific command", (cmd) => {
	if (!cmd) {
		var lines = []

		mains.forEach(cmd => {
			var info = cmds[cmd]
			lines.push(`> ${cmd} ${info.args.join(" ")}\n   ${info.desc}\n\n`)
		})

		print(`\nCommand Help:\n${lines.join("\n")}`)
	} else {
		var info = cmds[cmd]
		print(`\nCommand Help:\n${cmd} ${info.args.join(" ")}\n\nDescription:\n${info.desc}\n\nAliases:\n${info.aliases}`)
	}
})

command("update", [], [], "Updates Entire Library for Soundcloud", () => {
	fetchLibrary()
})