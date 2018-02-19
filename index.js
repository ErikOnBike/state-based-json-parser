module.exports = (function() {

	var Parser = require("state-based-string-parser");

	// Constants
	var HEX_STRING_LENGTH = 4;
	var
		CHARACTER_BACKSPACE = 0x08,
		CHARACTER_TAB = 0x09,
		CHARACTER_CARRIAGE_RETURN = 0x0d,
		CHARACTER_LINE_FEED = 0x0a,
		CHARACTER_FORM_FEED = 0x0c,
		CHARACTER_DOUBLE_QUOTE = 0x22,
		CHARACTER_COMMA = 0x2c,
		CHARACTER_COLON = 0x3a,
		CHARACTER_CURLY_BRACE_OPEN = 0x7b,
		CHARACTER_CURLY_BRACE_CLOSE = 0x7d,
		CHARACTER_SQUARE_BRACKET_OPEN = 0x5b,
		CHARACTER_SQUARE_BRACKET_CLOSE = 0x5d,
		CHARACTER_JSON_STRING_ESCAPE = 0x5c,	// \
		CHARACTER_SOLIDUS = 0x2f,
		CHARACTER_REVERSE_SOLIDUS = 0x5c,
		CHARACTER_MINUS = 0x2d,
		CHARACTER_PLUS = 0x2b,
		CHARACTER_ZERO = 0x30,
		CHARACTER_POINT = 0x2e,
		CHARACTER_UPPER_E = 0x45,
		CHARACTER_LOWER_B = 0x62,
		CHARACTER_LOWER_E = 0x65,
		CHARACTER_LOWER_F = 0x66,
		CHARACTER_LOWER_N = 0x6e,
		CHARACTER_LOWER_R = 0x72,
		CHARACTER_LOWER_T = 0x74,
		CHARACTER_LOWER_U = 0x75
	;

	// JSON states description
	var JSON_STATES = {
		"start": {
			acceptStates: [
				function() {
					return "value";
				}
			]
		},
		"value": {
			skipWhitespace: true,
			acceptStates: [
				function(charCode, parser) {
					if(charCode === CHARACTER_CURLY_BRACE_OPEN) {
						parser.skipCharacter();
						return "begin-object";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_SQUARE_BRACKET_OPEN) {
						parser.skipCharacter();
						return "begin-array";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_DOUBLE_QUOTE) {
						parser.skipCharacter();
						return "begin-string";
					}
				},
				function(charCode) {
					if(charCode === CHARACTER_MINUS || Parser.isDigit(charCode)) {
						return "begin-number";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_T) {
						if(parser.skipString("true")) {
							parser.setValue(true);
							return "end-literal";
						}
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_F) {
						if(parser.skipString("false")) {
							parser.setValue(false);
							return "end-literal";
						}
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_N) {
						if(parser.skipString("null")) {
							parser.setValue(null);
							return "end-literal";
						}
					}
				}
			],
			errorCode: "MISSING_VALUE"
		},
		"begin-object": {
			skipWhitespace: true,
			process: function(parser) {
				parser.setValue({});
				return true;
			},
			acceptStates: [
				function() {
					return "member";
				}
			]
		},
		"end-object": {
			skipWhitespace: true,
			isFinal: true
		},
		"member": {
			skipWhitespace: true,
			acceptStates: [
				function(charCode, parser) {
					if(charCode === CHARACTER_CURLY_BRACE_CLOSE) {
						parser.skipCharacter();
						return "end-object";
					}
				},
				function(charCode) {
					if(charCode === CHARACTER_DOUBLE_QUOTE) {
						return "member-name";
					}
				}
			],
			errorCode: "MISSING_MEMBER_NAME"
		},
		"member-name": {
			process: function(parser) {

				// A string should be present as member name
				var parseResult = parser.parse();
				if(parseResult.value !== undefined) {
					parser.objectValueAddMember(parseResult.value);
					return true;
				}

				return "INVALID_MEMBER_NAME";
			},
			acceptStates: [
				function(charCode, parser) {
					if(charCode === CHARACTER_COLON) {
						parser.skipCharacter();
						return "member-value";
					}
				}
			],
			errorCode: "MISSING_COLON"
		},
		"member-value": {
			process: function(parser) {

				// A value should be present as member value
				var parseResult = parser.parse();
				if(parseResult.value !== undefined) {
					parser.objectValueAssignMemberValue(parseResult.value);
					return true;
				}

				return parseResult.errorCode;
			},
			acceptStates: [
				function(charCode, parser) {
					if(charCode === CHARACTER_CURLY_BRACE_CLOSE) {
						parser.skipCharacter();
						return "end-object";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_COMMA) {
						parser.skipCharacter();
						return "member";
					}
				}
			],
			errorCode: "INVALID_OBJECT"
		},
		"begin-array": {
			skipWhitespace: true,
			process: function(parser) {
				parser.setValue([]);
				return true;
			},
			acceptStates: [
				function(charCode, parser) {
					if(charCode === CHARACTER_SQUARE_BRACKET_CLOSE) {
						parser.skipCharacter();
						return "end-array";
					}
				},
				function() {
					return "array-element";
				}
			],
		},
		"end-array": {
			skipWhitespace: true,
			isFinal: true
		},
		"array-element": {
			process: function(parser) {

				// A value should be present as array element
				var parseResult = parser.parse();
				if(parseResult.value !== undefined) {
					parser.arrayValuePush(parseResult.value);
					return true;
				}

				return parseResult.errorCode;
			},
			acceptStates: [
				function(charCode, parser) {
					if(charCode === CHARACTER_SQUARE_BRACKET_CLOSE) {
						parser.skipCharacter();
						return "end-array";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_COMMA) {
						parser.skipCharacter();
						return "array-element";
					}
				}
			],
			errorCode: "INVALID_ARRAY"
		},
		"begin-string": {
			process: function(parser) {
				parser.setValue("");
				return true;
			},
			acceptStates: [
				function() {
					return "string-char";
				}
			]
		},
		"end-string": {
			skipWhitespace: true,
			isFinal: true
		},
		"string-char": {
			acceptStates: [
				function(charCode, parser) {
					if(charCode === CHARACTER_DOUBLE_QUOTE) {
						parser.skipCharacter();
						return "end-string";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_JSON_STRING_ESCAPE) {
						parser.skipCharacter();
						return "string-escaped-char";
					}
				},
				function(charCode, parser) {
					if(charCode > 0x001f) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "string-char";
					}
				}
			],
			errorCode: "INVALID_STRING"
		},
		"string-escaped-char": {
			acceptStates: [
				function(charCode, parser) {
					if(charCode === CHARACTER_DOUBLE_QUOTE) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "string-char";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_REVERSE_SOLIDUS) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "string-char";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_SOLIDUS) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "string-char";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_N) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(CHARACTER_LINE_FEED);
						return "string-char";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_R) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(CHARACTER_CARRIAGE_RETURN);
						return "string-char";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_T) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(CHARACTER_TAB);
						return "string-char";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_B) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(CHARACTER_BACKSPACE);
						return "string-char";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_F) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(CHARACTER_FORM_FEED);
						return "string-char";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_U) {
						parser.skipCharacter();
						return "string-unicode-char";
					}
				}
			],
			errorCode: "INVALID_ESCAPE_CHAR"
		},
		"string-unicode-char": {
			acceptStates: [
				function(charCode, parser) {
					var hexString = parser.skipHexString();
					if(hexString) {
						var unicodeCharCode = parseInt(hexString, 16);
						parser.stringValueAppendCharCode(unicodeCharCode);
						return JSONParser.isLowSurrogate(unicodeCharCode) ? "string-high-surrogate" : "string-char";
					}
				}
			],
			errorCode: "INVALID_UNICODE_HEX_STRING"
		},
		"string-high-surrogate": {
			acceptStates: [
				function(charCode, parser) {
					var hexString = parser.skipUnicodeHexString();
					if(hexString) {
						var unicodeCharCode = parseInt(hexString, 16);
						if(JSONParser.isHighSurrogate(unicodeCharCode)) {
							parser.stringValueAppendCharCode(unicodeCharCode);
							return "string-char";
						}
					}
				}
			],
			errorCode: "MISSING_HIGH_SURROGATE"
		},
		"begin-number": {
			process: function(parser) {
				parser.setValue("");
				return true;
			},
			acceptStates: [
				function(charCode, parser) {
					if(charCode === CHARACTER_MINUS) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "number";
					}
				},
				function() {
					return "number";
				}
			],
		},
		"number": {
			acceptStates: [
				function(charCode) {
					if(charCode === CHARACTER_ZERO) {
						return "number-starting-0";
					}
				},
				function(charCode) {
					if(Parser.isNonZeroDigit(charCode)) {
						return "number-integer";
					}
				}
			],
			errorCode: "INVALID_NUMBER"
		},
		"end-number": {
			skipWhitespace: true,
			process: function(parser) {
				parser.stringValueConvertToNumber();
				return true;
			},
			isFinal: true
		},
		"number-starting-0": {
			process: function(parser) {
				parser.skipCharacter();
				parser.stringValueAppendCharCode(CHARACTER_ZERO);
				return true;
			},
			acceptStates: [
				function(charCode, parser) {
					if(charCode === CHARACTER_POINT) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "begin-number-fraction";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_E || charCode === CHARACTER_UPPER_E) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "begin-number-exponent";
					}
				},
				function() {
					return "end-number";
				}
			]
		},
		"number-integer": {
			acceptStates: [
				function(charCode, parser) {
					if(Parser.isDigit(charCode)) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "number-integer";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_POINT) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "begin-number-fraction";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_E || charCode === CHARACTER_UPPER_E) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "begin-number-exponent";
					}
				},
				function() {
					return "end-number";
				}
			]
		},
		"begin-number-fraction": {
			acceptStates: [
				function(charCode, parser) {
					if(Parser.isDigit(charCode)) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "number-fraction";
					}
				}
			],
			errorCode: "INVALID_NUMBER_FRACTION"
		},
		"number-fraction": {
			acceptStates: [
				function(charCode, parser) {
					if(Parser.isDigit(charCode)) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "number-fraction";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_LOWER_E || charCode === CHARACTER_UPPER_E) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "begin-number-exponent";
					}
				},
				function() {
					return "end-number";
				}
			]
		},
		"begin-number-exponent": {
			acceptStates: [
				function(charCode, parser) {
					if(charCode === CHARACTER_MINUS) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "begin-number-exponent-digits";
					}
				},
				function(charCode, parser) {
					if(charCode === CHARACTER_PLUS) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "begin-number-exponent-digits";
					}
				},
				function(charCode) {
					if(Parser.isDigit(charCode)) {
						return "number-exponent-digits";
					}
				}
			],
			errorCode: "INVALID_NUMBER_EXPONENT"
		},
		"begin-number-exponent-digits": {
			acceptStates: [
				function(charCode, parser) {
					if(Parser.isDigit(charCode)) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "number-exponent-digits";
					}
				}
			],
			errorCode: "INVALID_NUMBER_EXPONENT"
		},
		"number-exponent-digits": {
			acceptStates: [
				function(charCode, parser) {
					if(Parser.isDigit(charCode)) {
						parser.skipCharacter();
						parser.stringValueAppendCharCode(charCode);
						return "number-exponent-digits";
					}
				},
				function() {
					return "end-number";
				}
			]
		},
		"end-literal": {
			skipWhitespace: true,
			isFinal: true
		}
	};

	// JSONParser class
	function JSONParser() {
		Parser.call(this, JSON_STATES);
	}
	JSONParser.prototype = Object.create(Parser.prototype);
	JSONParser.prototype.constructor = JSONParser;

	// Class methods
	JSONParser.isLowSurrogate = function(charCode) {
		return charCode >= 0xd800 && charCode <= 0xdbff;
	};
	JSONParser.isHighSurrogate = function(charCode) {
		return charCode >= 0xdc00 && charCode <= 0xdfff;
	};

	// Instance methods (input handling)
	JSONParser.prototype.skipHexString = function() {
		var input = this.input;
		var hexString = input.string.slice(input.index, input.index + HEX_STRING_LENGTH);
		for(var i = 0; i < HEX_STRING_LENGTH; i++) {
			if(!Parser.isHexDigit(hexString.charCodeAt(i))) {
				return "";
			}
			input.index++;
		}
		return hexString;
	};
	JSONParser.prototype.skipUnicodeHexString = function() {
		var input = this.input;
		if(input.string.charCodeAt(input.index) === CHARACTER_JSON_STRING_ESCAPE) {
			input.index++;
			if(input.string.charCodeAt(input.index) === CHARACTER_LOWER_U) {
				input.index++;
				return this.skipHexString();
			}
		}
		return "";
	};

	// Instance methods (getting/setting current value)
	JSONParser.prototype.stringValueAppendCharCode = function(charCode) {
		this.setValue(this.getValue() + String.fromCharCode(charCode));
	};
	JSONParser.prototype.stringValueConvertToNumber = function() {
		this.setValue(parseFloat(this.getValue()));
	};
	JSONParser.prototype.arrayValuePush = function(value) {
		this.getValue().push(value);
	};
	JSONParser.prototype.objectValueAddMember = function(name) {
		this.getValue()[name] = undefined;
	};
	JSONParser.prototype.objectValueAssignMemberValue = function(value) {
		var objectValue = this.getValue();

		// Iterate over all members finding the unassigned one (should be last in order of Object.keys())
		var self = this;
		Object.keys(objectValue).reverse().some(function(name) {
			/* istanbul ignore next */
			if(objectValue[name] === undefined) {
				objectValue[name] = value;
				self.setValue(objectValue);
				return true;
			}
			/* istanbul ignore next */
			return false;
		});
	};

	return JSONParser;
})();
