var should = require('should');
var debug = require('debug')('OSMBC:router:tool');
var express = require('express');
var router = express.Router();
var help = require('../routes/help.js');

var parseEvent = require('../model/parseEvent.js');

/* GET home page. */


function renderCalenderAsMarkdown(req,res,next) {
  debug('renderCalenderAsMarkdown');

  parseEvent.calenderToMarkdown(function(err,result){
    res.render('calenderAsMarkdown',{calenderAsMarkdown:result,
                                layout:res.rendervar.layout});  

  })
}


router.get('/calender2markdown', renderCalenderAsMarkdown);


module.exports.router = router;
