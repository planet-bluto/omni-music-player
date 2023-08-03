// const print = console.log
// var socket = io()
// var input = document.getElementById('song')
var playhead = document.getElementById('playhead')
var play_button = document.getElementById('play-button')
var playhead_down = false
var GLOBAL_VOLUME = 0.5
var TEMP_QUEUE = []

var PlayingSong = null
var cache = []

function canvasClear(url) {
	var id = encodeURIComponent(url)

	var canvas = document.getElementById("canvas-"+id);
	var ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, 500, 500)
}

function canvasSetup(url) {
	var id = encodeURIComponent(url)

	var context = new AudioContext()
	var analyser = context.createAnalyser()
	var src = context.createMediaElementSource(PlayingSong.streams["mid"])
	analyser.fftSize = 256
	src.connect(analyser)
	analyser.connect(context.destination)
	// mid_src.connect(mid_analyser)

	var canvas = document.getElementById("canvas-"+id)
	canvas.width = 500
	canvas.height = 500
	var ctx = canvas.getContext("2d")

	var bufferLength = analyser.frequencyBinCount
	var dataArray = new Uint8Array(bufferLength)

	var WIDTH = canvas.width
	var HEIGHT = canvas.height
	var barHeight
	var x = 0

	function renderFrame() {
	  requestAnimationFrame(renderFrame);

	  if (PlayingSong.currentStream.getAttribute("type") == "mid") {
	  	// print("FUUUUCK")
		x = 0

		analyser.getByteFrequencyData(dataArray)

		// ctx.fillStyle = "#000";
		ctx.clearRect(0, 0, WIDTH, HEIGHT)

		var barWidth = (WIDTH / bufferLength) * (2.56*5)

		for (var i = 0; i < bufferLength; i++) {
			// print(currents[1])
			barHeight = dataArray[i]

			ctx.fillStyle = document.styleSheets[0].cssRules[0].style.getPropertyValue("--theme-accent2-pos")
			ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight)

			x += barWidth + 1
		}
	  }
	}

	renderFrame()
}

function focusNowPlaying() {
	document.getElementById("main").scrollTo({left: PlayingSong.elem.offsetLeft-(window.innerWidth/2)+(PlayingSong.elem.clientWidth/2), behavior: "smooth"})
}

async function play(omni_track, elem = null) {
	var { url } = omni_track
	if (PlayingSong != null) {
		PlayingSong.currentStream.pause()
		clearInterval(PlayingSong.playhead_int)
		PlayingSong.elem.removeAttribute("current")
		PlayingSong.streams.start.remove()
		PlayingSong.streams.mid.remove()
		// canvasClear(PlayingSong.track.url)
	}

	var playhead_int = setInterval(() => {
		if (PlayingSong != null) {
			var new_val = (PlayingSong.currentStream.currentTime / PlayingSong.streams.mid.duration) * 100
			// print(new_val)
			if (!playhead_down) {
				playhead.value = new_val

				// print(new_val)
				if ((new_val > 99) || (new_val > 90 && PlayingSong.currentStream.readyState == 2)) {
					next()
				}
			}
		}
	}, 100)

	PlayingSong = {
		"track": omni_track,
		"streams": {
			"start": stream(url, true),
			"mid": stream(url, false)
		},
		"buffered": false,
		"playhead_int": playhead_int,
		"paused": false,
		"elem": elem
	}
	PlayingSong.streams.start.volume = GLOBAL_VOLUME
	PlayingSong.streams.mid.volume = GLOBAL_VOLUME

	Object.defineProperty(PlayingSong, "currentStream", {
		get() {
			return PlayingSong.streams[(PlayingSong.buffered ? "mid" : "start")]
		},
	})

	// PlayingSong.streams.start.addEventListener("progress", e => {
	// 	var this_stream = PlayingSong.streams.start
	// 	if (!PlayingSong.buffered) {
	// 		playhead.value = (this_stream.currentTime / PlayingSong.streams.mid.duration)*100
	// 	}
	// })

	// PlayingSong.streams.mid.addEventListener("progress", e => {
	// 	var this_stream = PlayingSong.streams.mid
	// 	if (PlayingSong.buffered) {
	// 		print(`current: ${this_stream.currentTime} | total: ${PlayingSong.streams.mid.duration}`)
	// 		playhead.value = (this_stream.currentTime / PlayingSong.streams.mid.duration)*100
	// 	}
	// })
	function final_bit(this_track) {
		if (PlayingSong.track == this_track) {
			PlayingSong.streams.start.volume = GLOBAL_VOLUME
			PlayingSong.streams.mid.volume = GLOBAL_VOLUME
			play_button.innerHTML = `<span class="material-icons">pause</span>`
			document.title = `${omni_track.author} - ${omni_track.title} | Omni by Planet Bluto :)`

			document.getElementById('play-bar-author').textContent = omni_track.author
			document.getElementById('play-bar-title').textContent = omni_track.title

			elem.setAttribute("current", "")
			focusNowPlaying()
			socket.emit("nowplaying", this_track, {
				queueIndex: getIndexFromURL(this_track.url)+1,
				queueSize: TEMP_QUEUE.length,
				start: Date.now()
			})
		}
	}

	PlayingSong.streams.mid.addEventListener("loadeddata", async (e) => {
		print(`Loaded! < ${url} >`)
		PlayingSong.buffered = true
		final_bit(omni_track)
		await PlayingSong.streams.mid.play()
		PlayingSong.streams.start.pause()
		PlayingSong.streams.mid.currentTime = PlayingSong.streams.start.currentTime
	})

	PlayingSong.streams.start.play().then(() => { final_bit(omni_track) })

	if ("mediaSession" in navigator) {
		navigator.mediaSession.metadata = new MediaMetadata({
			title: omni_track.title,
			artist: omni_track.author,
			album: "Soundcloud",
			artwork: [
				{
					src: omni_track.thumbnail,
					sizes: "500x500",
					type: "image/jpeg",
				}
			],
		});

		navigator.mediaSession.setActionHandler("play", () => {
			unpause()
		});
		navigator.mediaSession.setActionHandler("pause", () => {
			pause()
		});
		navigator.mediaSession.setActionHandler("stop", () => {
			pause()
		});
		navigator.mediaSession.setActionHandler("seekbackward", () => {
			/* Code excerpted. */
		});
		navigator.mediaSession.setActionHandler("seekforward", () => {
			/* Code excerpted. */
		});
		navigator.mediaSession.setActionHandler("seekto", () => {
			/* Code excerpted. */
		});
		navigator.mediaSession.setActionHandler("previoustrack", () => {
			/* Code excerpted. */
		});
		navigator.mediaSession.setActionHandler("nexttrack", () => {
			next()
		});
	}

	canvasSetup(omni_track.url)
}

