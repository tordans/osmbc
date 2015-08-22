// Exported Functions and prototypes are defined at end of file


var pg     = require('pg');
var async  = require('async');
var should = require('should');
var markdown = require('markdown').markdown;
var debug  = require('debug')('OSMBC:article');


var config    = require('../config.js');
var util      = require('../util.js');

var logModule = require('../model/logModule.js');
var pgMap     = require('../model/pgMap.js');




var listOfOpenBlog = null;


function getListOfOpenBlog(callback) {
  debug('getListOfOpenBlog');
  if (listOfOpenBlog) return callback(null,listOfOpenBlog);

  pg.connect(config.pgstring, function(err, client, pgdone) {
    if (err) {
      console.log("Connection Error")

      pgdone();
      return (callback(err));
    }
    var query = client.query('select name from "OpenBlogWithArticle"');
    debug("reading list of open blog");
    listOfOpenBlog = [];
    query.on('row',function(row) {
      debug(row.name);
      listOfOpenBlog.push(row.name);
    })
    query.on('end',function (pgresult) {    
      pgdone();
      callback(null,listOfOpenBlog);
    })
  })  
}


function Article (proto)
{
	debug("Article");
  debug("Prototype %s",JSON.stringify(proto));
	this.id = 0;
  this._meta={};
  this._meta.table = "article";
	for (k in proto) {
    this[k] = proto[k];
  }
}

function create (proto) {
	debug("create");
	return new Article(proto);
}


function createNewArticle (proto,callback) {
  debug("createNewArticle");
  if (typeof(proto)=='function') {
    callback = proto;
    delete proto;
  }
  should.not.exist(proto.id);
  var article = create(proto);
  article.save(callback);
}

function preview(edit) {
  debug(preview);
  var editLink = '';
  if (edit) editLink = ' <a href="/article/'+this.id+'">Edit</a>'; 
  if (typeof(this.markdown)!='undefined' && this.markdown!='') {
    var md = this.markdown;

    // Does the markdown text starts with '* ', so ignore it
    if (md.substring(0,2)=='* ') {md = md.substring(2,99999)};
    // Return an list Element for the blog article
    var html = markdown.toHTML(md);

    return '<li>\n'+html+editLink+'\n</li>';
  } 
  // Markdown is not defined. Return a placholder for the article
  return '<li>\n'+this.displayTitle()+editLink+'\n</li>';
}




function setAndSave(user,data,callback) {
  debug("setAndSave");
  listOfOpenBlog = null;
  var self = this;
  delete self.lock;

  async.forEachOf(data,function(value,key,callback){
    // There is no Value for the key, so do nothing
    if (typeof(value)=='undefined') return callback();

    // The Value to be set, is the same then in the object itself
    // so do nothing
    if (value == self[key]) return callback();
    
    debug("Set Key %s to value >>%s<<",key,value);
    debug("Old Value Was >>%s<<",self[key]);


    async.series ( [
        function(callback) {
           logModule.log({oid:self.id,user:user,table:"article",property:key,from:self[key],to:value},callback);
        },
        function(callback) {
          self[key] = value;
          callback();
        }
      ],function(err){
        callback(err);
      })

  },function(err) {
    if (err) return callback(err);
    self.save(callback);
  })
} 



function find(obj,order,callback) {
	debug("find");
  pgMap.find(this,obj,order,callback);
}
function findById(id,callback) {
	debug("findById %s",id);
  pgMap.findById(id,this,callback);
}

function findOne(obj1,obj2,callback) {
  debug("findOne");
  pgMap.findOne(this,obj1,obj2,callback);
}


