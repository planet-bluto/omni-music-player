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

var OUTPUT_ID = (localStorage.getItem("OUTPUT_ID") || null)

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
var played = []

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
	var src = context.createMediaElementSource(PlayingSong.currentStream)
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

	  	// print("FUUUUCK")
		x = 0

		analyser.getByteFrequencyData(dataArray)

		// ctx.fillStyle = "#000";
		ctx.clearRect(0, 0, WIDTH, HEIGHT)

		var barWidth = (WIDTH / bufferLength) * (2.56*5)

		for (var i = 0; i < bufferLength; i++) {
			// print(currents[1])
			barHeight = dataArray[i]

			ctx.fillStyle = document.styleSheets[0].cssRules[0].style.getPropertyValue("#0000007c")
			ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight)

			x += barWidth + 1
		}
	}

	if (!query_params.includes("mobile") && !query_params.includes("streaming")) { renderFrame() }
}

var last_emit_progress = null
async function playheadRender(e = null) {
	if (PlayingSong != null) {
		var new_val = (PlayingSong.currentStream.currentTime / PlayingSong.currentStream.duration) * 100
		if ((new_val > 99.8) || (PlayingSong.currentStream.readyState == 2)) {
			await wait(800)
			endCheck()
		}
		// print(new_val)
		if (!playhead_down) {
			playhead.value = new_val
			var prog_to_emit = (new_val/100)
			if (query_params.includes("nowplaying")) {
				if (prog_to_emit != last_emit_progress) {
					last_emit_progress = prog_to_emit
					SocketEventEmitter("progress", {progress: prog_to_emit})
				}
			}
		}
	}
}

function endCheck() {
	print("checkings")
	if (!endBuffering) {
		print("1")
		endBuffering = true
		next()
	}
}

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
	// print(track)
	var queue_item_elem = document.createElement("div")
	var p_ness = document.createElement("p")

	var title_elem = document.createElement("span")
	var author_elem = document.createElement("span")

	title_elem.textContent = track.title
	author_elem.textContent = track.author.name

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

		var obj = trackPopups(track)
		delete obj["Add To Queue"]

		obj["Play"] = (() => {
			var fut_ind = ind
			// insertTrackToQueue(track, fut_ind)
			play(track, ind)
			closePopup()
		})

		if (ind != QueueIndex) {
			obj["Play Next"] = (() => {
				showToast("Playing next...", {image: track.image})
				moveQueueItem(ind, QueueIndex+1, true)
				closePopup()
			})

			obj["Remove From Queue"] = (() => {
				showToast("Removed from queue...", {image: track.image})
				removeQueueItem(ind)
				closePopup()
			})

			obj["Move Playing Song Above"] = () => {
				showToast("Moved playing song above a track...", {image: PlayingSong.track.image})
				moveQueueItem(QueueIndex, (ind > QueueIndex ? ind-1 : ind), true)
				closePopup()
			}

			obj["Move Playing Song Below"] = () => {
				showToast("Moved playing song below a track...", {image: PlayingSong.track.image})
				moveQueueItem(QueueIndex, (ind < QueueIndex ? ind+1 : ind), true)
				closePopup()
			}
		} else {
			delete obj["Play Next"]
		}

		showPopup(obj)
	}

	return queue_item_elem
}

