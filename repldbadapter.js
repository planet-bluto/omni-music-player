class ReplDBAdapter {
	constructor(key = "data") {
		const Database = require("@replit/database")
		this.db = new Database()
		this.key = key
	}

	async read() {
		const data = await this.db.get(this.key)
		return data
	}

	async write(data) {
		await this.db.set(this.key, data)
	}
}

module.exports = ReplDBAdapter