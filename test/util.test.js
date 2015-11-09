var util = require('../util.js');
var should = require('should');

describe('util',function() {
  describe('shorten', function () {
    it('should return empty string for undefined',function(bddone) {
      should(util.shorten()).equal("");
      var t;
      should(util.shorten(t)).equal("");
      should(util.shorten(t,25)).equal("");
      bddone();
    })
    it('should not shorten small strings',function(bddone){
      should(util.shorten("Short Test String")).equal("Short Test String");
      should(util.shorten("Short Test String",20)).equal("Short Test String");
      bddone();
    })
    it('should shorten long strings',function(bddone){
      should(util.shorten("This is a long string that will not fit on a web page table, so please shorten it")).equal("This is a long string that wil...");
      should(util.shorten("Extreme Test",1)).equal("E...");
      bddone();
    })
  })
  describe('isURL', function() {
    it('should recognise some urls',function() {
      should(util.isURL("https://www.google.de")).is.True();
      should(util.isURL("http://www.google.de/test")).is.True();
      should(util.isURL("http://www.google.de/test?param=ADSFASF&d=asdfa")).is.True();
    })
    it('should sort Not Urls out',function() {
      should(util.isURL("Wort")).is.False();
      should(util.isURL("Mehr Text mal am stück")).is.False();
    })
    it('should return a regex',function() {
      should((util.isURL() instanceof RegExp)).is.True();
    })
    it('should return false for markdown', function() {
      should((util.isURL('On October 8th, 2015 [Locus](http://www.locusmap.eu/) version [3.13.1](http://www.locusmap.eu/news-version-3-13.0/) was released.'))).is.False();
    })
  })
})