"use strict";


var lint = require("mocha-eslint");


lint(["model","notification","render","routes","util","views"], {formatter:"stylish",timeout:15000});