function insertTracksToQueue(tracks, ind, playing = (Queue.length == 0)) {
	// print(tracks, ind, playing)
	// ind += 1 // <- Why do this ??

	var queue_cont = document.getElementById("queue")
	var main_elem

	Queue.insertArr(ind, tracks)

	var da_length = Array.from(queue_cont.children).length-1
	var append_mode = ind > da_length
	if (!append_mode) { tracks = tracks.reverse() }

	tracks.forEach((track, this_ind) => {
		var queue_item = buildQueueItem(track)

		da_length = Array.from(queue_cont.children).length-1
		if (!append_mode) {
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

function moveQueueItem(ind1, ind2, naah = false) {
	// print(ind1, ind2)
	ind2 = Math.min(ind2, Queue.length-1)

	Queue.move(ind1, ind2)
	new Elem("queue").moveChild(ind1, ind2)
	// ind2 -= (ind1 < ind2 ? 1 : 0)

	if (ind1 == QueueIndex && naah) {
		setQueueIndex(ind2)
	}
}

function removeQueueItem(ind) {
	var track = Queue.remove(ind)
	new Elem("queue").children[ind].delete()

	if (ind < QueueIndex) {
		QueueIndex -= 1
	}

	return track
}

function shuffleQueue() {
	var curr_song = removeQueueItem(QueueIndex)
	// print(curr_song)
	// Queue.shuffle()
	let currentIndex = (Queue.length-1),  randomIndex;

	while (currentIndex != 0) {

		randomIndex = randiRange(0, currentIndex);
		moveQueueItem(currentIndex, randomIndex)
		currentIndex--;

		// [Queue[currentIndex], Queue[randomIndex]] = [
		//   Queue[randomIndex], Queue[currentIndex]]
	}

	pushTrackToQueue(curr_song)
	moveQueueItem((Queue.length-1), 0)
	setQueueIndex(0)
}

async function play(omni_track, q_ind = -1, focus = false) {
	if (QueueIndex == -1) {
		setQueueIndex(0)
	} else if (q_ind != -1) {
		setQueueIndex(q_ind)
	}
	var { url, streams } = omni_track
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

	var playhead_int = 0

	PlayingSong = {
		"track": omni_track,
		"streams": {
			"start": stream(omni_track, true),
			"mid": stream(omni_track, false)
		},
		"buffered": false,
		"playhead_int": playhead_int,
		"paused": false
	}

	PlayingSong.streams.start.addEventListener("timeupdate", playheadRender)
	PlayingSong.streams.mid.addEventListener("timeupdate", playheadRender)
	// PlayingSong.streams.start.addEventListener("ended", endCheck)
	PlayingSong.streams.mid.addEventListener("ended", endCheck)

	PlayingSong.streams.start.volume = GLOBAL_VOLUME
	PlayingSong.streams.mid.volume = GLOBAL_VOLUME

	Object.defineProperty(PlayingSong, "currentStream", {
		get() {
			// return PlayingSong.streams[(PlayingSong.buffered ? "mid" : "start")]
			return PlayingSong.streams["start"]
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
			document.title = `${omni_track.author.name} - ${omni_track.title} | Omni by Planet Bluto :)`

			document.getElementById('play-bar-author').textContent = omni_track.author.name
			document.getElementById('play-bar-title').textContent = omni_track.title

			var elems = Array.from(document.getElementsByClassName(`track-${encodeURIComponent(omni_track.url)}`))
			elems.forEach(elem => {
				elem.setAttribute("current", "")
			})
			if (focus) { focusNowPlaying() }

			if ("mediaSession" in navigator && !PlayingSong.buffered) {
				print("setting media session")
				navigator.mediaSession.metadata = new MediaMetadata({
					title: omni_track.title,
					artist: omni_track.author.name,
					artwork: [
						{
							src: omni_track.image,
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
				navigator.mediaSession.setActionHandler("seekbackward", (res) => {
					var value = PlayingSong.currentStream.currentTime = Math.max(PlayingSong.currentStream.currentTime - (res.seekOffset || 5), 0)
					print("seekbackward: ", value)
					PlayingSong.currentStream.currentTime = value
				});
				navigator.mediaSession.setActionHandler("seekforward", (res) => {
					var value = Math.max(PlayingSong.currentStream.currentTime + (res.seekOffset || 5), PlayingSong.currentStream.currentTime)
					print("seekforward: ", value)
					PlayingSong.currentStream.currentTime = value
				});
				navigator.mediaSession.setActionHandler("seekto", (res) => {
					print("seekto")
					PlayingSong.currentStream.currentTime = res.seekTo
				});
				navigator.mediaSession.setActionHandler("previoustrack", () => {
					prev()
				});
				navigator.mediaSession.setActionHandler("nexttrack", () => {
					next()
				});
			}
		}
	}

	PlayingSong.streams.mid.addEventListener("loadeddata", async (e) => {
		print(`Loaded! < ${url} >`)
		print("DURATION: ", PlayingSong.currentStream.duration)
		var currentTime = PlayingSong.streams.start.currentTime
		PlayingSong.buffered = true
		final_bit(omni_track)

		var you_good = (!PlayingSong.streams.start.paused)
		PlayingSong.streams.start.src = PlayingSong.streams.mid.src
		var playing_asf = false
		var timeSince = Date.now()
		PlayingSong.streams.start.addEventListener("loadeddata", async (e) => {
			if (you_good && !playing_asf) {
				print("You gooood")
				var timeElapse = (Date.now() - timeSince) / 1000
				PlayingSong.streams.start.currentTime = (currentTime + timeElapse)
				PlayingSong.streams.start.play()
			}
		})

		// if (!PlayingSong.streams.start.paused) {
		// 	await PlayingSong.streams.mid.play()
		// 	PlayingSong.streams.start.pause()
		// }
		// PlayingSong.streams.mid.currentTime = PlayingSong.streams.start.currentTime
		SocketEventEmitter("nowplaying_duration", {duration: PlayingSong.streams.mid.duration})
	})

	PlayingSong.streams.start.play().then(() => { final_bit(omni_track) })
	SocketEventEmitter("status", {status: "UNPAUSE"})

	played.push(omni_track.omni_track)

	// canvasSetup(omni_track.url)
	OmniEvents._fire("nowplaying", omni_track)
}

function updateTime(new_value = ((playhead.value / 100) * PlayingSong.currentStream.duration)) {
	if (PlayingSong != null) {
		PlayingSong.currentStream.currentTime = new_value
	}
}

playhead.addEventListener("input", e => { updateTime() })
playhead.addEventListener("change", e => { updateTime() })

playhead.addEventListener("mousedown", e => { playhead_down = true })
playhead.addEventListener("mouseup", e => { playhead_down = false })

var paused_saved_value = GLOBAL_VOLUME
async function toggle_pause() {
	if (PlayingSong.paused) {
		await unpause()
	} else {
		await pause()
	}
}

async function pause() {
	SocketEventEmitter("status", {status: "PAUSE"})
	paused_saved_value = GLOBAL_VOLUME
	await tween_volume(GLOBAL_VOLUME, 0, 200)
	if (!PlayingSong.paused) {
		PlayingSong.paused = true
		PlayingSong.currentStream.pause()
		play_button.innerHTML = `<span class="material-icons">play_arrow</span>`
	}
	GLOBAL_VOLUME = paused_saved_value
}

async function unpause() {
	SocketEventEmitter("status", {status: "UNPAUSE"})
	if (PlayingSong.paused) {
		PlayingSong.paused = false
		// print("Ok??")
		await PlayingSong.currentStream.play()
		// print("Thas what I thought")
		play_button.innerHTML = `<span class="material-icons">pause</span>`
	}
	tween_volume(0, paused_saved_value, 200)
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

function play_immediately(track) {
	var fut_ind = QueueIndex+1
	insertTrackToQueue(track, fut_ind)
	play(track, fut_ind)
}

async function next() {
	// print("Would skip...")
	if (play_next_queue.length > 0) {
		var track = play_next_queue.shift()
		play_immediately(track)
	} else if (QueueIndex+1 < Queue.length) {
		play(Queue[QueueIndex+1], QueueIndex+1)
	} else {
		print("hai 1")
		if (omni_play_queue.length > 0) {
			print("hai A1")
			var trackID = omni_play_queue.shift()
			var tracks = await fetchTracks(trackID)
			var track = tracks[0]

			var fut_ind = QueueIndex+1
			insertTrackToQueue(track, fut_ind)
			play(track, fut_ind)

			var omniPlayEntry = omni_play_cache.find(trackEntry => trackEntry.id == track.omni_id)
			print("Related: ", omniPlayEntry)
		} else if ((await omni_play()) == false) {
			random_song()
		}
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

// why please

var omni_play_queue = []
var omni_play_cache = []



async function omni_play() {
	print("hai B1")
	let possible_tracks;
	try {
		possible_tracks = await OmniAPI.GET(`/related/${PlayingSong.track.omni_id}`)
	} catch(err) {
		possible_tracks = []
	}
	omni_play_cache = possible_tracks
	if (possible_tracks.length == 0) { return false }
	print("hai B2", possible_tracks)

	var related_regions = {}

	possible_tracks.forEach(trackEntry => {
		var region = String(trackEntry.relatedness)
		if (!Array.isArray(related_regions[region])) { related_regions[region] = [] }
		related_regions[region].push(trackEntry.id)
	})

	var entire_queue = []
	Object.keys(related_regions).toSorted((a,b) => {return (Number(b) - Number(a))}).forEach(region => {
		var tracks = related_regions[region]
		tracks.shuffle()
		entire_queue = entire_queue.concat(tracks)
	})

	entire_queue = entire_queue.filter(bitch => bitch != null)

	if (entire_queue.length > 0) {
		omni_play_queue = entire_queue
		next()
		return true
	} else {
		return false
	}
}

var play_next_queue = []
function add_to_play_next_queue(track) {
	play_next_queue.push(track) // I swear there would be more
}

async function random_song() {
	print("hai C1")
	// hey temp queue is dying.
	//// cache all the IDs of songs in the library
	//// store all the played songs in the 'played' array (renamed to 'cache' because 'played' is the IDs you fucking idiot)
	//// fetch the song obj from the ID with... api?? (you was supposed to move these sockets to http requests)
	//// everything else is the same from there
	var playable = cache.filter(id => (!played.includes(id)))

	var track;
	var fut_ind;
	var id;
	if (playable.length > 0) {
		id = playable[randi(playable.length)]
		fut_ind = Queue.length
	} else {
		id = played[0]
		fut_ind = 0
	}

	var tracks = await socket.emitWithAck("fetchTracks", id)
	if (tracks != null) {
		track = tracks[0]
	}

	print("Random: ", track)

	if (track != null) { // hold diss
		var fut_ind = QueueIndex+1
		insertTrackToQueue(track, fut_ind)
		play(track, fut_ind)
		// pushTrackToQueue(track, true)
		// play(tracks[0], fut_ind, true)
		return track
	}
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

shuffle_button.onclick = (async e => {
	shuffleQueue()
})

function stream(track, start = false) {
	var {url} = track
	var elem;

	if (start) {
		elem = new Audio(`/mediastart?url=${encodeURIComponent(url)}`)
		// elem = new Audio(url)
		elem.setAttribute("type", "start")
	} else {
		elem = new Audio(`/media?url=${encodeURIComponent(url)}`)
		// elem = new Audio(url)
		elem.setAttribute("type", "mid")
	}

	if (OUTPUT_ID) {
		elem.setSinkId(OUTPUT_ID)
	}
	return elem
}
