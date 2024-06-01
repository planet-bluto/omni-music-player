var Form = {
	_eid: 0,
	_entries: {},
	Header: (text) => {
		var elem = new Elem("p")
		elem.classes.add("form-header")
		elem.text = text


		return {type: "static", elem}
	},
	SubHeader: (text) => {
		var elem = new Elem("p")
		elem.classes.add("form-sub-header")
		elem.text = text


		return {type: "static", elem}
	},
	Label: (text) => {
		var elem = new Elem("p")
		elem.classes.add("form-label")
		elem.text = text


		return {type: "static", elem}
	},
	InputString: (key, opts) => {
		var eid = String(Form._eid)
		Form._eid += 1

		var input = new Elem("input")
		input.classes.add("form-input")
		input.classes.add("form-input-string")
		
		if (opts.placeholder) { input.setAttr("placeholder", opts.placeholder) }

		input.on("change", e => {
			Form._entries[eid] = {key, value: input.value, fufilled: (input.value != "" && input.value != null)}
		})

		Form._entries[eid] = {key, value: input.value}

		return {type: "input", elem: input, eid, required: (opts.required != null ? opts.required : true)}
	},
	InputBoolean: (key, opts = {}) => {
		var eid = String(Form._eid)
		Form._eid += 1

		var input = new Elem("input")
		input.classes.add("form-input")
		input.classes.add("form-input-checkbox")
		input.elem.type = "checkbox"

		input.on("change", e => {
			Form._entries[eid] = {key, value: e.target.checked, fufilled: true}
		})

		Form._entries[eid] = {key, value: input.elem.checked}

		return {type: "input", elem: input, eid, required: false}
	},
	InputRange: (key, opts) => {
		var eid = String(Form._eid)
		Form._eid += 1

		var input = new Elem("input")
		input.classes.add("form-input")
		input.classes.add("form-input-range")
		input.elem.type = "range"
		
		if (opts.min) { input.setAttr("min", String(opts.min)) }
		if (opts.max) { input.setAttr("max", String(opts.max)) }
		if (opts.step) { input.setAttr("step", String(opts.step)) }
		if (opts.value) { input.elem.value = opts.value }

		input.on("change", e => {
			Form._entries[eid] = {key, value: input.value, fufilled: true}
			input.elem.title = input.value
		})

		Form._entries[eid] = {key, value: input.value}
		input.elem.title = input.value

		return {type: "input", elem: input, eid, required: false}
	},
}