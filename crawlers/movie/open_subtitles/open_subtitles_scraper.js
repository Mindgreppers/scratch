var request = require('request'),
fs = require('fs'),
rp = require('request-promise'),
Q = require('q')
async = require("async")

var base_url = "http://www.opensubtitles.org/",//base url
srt_dl_base_url = "http://dl.opensubtitles.org/en/download/file/"
/**
* Extracts subtitles for given imdbId and stores in storage_dir/imdbId/<subtitle_id>.srt files
* @param imdbid the id of movie on imdb.com
* @param storage_dir the directory in which to store the extracted subtitle files
**/
var scrape=function(imdbid, storage_dir){
	var original_imdbid = imdbid,
	imdbid = imdbid.indexOf("tt") > -1? imdbid.substr(2):imdbid,
	storage_path = storage_dir+"/"+original_imdbid,
	url=base_url+'en/search/sublanguageid-eng/imdbid-'+imdbid;
	if (!fs.existsSync(storage_path)){
    fs.mkdirSync(storage_path,0744);
	}
	
	return download(url,200).//First get all the seach results for given imdb id
	then(function (response) {
			var regExp = /onclick="servOC\(\d+,'([^,^']+)',/ig
			var match, srt_details_urls =[]
			while(match = regExp.exec(response.body)) {//For every result, expand the result to find the details about the result which contain the download url 
				srt_details_urls.push(base_url+match[1])
			}
			if(srt_details_urls.length) {
				
				return downloadEachSeries(srt_details_urls,200)
			}
			else 
				return Q()
	}).
	then(function(srts_details){
    var num_downloaded=0;
		if(!srts_details || !srts_details.length) {
			console.log("lost srts details")
			return Q(0)
		}
		else {
			return srts_details.reduce(function(soFar,srt_details){//Now for every url, download and save the file
				if (srt_details.statusCode == 200) {	
					var match = /file\/(\d+)/i.exec(srt_details.body)
					if(!match){
						return soFar;//From the detail get the url
					}	
					var str_dl_url = srt_dl_base_url + match[1]
					return soFar.
					then(function(){return download(str_dl_url,200)}).
					then(function(response){//save the srt file
						if(response.statusCode == 200) {
							console.log('downloaded from srt dl url ', str_dl_url) 
							fs.writeFile(storage_path + "/"+match[1] +".txt",response.body)
              num_downloaded++
						} else {
							console.log("could not download srt from url ", srt_dl_url, response.statusCode)
						}
					})
				} else {//Just ignore and log the error.
					console.log("Could not download srt details from url" + response.statusCode + " in url " + srt_details)
					return soFar
				}
				
			},
			Q()).then(function(){
        return num_downloaded 
      })
		
		}
	})
}

var download = function(url,timeout) {//download take a two parameters url and timeout and then scrape data of url
	if(!timeout) {
		return rp({url:url,resolveWithFullResponse: true})
	} else {	
		var deferred = Q.defer()
		rp({url:url,resolveWithFullResponse: true}).
		then(
			function(res){
				setTimeout(
					function(){
						deferred.resolve(res)
					},
					timeout
				)
			},
			function(err) {
				deferred.reject(err)
				console.log("error in downloading url in download ", url, timeout)
			}
		)
		return deferred.promise
	}
}

var downloadEachSeries = function(urls, timeout, throwErr) {
	var downloads = []
	return urls.reduce(
		function(soFar, url){
			return soFar.then(function(){
				return download(url,timeout).
				then(function(res) {
					downloads.push(res)
					return downloads
				})
			})
		},
		Q()
	)
}

module.exports = scrape
//exports.scrape = true;
if(require.main === module) {
	scrape("0418455","/tmp").
	then(function(res){console.log(res.length)})
	//downloadEachSeries(['http://www.google.com','http://www.metataste.com'])
	//.then(function(res){console.log(res.length)})
}	
