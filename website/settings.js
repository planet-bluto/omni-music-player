var settings = {}
////////////////////////////////////////////////////////////////

var _settings_schema = {}

_settings_schema["Login"] = {header: true}
_settings_schema["Login"]["SoundCloud Access Token"] = InputString("token")
_settings_schema["Login"]["SoundCloud Client ID"] = InputString("client_id")

_settings_schema["Drop Down"] = InputDropDown(["Yes", "No", "Maybe-so", "kys"])

_settings_schema["Steal your information?"] = InputCheckbox(true)

////////////////////////////////////////////////////////////////

function InputBase(type) {
	return {type: type, value: null}
}

function InputString(placeholder, value = "") {
	var _inp = InputBase("string")
	_inp["placeholder"] = placeholder
	_inp["value"] = value
	return _inp
}

function InputSlider(min, max, value = 0) {
	var _inp = InputBase("slider")
	_inp["min"] = min
	_inp["max"] = max
	_inp["value"] = value
	return _inp
}

function InputCheckbox(value = true) {
	var _inp = InputBase("checkbox")
	_inp["value"] = value
	return _inp
}

function InputDropDown(options = [], value = options[0]) {
	var _inp = InputBase("drop-down")
	_inp["options"] = options
	_inp["value"] = value
	return _inp
}

////////////////////////////////////////////////////////////////

Object.keys(_settings_schema).forEach(key => {
	var res = _settings_schema[key]
	if (res.header == true) {
		settings[key] = {}
		Object.keys(res).forEach(sub_key => {
			print("CHECKINGS: ", sub_key)
			if (sub_key == "header") { return }
			settings[key][sub_key] = _settings_schema[key][sub_key].value
		})
	} else {
		settings[key] = _settings_schema[key].value 
	}
})

print("Settings Loaded:", settings)