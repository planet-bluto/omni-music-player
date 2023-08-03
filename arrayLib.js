Array.prototype.awaitForEach = async function(func) {
	var proms = []

	this.forEach((...args) => {
		proms.push(func(...args))
	})

	return await Promise.all(proms)
}

Array.prototype.asyncForEach = async function(func) {
	var i = 0
	var length = this.length
	var funcs = []
	var reses = []
	return new Promise(async (res, rej) => {
		this.forEach((...args) => {
			funcs.push(func.bind(this, ...args))
		})

		async function loop() {
			var this_res = await funcs[i]()
			reses.push(this_res)
			i++
			if (i == length) {
				res(reses)
			} else {
				loop()
			}
		}
		loop()
	})
}