// Settings Rendering
////////////////////////////////////////////////////////////////////////////////

function generateSettings() {
	Settings._tree = []

	Settings.Header("💽 Services 💽")
	Settings.SubHeader("Soundcloud")
	Settings.INDEX(["auth_info", "soundcloud"])
	Settings.InputString("client_id", "", "Client ID", true)
	Settings.InputString("oauth", "", "OAuth Token", true)
	Settings.SubHeader("YouTube")
	Settings.INDEX(["settings", "youtube"])
	// Settings.InputString("oauth", "", "OAuth Token", true)
	Settings.InputCheckbox("remove_-_topic_from_author_name", true)
	Settings.SubHeader("Bandcamp")
	Settings.INDEX(["auth_info", "bandcamp"])
	Settings.InputString("oauth", "", "OAuth Token", true)

	Settings.Header("📎 Tagging 📎")
	// Settings.SubHeader("🟠 Soundcloud 🟠")
	Settings.INDEX(["settings"])
	Settings.InputRange("tag_default_weight", 0.5, 0, 1, 0.05)
	// Settings.InputString("oauth", "", "OAuth Token", true)
}

async function renderSettings() {
	var main_elem = new Elem("main")

	await OmniAPI.ME()
	Settings._tree.forEach(obj => {
		if (!["header", "sub_header"].includes(obj.type)) {
			obj = Object.assign(obj, {
				full_index: [...obj.index, obj.key],
				fancy_key: obj.key.split("_").map(word => {word = word.split(""); var first_letter = word.shift(); return [first_letter.toUpperCase(), ...word].join("")}).join(" ")
			})

			var potential_value = getFromPath(OmniAPI.user, obj.full_index)
			if (potential_value != null) {
				obj.default_value = potential_value
			}
		}
		var elem = obj.render(obj)
		main_elem.addChild(elem)
	})
}

// Settings const
////////////////////////////////////////////////////////////////////////////////

var Settings = {
	_tree: [],
	curr_index: "settings",
	INDEX: index => { Settings.curr_index = index },
	Header: (text) => { Settings._tree.push({type: "header", render: HeaderElem, text}) },
	SubHeader: (text) => { Settings._tree.push({type: "sub_header", render: SubHeaderElem, text}) },
	InputString: (key, default_value, placeholder = null, password = false) => {
		Settings._tree.push({type: "string", index: Settings.curr_index, render: InputStringElem, key, default_value, placeholder, password})
	},
	InputRange: (key, default_value, min, max, step) => {
		Settings._tree.push({type: "range", index: Settings.curr_index, render: InputRangeElem, key, default_value, min, max, step})
	},
	InputDropDown: (key, default_value, choices = []) => {
		Settings._tree.push({type: "drop_down", index: Settings.curr_index, render: InputDropDownElem, key, default_value, choices})
	},
	InputCheckbox: (key, default_value) => {
		Settings._tree.push({type: "checkbox", index: Settings.curr_index, render: InputCheckboxElem, key, default_value})
	},
}


// Setting Inputs => HTML Elements:
////////////////////////////////////////////////////////////////////////////////

function HeaderElem(obj) {
	var header_elem = new Elem("p")
	header_elem.text = obj.text
	header_elem.classes.add("settings-header")

	return header_elem
}

function SubHeaderElem(obj) {
	var sub_header_elem = new Elem("p")
	sub_header_elem.text = obj.text
	sub_header_elem.classes.add("settings-sub-header")

	return sub_header_elem
}

function InputBaseElem(obj) {
	var div_elem = new Elem("div")
	div_elem.classes.add("settings-div")

	var label = new Elem("p")
	label.classes.add("settings-label")
	label.text = `${obj.fancy_key}: `

	var input = new Elem("input")
	input.classes.add("settings-input")

	function update() {
		var template = merge(OmniAPI.user, obj.full_index, input.value)
		print(`${obj.fancy_key}: `, template)
		OmniAPI.PATCH(`/me`, template).then(userObj => {
			print("Updated!", userObj)
			showToast(`Settings updated!`)
		})
	}
	// input.on("input", e => { update() })
	input.on("change", e => { update() })

	div_elem.addChild(label)
	div_elem.addChild(input)

	if (obj.default_value) { setTimeout(() => {input.value = obj.default_value}, 1) }

	return {div_elem, input, label}
}

function InputStringElem(obj) {
	var {div_elem, input, label} = InputBaseElem(obj)

	if (obj.placeholder) { input.setAttr("placeholder", obj.placeholder) }
	if (obj.default_value) { input.value = obj.default_value }
	if (obj.password) { input.setAttr("type", "password") }

	return div_elem
}

function InputRangeElem(obj) {
	var {div_elem, input, label} = InputBaseElem(obj)

	input.setAttr("type", "range")
	input.setAttr("min", obj.min)
	input.setAttr("max", obj.max)
	input.setAttr("step", obj.step)

	return div_elem
}

function InputDropDownElem(obj) {
	var input = new Elem("input")

	input

	return input
}

function InputCheckboxElem(obj) {
	var {div_elem, input, label} = InputBaseElem(obj)

	input.setAttr("type", "checkbox")
	if (obj.default_value) { input.checked = obj.default_value }
	// input.setAttr("type", "checkbox")

	return div_elem
}

// Utility Functions :D
////////////////////////////////////////////////////////////////////////////////

function makeTemplate(keys, value) {
	keys = keys.reverse()
	var curr_obj = {}
	keys.forEach((key, ind) => {
		if (ind > 0) {
			var this_obj = {}
			this_obj[key] = curr_obj
			curr_obj = this_obj
		} else {
			curr_obj[key] = value
		}
	})

	return curr_obj
}

// Then you use Object.assign in the backend >:)

function getFromPath(obj, this_path) {
    var value = obj

    for (var i = 0; i < this_path.length; i++) {
    	var key = this_path[i]

    	value = value[key]
        if (value == null) { break }
    }

    return value
}

function merge(obj, path, value) {
	var curr_obj = {}

	var dupe_path = JSON.parse(JSON.stringify(path))
	var this_last_key = dupe_path.pop()
	curr_obj = getFromPath(obj, dupe_path)
	if (curr_obj != null) {
		curr_obj[this_last_key] = value
		return makeTemplate(dupe_path, curr_obj)
	} else {
		return makeTemplate(path, value)
	}
}