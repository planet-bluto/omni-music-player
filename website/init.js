var socket = io()

var localStorage = window.localStorage
var query_params = Array.from(new URLSearchParams(window.location.search).keys())

function clamp(val, min, max) {
	if (val < min) { val = min }
	if (val > max) { val = max }
	return val
}

var vol_tweens = []
function tween_volume(start, end, time) {
	vol_tweens.forEach(cancelTween)

	var tween_int = tween(time, EASE_LINEAR, (x) => {
		var orig_x = x
		x = lerp(start, end, x)
		GLOBAL_VOLUME = x
		// print(x != end)
		if (orig_x != 1) { volUpdate() }
	}, false)
	vol_tweens.push(tween_int)

	return awaitTween(tween_int)
	// let incr = (end - start)/rounds
	// // let pol = Math.sign(start - end)
	// let timeout_time = (time*1000)/rounds
	// let i = 0
	// return new Promise((res, rej) => {
	// 	function loop() {
	// 		GLOBAL_VOLUME = start+(incr*i)
	// 		volUpdate()
	// 		i += 1
	// 		if (i < rounds) {
	// 			setTimeout(loop, timeout_time)
	// 		} else {
	// 			GLOBAL_VOLUME = end
	// 			res("done")
	// 		}
	// 	}
	// 	setTimeout(loop, timeout_time)
	// })
}

function randi(max) {
  return Math.floor(Math.random() * max);
}

if( typeof Element.prototype.clearChildren === 'undefined' ) {
    Object.defineProperty(Element.prototype, 'clearChildren', {
      configurable: true,
      enumerable: false,
      value: function() {
        while(this.firstChild) this.removeChild(this.lastChild);
      }
    });
}

var loading_processes = {}
function startLoading(key) {
	loading_processes[key] = false
	document.getElementById("loading").style.setProperty("display", "")
}

function stopLoading(key) {
	loading_processes[key] = true
	if (Object.values(loading_processes).every(bool => bool)) {
		document.getElementById("loading").style.setProperty("display", "none")
	}
}

startLoading("auth")

if (!query_params.includes("mobile")) {
	new Elem("fullscreen-button").style.setProperty("display", "none")
}

async function fullscreenPage() {
	var topElem = new Elem("fullscreen-cont")
	await topElem.elem.requestFullscreen()
	new Elem('fullscreen-button').style.setProperty('display', 'none')
	topElem.style.setProperty("background", "#151515")
}

function imageLoading() {
	if (query_params.includes("mobile") && query_params.includes("streaming")) { return }

	let unloaded_images = getClass("unloaded-image")
	unloaded_images = unloaded_images.filter(track_elem => {
		let to_return = (isElementInViewport(track_elem.elem) && (!track_elem.hasAttr("bottom")))
		if (!to_return && Number(track_elem.getAttr("seen")) != -1) {
			track_elem.setAttr("seen", -1)
		}
		return to_return
	})

	if (unloaded_images.length > 0) {
		unloaded_images.forEach(track_elem => {
			var src = track_elem.getAttr("loadSrc")
			
			setTimeout(() => {
				if (isElementInViewport(track_elem.elem)) {
					// print("loaded image: ", src)
					track_elem.classes.remove("unloaded-image")
					track_elem.style = `background-image: linear-gradient(to top, color-mix(in srgb, var(--fade-color) 0%, #00000000), color-mix(in srgb, var(--fade-color) 100%, #00000000)), url(${src});`
				}
			}, 50)
		})
	}

	// requestAnimationFrame(imageLoading)
}

// if (!query_params.includes("mobile") && !query_params.includes("streaming")) { imageLoading() }

new Elem("main").on("scroll", e => {
	imageLoading()
})

var lastLoad = null
new Elem("main").watch({childList: true, subtree: false}, (timestamp, mutation) => {
	if (timestamp != lastLoad) {
		lastLoad = timestamp
		print("gulp: ", timestamp)
		imageLoading()
	}
})

function isElementInViewport (el) {

    // Special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    var rect = el.getBoundingClientRect();

    return (
        rect.top >= -el.clientHeight &&
        rect.left >= -el.clientWidth &&
        rect.bottom <= ((window.innerHeight || document.documentElement.clientHeight) + el.clientHeight) && /* or $(window).height() */
        rect.right <= ((window.innerWidth || document.documentElement.clientWidth) + el.clientWidth) /* or $(window).width() */
    );
}