const print = console.log
var socket = io()

function clamp(val, min, max) {
	if (val < min) { val = min }
	if (val > max) { val = max }
	return val
}

function tween_volume(start, end, rounds, time) {
	let incr = (end - start)/rounds
	// let pol = Math.sign(start - end)
	let timeout_time = (time*1000)/rounds
	let i = 0
	return new Promise((res, rej) => {
		function loop() {
			GLOBAL_VOLUME = start+(incr*i)
			volUpdate()
			i += 1
			if (i < rounds) {
				setTimeout(loop, timeout_time)
			} else {
				GLOBAL_VOLUME = end
				res("done")
			}
		}
		setTimeout(loop, timeout_time)
	})
}

function randi(max) {
  return Math.floor(Math.random() * max);
}
