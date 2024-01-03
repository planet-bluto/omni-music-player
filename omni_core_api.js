var jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
var fs = require("node:fs/promises")
var path = require("path")
const hyperid = require('hyperid')

var saltRounds = (process.env.BCRYPT_SALT_ROUNDS || 10)

module.exports = (omniCore => {
	var {app, express} = omniCore
	
	app.use(express.json())
	app.use(express.urlencoded({ extended: true }))

	////////////////////////////////////////////////////////////////////////////

	// ENDPOINT: //
	unauthGET("", (req, res) => {
		res.send("Omni API v1")
	})

	// ENDPOINT: login //
	unauthPOST("/login", async (req, res) => {
		if (req.body.username && req.body.password) {
			var userDB = await getUserByUsername(req.body.username)
			if (userDB) {
				var passing = await bcrypt.compare(req.body.password, userDB.data.password)
				if (passing) {
					var userObj = {
						id: userDB.data.id,
						username: userDB.data.username,
						password: userDB.data.password
					}

					var token = jwt.sign(userObj, process.env.JWT_SECRET)

					res.send({token: token, object: userDB.data})
				} else {
					res.status(401).send("Invalid username or password (1)")
				}
			} else {
				res.status(401).send("Invalid username or password (2)")
			}
		} else {
			 res.status(401).send("Invalid username or password (3)")
		}
	})

	// ENDPOINT: signup //
	unauthPOST("/signup", async (req, res) => {
		if (req.body.username && req.body.password) {
			var usernames = (await getAllUsers()).map(userDB => userDB.data.username)
			if (!(usernames.length >= (process.env.USER_CAP || Infinity))) {
				if (!usernames.includes(req.body.username)) {

					var id = generateID()
					var hashedPassword = await bcrypt.hash(req.body.password, saltRounds)

					var userObj = {
						id: id,
						username: req.body.username,
						password: hashedPassword
					}

					GLOBAL_DB.data.users.push({id, username: req.body.username})
					
					var prom1 = createDB(`users/${id}`, userObj)
					var prom2 = GLOBAL_DB.write()
					
					var reses = await Promise.all([prom1, prom2])
					
					var userDB = reses[0]

					var token = jwt.sign(userObj, process.env.JWT_SECRET)

					res.send({token: token, object: userDB.data})
				} else {
					res.status(400).send("Invalid username (not unique)")
				}
			} else {
				res.status(401).send("User limit reached")
			}
		} else {
			res.status(400).send("Invalid request")
		}
	})
	
	// ENDPOINT: auth //
	authGET("/me" , (userDB, req, res) => {
		if (userDB) {
			var userObj = userDB.data
			delete userObj.password
			res.send(userObj)
		} else {
			res.status(401).send("Unauthorized")
		}
	})

	////////////////////////////////////////////////////////////////////////////

	//// UNAUTHENTICATED ////
	function unauthGET(path, func) {
		app.get("/api"+path, (req, res) => {
			func(req, res)
		})
	}

	function unauthPOST(path, func) {
		app.post("/api"+path, (req, res) => {
			func(req, res)
		})
	}

	//// AUTHENTICATED ////
	function authGET(path, func) {
		app.get("/api"+path, async (req, res) => {
			var userObj = await getUser(req.header("Authorization"))
			if (userObj) {
				func(userObj, req, res)
			} else {
				res.status(401).send("Unauthorized")
			}
		})
	}

	function authPOST(path, func) {
		app.get("/api"+path, async (req, res) => {
			var userObj = await getUser(req.header("Authorization"))
			if (userObj) {
				func(userObj, req, res)
			} else {
				res.status(401).send("Unauthorized")
			}
		})
	}
})

function getUser(auth) {
	return new Promise((res, rej) => {
		if (!auth) { res(null) }
		var token = auth.split(" ")[1]
		jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
			if (!err) {
				var userDB = await initDB(`users/${decoded.id}`)
				res(userDB)
			} else {
				res(null)
				print(err)
			}
		})
	})
}

async function getAllUsers() {
	var userObjs = []
	
	await GLOBAL_DB.data.users.awaitForEach(async (liteUserObj, ind) => {
		var userDB = await initDB(`users/${liteUserObj.id}`)
		if (userDB.data == {}) {
			GLOBAL_DB.data.users = GLOBAL_DB.data.users.splice(ind, 1)
		} else {
			userObjs.push(userDB)
		}
	})
	
	return userObjs
}

async function getUserByUsername(username) {
	var userDBs = await getAllUsers()
	
	var return_val = userDBs.find(userDB => {
		if (userDB.data.username == username) {
			return userDB
		}
	})

	return return_val
}

function generateID() {
	var instance = hyperid({urlSafe: true, fixedLength: true})
	var id = (instance().split("-").slice(0,-1)).join("-")
	return id
}