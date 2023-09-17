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

Array.prototype.shuffle = function () {
  let currentIndex = this.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [this[currentIndex], this[randomIndex]] = [
      this[randomIndex], this[currentIndex]];
  }
}

Array.prototype.insert = function (index, value) {
	this.splice(index, 0, value)
}

Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length + 1;
        while (k--) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
}

Array.prototype.remove = function (index) {
    if (index > -1 && index < this.length-1) {
    	var return_value = this.splice(index, 1)
    	return return_value
    }
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