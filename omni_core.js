const print = console.log

var {spawn} = require('node:child_process')
const { python } = require('pythonia')

var {SuperOmniParser, OmniParser, MultiLoader} = require('omni-parser')
var raw_omni_parse = OmniParser()
// var raw_multi_load = MultiLoader()
var super_omni_parser = new SuperOmniParser()

const TOPIC = " - Topic"
function removeTopic(track) {
	var authName = track.author.name
	var code = track.service.code

	if (code == "YT") {
		if (authName.endsWith(TOPIC)) {
			authName = authName.slice(0, (authName.length - TOPIC.length))
		}
	}

	track.author.name = authName
	// print(track.author.name)

	return track
}

var multi_load = async (...args) => {
	var res = await super_omni_parser.multiple(...args)

	if (res != null) {
		res.map(track => removeTopic(track))
	}

	return res
}
var omni_parse = async (...args) => {
	var res = await raw_omni_parse(...args)

	if (res != null) {
		if (Array.isArray(res.tracks)) {
			res.tracks.forEach( (track, ind) => {
				res.tracks[ind] = removeTopic(res.tracks[ind])
			})
		} else {
			res = removeTopic(res)
		}
	}

	return res
}

var SoundCloud = require("scdl-core").SoundCloud
SoundCloud.clientId = (process.env["SC_CLIENT_ID"] || "8BBZpqUP1KSN4W6YB64xog2PX4Dw98b1")
var bcscrape = require('bandcamp-scraper')
var ytdl_og = require("@distube/ytdl-core")
var youtubedl = require('youtube-dl-exec')
const ytdlIsDying = true

async function fetchYoutubeStream(url) {
	if (ytdlIsDying) {
		var sub = spawn(youtubedl.constants.YOUTUBE_DL_PATH, ["-o", "-", `${url}`, "-x", "-q", "--no-warnings"])
		return sub.stdout
	} else {
		return ytdl_og(url, { filter: "audioonly", range: {start: start, end: end}})
	}
}

var fs = require('fs')
var fsPromise = require('fs/promises')
var path = require('path')
var Readable = require('node:stream').Readable
var fetch = require('node-fetch')
var express = require('express')
const cors = require('cors')
var jwt = require('jsonwebtoken')
const { Stream } = require('stream')
const fsExtra = require('fs-extra')

const Scraper = require('youtube-search-scraper').default
const YouTubeSearcher = new Scraper()

require("./arrayLib.js")

var client
var isLocal = (process.env["LOCAL"] != null && process.env["LOCAL"] == "true")
if (isLocal) {
  client = require('discord-rich-presence')('1208995328720637952')
}

class OmniCoreClass {
	constructor() {
		this.express = express
	    this.app = this.express()
	    this.httpserver = require('http').createServer(this.app);
	    this.Server = require('socket.io').Server

	    this.io = new this.Server(this.httpserver, {
	    	maxHttpBufferSize: 100e6,
			cors: {
				allow: ["http://absolute/", "*"]
			}
	    })

	    //// Socket.io ////
	    this.io.on("connection", SocketHandler)

	    //// Express ////
	    this.app.use('/', express.static(path.join(__dirname, 'website')))
	    this.app.use(cors())

			this.app.get("/", (req, res) => {
				res.sendFile('/index.html', {root: path.resolve(__dirname, "website")})
			})

			require("./omni_core_api.js")(this)
	}

	async start() {
		this.httpserver.listen((process.env["PORT"] || 8080), "0.0.0.0", (e) => {
			print("Server Listening!")
		})
	}

