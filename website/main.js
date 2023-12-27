function trackElem(track, bottom = false) {
	var track_elem = document.createElement("div")
	track_elem.src = track.thumbnail
	track_elem.classList.add("track-elem")
	track_elem.classList.add(`track-${encodeURIComponent(track.url)}`)
	if (bottom) { track_elem.setAttribute("bottom", "") }
	if (!bottom) {
		if (!query_params.includes("mobile")) {
			track_elem.style = `background-image: linear-gradient(to top, color-mix(in srgb, var(--fade-color) 0%, #00000000), color-mix(in srgb, var(--fade-color) 100%, #00000000)), url(${track.thumbnail});`
		}
	} else {
		track_elem.style = `background-image: url("${track.thumbnail}");`
	}
		
	var title_elem = document.createElement("p")
	title_elem.classList.add("track-title")
	title_elem.classList.add("track-text")
	title_elem.textContent = track.title

	var track_visualizer = document.createElement("canvas")
	track_visualizer.id = `canvas-${encodeURIComponent(track.url)}`
	track_visualizer.classList.add("visualizer")
	track_visualizer.width = 500
	track_visualizer.height = 500
	
	var author_elem = document.createElement("p")
	author_elem.classList.add("track-author")
	author_elem.classList.add("track-text")
	author_elem.textContent = track.author
	
	if (!bottom) {
		track_elem.onclick = e => {
			// insertTrackToQueue(track, QueueIndex, true)
			showTrackPopup(track)
		}
	}

	if (bottom) { track_elem.appendChild(track_visualizer) }
	if (!bottom) { track_elem.appendChild(title_elem) }
	if (!bottom) { track_elem.appendChild(author_elem) }

	return track_elem
}

OmniEvents.on("nowplaying", track => {
	// print("Got it!", track, )
	var current_track_cont = document.getElementById("playing-track-cont")
	current_track_cont.innerHTML = trackElem(track, true).outerHTML
	resizePlayingTrackCont()
	canvasSetup(track.url)
})

// socket.emit("tracks")
socket.on("tracks", (tracks) => {
	var main_elem = document.getElementById("main")
	tracks.forEach(track => {
		var track_elem = trackElem(track)
		main_elem.appendChild(track_elem)

		TEMP_QUEUE.push({
			track: track,
			elem: track_elem
		})
	})

	print(String(TEMP_QUEUE.length))
	main_elem.style.setProperty("--track-count", `${TEMP_QUEUE.length}`)
})

function volUpdate(telementry = false) {
	GLOBAL_VOLUME = clamp(GLOBAL_VOLUME, 0, 1)
	if (PlayingSong != null) {
		PlayingSong.streams.start.volume = GLOBAL_VOLUME
		PlayingSong.streams.mid.volume = GLOBAL_VOLUME	
	}
	if (telementry) {
		print(`Set volume to ${GLOBAL_VOLUME*100.0}%`)
	}
}

var keylog = false
document.addEventListener("keydown", event => {
	if (keylog) { print(event.which) }

	var shift_mult = (event.shiftKey ? 5 : 1)
	switch (event.which) {
		case 40:
			GLOBAL_VOLUME -= 0.02*shift_mult
			volUpdate(true)
		break;
		case 38:
			GLOBAL_VOLUME += 0.02*shift_mult
			volUpdate(true)
		break;
		case 70:
			tween_volume(clamp(GLOBAL_VOLUME, 0, 1), 0.25, 50, 0.0001)
			print("Volume Jumped to 25%")
			// volUpdate()
		break;
		case 71:
			tween_volume(clamp(GLOBAL_VOLUME, 0, 1), 0.5, 50, 0.0001)
			print("Volume Jumped to 50%")
		break;
		case 72:
			tween_volume(clamp(GLOBAL_VOLUME, 0, 1), 0.75, 50, 0.0001)
			print("Volume Jumped to 75%")
		break;
		case 74:
			tween_volume(clamp(GLOBAL_VOLUME, 0, 1), 1, 50, 0.0001)
			print("Volume Jumped to 100%")
		break;
		case 32:
			toggle_pause()
		break;
		case 39:
			if (event.shiftKey) { next() }
		break;
		case 37:
			if (event.shiftKey) { prev() }
		break;
		case 82:
			if (event.shiftKey) { random_song() }
		break;
	}
})

var menu_toggles = [
	document.getElementById('playhead'),
	document.getElementById('queue'),
	document.getElementById('queue-fade'),
	document.getElementById('close-menu-button'),
	document.getElementById('loop-button'),
	document.getElementById('shuffle-button'),
	document.getElementById('playing-track-cont'),
]
var bottom_area_opened = false
var bottom_area_moving = false
var play_bar_elem = document.getElementById('play-bar')

var pendingQueueScroll = null

play_bar_elem.onclick = e => {
	if (e.target == play_bar_elem) {
		e.preventDefault()

		if (!bottom_area_opened && !bottom_area_moving) {
			var entireHeight = document.body.clientHeight
			play_bar_elem.style["height"] = `calc(${entireHeight}px - 32px)`
			play_bar_elem.setAttribute("bottom_view", "")

			var controls = document.getElementById("controls")
			controls.setAttribute("bottom_view", "")

			menu_toggles.forEach(elem => { elem.style["display"] = "" })

			bottom_area_moving = true
			setTimeout(() => {
				bottom_area_moving = false

				if (pendingQueueScroll != null) {
					var main_elem = pendingQueueScroll
					var queue_cont = document.getElementById("queue")
					var trackPos = main_elem.offsetTop-(queue_cont.clientHeight/2)+(main_elem.clientHeight/2)

					queue_cont.scrollTop = trackPos

					pendingQueueScroll = null
				}
			}, 200)

			bottom_area_opened = true
		} 
	}
}

