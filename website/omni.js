var OmniEvents = {
	_telementry: false,
	_events: {},
	_fire: ((event, ...args) => {
		if (OmniEvents._telementry) { print("Attempting to fire event: ", event) }
		if (Object.keys(OmniEvents._events).includes(event)) {
			if (OmniEvents._telementry) { print("Event valid!") }
			OmniEvents._events[event].forEach(func => {
				if (OmniEvents._telementry) { print("Firing function: ", func) }
				func(...args)
			})
		}
	}),
	on: ((event, func) => {
		if (OmniEvents._telementry) { print(Object.keys(OmniEvents._events)) }
		if (!Object.keys(OmniEvents._events).includes(event)) {
			if (OmniEvents._telementry) { print("Made new event array: ", event) }
			OmniEvents._events[event] = []
		}
		if (OmniEvents._telementry) { print("Pushed function to event store: ", func) }
		OmniEvents._events[event].push(func)
	})
}

var playhead = document.getElementById('playhead')
var playhead_down = false
var endBuffering = false
var GLOBAL_VOLUME = 0.5
var QueueIndex = -1
var Queue = []

var query_params = Array.from(new URLSearchParams(window.location.search).keys())
if (query_params.includes("mobile")) {
	GLOBAL_VOLUME = 1
}

//// Controls ////
var play_button = document.getElementById('play-button')
var prev_button = document.getElementById('prev-button')
var next_button = document.getElementById('next-button')
var loop_button = document.getElementById('loop-button')
var shuffle_button = document.getElementById('shuffle-button')

var TEMP_QUEUE = []

var PlayingSong = null
var cache = []

function canvasClear(url) {
	var id = encodeURIComponent(url)

	var canvas = document.getElementById("canvas-"+id)
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

	if (!query_params.includes("mobile")) { renderFrame() }
}

function playheadRender() {
	requestAnimationFrame(playheadRender)

	if (PlayingSong != null) {
		var new_val = (PlayingSong.currentStream.currentTime / PlayingSong.streams.mid.duration) * 100
		// print(new_val)
		if (!playhead_down) {
			playhead.value = new_val
	
			// print(new_val)
			if (!endBuffering) {
				if (PlayingSong.currentStream.ended || (new_val > 99.8) || (PlayingSong.currentStream.readyState == 2)) {
					endBuffering = true
					wait(2000).then(next)
					// random_song()
				}
			}
		}
	}
}
playheadRender()

function focusNowPlaying() {
	var id = encodeURIComponent(PlayingSong.track.url)
	var this_track = document.getElementsByClassName(`track-${id}`)[0]
	// print("EXPLOSION (DIE EXPLODE AHAHAHAHAHA")
	document.getElementById("main").scrollTo({left: this_track.offsetLeft-(window.innerWidth/2)+(this_track.clientWidth/2), behavior: "smooth"})
}

function setQueueIndex(ind) {
	var queue_cont = document.getElementById("queue")
	QueueIndex = ind

	Array.from(queue_cont.children).forEach((item, this_ind) => {
		if (this_ind != ind) {
			item.removeAttribute("current")
		} else {
			item.setAttribute("current", "")
		}
	})
}

function buildQueueItem(track) {
	var queue_item_elem = document.createElement("div")
	var p_ness = document.createElement("p")

	var title_elem = document.createElement("span")
	var author_elem = document.createElement("span")

	title_elem.textContent = track.title
	author_elem.textContent = track.author

	p_ness.appendChild(title_elem)
	p_ness.appendChild(document.createElement("br"))
	p_ness.appendChild(author_elem)
	queue_item_elem.appendChild(p_ness)

	queue_item_elem.classList.add("queue-item")
	title_elem.classList.add("queue-item-title")
	author_elem.classList.add("queue-item-author")

	var queue_cont = document.getElementById("queue")
	queue_item_elem.onclick = e => {
		e.preventDefault()

		var ind = Array.from(queue_cont.children).findIndex(elem => elem == queue_item_elem)
		play(track, ind)
	}

	return queue_item_elem
}