function calculateLinks() {
  debug("calculateLinks");
  var links = [];

  if (typeof(this.collection)!='undefined') {
    var res = this.collection.match(/(http|ftp|https):\/\/([\w\-_]+(?:(?:\.[\w\-_]+)+))([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/g);
    if (res) links = links.concat(res);
  }
  if (typeof(this.markdown)!='undefined') {
    var res = this.markdown.match(/(http|ftp|https):\/\/([\w\-_]+(?:(?:\.[\w\-_]+)+))([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/g);
    if (res) links = links.concat(res);
  }
  return links;
}



function displayTitle(maxlength) {
  if (typeof(maxlength) == 'undefined') maxlength = 30;
  if (typeof(this.title)!='undefined' && this.title != "") {
    return util.shorten(this.title,maxlength)
  }
  if (typeof(this.markdown)!='undefined' && this.markdown !="") {
    return util.shorten(this.markdown,maxlength)
  }
  if (typeof(this.collection)!='undefined' && this.collection !="") {
    return util.shorten(this.collection,maxlength)
  }
  return "Empty Article";
}


function createTable(cb) {
  debug('createTable');
  createString = 'CREATE TABLE article (  id bigserial NOT NULL,  data json,  \
                  CONSTRAINT article_pkey PRIMARY KEY (id) ) WITH (  OIDS=FALSE);'
  createView = "CREATE OR REPLACE VIEW \"OpenBlogWithArticle\" AS \
             SELECT DISTINCT article.data ->> 'blog'::text AS name \
               FROM article \
                 LEFT JOIN blog ON (article.data ->> 'blog'::text) = (blog.data ->> 'name'::text) \
              WHERE (blog.data ->> 'status'::text) <> 'published'::text OR blog.data IS NULL \
              ORDER BY article.data ->> 'blog'::text;";
  pgMap.createTable('article',createString,createView,cb)
}

function dropTable(cb) {
  debug('dropTable');
  pgMap.dropTable('article',cb);
}


// Calculate a Title with a maximal length for Article
// The properties are tried in this order
// a) Title
// b) Markdown (final Text)
// c) Collection 
// the maximal length is optional (default is 30)
Article.prototype.displayTitle = displayTitle;

// Calculate all links in markdown (final Text) and collection
// there is no double check for the result
Article.prototype.calculateLinks = calculateLinks;

// Set a Value (List of Values) and store it in the database
// Store the changes in the change (history table) too.
// There are 3 parameter
// user: the user stored in the change object
// data: the JSON with the changed values
// callback
// Logging is written based on an in memory compare
// the object is written in total
// There is no version checking on the database, so it is
// an very optimistic "locking"
Article.prototype.setAndSave = setAndSave;

// save stores the current object to database
Article.prototype.save = pgMap.save;

// remove deletes the current object from the database
Article.prototype.remove = pgMap.remove;

// preview(edit)
// edit: Boolean, that specifies, wether edit links has to be created or not
// This function returns an HTML String of the Aricle as an list element.
Article.prototype.preview = preview;


// Create an Article object in memory, do not save
// Can use a prototype, to initialise data
// Parameter: prototype (optional)
module.exports.create= create;

// Creates an Article object and stores it to database
// can use a prototype to initialise data
// Parameter: Prototype (optional)
//            callback
// Prototype is not allowed to have an id
module.exports.createNewArticle = createNewArticle;

// Find an Article in database
// Parameter: object JSON Object with key value pairs to seach for
//            order  string to order the result
module.exports.find = find;

// Find an Article in database by ID
module.exports.findById = findById;

// Find one Object (similar to find, but returns first result)
module.exports.findOne = findOne;
module.exports.table = "article";

// Return an String Array, with all blog references in Article
// that does not have a "finished" Blog in database
module.exports.getListOfOpenBlog = getListOfOpenBlog;

// Create Tables and Views
module.exports.createTable = createTable;

// Drop Table (and views)
module.exports.dropTable = dropTable;

// Internal function to reset OpenBlogCash
// has to be called, when a blog is changed
module.exports.removeOpenBlogCache = function() {debug('removeOpenBlogCache');listOfOpenBlog = null}
