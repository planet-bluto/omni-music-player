function omni_track(title = "fucking", author = "idiot", thumbnail = "forgot", duration = "the", url = "arguments") {
	return {
		title: title,
		author: author,
		thumbnail: thumbnail,
		url: url,
		streams: {
			start: `/mediastart?url=${encodeURIComponent(url)}`,
			mid: `/media?url=${encodeURIComponent(url)}`
		},
		tags: []
	}
}

const SOUNDCLOUD_HOSTNAMES = ["soundcloud.com"]
async function soundcloud(url) {
	const track = await SoundCloud.tracks.getTrack(url)
	return omni_track(
		track.title,
		track.user.username,
		track.artwork_url,
		track.duration,
		url
	)
}

const YOUTUBE_HOSTNAMES = ["www.youtube.com", "youtu.be", "youtube.com"]
async function youtube(url) {
	var track = await ytdl.getInfo(url)
	return omni_track(
		track.videoDetails.title,
		track.videoDetails.author.name,
		track.videoDetails.thumbnails.pop().url,
		track.videoDetails.lengthSeconds,
		track.videoDetails.video_url
	)
}

async function bandcamp(url) {
	var track = await await bcfetch.getTrackInfo(url)
	return omni_track(
		track.name,
		track.artist.name,
		track.imageUrl,
		null,
		track.url
	)
}

async function main(url) {
	var thisURLClass = new URL(url)
	var to_return = null

	if (SOUNDCLOUD_HOSTNAMES.includes(thisURLClass.hostname)) { to_return = await soundcloud(url) }
	if (YOUTUBE_HOSTNAMES.includes(thisURLClass.hostname)) { to_return = await youtube(url) }
	if (thisURLClass.hostname.endsWith("bandcamp.com")) { to_return = await bandcamp(url) }

	return to_return
}

module.exports = main