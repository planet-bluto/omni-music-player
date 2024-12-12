// var Omni = require("./omni_music.js")
// const likes = require("./soundcloud_likes.json")

// // const TEST_PLAYLIST = [
// // 	"https://soundcloud.com/qteku/bimo",
// // 	"https://soundcloud.com/qteku/rat-trap",
// // 	"https://soundcloud.com/yunibasaruwa/cant-tell",
// // 	"https://idogedochiptune.bandcamp.com/track/temporal-memories",
// // 	"https://idogedochiptune.bandcamp.com/track/apple-cinnamon-porridge",
// // 	"https://memodemo.bandcamp.com/track/its-like-that",
// // 	"https://youtu.be/Lhjh-rD8Bwc?list=PL61Jej2wKUEQiarJ1JWJ5Y1fYM3CEIUAs",
// // 	"https://www.youtube.com/watch?v=anw6cFmR9hM&list=PL61Jej2wKUEQiarJ1JWJ5Y1fYM3CEIUAs&index=5&pp=gAQBiAQB8AUB",
// // 	"https://www.youtube.com/watch?v=75kJb_aAvKY&list=PL61Jej2wKUEQiarJ1JWJ5Y1fYM3CEIUAs&index=8&pp=gAQBiAQB8AUB",
// // ]

// async function main() {
// 	var res = likes.slice(0, 100)

// 	print(res)
// }

// main()

const print = console.log

var ytdl = require("@distube/ytdl-core")
const youtubedl = require('youtube-dl-exec')
var fs = require('fs')
var path = require('path')
var {spawn} = require('node:child_process')

var {OmniParser, MultiLoader} = require('omni-parser')
var raw_omni_parse = OmniParser()

const LINK = "https://www.youtube.com/watch?v=-LwBbLa_Vhc"

async function main() {
  print(ytdl)
  let info = await ytdl.getInfo(LINK)
  print(info)
  // var sub = youtubedl.exec('https://www.youtube.com/watch?v=6xKWiCMKKJg', {
  //   o: "-",
  //   x: true,
  //   q: true,
  //   noWarnings: true,
  //   s: true,
  // })
}

main()
// var stream = ytdl("https://www.youtube.com/watch?v=vW9d8-8gm7o")
// stream.pipe(fs.createWriteStream('test.mp4'))