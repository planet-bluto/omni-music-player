global.print = console.log

require('dotenv').config()
var OmniCore = require("./omni_core.js")
var { getStream } = OmniCore
var path = require("path")
const streamToBuffer = require('fast-stream-to-buffer')
var Readable = require('node:stream').Readable
var fs = require("node:fs/promises")

OmniCore.app.get("/mediastart", async (req, res) => {
  var thisURL = req.query.url
  if (thisURL != "") {
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
        streamToBuffer(stream, (err, buf) => {
        	total = buf.length
        	end = end ? parseInt(end, 10) : total
        	chunksize = (end-start)+1

			// res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + total)
			// res.set('Accept-Ranges', 'bytes')
			// res.set('Content-Length', chunksize)
			// res.set('Content-Type', 'audio/mpeg')

        	// res.send(buf.subarray(start, end))
        	res.send(buf)
        })
    }
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