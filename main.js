global.print = console.log

require('dotenv').config()
var OmniCore = require("./omni_core.js")
var { getStream } = OmniCore

const streamToBuffer = require('fast-stream-to-buffer')
var Readable = require('node:stream').Readable

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
OmniCore.start()