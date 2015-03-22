var async = require("async")
var scrape_module =require("/home/pankaj/maui/maui/data/automatic_tagging/open_subtitles.org/open_subtitles_scraper.js")
var databaseUrl = "testdata";
var collections = ["testdata"]
var db = require("mongojs").connect(databaseUrl, collections);
db.testdata.distinct("uid",{num_subtitle:{$exists:false}},function (err, uids) {//if status_exit is false then get uids from database 
	if(err){
		 console.log("error occure");//if err the print an error
	}
  async.eachLimit(uids, 1, function(uid, item_cb){
    if(uid){
    	scrape_module(uid ,"/tmp").
      then(function(res){
        if(res) {//if res then update database
          console.log(res)
          console.log("saved ", console.log(res), "subtitles for ", uid)
          db.testdata.update( { "uid": uid},    { $set: { num_subtitle: res} } )
        }
        else {//else then also update database but update 0.
          console.log("did not find any subtitles for ", uid)
          db.testdata.update( { "uid": uid},    { $set: { num_subtitle: (res && res.length) || 0} } )
          setTimeout(item_cb,500)
        }
      }).
      done()
console.log()
		}
	},
  function(err){
      console.log("all done")
  })
})
