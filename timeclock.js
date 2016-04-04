var args = process.argv;

if (!(args.length > 2)){
	console.log("No arguments given");
	return;
}

var moment = require("moment"),
	request = require('request'),
	path = require('path'),
	cheerio = require('cheerio'),
	config = require('./config');
	
var startDate = "";
var endDate = "";
var tmpDate = "";
var makeFile = false;
var showLog = false;
var showDiff = false;
var changeUser = false;
var approxCheck = false;
var hourly = 11.293;//on average with tax
var amountDiff = 8;
var val = "";

for(var index = 2; index < args.length; index++){
	val = args[index];
	tmpDate = moment(new Date(val)).format('l');
	
	if ((tmpDate != "Invalid date") && (+moment(val).year() > 2001)){
		if(startDate == ""){
			startDate = tmpDate;
		}else if(endDate == ""){
			endDate = tmpDate;
		}
	}else{
		if (val.toUpperCase() == "WEEK"){
			startDate = moment().day("Monday").format('l');
			endDate = moment().format('l');
		}else if (val.toUpperCase() == "TODAY"){
			if(startDate == ""){
				startDate = moment().format('l');
			}else if(endDate == ""){
				endDate = moment().format('l');
			}
		}else if (val.toUpperCase() == "-F"){
			makeFile = true;
		}else if (val.toUpperCase() == "-L"){
			showLog = true;
		}else if (val.toUpperCase() == "-D") {
			showDiff = true;
			
			if(((index + 1) < args.length) && !isNaN(+args[index + 1])){
				amountDiff = +args[++index];
			}
		}else if (val.toUpperCase() == "-U") {
			changeUser = true;
			
			if((index + 1) < args.length){
				config.user.name = args[++index];
			}
		}else if (val.toUpperCase() == "-M") {
			approxCheck = true;
			
			if(((index + 1) < args.length) && !isNaN(+args[index + 1])){
				hourly = +args[++index];
			}
		}
		
	}
}

if((startDate != "") && (endDate == "")){
	endDate = startDate;
}

if((startDate == "") || (endDate == "")){
	console.log("Missing date, using today");
	startDate = moment().format('l');
	endDate = startDate;
}

if(changeUser){
	var fs = require('fs');
	fs.writeFile(path.dirname(args[1]) + '\\config.json', JSON.stringify(config), function (err) {
	  //if (err) return console.log(err);
	});
}

request.post(
	config.timeclock.timeclockReportUrl,
		{ form: {
			"date_format":'M/d/yyyy',
			'office_name':'Superior Controls',
			'group_name':'All',
			'user_name': 'All',
			'from_date': startDate,
			'to_date': endDate,
			'csv':'0',
			'tmp_paginate':'1',
			'tmp_show_details':'1',
			'tmp_display_ip':'1',
			'tmp_round_time':'0',
			'submit.x':'17',
			'submit.y':'12',
			'submit':'Edit Time'
		}
	},
	function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var $ = cheerio.load(body);
			var tables = $('body').find('table').not($('table[style="page-break-before:always;"]'));
			var tableLimit = 0;
			var table = $(tables[tableLimit]);
			
			while (((table.text()).indexOf(config.user.name) == -1) && (tableLimit < tables.length)) {
				table = $(tables[tableLimit]);
				tableLimit++;
			}
			
			if (tableLimit == tables.length){
				console.log("error finding hours");
				return;
			}
			
			var rows = table.find('tr');
			
			if(rows.length < 3){
				console.log("error finding user");
			}
			
			var lastRow ={};
			var log = "";
			
			for(var i = 0; i < rows.length; i++){
				var row = $(rows[i]);
				
				for(var innerI = 0; innerI <= 7; innerI++){
					var weekDay = moment().weekday(innerI).format('dddd');
					if(row.text().indexOf(weekDay) != -1){
						var row = $(rows[++i]);
						lastRow = row;
						log += weekDay +"\n";
						log += row.text() + "\n";
					}
				}
			}
			
			var tds = lastRow.find('td').first().find('td');
			var currentStat = $(tds[tds.length - 4]).text().trim();
			
			var hours = 0;
			var str =lastRow.next().text();
			var matchArray = str.match(/[0-9]{1,5}\.[0-9]{2}/,'')
			
			if (matchArray != null){
				hours = +matchArray[0];
			}else{
				matchArray = table.text().match(/[0-9]{1,5}\.[0-9]{2}/,'')
				if (matchArray != null){hours = +matchArray[0];}
			}
			
			if(currentStat == ""){
				currentStat = "No Activity Today";
			}
			
			if (showLog){
				console.log(log);
			}
			
			if (startDate == endDate){
				console.log("\nHours logged for " + endDate);
			}else{
				console.log("\nHours logged from " + startDate + " to " + endDate);
				matchArray = table.next().text().match(/[0-9]{1,5}\.[0-9]{2}/,'')
				if (matchArray != null){hours = +matchArray[0];}
			}
			
			console.log("Total Hours Worked: " + hours);
			console.log("Current status: " + currentStat);
			
			if(approxCheck){
				var amount = 0;
				var dayDiff = moment(endDate).diff(startDate, 'days') + 1
				var overHour = dayDiff * 8
				
				if(hourly > overHour){
					amount = (overHour * hourly) + ((hours - overHour) * 1.5 * hourly);
				}else{
					amount = (hourly * hours);
				}
				
				amount = Math.round(amount * 100) / 100;
				console.log("Made approximately " + (amount) + "$");
			}
			
			if (makeFile){
				var fs = require('fs');
				fs.writeFile('report.html', body, function (err) {
				  if (err) {
					console.log("Error making file: " + err.message);					
				  }
				});
			}
			if(showDiff){
				var diffHours = (amountDiff - hours);
				console.log("\You will have " + amountDiff  + " hours by: " + moment().add(diffHours, "hour").format('M-D-YYYY h:mma'));
			}
		}else{
			console.log("Error, response was disconnected");
		}
	}
);