	async getStream( thisURL, req_range ) {
	  var thisURLClass = new URL(thisURL)
	  var stream;

	  var range = req_range
	  var start = 0
	  var end = 0
	  if (req_range) {
	    var parts = range.replace(/bytes=/, "").split("-")
	    var partialstart = parts[0]
	    var partialend = parts[1]
	    start = parseInt(partialstart, 10)
	    end = parseInt(partialend, 10)
	  }
	  
	  const SOUNDCLOUD_HOSTNAMES = ["soundcloud.com"]
	  const YOUTUBE_HOSTNAMES = ["www.youtube.com", "youtu.be", "youtube.com", "music.youtube.com"]

		async function fallbackYoutube(input, is_url = false) {
			if (!is_url) {
				var found = false
				while (!found) {
					var results = await YouTubeSearcher.search(input, {searchType: "video"})
					found = (results.videos.length > 0)
					if (found) {
						input = results.videos[0].link
						print(`> Falling back to ${input} on YouTube`)
					}
				}
			}
			
			return fetchYoutubeStream(input)
		}

	  var song_length = 1000
	  var mode = null
	  // print(thisURL)
	  if (SOUNDCLOUD_HOSTNAMES.includes(thisURLClass.hostname)) {
			mode = "SC"
			var trackInfo = await SoundCloud.tracks.getTrack(thisURL)
			if (trackInfo.duration != trackInfo.full_duration && trackInfo.duration == 30000) {
				var omni_track = await omni_parse(thisURL)
				stream = await fallbackYoutube(`${omni_track.title} - ${omni_track.author.name}`)
			} else {
				try {
					stream = await SoundCloud.download(thisURL, {highWaterMark: 1 << 25})
				} catch(err) {
					print("Fuck you Tokyo Machine: ", err)
					var omni_track = await omni_parse(thisURL)
					stream = await fallbackYoutube(`${omni_track.title} - ${omni_track.author.name}`)
				}
			}
		} else if (YOUTUBE_HOSTNAMES.includes(thisURLClass.hostname)) {
	    mode = "YT"
	    // stream = ytdl(thisURL, { filter: "audioonly", range: {start: start, end: end}})
			print(`> Returning stream from ${thisURL}`)
	    stream = await fallbackYoutube(thisURL, true)
			// This whole time this idiot was fetching the first search result when you search the URL and playing THAT instead of just the url... incredible
	  } else if (thisURLClass.hostname.endsWith("bandcamp.com")) {
	    mode = "BC"
	    var track = await new Promise((res, rej) => {
	      bcscrape.getTrackInfo(thisURL, (err, track) => {
	        res(track)
	      })
	    })
	    var response = await fetch(track.raw.trackinfo[0].file["mp3-128"], {method: "GET"})
	    stream = response.body
	    // stream = track.streamUrl
	  } else if (thisURLClass.hostname == "open.spotify.com") {
			var omni_track = await omni_parse(thisURL)
			stream = await fallbackYoutube(`${omni_track.title} - ${omni_track.author.name}`)
		} else {
	  	mode = "REMOTE"
	    var response = await fetch(thisURL, {method: "GET"})
	    stream = response.body
	  }

	  return {stream: stream, mode: mode, start: start, end: end}
	}
}

var EventStore = {}
var StreamingClientSocket = null
var StreamingServerSocket = null
var updateObj = {
	largeImageKey: "omniiconlarge",
	largeImageText: "∞ Omni Music Player"
}
var currentPlayingTrack = null
var lastStart = Date.now()
var lastProgress = 0
var lastDuration = Date.now()
var lastStatus = "UNPAUSE"