function updateTime() {
	print(playhead.value)
	if (PlayingSong != null) {
		print((playhead.value / 100) * PlayingSong.streams.mid.duration)
		PlayingSong.currentStream.currentTime = ((playhead.value / 100) * PlayingSong.streams.mid.duration)
		// PlayingSong.currentStream.fastSeek((playhead.value/100)*PlayingSong.streams.mid.duration)
	}
}

playhead.addEventListener("input", e => { updateTime() })
playhead.addEventListener("change", e => { updateTime() })

playhead.addEventListener("mousedown", e => { playhead_down = true })
playhead.addEventListener("mouseup", e => { playhead_down = false })

async function toggle_pause() {
	if (PlayingSong.paused) {
		await unpause()
		await tween_volume(0, GLOBAL_VOLUME, 10, 0.01)
	} else {
		var saved_vol = GLOBAL_VOLUME
		await tween_volume(GLOBAL_VOLUME, 0, 10, 0.01)
		pause()
		GLOBAL_VOLUME = saved_vol
	}
}

function pause() {
	if (!PlayingSong.paused) {
		PlayingSong.paused = true
		PlayingSong.currentStream.pause()
		play_button.innerHTML = `<span class="material-icons">play_arrow</span>`
	}
}

async function unpause() {
	if (PlayingSong.paused) {
		PlayingSong.paused = false
		// print("Ok??")
		await PlayingSong.currentStream.play()
		// print("Thas what I thought")
		play_button.innerHTML = `<span class="material-icons">pause</span>`
	}
}

function getIndexFromURL(url) {
	var ind = null
	TEMP_QUEUE.forEach((queue_obj, this_ind) => {
		var {track} = queue_obj
		if (track.url == url) {
			ind = this_ind
		}
	})

	return ind
}

function next() {
	var queue_obj = TEMP_QUEUE[randi(TEMP_QUEUE.length)]
	play(queue_obj.track, queue_obj.elem)
}

play_button.onclick = (async e => {
	toggle_pause()
})

function stream(url, start = false) {
	if (start) {
		var elem = new Audio(`/mediastart?url=${encodeURIComponent(url)}`)
		elem.setAttribute("type", "start")
		return elem
	} else {
		var elem = new Audio(`/media?url=${encodeURIComponent(url)}`)
		elem.setAttribute("type", "mid")
		return elem
	}
}
