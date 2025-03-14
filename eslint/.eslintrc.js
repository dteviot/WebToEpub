module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "webextensions": true,
    },
    "parserOptions": {
        "ecmaVersion": 2022
    },    
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "windows"
        ],
        "no-extra-semi": [
            "off"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "off",
            "never"
        ],
    },
	"globals": {
		"zip": "readable",
	}
};