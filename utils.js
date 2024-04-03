'use strict';

var utils = require('jotai/vanilla/utils');
var utils$1 = require('jotai/react/utils');



Object.keys(utils).forEach(function (k) {
	if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function () { return utils[k]; }
	});
});
Object.keys(utils$1).forEach(function (k) {
	if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function () { return utils$1[k]; }
	});
});
