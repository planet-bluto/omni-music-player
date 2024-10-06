var jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
var fs = require("node:fs/promises")
var path = require("path")
const hyperid = require('hyperid')

var saltRounds = (process.env.BCRYPT_SALT_ROUNDS || 10)

var {OmniParser, MultiLoader} = require('omni-parser')
var raw_omni_parse = OmniParser()
var raw_multi_load = MultiLoader()

const TOPIC = " - Topic"
function removeTopic(track) {
	var authName = track.author.name
	var code = track.service.code

	if (code == "YT") {
		if (authName.endsWith(TOPIC)) {
			authName = authName.slice(0, (authName.length - TOPIC.length))
		}
	}

	track.author.name = authName
	// print(track.author.name)

	return track
}

var multi_load = async (...args) => {
	// print("CALLED!")
	var res = await raw_multi_load(...args)

	if (res != null) {
		res.map(track => removeTopic(track))
	}

	return res
}
var omni_parse = async (...args) => {
	var res = await raw_omni_parse(...args)

	if (res != null) {
		if (Array.isArray(res.tracks)) {
			res.tracks.forEach( (track, ind) => {
				res.tracks[ind] = removeTopic(res.tracks[ind])
			})
		} else {
			res = removeTopic(res)
		}
	}

	return res
}

