const express = require('express');
var ss = require('socket.io-stream');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 3000
const print = console.log
const SoundCloud = require("soundcloud-scraper")
const scdl = require('soundcloud-downloader').default
const SC_CLIENT_ID = "c7qRtooYX5D1QXCM7DmD1J4E7v5YcxpR"
const SC_client = new SoundCloud.Client(SC_CLIENT_ID)

class Song {
	constructor(title, author, author_url, thumbnail, url, plays, id, stream_url) {
		this.title = title
		this.author = author
		this.author_url = author_url
		this.thumbnail = thumbnail
		this.url = url
    this.plays = plays
    this.id = id
    this.stream_url = stream_url
	}
}


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/main.html');
});

io.on('connection', (socket) => {
  socket.on('search', (query) => {
    let songs = []
    let loadedCount = 0
  
    SC_client.search(query, "track")
    .then(async results => {
      songAmount = results.length
      for (i = 0; i < 20; i++) {
        curr_result = results[i]
        if (curr_result != null) {
          if (curr_result.type == "track") {
            SC_client.getSongInfo(curr_result.url)
            .then(async song => {
              SoundCloud.Util.fetchSongStreamURL(song.trackURL, "Gef7Kyef9qUHLjDFrmLfJTGqXRS9QT3l").then((stream_url) => {
                if (song.thumbnail == null) {
                  real_thumbnail = "https://i.imgur.com/1DR41RB.png"
                } else {
                  real_thumbnail = song.thumbnail
                }
                songs.push(new Song(song.title, song.author.name, song.author.url, real_thumbnail, song.url, song.playCount, song.id, stream_url))
                loadedCount += 1
                if ((loadedCount) == songAmount) {
                  songs.sort(function(a, b){return b.plays-a.plays})
                  socket.emit('results', {songs: songs, query: query})
                }
              })
            })
          }
        }
      }
    })
  })
})

server.listen(port, () => {
  print(`listening on port ${port}`);
});