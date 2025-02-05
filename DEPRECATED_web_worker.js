// We need to find a way to manipulate streams betterrr
var client
var isLocal = (process.env["LOCAL"] != null && process.env["LOCAL"] == "true")
if (isLocal) {
  client = require('discord-rich-presence')('1136427488495550494')
}

const io = new Server(httpserver, {
  maxHttpBufferSize: 100e6
});

app.use('/', express.static(path.join(__dirname, 'website')))

async function getStream( thisURL, req_range ) {
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

  var song_length = 1000
  var mode = null
  if (SOUNDCLOUD_HOSTNAMES.includes(thisURLClass.hostname)) { mode = "SC"; stream = await SoundCloud.download(thisURL, {highWaterMark: 1 << 25}) }
  if (YOUTUBE_HOSTNAMES.includes(thisURLClass.hostname)) {
    mode = "YT"
    stream = ytdl(thisURL, { filter: "audioonly", range: {start: start, end: end}})
  }
  if (thisURLClass.hostname.endsWith("bandcamp.com")) {
    mode = "BC"
    var track = await new Promise((res, rej) => {
      bcscrape.getTrackInfo(thisURL, (err, track) => {
        res(track)
      })
    })
    var response = await fetch(track.raw.trackinfo[0].file["mp3-128"], {method: "GET"})
    stream = response.body
    // stream = track.streamUrl
  }

  return {stream: stream, mode: mode, start: start, end: end}
}

app.get("/mediastart", async (req, res) => {
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

app.get("/media", async (req, res) => {
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

app.get("/", (req, res) => {
  res.sendFile('/index.html', {root: path.resolve(__dirname, "website")})
})

io.on("connection", async socket => {
	socket.on("tracks", async () => {
    var tracks = []
    var amount = 10
    var client_id = `TtbhBUaHqao06g1mUwVTxbjj8TSUkiCl`
    var user_id = "200230716"

    print(`Returning ${amount} tracks...`)

    var res = await fetch(`https://api-v2.soundcloud.com/users/${user_id}/track_likes?limit=${amount}&client_id=${client_id}`)
    var data = await res.json()
    
    data.collection.forEach(obj => {
      var track = obj.track
      tracks.push({
          type: "SOUNDCLOUD",
          title: track.title,
          author: track.user.username,
          thumbnail: (track.artwork_url || track.user.avatar_url).replace("-large.jpg", "-t500x500.jpg"),
          url: track.permalink_url,
          streams: {
              start: `/mediastart?url=${encodeURIComponent(track.permalink_url)}`,
              mid: `/media?url=${encodeURIComponent(track.permalink_url)}`
          },
          tags: []
      })
    })
		socket.emit("tracks", tracks)
	})

  socket.on("nowplaying", (track, stateInfo) => {
    print(track, stateInfo)
    if (isLocal) {
      const mmhmm = {
        YOUTUBE: "Youtube",
        SOUNDCLOUD: "Soundcloud",
        BANDCAMP: "Bandcamp",
      }
      client.updatePresence({
        details: `∞ ${track.author} - ${track.title}`,
        state: `Playing Songs in Queue`,
        partySize: stateInfo.queueIndex,
        partyMax: stateInfo.queueSize,
        startTimestamp: stateInfo.start,
        largeImageKey: "omniiconlarge",
        largeImageText: "Omni Music Player",
        smallImageKey: track.type.toLowerCase(),
        smallImageText: `Current Track from ${mmhmm[track.type]}!`,
        instance: true,
      })
    }
  })
})

httpserver.listen((process.env["PORT"] || 8080), "0.0.0.0", (e) => {
	print("Server Listening!")
})