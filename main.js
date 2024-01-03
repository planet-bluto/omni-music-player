global.print = console.log
global.REPL = Boolean(process.env['REPL'])

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

    switch (mode) {
      case "YT":
        stream.pipe(res)
      break;
      // case "BC":
      //   res.redirect(stream)
      // break;
      default:
        streamToBuffer(stream, (err, buf) => {
          var total = buf.length

          end = end ? parseInt(end, 10) : total-1
          var chunksize = (end-start)+1
          // var readStream = fs.createReadStream(buf, {start: start, end: end})
          var readStream = Readable.from(buf.subarray(start, end))
          res.writeHead(206, {
              'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
              'Accept-Ranges': 'bytes', 'Content-Length': chunksize,
              'Content-Type': 'audio/mpeg'
          });
          readStream.pipe(res)
        })
    }
  }
})

//// Start HTTP Server ////
import("lowdb").then(async (module) => {
	global.Low = module.Low
	global.JSONFile = module.JSONFile

	global.initDB = async (DBpath) => {
		if (REPL) {
			const Database = require("@replit/database")
			var db = new Database()
			
			var dbValue = await db.get(DBpath)
			if (dbValue == null) {
				await db.set(DBpath, {})
			}
			
			var ReplDBAdapter = require("./repldbadapter.js")
			adapter = new ReplDBAdapter(DBpath)
		} else {
			adapter = new JSONFile(path.join(__dirname, `/db/${DBpath}.json`), {})
		}
		
		db = new Low(adapter)
		await db.read()
		return db
	}
	global.GLOBAL_DB = await initDB("GLOBAL")
	if (!Array.isArray(GLOBAL_DB.data.users)) {
		GLOBAL_DB.data.users = []
		await GLOBAL_DB.write()
	}

	global.createDB = async (DBpath, data = {}) => {
		if (REPL) {
			var thisDB = await initDB(DBpath)
			thisDB.data = data
			await thisDB.write()
			return thisDB
		} else {
			await fs.writeFile(path.join(__dirname, `/db/${DBpath}.json`), JSON.stringify(data))
			return initDB(DBpath)
		}
	}
		
	OmniCore.start()
})

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

if (REPL) {
	command("clear_db", [], [], "Clears database", () => {
		prompt.get(["Are you sure you want to clear the database? (y/n)"], async (err, res) => {
			var answer = Object.values(res)[0]

			if (answer.toLowerCase() == "y") {
				const Database = require("@replit/database")
				var db = new Database()

				var keys = await db.list()

				await keys.awaitForEach(async (key) => {
					await db.delete(key)
				})

				print("Database cleared.")
			} else {
				print("Aborted.")
			}
		})
	})

	command("list_db", [], [], "List REPL database keys and values", async (key = null) => {
		const Database = require("@replit/database")
		var db = new Database()

		if (key) {
			var value = await db.get(key)
			print(value)
		} else {
			var keys = await db.list()
			print(keys)
		}
	})

	command("delete_db", [], [], "Deletes REPL database entry", async (key) => {
		const Database = require("@replit/database")
		var db = new Database()

		await db.delete(key)
		print("Database entry deleted.")
	})
}