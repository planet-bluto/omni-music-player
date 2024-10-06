function trackElem(track, bottom = false) {
	// print(track)
	var track_elem = document.createElement("div")
	track_elem.setAttribute("loadSrc", track.image)
	track_elem.setAttribute("seen", -1)
	track_elem.classList.add("track-elem")
	track_elem.classList.add("unloaded-image")
	track_elem.classList.add(`track-${encodeURIComponent(track.url)}`)
	if (!bottom) { track_elem.classList.add(`track-${track.omni_id}`) }
	if (bottom) { track_elem.setAttribute("bottom", "") }
	if (!bottom) {
		track_elem.style = `background-image: linear-gradient(to top, color-mix(in srgb, var(--fade-color) 0%, #00000000), color-mix(in srgb, var(--fade-color) 100%, #00000000)), url(assets/loading.gif);`
	} else {
		track_elem.style = `background-image: url("${track.image}");`
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
	author_elem.textContent = track.author.name
	
	var service_elem = document.createElement("img")
	service_elem.classList.add("track-service")
	service_elem.src = `assets/${track.service.code}_icon.png`

	var serv_auth_cont = document.createElement("div")
	serv_auth_cont.classList.add("service-author-cont")
	serv_auth_cont.appendChild(service_elem)
	serv_auth_cont.appendChild(author_elem)
	
	if (!bottom) {
		track_elem.onclick = e => {
			// insertTrackToQueue(track, QufeueIndex, true)
			showTrackPopup(track)
		}
	}

	if (bottom) { track_elem.appendChild(track_visualizer) }
	if (!bottom) { track_elem.appendChild(title_elem) }
	if (!bottom) { track_elem.appendChild(serv_auth_cont) }

	return track_elem
}

function playlistElem(playlist) {
	var playlist_elem = new Elem("div")
	playlist_elem.classes.add("playlist-elem")

	var playlist_title = new Elem("p")
	playlist_title.classes.add("playlist-title")
	playlist_title.text = playlist.title
	playlist_elem.addChild(playlist_title)

	playlist_elem.on("click", async e => {
		showPopup({
			"Show Tracks": (async () => {
				startLoading("playlist")
				var tracks = await fetchMultipleTracks(playlist.tracks)
				print(tracks)

				var trackElems = tracks.map(track => trackElem(track, false))
				openSubPage(trackElems)
				currentPlaylist = playlist
				closePopup()

				stopLoading("playlist")
			}),
			"Play Shuffle": (async () => {
				startLoading("playlist")
				var tracks = await fetchMultipleTracks(playlist.tracks)
				tracks.shuffle()
				// tracks = tracks.reverse()
				print(tracks)

				var autoplaying = (Queue.length == 0)
				var fut_ind = QueueIndex+1
				insertTracksToQueue(tracks, QueueIndex+1)

				if (autoplaying) { play(tracks[0], 0) }
				showToast(`Playing tracks next...`)
				closePopup()

				stopLoading("playlist")
			}),
			"Play Tracks Next": (async () => {
				startLoading("playlist")
				var tracks = await fetchMultipleTracks(playlist.tracks)
				// tracks = tracks.reverse()
				print(tracks)

				var autoplaying = (Queue.length == 0)
				var fut_ind = QueueIndex+1
				insertTracksToQueue(tracks, QueueIndex+1)

				if (autoplaying) { play(tracks[0], 0) }
				showToast(`Playing tracks next...`)
				closePopup()

				stopLoading("playlist")
			}),
			"Add Tracks to Queue": (async () => {
				startLoading("playlist")
				var tracks = await fetchMultipleTracks(playlist.tracks)
				// tracks = tracks.reverse()
				print(tracks)

				var autoplaying = (Queue.length == 0)
				insertTracksToQueue(tracks, Infinity, autoplaying)

				showToast(`Added tracks to queue!`)
				closePopup()

				stopLoading("playlist")
			}),
			"Delete Playlist": (async () => {
				startLoading("playlist")

				if (confirm(`Are you sure you want to delete '${playlist.title}'`)) {
					await OmniAPI.DELETE(`/playlist/${playlist.id}`)
					playlist_elem.delete()
					var main_elem = document.getElementById("main")
					main_elem.style.setProperty("--item-count", `${main_elem.children.length}`)

					showToast(`Deleted playlist!`)
					closePopup()
				} else {
					showToast(`Cancelled!`)
				}

				stopLoading("playlist")
			}),
		})
	})

	return playlist_elem.elem
}

function tagElem(tag) {
	var tag_elem = new Elem("div")
	tag_elem.classes.add("tag-elem")

	var tag_title = new Elem("p")
	tag_title.classes.add("tag-title")
	tag_title.text = tag.title
	tag_elem.addChild(tag_title)

	tag_elem.on("click", e => {
		showPopup({
			"Edit Tag": (async () => {
				showForm([
					Form.Header("Edit Tag"),
					Form.Label("Title:"),
					Form.InputString("title", {placeholder: "Tag Title", required: true}),
					Form.Label("Description:"),
					Form.InputString("desc", {placeholder: "Tag Description", required: false}),
					// Form.Label("Visibility:"),
					// Form.InputDropDown("visibility", ["PUBLIC", "UNLISTED", "PRIVATE"]),
					// Form.Label("Add Tracks URLs:"),
					// Form.InputString("urls", {placeholder: "Track or Playlist URL (separate multiple with '|')", required: false}),
				])
			}),
			"Delete Tag": (async () => {
				startLoading("tag")

				if (confirm(`Are you sure you want to delete '${tag.title}'`)) {
					await OmniAPI.DELETE(`/tag/${tag.id}`)
					tag_elem.delete()
					var main_elem = document.getElementById("main")
					main_elem.style.setProperty("--item-count", `${main_elem.children.length}`)

					showToast(`Deleted tag!`)
					closePopup()
				} else {
					showToast(`Cancelled!`)
				}

				stopLoading("tag")
			}),
		})
	})

	return tag_elem.elem
}

var nowplaying_cache = null
var duration_cache = null
function emit_nowplaying(track) {
	print("lmao? ", track)
	if (query_params.includes("nowplaying")) {
		// socket.emit("$emit_status", {status: "UNPAUSE"})
		SocketEventEmitter("nowplaying", {track})
		nowplaying_cache = track
	}
}

OmniEvents.on("nowplaying", track => {
	// print("Got it!", track, )
	var current_track_cont = document.getElementById("playing-track-cont")
	current_track_cont.innerHTML = trackElem(track, true).outerHTML
	resizePlayingTrackCont()
	canvasSetup(track.url)

	// showToast(`Now playing: '${track.author.name} - ${track.title}'...`)

	emit_nowplaying(track)
})

var event_emit_cache = {}
function SocketEventEmitter(eventName, eventObj) {
	eventObj["timestamp"] = moment().unix()
	socket.emit(`$emit_${eventName}`, eventObj)
	event_emit_cache[eventName] = eventObj
}

socket.on("connect", () => {
	Object.keys(event_emit_cache).forEach(eventName => {
		var eventObj = event_emit_cache[eventName]
		SocketEventEmitter(eventName, eventObj)
	})
	
	if (query_params.includes("streaming")) {
		socket.emit("$streamClient")
	}
})

//// Live Stream Hookup ////

if (query_params.includes("streaming")) {
	socket.emit("$streamClient")

	socket.on("$stream_add_to_queue", async (userName, input, callback) => {
		var tracks = await fetchTracks(input)
		if (tracks.length == 1) {
			insertTracksToQueue(tracks, Infinity, false)

			var track = tracks[0]
			showToast(`${userName}'s track added to queue!`, {image: track.image})
			callback(track)
		} else {
			callback(null)
		}
	})
	
	socket.on("$stream_play_next", async (userName, input, callback) => {
		var tracks = await fetchTracks(input)
		if (tracks.length == 1) {
			// insertTracksToQueue(tracks, Infinity, false)
			add_to_play_next_queue(tracks[0])

			var track = tracks[0]
			showToast(`${userName}'s track added to play next queue!`, {image: track.image})
			callback(track)
		} else {
			callback(null)
		}
	})
}

var cache = []

// socket.emit("tracks")
// socket.on("tracks", (tracks) => {

// })

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

	const tween_vol_durr = 250

	var shift_mult = (event.shiftKey ? 5 : 1)

	function volumeJump(NEW_VOLUME) {
		tween_volume(clamp(GLOBAL_VOLUME, 0, 1), NEW_VOLUME, tween_vol_durr)
		GLOBAL_VOLUME = clamp(GLOBAL_VOLUME, 0, 1)

		var resulting_text = `Volume Jumped to ${Math.round(NEW_VOLUME*100)}%`
		print(resulting_text)
		showToast(resulting_text, {type: "volume"})
	}

	if (document.activeElement != document.body) { return }
	switch (event.which) {
		case 40:
			GLOBAL_VOLUME -= 0.02*shift_mult
			GLOBAL_VOLUME = clamp(GLOBAL_VOLUME, 0, 1)
			showToast(`Volume Jumped to ${Math.round(GLOBAL_VOLUME*100)}%`, {type: "volume"})
			volUpdate(true)
		break;
		case 38:
			GLOBAL_VOLUME += 0.02*shift_mult
			GLOBAL_VOLUME = clamp(GLOBAL_VOLUME, 0, 1)
			showToast(`Volume Jumped to ${Math.round(GLOBAL_VOLUME*100)}%`, {type: "volume"})
			volUpdate(true)
		break;
		case 70:
			if (!event.shiftKey) { return }
			volumeJump(0.1)
			// volUpdate()
		break;
		case 71:
			if (!event.shiftKey) { return }
			volumeJump(1/3)
		break;
		case 72:
			if (!event.shiftKey) { return }
			volumeJump(2/3)
		break;
		case 74:
			if (!event.shiftKey) { return }
			volumeJump(1)
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
			if (event.shiftKey) {
				random_song().then(track => {
					showToast(`Playing a random song...`, {image: track.image})
				})
			}
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

var playing_cont_tweens = []
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

			playing_cont_tweens.forEach(tween_int => { cancelTween(tween_int) })
			var tween_int = tween(200, EASE_LINEAR, (perc) => {
				var x = lerp(64, 0, perc)
				TOAST_CONT.style.setProperty("top", `calc(${x}px + 8px)`)
				menu_toggles.forEach(elem => { elem.style.setProperty("opacity", (perc)) })
			})
			playing_cont_tweens.push(tween_int)

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

		playing_cont_tweens.forEach(tween_int => { cancelTween(tween_int) })
		var tween_int = tween(200, EASE_LINEAR, (perc) => {
			var x = lerp(0, 64, perc)
			TOAST_CONT.style.setProperty("top", `calc(${x}px + 8px)`)
			menu_toggles.forEach(elem => { elem.style.setProperty("opacity", (1-perc)) })
		})
		playing_cont_tweens.push(tween_int)

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

	var thing = Math.max(new_width, new_height)

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

function showAuthPopup() {
	stopLoading("auth")
	var getInputs = () => {
		return {username: document.getElementById("popup-auth-username").value, password: document.getElementById("popup-auth-password").value}
	}

	async function auth(type) {
		var {username, password} = getInputs()

		var res = await fetch(`/api/${type}`, {
			method: "POST",
			body: JSON.stringify({username, password}),
			headers: {
				"Content-Type": "application/json",
			},
		})

		if (res.ok) {
			var resJSON = await res.json()
			localStorage.setItem("token", resJSON.token)
			OmniAPI._token = resJSON.token
			OmniAPI.user = resJSON.object
			OmniEvents._fire("logged_in")
			closePopup()
			// print(resJSON)
		} else {
			var resText = await res.text()
			// print(resText)
		}
	}
	
	var login_button = document.getElementById("popup-auth-login")
	login_button.onclick = async e => {
		auth("login")
	}
	
	var signup_button = document.getElementById("popup-auth-signup")
	signup_button.onclick = async e => {
		auth("signup")
	}
	
	document.getElementById("popup-auth").style["display"] = ""
	document.getElementById("fadeout").style["display"] = ""
}

// Checking authenticationings
async function authCheck() {
	if (OmniAPI._token) {
		var res = await fetch(`/api/me`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${OmniAPI._token}`,
			},
		})

		if (res.ok) {
			var resJSON = await res.json()
			OmniAPI.user = resJSON
			OmniEvents._fire("logged_in")
			stopLoading("auth")	
		} else {
			var resText = await res.text()
			showAuthPopup()
		}
	} else {
		showAuthPopup()
	}
}

OmniEvents.on("logged_in", () => {
	OmniAPI.loggedIn = true

	OmniAPI.GET("/me/library").then(tracks => {
		print(tracks)
		cache = tracks
	})
})

authCheck()

function trackPopups(track) {
	var obj = {
		"Play": (() => {
			var fut_ind = QueueIndex+1
			insertTrackToQueue(track, fut_ind)
			play(track, fut_ind)
			closePopup()
		}),
		"Play Next": (() => {
			insertTrackToQueue(track, QueueIndex+1)
			if (Queue.length == 1) { play(track, 0) }
			showToast("Playing next...", {image: track.image})
			closePopup()
		}),
		"Add To Queue": (() => {
			pushTrackToQueue(track)
			if (Queue.length == 1) { play(track, 0) }
			showToast(`Added to queue!`, {image: track.image})
			closePopup()
		}),
		"Edit Tags": (async () => {
			startLoading("tags")
			var tags = await OmniAPI.GET("/me/tags")
			var form_elements = [Form.Header("Edit Tags")]
			tags.forEach(tag => {
				if (Array.isArray(tag.tracks)) {
					var trackEntry = tag.tracks.find(thisTrackEntry => thisTrackEntry.id == track.omni_id)
					var current_weight = (trackEntry != null ? (trackEntry.weight * 100.0) : 0) + 1
					print(current_weight)
	
					form_elements.push(Form.Label(tag.title))
					form_elements.push(Form.InputRange(`tag ${tag.id}`, {min: 1, max: 101, step: 5, value: current_weight}))
				}
			})

			closePopup()
			showForm(form_elements, async (results) => {
				startLoading("editing_tags")
				var payload = []

				Object.keys(results).forEach(async (key) => {
					var keyBits = key.split(" ")
					var tagID = keyBits[1]

					var value = (Number(results[key])-1) / 100.0

					payload.push({id: tagID, weight: value})
				})

				var res = await OmniAPI.PATCH(`/track/${track.omni_id}/tags`, payload)

				print(res)
				showToast("Edited Tags!", {image: track.image})
				stopLoading("editing_tags")
				closePopup()
			})
			
			stopLoading("tags")
		}),
		"Add To Playlist": (async () => {
			startLoading("add_to_playlist")
			var playlists = await OmniAPI.GET("/me/playlists")
			stopLoading("add_to_playlist")

			if (playlists.length > 0) {
				var obj = {}

				playlists.forEach(playlist => {
					obj[playlist.title] = async () => {
						startLoading("adding_to_playlist")
						await OmniAPI.POST(`/playlist/${playlist.id}/tracks`, {
							tracks: [track.omni_id]
						})
						showToast(`Added to '${playlist.title}'!`, {image: track.image})
						stopLoading("adding_to_playlist")
						closePopup()
					}
				})

				showPopup(obj)
			} else {
				// ... Show toast
			}
		}),
		"Copy Link": (() => {
			navigator.clipboard.writeText(track.url)
			closePopup()
		}),
		"Open In New Tab": (() => {
			window.open(track.url, "_blank")
			// if (Queue.length == 1) { play(track, 0) }
			closePopup()
		}),
	}

	if (currentPlaylist && currentPlaylist.tracks.includes(track.omni_id)) {
		obj["Remove From Playlist"] = async () => {
			startLoading("removing_from_playlist")
			await OmniAPI.DELETE(`/playlist/${currentPlaylist.id}/tracks`, {
				tracks: [track.omni_id]
			})

			var trackElems = getClass(`track-${track.omni_id}`)
			trackElems.forEach(trackElem => {
				trackElem.delete()
			})
			var main_elem = document.getElementById("main")
			main_elem.style.setProperty("--item-count", `${main_elem.children.length}`)

			stopLoading("removing_from_playlist")
			showToast("Removed from playlist", {image: track.image})
			closePopup()
		}
	}

	return obj
}

function showTrackPopup(track) {
	showPopup(trackPopups(track))
}

function showPopup(obj) {
	closePopup()

	var popup_cont_elem = new Elem("popup-cont")
	popup_cont_elem.clear()
	Object.keys(obj).forEach(label => {
		var func = obj[label]

		var button = new Elem("button")
		button.classes.add("popout-track-button")
		button.text = label

		button.on("click", e => {
			func()
		})

		popup_cont_elem.addChild(button)
	})

	document.getElementById("popup-cont").style["display"] = ""
	document.getElementById("fadeout").style["display"] = ""
}

function showForm(form_objs, callback) {
	var popup_form_cont_elem = new Elem("popup-form-cont")
	popup_form_cont_elem.clear()

	var inputs = []
	form_objs.forEach(obj => {
		var {type, elem} = obj
		popup_form_cont_elem.addChild(elem)

		if (type == "input") { inputs.push(obj) }
	})

	function submit() {
		var result = {}
		var missing = []

		inputs.forEach(obj => {
			var {eid, required} = obj

			var entry = Form._entries[eid]
			result[entry.key] = entry.value

			if (required && !entry.fufilled) {
				missing.push(entry.key)
			}
		})

		if (missing.length == 0) {
			callback(result)
		} else {
			alert(`Following Inputs Not Fufilled!\n${missing.join(", ")}`)
		}
	}

	var confirm_button = new Elem("button")
	confirm_button.text = "Confirm"
	confirm_button.classes.add("form-confirm")
	confirm_button.on("click", e => {
			submit()
	})
	popup_form_cont_elem.addChild(confirm_button)

	document.getElementById("popup-form-cont").style["display"] = ""
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

function render(elements, page = currentPage) {
	if (currentPage != page) { return false }
	var main_elem = document.getElementById("main")
	main_elem.clearChildren()
	main_elem.setAttribute("render", "items")

	elements.forEach(element => {
		main_elem.appendChild(element)
		// TEMP_QUEUE.push({
		// 	track: track,
		// 	elem: track_elem
		// })
	})

	main_elem.style.setProperty("--item-count", `${elements.length}`)
	return true
}

var pages = ["top-home", "top-playlist", "top-tracks", "top-tags", "settings-button"]
var notQuitePages = ["lookup-button"]

var pending_tracks = false
var currentPage = "top-tracks"
var currentPlaylist = null
async function switchPage( pageName, ...args ) {
	currentPlaylist = null
	currentPage = pageName
	pending_tracks = false
	var main_elem = document.getElementById("main")
	var clicked_elem = document.getElementById(pageName)
	pages.concat(notQuitePages).forEach(page => {
		document.getElementById(page).removeAttribute("current")
	})
	clicked_elem.setAttribute("current", "")
	main_elem.setAttribute("page", pageName)
	main_elem.clearChildren()

	// wtf do I do next??
	switch (pageName) {
		case 'lookup-button':
			var elements = args[0]
			render(elements, "lookup-button")
			stopLoading("page")
		break;
		case 'top-home':

		break;
		case 'top-playlist':
			main_elem.setAttribute("render", "items")

			startLoading("page")
			OmniAPI.GET("/me/playlists").then(playlists => {
				var elements = [add_playlist_button.elem, ...playlists.map(playlistElem)]

				pageLevels = [elements]
				pageLevel = 0

				var res = render(elements, "top-playlist")
				if (res) { stopLoading("page") }
			})

			var add_playlist_button = new Elem("div")
			add_playlist_button.classes.add("add-playlist-button")
			add_playlist_button.on("click", e => {
				showForm([
					Form.Header("New Playlist"),
					Form.Label("Title:"),
					Form.InputString("title", {placeholder: "Playlist Title", required: true}),
					Form.Label("Description:"),
					Form.InputString("desc", {placeholder: "Playlist Description", required: false}),
					// Form.Label("Visibility:"),
					// Form.InputDropDown("visibility", ["PUBLIC", "UNLISTED", "PRIVATE"]),
					Form.Label("Import URLs:"),
					Form.InputString("urls", {placeholder: "Track or Playlist URL (separate multiple with '|')", required: false}),
				], async (result) => {
					// print(result)
					startLoading("create_playlist")

					var tracks = []
					if (result.urls != "") { tracks = await fetchIDs(result.urls) }
					// tracks = tracks.map(track => track.omni_id)

					var post_body = {
						title: result.title,
						desc: result.desc,
						tracks: tracks,
					}

					var new_playlist = await OmniAPI.POST("/playlist", post_body)
					print(new_playlist)
					stopLoading("create_playlist")
					showToast("Playlist created!")
					closePopup()

					main_elem.appendChild(playlistElem(new_playlist))
					main_elem.style.setProperty("--item-count", `${main_elem.children.length}`)
				})
			})

			main_elem.appendChild(add_playlist_button.elem)
		break;
		case 'top-tags':
			main_elem.setAttribute("render", "items")

			startLoading("page")
			OmniAPI.GET("/me/tags").then(tags => {
				var elements = [add_tag_button.elem, ...tags.map(tagElem)]

				pageLevels = [elements]
				pageLevel = 0

				var res = render(elements, "top-tags")
				if (res) { stopLoading("page") }
			})

			var add_tag_button = new Elem("div")
			add_tag_button.classes.add("add-tag-button")
			add_tag_button.on("click", async e => {
				startLoading("loading_tag_options")

				var tag_options = await OmniAPI.GET("/me/tags")

				var tag_children_form_insert = []
				tag_options.forEach(tag => {
					tag_children_form_insert.push(Form.Label(tag.title))
					tag_children_form_insert.push(Form.InputBoolean(`child ${tag.id}`))
				})

				var tag_parents_form_insert = []
				tag_options.forEach(tag => {
					tag_parents_form_insert.push(Form.Label(tag.title))
					tag_parents_form_insert.push(Form.InputBoolean(`parent ${tag.id}`))
				})

				stopLoading("loading_tag_options")
				
				showForm([
					Form.Header("New Tag"),
					Form.Label("Title:"),
					Form.InputString("title", {placeholder: "Tag Title", required: true}),
					Form.Label("Description:"),
					Form.InputString("desc", {placeholder: "Tag Description", required: false}),
					Form.SubHeader("Children:"),
					...tag_children_form_insert,
					Form.SubHeader("Parents:"),
					...tag_parents_form_insert,
					Form.SubHeader("Import URLs:"),
					Form.InputString("urls", {placeholder: "Track or Playlist URL (separate multiple with '|')", required: false}),
				], async (result) => {
					// print(result)
					startLoading("create_tag")

					var tracks = []
					if (result.urls != "") { tracks = await fetchTracks(result.urls) }
					// print(tracks)
					tracks = tracks.map(track => track.omni_id)

					await OmniAPI.ME()
					tracks = tracks.map(track_id => {
						return {
							id: track_id,
							weight: Number(OmniAPI.user.settings.tag_default_weight)
						}
					})

					var post_body = {
						title: result.title,
						desc: result.desc,
						parents: [],
						children: [],
						tracks: tracks,
					}

					print(result)

					function accountArray(key, prefix) {
						Object.keys(result).forEach(this_key => {
							if (this_key.startsWith(`${prefix}_`)) {
								var value = {"true": true, "false": false}[result[this_key]]
								let keyBits = this_key.split(" ")
								let tagId = keyBits[1]
								if (value) {
									post_body[key].push(tagId)
								}
							}
						})
					}

					accountArray("children", "child")
					accountArray("parents", "parent")

					var new_tag = await OmniAPI.POST("/tag", post_body)
					print(new_tag)
					stopLoading("create_tag")
					showToast("Tag created!")
					closePopup()

					main_elem.appendChild(tagElem(new_tag))
					main_elem.style.setProperty("--item-count", `${main_elem.children.length}`)
				})
			})

			main_elem.appendChild(add_tag_button.elem)
		break;
		case 'top-tracks':
			startLoading("page")
			pending_tracks = true
			if (true) {
				socket.emitWithAck("tracks").then(tracks => {
					var trackElems = tracks.map(track => trackElem(track))
					var res = render(trackElems, "top-tracks")

					imageLoading()
					
					if (res) { stopLoading("page") }
				})
			} else {
				stopLoading("page")
			}
		break;
		case 'settings-button':
			startLoading("page")
			main_elem.removeAttribute("render")

			await generateSettings()
			await renderSettings()
			stopLoading("page")
		break;
	}
}

switchPage("top-tracks")

const PAGE_SHOW_POPUP = 0

var pageHoldTimers = {}
pages.forEach(pageName => {
	document.getElementById(pageName).onmouseup = e => {
		e.preventDefault()

		if (pageHoldTimers[pageName]) {
			// ...
		} else {
			switchPage(pageName)
		}
	}
})

var pageLevels = []
var pageLevel = 0
function restorePage() {
	var elements = pageLevels.pop()
	pageLevel -= 1
	render(elements)
	backCheck()
}

function openSubPage(elements) {
	pageLevels.push(elements)
	pageLevel += 1
	render(elements)
	backCheck()
}

function backCheck() {
	var back_button = new Elem("back-button")

	if (pageLevel > 0) {
		back_button.setAttr("enabled")
		back_button.on("click", e => {
			restorePage()
		})
	} else {
		back_button.setAttr("disabled")
		back_button.notOn("click")
	}
}

// document.getElementById("settings-button").onclick = e => {
// 	e.preventDefault()
// 	print("settings yo")
// 	switchPage("settings-button")
// }

async function fetchMultipleTracks(ids) {
	var tracks = await socket.emitWithAck("fetchTracks", ids)
	// print("Worked??", tracks)
	return tracks
}

async function fetchTracks(input) {
	var tracks = []
	var urls = input.split("|")

	var proms = urls.map(url => socket.emitWithAck("fetchTracks", url))

	var res = await Promise.all(proms)

	res.forEach(async these_tracks => {
		these_tracks = these_tracks.filter(track => track != null)
		tracks = tracks.concat(these_tracks)
	})

	return tracks
}

async function fetchIDs(input) {
	var ids = []
	var urls = input.split("|")

	var proms = urls.map(url => socket.emitWithAck("fetchIDs", url))

	var res = await Promise.all(proms)

	res.forEach(async these_ids => {
		these_ids = these_ids.filter(id => id != null)
		ids = ids.concat(these_ids)
	})

	return ids
}

async function lookupTracks() {
	startLoading("page")
	var main_elem = document.getElementById("main")
	var input = prompt("URL to add to queue")
	if (input != null) {
		var tracks = await fetchTracks(input)

		if (tracks.length > 0) {
			var trackElems = tracks.map(track => trackElem(track))
			// tracks.forEach(track => {
			// 	var track_elem = trackElem(track)

			// 	if (currentPage == "top-tracks") {
			// 		main_elem.appendChild(track_elem)

			// 		TEMP_QUEUE.push({
			// 			track: track,
			// 			elem: track_elem
			// 		})
			// 	}
			// })

			switchPage("lookup-button", trackElems)

			tracks.shuffle()
			insertTracksToQueue(tracks, Infinity, false)
		} else {
			stopLoading("page")
		}
	} else {
		stopLoading("page")
	}
}