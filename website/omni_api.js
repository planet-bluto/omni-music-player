var OmniAPI = {
	_token: localStorage.getItem("token"),
	loggedIn: false,
	user: null,
	ME: async () => {
		var response = await fetch(`/api/me`, {
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${OmniAPI._token}`,
			}
		})

		if (response.ok) {
			var payload = await response.json()

			OmniAPI.user = payload
			loggedIn = true
		} else {
			OmniAPI.user = null
			loggedIn = false
		}
	},
	GET: async (path) => {
		var response = await fetch(`/api${path}`, {
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${OmniAPI._token}`,
			}
		})
		var payload = await response.json()

		await OmniAPI.ME()

		return payload
	},
	POST: async (path, data) => {
		var response = await fetch(`/api${path}`, {
			method: "POST",
			body: JSON.stringify(data),
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${OmniAPI._token}`,
			}
		})
		var payload = await response.json()

		await OmniAPI.ME()

		return payload
	},
	PATCH: async (path, data) => {
		var response = await fetch(`/api${path}`, {
			method: "PATCH",
			body: JSON.stringify(data),
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${OmniAPI._token}`,
			}
		})
		var payload = await response.json()

		await OmniAPI.ME()

		return payload
	},
	DELETE: async (path, data) => {
		var response = await fetch(`/api${path}`, {
			method: "DELETE",
			body: JSON.stringify(data),
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${OmniAPI._token}`,
			}
		})
		var payload = await response.json()

		await OmniAPI.ME()

		return payload
	},
}