function insertTracksToQueue(tracks, ind, playing = (Queue.length == 0)) {
	print(tracks, ind, playing)
	// ind += 1 // <- Why do this ??

	var queue_cont = document.getElementById("queue")
	var main_elem

	var mmhmm = tracks.reverse()
	mmhmm.forEach((track, this_ind) => {
		Queue.insert(ind, track)

		var queue_item = buildQueueItem(track)
		if (ind < (Array.from(queue_cont.children).length) ) {
			var _before = queue_cont.children[ind]
			queue_cont.insertBefore(queue_item, _before) 
		} else {
			queue_cont.appendChild(queue_item)
		}

		if (this_ind == 0) {
			main_elem = queue_item
		}
	})

	if (playing) {
		setQueueIndex(ind)

		var trackPos = main_elem.offsetTop-(queue_cont.clientHeight/2)+(main_elem.clientHeight/2)

		if (bottom_area_opened) {
			queue_cont.scrollTo({top: trackPos, behavior: "smooth"})
		} else {
			pendingQueueScroll = main_elem
		}
	}
}

function insertTrackToQueue(track, ind, playing = (Queue.length == 0)) {
	insertTracksToQueue([track], ind, playing)
}

function pushTrackToQueue(track, playing = (Queue.length == 0)) {
	insertTrackToQueue(track, Queue.length, playing)
}

function swapQueueItems(ind1, ind2) {
	//...
}

async function play(omni_track, q_ind = -1, focus = false) {
	if (QueueIndex == -1) {
		setQueueIndex(0)
	} else if (q_ind != -1) {
		setQueueIndex(q_ind)
	}
	var { url } = omni_track
	if (PlayingSong != null) {
		["start", "mid"].forEach(soos => {
			PlayingSong.streams[soos].pause()
			PlayingSong.streams[soos].src = ""
			PlayingSong.streams[soos].remove()
		})
		clearInterval(PlayingSong.playhead_int)

		var elems = Array.from(document.getElementsByClassName(`track-${encodeURIComponent(PlayingSong.track.url)}`))
		elems.forEach(elem => {
			elem.removeAttribute("current")
		})
		// canvasClear(PlayingSong.track.url)
	}

	var playhead_int = setInterval(() => {

	}, 100)

	PlayingSong = {
		"track": omni_track,
		"streams": {
			"start": stream(url, true),
			"mid": stream(url, false)
		},
		"buffered": false,
		"playhead_int": playhead_int,
		"paused": false
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
			endBuffering = false
			PlayingSong.streams.start.volume = GLOBAL_VOLUME
			PlayingSong.streams.mid.volume = GLOBAL_VOLUME
			play_button.innerHTML = `<span class="material-icons">pause</span>`
			document.title = `${omni_track.author} - ${omni_track.title} | Omni by Planet Bluto :)`

			document.getElementById('play-bar-author').textContent = omni_track.author
			document.getElementById('play-bar-title').textContent = omni_track.title

			var elems = Array.from(document.getElementsByClassName(`track-${encodeURIComponent(omni_track.url)}`))
			elems.forEach(elem => {
				elem.setAttribute("current", "")
			})
			if (focus) { focusNowPlaying() }
			if (query_params.includes("nowplaying")) {
				socket.emit("nowplaying", this_track, {
					queueIndex: getIndexFromURL(this_track.url)+1,
					queueSize: TEMP_QUEUE.length,
					start: Date.now()
				})
			}
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

	// canvasSetup(omni_track.url)
	OmniEvents._fire("nowplaying", omni_track)
}

function updateTime(new_value = ((playhead.value / 100) * PlayingSong.streams.mid.duration)) {
	if (PlayingSong != null) {
		PlayingSong.currentStream.currentTime = new_value
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
	// print("Would skip...")
	if (QueueIndex+1 < Queue.length) {
		play(Queue[QueueIndex+1], QueueIndex+1)
	} else {
		random_song()
	}
}

var prev_cooldown = false
function prev() {
	if (!prev_cooldown) {
		updateTime(0)

		prev_cooldown = true
		setTimeout(() => { prev_cooldown = false }, 400)
	} else if (QueueIndex > 0) {
		play(Queue[QueueIndex-1], QueueIndex-1)
	}
}

function random_song() {
	var queue_obj = TEMP_QUEUE[randi(TEMP_QUEUE.length)]
	var fut_ind = Queue.length
	pushTrackToQueue(queue_obj.track, true)
	play(queue_obj.track, fut_ind, true)
}

play_button.onclick = (async e => {
	e.preventDefault()
	toggle_pause()
})

next_button.onclick = (async e => {
	next()
})

prev_button.onclick = (async e => {
	prev()
})

function stream(url, start = false) {
	var elem;
	if (start) {
		elem = new Audio(`/mediastart?url=${encodeURIComponent(url)}`)
		elem.setAttribute("type", "start")
	} else {
		elem = new Audio(`/media?url=${encodeURIComponent(url)}`)
		elem.setAttribute("type", "mid")
	}
	// elem.crossOrigin = "anonymous"
	return elem
}