async function fetchSoundcloudLibrary() {
	let amount = null

	if (amount == null) {
		let res = await fetch(`https://api-v2.soundcloud.com/users/200230716?client_id=${(process.env["SC_CLIENT_ID"] || "8BBZpqUP1KSN4W6YB64xog2PX4Dw98b1")}`)
		try {
			let user_model = JSON.parse(await res.text())
			amount = user_model.likes_count
			print("Got Like Count: ", amount)
		} catch (err) {
			// ... 
		}
	}

	let sc_response = await fetch(`https://api-v2.soundcloud.com/users/200230716/track_likes?client_id=${(process.env["SC_CLIENT_ID"] || "8BBZpqUP1KSN4W6YB64xog2PX4Dw98b1")}${(amount == null ? "" : `&limit=${amount}`)}&offset=0&linked_partitioning=1&app_version=1690193099&app_locale=en`, {headers: {"Authorization": (process.env["SC_OAUTH2"] || "OAuth 2-294546-200230716-0URUIYJPzUgntj")}})
	// var sc_response = await fetch("https://api-v2.soundcloud.com/me/track_likes/ids?limit=5000&client_id=ffMw8NQS7WzQJYzQ0qvByPCqgm2EGAje", {headers: {"Authorization": "OAuth 2-294546-200230716-0URUIYJPzUgntj"}})
	var sc_body = await sc_response.text()

	// print(sc_body)

	// var bc_response = await fetch("https://bandcamp.com/api/fan/2/collection_summary", {
	//   "headers": {
	//     "accept": "application/json, text/javascript, */*; q=0.01",
	//     "accept-language": "en-US,en;q=0.9",
	//     "sec-ch-ua": "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Microsoft Edge\";v=\"122\"",
	//     "sec-ch-ua-mobile": "?0",
	//     "sec-ch-ua-platform": "\"Windows\"",
	//     "sec-fetch-dest": "empty",
	//     "sec-fetch-mode": "cors",
	//     "sec-fetch-site": "same-origin",
	//     "x-requested-with": "XMLHttpRequest",
	//     "cookie": "client_id=F0E97DDDD87DD4509F0F01CB7BB4AB5A434AD075C96B265EC64ED153A5F67895; menubar_active_band=1646701357; _ga_05ZD6JPXYZ=GS1.1.1708050295.5.1.1708050297.0.0.0; _ga=GA1.2.669936070.1655046102; identity=7%097WIWKip9zGyMMzpV%2BnoUhIxNUl%2BgiriLq5fv7QyIy28%3D%09%7B%22id%22%3A793757296%2C%22ex%22%3A0%7D; js_logged_in=1; logout=%7B%22username%22%3A%22plush.gamer.456%40gmail.com%22%7D; fan_visits=9341303; _gid=GA1.2.1988290062.1710399751; BACKENDID3=flexocentral-hlht-2; session=1%09r%3A%5B%228443f0c0x1710399831%22%2C%22nilZ0f0x1710399827%22%2C%22nilZ0t2463350650x1710399777%22%5D%09t%3A1710399747%09bp%3A1%09c%3A1",
	//     "Referer": "https://bandcamp.com/blu_axolotl/wishlist",
	//     "Referrer-Policy": "no-referrer-when-downgrade"
	//   },
	//   "body": null,
	//   "method": "GET"
	// })
	// var bc_body = await bc_response.text()
	// print(bc_body)

	try {
		if (!sc_response.ok) { new Error("fuck") }

		var { collection } = (JSON.parse(sc_body))
		var omni_tracks = []
		collection.forEach(like_res => {
				var track = like_res.track

				// totalMS += track.full_duration

				omni_tracks.push({
						type: "SOUNDCLOUD",
						title: track.title,
						author: {name: track.user.username},
						image: (track.artwork_url || track.user.avatar_url).replace("-large.", "-t500x500."),
						url: track.permalink_url,
						omni_id: `SC_${track.id}`,
						service: {
								"id": track.id,
								"code": "SC",
								"name": "Soundcloud"
						}
				})
		})
		// print(ids)

		// socket.emit("library", omni_tracks)
		await fsPromise.writeFile("./soundcloud_likes.json", JSON.stringify(omni_tracks, null, 4), "utf-8")
		print("Fetched Library! (Soundcloud)")
	} catch (err) {
		print("fuck: ", err)
	}
}

function artistJoin(artists) {
	var toReturn = ""
	for (let index = 0; index < artists.length; index++) {
		var artist = artists[index]
		if (index == 0) {
			toReturn += artist
		} else if (index == artists.length-1) {
			if (artists.length == 2) {
				toReturn += (" & " + artist)
			} else {
				toReturn += (", & " + artist)	
			}
		} else {
			toReturn += (", " + artist)
		}
	}

	return toReturn
}

