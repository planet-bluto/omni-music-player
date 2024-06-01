const TOAST_CONT = new Elem("toast-cont")
var GLOBAL_T_ID = 0

var T_TWEENS = {}
var TYPED_TOAST = {}
async function showToast(text, opts) {
	const default_opts = { durr: 5000, image: null, color: "var(--theme-accent1-pos)", type: null }
	var {durr, image, color, type} = Object.assign(default_opts, opts)

	var TID = String(GLOBAL_T_ID)
	T_TWEENS[TID] = []
	GLOBAL_T_ID += 1

	var toast_elem = new Elem("div")
	toast_elem.classes.add("toast")

	if (image) {
		var toast_image = new Elem("img")
		toast_image.classes.add("toast-image")
		toast_image.src = image
		toast_elem.addChild(toast_image)
	}

	var toast_text = new Elem("p")
	toast_text.classes.add("toast-text")
	toast_text.text = text
	toast_elem.addChild(toast_text)

	var toast_button = new Elem("button")
	toast_button.html = `<span class="material-icons">close</span>`
	toast_button.classes.add("toast-button")
	toast_elem.addChild(toast_button)
	toast_button.on("click", e => {
		closeToast()
	})

	if (type) {
		if (TYPED_TOAST[type] != null) { TYPED_TOAST[type]() }
		TYPED_TOAST[type] = closeToast
	}


	TOAST_CONT.addChild(toast_elem)

	T_TWEENS[TID].push(tween(800, EASE_OUT_QUART, (perc) => {
		var right = lerp(-toast_elem.elem.clientWidth, 0, perc)
		toast_elem.elem.style.setProperty("right", `${right}px`)
		// print(right)
	}))

	await wait((durr/4) * 3)

	T_TWEENS[TID].push(tween((durr/3), EASE_OUT_QUART, (perc) => {
		var x = lerp(1, 0, perc)
		toast_elem.elem.style.setProperty("opacity", x)
		// print(right)
	}))

	await wait(durr/4)

	function closeToast() {
		T_TWEENS[TID].forEach(tween_int => {
			cancelTween(tween_int)
		})
		toast_elem.delete()
	}

	closeToast()
}