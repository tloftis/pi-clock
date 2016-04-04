var args = process.argv;

if (!(args.length > 2)){
	console.log("No arguments given");
	return;
}

var config = require('./config.json');

var request = require('request'),
    cheerio = require('cheerio');

var upperLim = 150;
var fullName = config.user.name;
var userName = config.user.name;
var stat = "";
var note = "";
var makeFile = false;
var val = "";

for(var index = 2; index < args.length; index++){
	val = args[index];
	
	if (val.toUpperCase() == "-N"){
		note = args[++index];
	}else{
		stat = val.toLowerCase();
	}
};

if((stat != 'in') && (stat != 'out') && (stat != 'lunch') && (stat != 'break')){
	console.log("Status not found, must be 'in', 'out', 'lunch' or 'break'")
	return;
}

request.post(
	config.timeclock.timeclockUrl,
		{ form: {
			"left_notes":note,
			'left_inout':stat,
			'left_displayname': userName,
			'left_fullname': fullName
		}
	},
	function (error, response, body) {
		if (!error && response.statusCode == 200) {

			var $ = cheerio.load(body);
			var rows = $('tr').find('.display_row');
			var limit = 0;
			var row = rows.first();
			
			while (((row.text()).indexOf(fullName) == -1) && (limit < upperLim)) {
				row = row.next();
				limit++;
			}
			
			if (limit == upperLim){
				console.log("error finding hours");
				return;
			}
			
			console.log(row.text());
		}else{
			console.log("Error, response was disconnected");
		}
	}
);