async function fetchYoutubeLibrary() {
// call and await python script to fetch raw youtube likes
	// await python("./ytmusic.py") // PLEASE JUST WORK
	var sub = spawn("python", ["ytmusic.py"])
	
	let code = await (new Promise((res, rej) => {
		sub.on("close", code => {
			res(code)
		})
	}))

	print("youtube code: ", code)
	// var ytmusic = await YTMusic("browser.json")
	// ytmusic.get_library_songs(limit=1000)

	var raw_youtube_likes = await fsExtra.readJson("raw_youtube_likes.json")
	var omni_tracks = []
	raw_youtube_likes.forEach(entry => {
		omni_tracks.push({
			type: "YOUTUBE",
			title: entry.title,
			author: {name: artistJoin(entry.artists.map(artist => artist.name))},
			image: entry.thumbnails[entry.thumbnails.length-1].url,
			url: `https://music.youtube.com/watch?v=${entry.videoId}`,
			omni_id: `YT_${entry.videoId}`,
			service: {
					"id": entry.videoId,
					"code": "YT",
					"name": "YouTube"
			}
		})
	})

	await fsPromise.writeFile("./youtube_likes.json", JSON.stringify(omni_tracks, null, 4), "utf-8")
	print("Fetched Library! (YouTube)")
}

async function fetchLibrary() {
	var proms = Promise.all([
		fetchSoundcloudLibrary(),
		fetchYoutubeLibrary(),
	])

	return proms
}

fetchLibrary()

