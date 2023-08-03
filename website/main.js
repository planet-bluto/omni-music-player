setInterval(() => {
	var main_elem = document.getElementById("main")
	// console.log(main_elem.clientHeight)
	main_elem.setAttribute("style", `--this_height: ${main_elem.clientHeight}px`)
}, 100)

socket.emit("tracks")
socket.on("tracks", (tracks) => {
	var main_elem = document.getElementById("main")
	tracks.forEach(track => {
		var track_elem = document.createElement("div")
		track_elem.src = track.thumbnail
		track_elem.classList.add("track-elem")
		track_elem.style = `background-image: linear-gradient(to top, color-mix(in srgb, var(--fade-color) 0%, #00000000), color-mix(in srgb, var(--fade-color) 100%, #00000000)), url(${track.thumbnail});`
		
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
		
		track_elem.onclick = e => {
			play(track, track_elem)
		}

		track_elem.appendChild(track_visualizer)
		track_elem.appendChild(title_elem)
		track_elem.appendChild(author_elem)
		main_elem.appendChild(track_elem)


		TEMP_QUEUE.push({
			track: track,
			elem: track_elem
		})
	})
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
	}
})