module.exports = (omniCore => {
	var {app, express} = omniCore
	
	app.use(express.json())
	app.use(express.urlencoded({ extended: true }))

	//// Hi, you can search for endpoints by doing ctrl+f and typing 'ENDPOINT: ...' ////

	// ENDPOINT: GET //
	unauthGET("", (req, res) => {
		res.send("Omni API v1")
	})

	// ENDPOINT: POST //
	unauthPOST("", (req, res) => {
		res.send("fuck you posting for?...")
	})

	// // ENDPOINT: POST // horrible scary debugging endpoint don't un comment me again
	// authPOST("/me/tags/split", async (userDB, req, res) => {
	// 	userDB.data.tags.awaitForEach(async (tagID) => {
	// 		var tagDB = await DB.fetch(`tags/${tagID}`)
	// 		if (tagDB.data.tracks && tagDB.data.tracks.length > 0) {
	// 			tagDB.data.tracks = tagDB.data.tracks.map(trackEntry => {
	// 				return {id: trackEntry.id, weight: (Number(trackEntry.weight) / 2)}
	// 			})
	// 			await tagDB.write()
	// 		}
	// 	})
	// })

	// ENDPOINT: POST // horrible scary debugging endpoint don't un comment me again
	authPOST("/me/tags/remove_dupes", async (userDB, req, res) => {
		var changed_tags = []

		await userDB.data.tags.awaitForEach(async (tagID) => {
			var tagDB = await DB.fetch(`tags/${tagID}`)
			if (tagDB.data.tracks && tagDB.data.tracks.length > 0) {
				tagDB.data.tracks = tagDB.data.tracks.filter((trackEntry, ind) => {
					return (tagDB.data.tracks.findIndex(thisTrackEntry => trackEntry.id == thisTrackEntry.id) == ind)
				})
				// await tagDB.write()
			}

			changed_tags.push(tagDB.data)
		})

		res.send(changed_tags)
	})

	// ENDPOINT: POST // horrible scary debugging endpoint don't un comment me again
	authPOST("/me/tags/kill_them_all", async (userDB, req, res) => {
		var changed_tags = []

		var DB_KEYS = await DB.keys()
		var tagKeys = DB_KEYS.filter(key => key.startsWith("tags/"))

		await tagKeys.asyncForEach(async (tagKey) => {
			var tagID = tagKey.substring(5)
			await deleteTag(userDB, tagID)

			changed_tags.push(tagID)
		})

		res.send(changed_tags)
	})

	// ENDPOINT: GET //
	authGET("/related/:id", async (userDB, req, res) => {
		var trackDB = await DB.fetch(`track_tag_cache/${req.params.id}`)

		if (!Array.isArray(trackDB.data.tags)) { trackDB.data.tags = [] }

		// print(trackDB.data.tags)

		var tags_to_check = await trackDB.data.tags.awaitForEach(async (tagID) => {
			var tagDB = await DB.fetch(`tags/${tagID}`)
			// print(`${tagID}: `, tagDB.data)
			if (Object.keys(tagDB.data).filter(key => !["parents", "children"].includes(key)).length > 0) {
				var trackEntry = tagDB.data.tracks.find(thisTrackEntry => thisTrackEntry.id == req.params.id)
				return {top: true, id: tagID, weight: trackEntry.weight, children: tagDB.data.children, tracks: tagDB.data.tracks, title: tagDB.data.title}
			} else {
				await deleteTag(userDB, tagID)
				return null
			}
		})
		tags_to_check = tags_to_check.filter(entry => entry != null)
		print(tags_to_check)

		var possible_tags = []

		while (tags_to_check.length > 0) {
			var tagEntry = tags_to_check.shift()

			var children = []
			var tracks = []

			if (tagEntry.top) {
				children = tagEntry.children

				// tagEntry["tracks"] = tagEntry.tracks
			} else {	
				var tagDB = await DB.fetch(`tags/${tagEntry.id}`)

				children = tagDB.data.children,

				tagEntry["title"] = tagDB.data.title
				tagEntry["tracks"] = tagDB.data.tracks
			}

			tagEntry["tracks"] = tagEntry["tracks"].filter(trackEntry => trackEntry.id != req.params.id)
			if (!possible_tags.some(thisTagEntry => thisTagEntry.id == tagEntry.id)) {possible_tags.push(tagEntry)}

			children.forEach(childTag => {
				if (!tags_to_check.includes(childTag)) {tags_to_check.push({
					top: false,
					id: childTag,
					weight: tagEntry.weight
				})}
			})
		}

		var track_cache = {}
		var tag_cache = {}
		possible_tags.awaitForEach(async (tagEntry) => {
			tagEntry.tracks = tagEntry.tracks.remove_duplicates()
			tagEntry.tracks.awaitForEach(trackEntry => {
				if (!Object.keys(track_cache).includes(trackEntry.id)) {track_cache[trackEntry.id] = 0}
				if (!Object.keys(tag_cache).includes(trackEntry.id)) {tag_cache[trackEntry.id] = {}}
				if (!Object.keys(tag_cache[trackEntry.id]).includes(tagEntry.id)) {
					track_cache[trackEntry.id] += (tagEntry.weight * trackEntry.weight)
					tag_cache[trackEntry.id][tagEntry.id] = ({title: tagEntry.title, this_weight: tagEntry.weight, that_weight: trackEntry.weight, weighted_weight: (tagEntry.weight * trackEntry.weight)})	
				}
			})
		})

		var possible_tracks = Object.keys(track_cache).sort((a, b) => {
			return track_cache[b] - track_cache[a]
		}).map(trackID => {
			return {id: trackID, relatedness: track_cache[trackID], tag_info: tag_cache[trackID]}
		})

		res.send(possible_tracks)
	})

	// ENDPOINT: PATCH track //
	authPATCH("/track/:id/tags", async (userDB, req, res) => {
		var payload = req.body
		var trackID = req.params.id
		var trackDB = await DB.fetch(`track_tag_cache/${trackID}`)

		if (!Array.isArray(trackDB.data.tags)) { trackDB.data.tags = [] }
		
		await payload.awaitForEach(async (tagEntry) => {
			print(`${trackID}: `, tagEntry)
			var tagDB = await DB.fetch(`tags/${tagEntry.id}`)
			if (!Array.isArray(tagDB.data.tracks)) { tagDB.data.tracks = [] }

			if (tagEntry.weight > 0) {
				trackDB.data.tags.pat(tagEntry.id)
				tagDB.data.tracks = tagDB.data.tracks.filter(thisTrackEntry => thisTrackEntry.id != trackID)
				tagDB.data.tracks.push({id: trackID, weight: tagEntry.weight})
			} else {
				trackDB.data.tags = trackDB.data.tags.filter(tagID => tagID != tagEntry.id)
				tagDB.data.tracks = tagDB.data.tracks.filter(trackEntry => trackEntry.id != trackID)
			}

			await tagDB.write()
		})

		await trackDB.write()

		res.send(trackDB.data)
	})

	// ENDPOINT: PATCH tag //
	authPATCH("/tag/:id/tracks", async (userDB, req, res) => {
		var payload = req.body
		if (!Array.isArray(payload)) { payload = [payload] }

		var tagDB = await DB.fetch(`tags/${req.params.id}`)

		var to_remove = []

		await payload.awaitForEach(async (trackEntry) => {
			var trackDB = await DB.fetch(`track_tag_cache/${trackEntry.id}`)
			if (!trackDB.data.tags) { trackDB.data.tags = [] }
			if (trackEntry.weight > 0) {
				var ind = tagDB.data.tracks.findIndex(thisTrackEntry => thisTrackEntry.id == trackEntry.id)
				if (ind == -1) { // new tag entry :D (for future reference, maybe make a database class that handles all these things but for now whatever :/)
					tagDB.data.tracks.push(trackEntry)
				} else {
					tagDB.data.tracks[ind] = trackEntry
				}

				if (!Array.isArray(trackDB.data.tags)) { trackDB.data.tags = [] }
				var tagInd = trackDB.data.tags.indexOf(req.params.id)
				if (tagInd != -1) {
					trackDB.data.tags[tagInd] = req.params.id
				} else {
					trackDB.data.tags.push(req.params.id)
				}
			} else { // Removing entry
				to_remove.push(trackEntry.id)
				if (!Array.isArray(trackDB.data.tags)) { trackDB.data.tags = [] }
				trackDB.data.tags = trackDB.data.tags.filter(thisTagID => thisTagID != req.params.id)
			}

			if (trackDB.data.tags.length > 0) {
				await trackDB.write()
			} else {
				await DB.delete(`track_tag_cache/${trackEntry.id}`)
			}
			
		})

		tagDB.data.tracks = tagDB.data.tracks.filter(thisTrackEntry => !to_remove.includes(thisTrackEntry.id))

		await tagDB.write()
		
		res.send(tagDB.data)
	})
	
	// ENDPOINT: DELETE tag //
	authDELETE("/tag/:id", async (userDB, req, res) => {
		var result = await deleteTag(userDB, req.params.id)

		res.send(result)
	})

	async function deleteTag(userDB, tagID) {
		// Sync to User
		if (!Array.isArray(userDB.data.tags)) { userDB.data.tags = [] }
		var ind = userDB.data.tags.findIndex(tagID => tagID == tagID)
		if (ind != -1) {
			userDB.data.tags.remove(ind)
		}
		
		var tagDB = await DB.fetch(`tags/${tagID}`)

		var writeProms = []

		// Sync to Tracks
		var DB_KEYS = await DB.keys()

		var trackKeys = DB_KEYS.filter(key => key.startsWith("track_tag_cache/"))
		var tagKeys = DB_KEYS.filter(key => key.startsWith("tags/"))

		await trackKeys.awaitForEach(async (trackKey) => {
			var trackDB = await DB.fetch(trackKey)
			if (!Array.isArray(trackDB.data.tags)) { trackDB.data.tags = [] }

			if (trackDB.data.tags.includes(tagID)) {
				var tagInd = trackDB.data.tags.indexOf(tagID)
				trackDB.data.tags.remove(tagInd)
				
				if (trackDB.data.tags.length > 0) {
					writeProms.push(trackDB.write())
				} else {
					writeProms.push(DB.delete(trackKey))
				}
			}
		})

		// Sync to Tags
		await tagKeys.awaitForEach(async (tagKey) => {
			var thisTagDB = await DB.fetch(tagKey)

			if (!Array.isArray(thisTagDB.data.parents)) { thisTagDB.data.parents = [] }
			var tagInd = thisTagDB.data.parents.indexOf(tagID)
			if (tagInd != -1) { thisTagDB.data.parents.remove(tagInd) }

			if (!Array.isArray(thisTagDB.data.children)) { thisTagDB.data.children = [] }
			var tagInd = thisTagDB.data.children.indexOf(tagID)
			if (tagInd != -1) { thisTagDB.data.children.remove(tagInd) }

			writeProms.push(thisTagDB.write())
		})

		var reses = await Promise.all([
			DB.delete(`tags/${tagID}`),
			userDB.write(),
			Promise.all(writeProms),
		])

		return reses
	}

	// ENDPOINT: POST tag //
	authPOST("/tag", async (userDB, req, res) => {
		var userObj = userDB.data
		var {body} = req

		var newTagObj = {
			id: generateID(),
			owner: userObj.id,
			title: body.title,
			desc: body.desc,
			parents: (body.parents || []),
			children: body.children,
			tracks: body.tracks
		}

		var tagDB = await DB.fetch(`tags/${newTagObj.id}`)
		tagDB.data = newTagObj

		// Sync to User
		if (!Array.isArray(userDB.data.tags)) { userDB.data.tags = [] }
		userDB.data.tags.push(newTagObj.id)


		var writeProms = []
		// Sync to Tracks
		await body.tracks.awaitForEach(async (trackEntry) => {
			var trackDB = await DB.fetch(`track_tag_cache/${trackEntry.id}`)
			if (!Array.isArray(trackDB.data["tags"])) { trackDB.data["tags"] = [] }

			trackDB.data.tags.push(newTagObj.id)

			writeProms.push(trackDB.write())
		})

		// Sync to Children
		await body.children.awaitForEach(async (thisTagID) => {
			var thisTagDB = await DB.fetch(`tags/${thisTagID}`)
			thisTagDB.data.parents.push(newTagObj.id)

			writeProms.push(thisTagDB.write())
		})

		// Sync to Parents
		await body.parents.awaitForEach(async (thisTagID) => {
			var thisTagDB = await DB.fetch(`tags/${thisTagID}`)
			thisTagDB.data.children.push(newTagObj.id)

			writeProms.push(thisTagDB.write())
		})

		await Promise.all([
			tagDB.write(),
			userDB.write(),
			Promise.all(writeProms)
		])

		res.send(tagDB.data)
	})

	// ENDPOINT: GET me/tags //
	authGET("/me/tags", async (userDB, req, res) => {
		var tagObjs = []

		var userObj = userDB.data
		if (userObj.tags) {
			tagObjs = await Promise.all(userObj.tags.map(tag_id => DB.fetch(`tags/${tag_id}`)))
			tagObjs = tagObjs.map(tagObjs => tagObjs.data)
		}

		res.send(tagObjs)
	})

	//https://soundcloud.com/c-h-r-o-m-a/feat: SC_208762105

	// ENDPOINT: DELETE playlist/:id/tracks //
	authDELETE("/playlist/:id/tracks", async (userDB, req, res) => {
		var {body} = req
		var response = {}

		var playlistDB = await DB.fetch(`playlists/${req.params.id}`)
		if (playlistDB.data.id != null) {
			body.tracks.forEach(track_id => {
				var found = playlistDB.data.tracks.findIndex(this_id => (this_id == track_id))
				if (found != -1) { playlistDB.data.tracks.remove(found) }
			})

			await playlistDB.write()

			response = playlistDB.data
		}

		res.send(response)
	})

	// ENDPOINT: POST playlist/:id/tracks //
	authPOST("/playlist/:id/tracks", async (userDB, req, res) => {
		var {body} = req
		var response = {}

		var playlistDB = await DB.fetch(`playlists/${req.params.id}`)
		if (playlistDB.data.id != null) {
			playlistDB.data.tracks = playlistDB.data.tracks.concat(body.tracks)

			await playlistDB.write()

			response = playlistDB.data
		}

		res.send(response)
	})

	// ENDPOINT: GET me/playlists //
	authGET("/me/playlists", async (userDB, req, res) => {
		var playlistObjs = []

		var userObj = userDB.data
		if (userObj.playlists) {
			playlistObjs = await Promise.all(userObj.playlists.map(playlist_id => DB.fetch(`playlists/${playlist_id}`)))
			playlistObjs = playlistObjs.map(playlistObj => playlistObj.data)
		}

		res.send(playlistObjs)
	})

	// ENDPOINT: DELETE playlist //
	authDELETE("/playlist/:id", async (userDB, req, res) => {
		var userObj = userDB.data

		if (!Array.isArray(userDB.data.playlists)) { userDB.data.playlists = [] }
		var ind = userDB.data.playlists.findIndex(playlistID => playlistID == req.params.id)
		userDB.data.playlists.remove(ind)

		var reses = await Promise.all([
			DB.delete(`playlists/${req.params.id}`),
			userDB.write()
		])

		res.send(reses[0])
	})

	// ENDPOINT: POST playlist //
	authPOST("/playlist", async (userDB, req, res) => {
		var userObj = userDB.data
		var {body} = req

		var newPlaylistObj = {
			id: generateID(),
			owner: userObj.id,
			title: body.title,
			desc: body.desc,
			visibility: 0,
			tracks: body.tracks
		}

		var playlistDB = await DB.fetch(`playlists/${newPlaylistObj.id}`)
		playlistDB.data = newPlaylistObj

		if (!Array.isArray(userDB.data.playlists)) { userDB.data.playlists = [] }
		userDB.data.playlists.push(newPlaylistObj.id)

		await Promise.all([
			playlistDB.write(),
			userDB.write()
		])

		res.send(playlistDB.data)
	})

	// ENDPOINT: GET playlist //
	unauthGET("/playlist/:id", async (req, res) => {
		var playlistDB = await DB.fetch(`playlists/${req.params.id}`)

		res.send(playlistDB.data)
	})

	// ENDPOINT: GET library //
	authGET("/me/library", async (userDB, req, res) => {
		if (true) {
			var test_tracks = require("./soundcloud_likes.json")

			res.send(test_tracks)
		} else {
			var userObj = userDB.data

			var client_id = userObj?.auth_info?.soundcloud?.client_id
			var oauth = userObj?.auth_info?.soundcloud?.oauth

			var response = await fetch(`https://api-v2.soundcloud.com/me/track_likes/ids?limit=5000&client_id=${(client_id || "ffMw8NQS7WzQJYzQ0qvByPCqgm2EGAje")}`, {headers: {"Authorization": (oauth || "OAuth 2-294546-200230716-0URUIYJPzUgntj")}})
			var body = await response.text()

			try {
				if (!response.ok) { new Error("fuck") }

				var data = JSON.parse(body)
				var ids = data.collection
				var tracks = ids.map(id => `SC_${id}`)
				// print(ids)

				res.send(tracks)
			} catch (err) {
				res.status(404).send(`Backend Error: ${err}` )
			}
		}
	})

	// ENDPOINT: PATCH me //
	authPATCH("/me", async (userDB, req, res) => {
		var newData = Object.assign(userDB.data, req.body)

		userDB.data = newData
		await userDB.write()

		res.send(userDB.data)
	})

	// ENDPOINT: GET auth //
	authGET("/me" , (userDB, req, res) => {
		if (userDB) {
			var userObj = userDB.data
			delete userObj.password // ??? bro....
			res.send(userObj)
		} else {
			res.status(401).send("Unauthorized")
		}
	})

	// ENDPOINT: GET fetch //
	unauthPOST("/fetch", async (req, resp) => {
		var res = null;
		var input = req.body;

		if (Array.isArray(input)) { // MULTI_LOAD
			print("- multi loadings...")
			try {
				res = await multi_load(input)
				print("+ respondings...")
			} catch(err) {
				print("- Nope", err)
				res = null
			}
		} else { // OMNI_PARSE
			try {
				res = await omni_parse(input)
			} catch (err) {
				res = null
			}
			// print(res)

			if (res != null) {
				if (!Array.isArray(res.tracks)) {
					res = [res]
				} else {
					res = res.tracks
				}
			}
		}

		resp.send(res)
	})

	// ENDPOINT: POST login //
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
					res.status(401).send("Invalid username or password")
				}
			} else {
				res.status(401).send("Invalid username or password")
			}
		} else {
			 res.status(401).send("Invalid username or password")
		}
	})

	// ENDPOINT: POST signup //
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

					var GlobalDB = await DB.fetch("GLOBAL")
					GlobalDB.data.users.push({id, username: req.body.username})

					var userDB = await DB.fetch(`users/${id}`)
					userDB.data = userObj
					
					var prom1 = userDB.write()
					var prom2 = GlobalDB.write()
					
					var reses = await Promise.all([prom1, prom2])

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
		app.post("/api"+path, async (req, res) => {
			var userObj = await getUser(req.header("Authorization"))
			if (userObj) {
				func(userObj, req, res)
			} else {
				res.status(401).send("Unauthorized")
			}
		})
	}

	function authPATCH(path, func) {
		app.patch("/api"+path, async (req, res) => {
			var userObj = await getUser(req.header("Authorization"))
			if (userObj) {
				func(userObj, req, res)
			} else {
				res.status(401).send("Unauthorized")
			}
		})
	}

	function authDELETE(path, func) {
		app.delete("/api"+path, async (req, res) => {
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
			var userDBs = await getAllUsers()
			var users = userDBs.map(userDB => userDB.data.id)
			if (!err && (users.includes(decoded.id))) {
				var userDB = await DB.fetch(`users/${decoded.id}`)
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

	var keys = await DB.keys()
	
	await keys.awaitForEach(async key => {
		if (key.startsWith("users/")) {
			var userDB = await DB.fetch(key)
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