function SocketHandler(socket) {
	socket.onAny((eventName, eventObj) => {
		var bits = eventName.split("_")
		var prefix = bits.shift()
		eventName = bits.join("_")

		if (prefix == "$reg") {
			socket.join(eventName)
			if (EventStore[eventName] != null) {
				socket.emit(eventName, EventStore[eventName])
			}
		}

		function setupStreamEvents() {
			print("> Setting up streaming events...")
			StreamingServerSocket.onAny(async (streamEventName, streamEventArgs, callback = null) => {

				if (!streamEventName.startsWith("$stream_")) { return }
				if (StreamingClientSocket == null) { return }

				print(`> Forwarding '${streamEventName}' event to client...`, streamEventArgs)
				if (callback != null) {
					var res = await StreamingClientSocket.emitWithAck(streamEventName, ...streamEventArgs)
					callback(res)
				} else {
					StreamingClientSocket.emit(streamEventName, ...streamEventArgs)
				}
			})
		}

		if (prefix == "$streamClient" && (StreamingClientSocket == null)) {
			print("> Got streaming client instance...")
			StreamingClientSocket = socket

			StreamingClientSocket.on("disconnect", () => {
				StreamingClientSocket = null
			})
		}

		if (prefix == "$streamServer" && (StreamingServerSocket == null)) {
			print("> Got streaming server instance...")
			StreamingServerSocket = socket
			
			setupStreamEvents()

			StreamingServerSocket.on("disconnect", () => {
				StreamingServerSocket = null
			})
		}

		if (prefix == "$emit") {
			EventStore[eventName] = eventObj
			socket.to(eventName).emit(eventName, eventObj)
		}
	})

	socket.on("fetchTracks", async (input, callback) => {
		// print(input)
		var res = null;

		if (Array.isArray(input)) { // MULTI_LOAD
			print("- multi loadings...")
			try {
				res = await multi_load(input)
				print("+ respondings...")
			} catch(err) {
				print("- Nope", err)
				res = null
			}
		} else { // OMNI_PARSE
			try {
				res = await omni_parse(input)
			} catch (err) {
				res = null
			}
			// print(res)

			if (res != null) {
				if (!Array.isArray(res.tracks)) {
					res = [res]
				} else {
					res = res.tracks
				}
			}
		}

		callback(res)
	})
	socket.on("fetchIDs", async (inputs, callback) => {
		if (!Array.isArray(inputs)) { inputs = [inputs] }

		var res = []

		await inputs.awaitForEach(async (input) => {
			var this_res = await omni_parse(input)
			
			switch (this_res.type) {
				case 'list':
					res.push(input)
				break;
				case 'track':
					res.push(this_res.omni_id)
				break;
			}
		})

		callback(res)
	})

 	socket.on("tracks", async (callback) => {
		if (false) {
			// var playlist = await omni_parse("https://soundcloud.com/planet_bluto/sets/httpcore/s-tQoOe5dQTZd")
			// var playlist = await omni_parse("https://soundcloud.com/planet_bluto/sets/fufunk-jams")
			// var playlist = await omni_parse("https://streetofficial.bandcamp.com/album/ep-3")
			// var playlist = await omni_parse("https://zackerywilson.bandcamp.com/album/dsque")
			// var playlist = await omni_parse("https://music.youtube.com/playlist?list=PL61Jej2wKUEQW_X1aj2Xzfh2ytn8kAJvT")
			var playlist = await omni_parse("https://soundcloud.com/planet_bluto/sets/vgm-2")
			// callback(playlist.tracks)
			callback(playlist.tracks)
		} else {
			var test_tracks = await fsExtra.readJson("./soundcloud_likes.json")
			callback(test_tracks)
		}
	})

	socket.on("playlists", async (callback) => {
		var res = await fetch("https://api-v2.soundcloud.com/me/library/all?client_id=x7l8owbHedbxGjHtikmvfMh0xQmcNNId&limit=200&offset=0&linked_partitioning=1&app_version=1704904096&app_locale=en", {method: "GET", headers: {"Authorization": "OAuth 2-294467-200230716-gQBHfOKIZfqCX7"}})
		var data = await res.json()

		data.collection
	})

	socket.on("print", console.log)

	socket.on("$emit_nowplaying", ({track, timestamp}) => {
		currentPlayingTrack = track
		if (isLocal) {
			lastStart = timestamp
			updateObj["details"] = `${track.author.name} - ${track.title}`,
			updateObj["smallImageKey"] = track.service.code.toLowerCase()
			updateObj["smallImageText"] = `Current Track from ${track.service.name}!`
			lastDuration = null
			lastProgress = 0
			lilUpdate()

			if (isLocal) { client.updatePresence(updateObj) }
		  	// print(updateObj)
		}
	})

	function lilUpdate() {
		if (lastStatus == "PAUSE") {
			delete updateObj["startTimestamp"]
			delete updateObj["endTimestamp"]
			updateObj["state"] = "PAUSED"
		} else {
			delete updateObj["state"]
			if (lastDuration != null) {
				updateObj["startTimestamp"] = lastStart
				updateObj["endTimestamp"] = Math.round(lastStart + (lastDuration - (lastDuration * (lastProgress || 0))))
			} else {
				delete updateObj["startTimestamp"]
				delete updateObj["endTimestamp"]
				updateObj["state"] = "[⠀⏳⠀]"
			}
		}
	}

	socket.on("$emit_status", ({status, timestamp}) => {
		if (isLocal) {
			print(lastDuration)
			print(lastDuration * lastProgress)
			lastStatus = status
			if (status == "UNPAUSE") { lastStart = timestamp }
			lilUpdate()
			if (isLocal) { client.updatePresence(updateObj) }
		  	// print(updateObj)
		}
	})

	socket.on("$emit_progress", ({progress, timestamp}) => {
		lastProgress = progress
	}) 	

	socket.on("$emit_nowplaying_duration", ({duration, timestamp}) => {
		lastDuration = duration
		lilUpdate()
		if (isLocal) { client.updatePresence(updateObj) }
	})
}

var OmniCore = new OmniCoreClass()

module.exports = {OmniCore, fetchLibrary}