document.getElementById('close-menu-button').onclick = e => {
	e.preventDefault()

	if (bottom_area_opened && !bottom_area_moving) {
		play_bar_elem.style["height"] = ""
		play_bar_elem.removeAttribute("bottom_view")

		var controls = document.getElementById("controls")
		controls.removeAttribute("bottom_view")

		bottom_area_moving = true
		setTimeout(() => {
			menu_toggles.forEach(elem => { elem.style["display"] = "none" })
			bottom_area_moving = false
		}, 200)

		bottom_area_opened = false
	}
}

function resizePlayingTrackCont() {
	var playing_track_cont = document.getElementById('playing-track-cont')

	var new_width = window.innerWidth*0.5-45
	var new_height = window.innerHeight*0.6-45
	var new_value = Math.min(new_width, new_height)

	playing_track_cont.style["width"] = `${new_value}px`
	playing_track_cont.style["height"] = `${new_value}px`
	playing_track_cont.style["left"] = `${(new_width/2)-(new_value/2)}px`
	if (PlayingSong != null) { focusNowPlaying() }
}

addEventListener("resize", (event) => {
	resizeCheck()
})

function resizeCheck() {
	var entireHeight = document.body.clientHeight
	if (bottom_area_opened && !bottom_area_moving) { play_bar_elem.style["height"] = `calc(${entireHeight}px - 32px)` }

	var playing_track_info = document.getElementById("playing-track-info")
	play_bar_elem.style["--curr_height"] = `${playing_track_info.clientHeight+53+20}px`

	var main_elem = document.getElementById("main")
	print(`HEIGHT CHECK !!\n${main_elem.clientHeight}px;`)
	main_elem.style.setProperty("--this_height", `${main_elem.clientHeight}px`)
	// main_elem.style["--this_height"] = `${main_elem.clientHeight}px;`

	resizePlayingTrackCont()
}
resizeCheck()

function showTrackPopup(track) {
	// print("ok gimme a minute...", track)
	document.getElementById("popout-track-play-button").onclick = e => {
		var fut_ind = QueueIndex+1
		insertTrackToQueue(track, QueueIndex)
		play(track, fut_ind)
		closePopup()
	}
	
	document.getElementById("popout-track-playnext-button").onclick = e => {
		insertTrackToQueue(track, QueueIndex+1)
		if (Queue.length == 1) { play(track, 0) }
		closePopup()
	}
	
	document.getElementById("popout-track-queue-button").onclick = e => {
		pushTrackToQueue(track)
		if (Queue.length == 1) { play(track, 0) }
		closePopup()
	}

	document.getElementById("popup-track").style["display"] = ""
	document.getElementById("fadeout").style["display"] = ""
}

function closePopup() {
	var popups = Array.from(document.getElementsByClassName("popup"))
	popups.push(document.getElementById("fadeout"))
	popups.forEach(elem => {
		elem.style["display"] = "none"
	})
}

document.getElementById("fadeout").onclick = closePopup

var pages = ["top-home", "top-playlist", "top-tracks", "top-tags", "settings-button"]

var pending_tracks = false
function switchPage( pageName ) {
	pending_tracks = false
	TEMP_QUEUE = []
	var main_elem = document.getElementById("main")
	var clicked_elem = document.getElementById(pageName)
	pages.forEach(page => {
		document.getElementById(page).removeAttribute("current")
	})
	clicked_elem.setAttribute("current", "")
	main_elem.setAttribute("page", pageName)
	main_elem.clearChildren()

	// wtf do I do next??
	switch (pageName) {
		case 'top-home':
		break;
		case 'top-tracks':
			pending_tracks = true
			socket.emit("tracks")
		break;
		case 'settings-button':
			function makeElement(schema, this_key, this_value) {
				print("Hi schema!", schema)
				var paraElem = document.createElement('p')
				paraElem.textContent = this_key + ": "

				switch (schema.type) {
					case "string":
						var elem = document.createElement("input")
						elem.setAttribute("type", "text")
						if (schema.placeholder != null) { elem.setAttribute("placeholder", schema.placeholder) }
						elem.value = this_value
						paraElem.appendChild(elem)
						return paraElem
					break;
					case "drop-down":
						var elem = document.createElement("input")
						elem.setAttribute("type", "text")
						elem.value = this_value
						paraElem.appendChild(elem)
						return paraElem
					break;
					case "checkbox":
						var elem = document.createElement("input")
						elem.setAttribute("type", "checkbox")
						elem.checked = this_value
						paraElem.appendChild(elem)
						return paraElem
					break;
					case "slider":
						var elem = document.createElement("input")
						elem.setAttribute("type", "range")
						elem.value = this_value
						paraElem.appendChild(elem)
						return paraElem
					break;
				}
			}

			Object.keys(_settings_schema).forEach(key => {
				var res = _settings_schema[key]

				if (res.header == true) {
					Object.keys(res).forEach(sub_key => {
						if (sub_key == "header"){ return }
						var elem = makeElement(_settings_schema[key][sub_key], sub_key, settings[key][sub_key])
						main_elem.appendChild(elem)
					})
				} else {
					var elem = makeElement(_settings_schema[key], key, settings[key])
					main_elem.appendChild(elem)
				}
			})
		break;
	}
}

pages.forEach(pageName => {
	document.getElementById(pageName).onclick = e => {
		e.preventDefault()
		switchPage(pageName)
	}
})

// document.getElementById("settings-button").onclick = e => {
// 	e.preventDefault()
// 	print("settings yo")
// 	switchPage("settings-button")
// }