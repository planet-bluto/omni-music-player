var Omni = require("./omni_music.js")
const likes = require("./soundcloud_likes.json")

// const TEST_PLAYLIST = [
// 	"https://soundcloud.com/qteku/bimo",
// 	"https://soundcloud.com/qteku/rat-trap",
// 	"https://soundcloud.com/yunibasaruwa/cant-tell",
// 	"https://idogedochiptune.bandcamp.com/track/temporal-memories",
// 	"https://idogedochiptune.bandcamp.com/track/apple-cinnamon-porridge",
// 	"https://memodemo.bandcamp.com/track/its-like-that",
// 	"https://youtu.be/Lhjh-rD8Bwc?list=PL61Jej2wKUEQiarJ1JWJ5Y1fYM3CEIUAs",
// 	"https://www.youtube.com/watch?v=anw6cFmR9hM&list=PL61Jej2wKUEQiarJ1JWJ5Y1fYM3CEIUAs&index=5&pp=gAQBiAQB8AUB",
// 	"https://www.youtube.com/watch?v=75kJb_aAvKY&list=PL61Jej2wKUEQiarJ1JWJ5Y1fYM3CEIUAs&index=8&pp=gAQBiAQB8AUB",
// ]

async function main() {
	var res = likes.slice(0, 100)

	print(res)
}

main()