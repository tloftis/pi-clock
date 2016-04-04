var moment = require("moment"),
    request = require('request'),
    path = require('path'),
    cheerio = require('cheerio'),
    config = require('./config');

var upperLim = 150;
var fullName = config.user.name;
var userName = config.user.name;

function sendNewStat(stat, callback) {
    if((stat != 'in') && (stat != 'out') && (stat != 'lunch') && (stat != 'break')){
        console.log("Status not found, must be 'in', 'out', 'lunch' or 'break'");
        return;
    }

    request.post(
        config.timeclock.timeclockUrl,
        {
            form: {
                "left_notes": "",
                'left_inout': stat,
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

                if (limit == upperLim) {
                    callback(false);
                    return;
                }

                callback(true);
                console.log(row.text());
            } else {
                console.log("Error, response was disconnected");
            }
        }
    );
}

function testForTimeclock(callback){
    var startDate = moment().format('l');
    var endDate = startDate;

    request.post(
        config.timeclock.timeclockReportUrl,
        {
            form: {
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
                callback(true);
            }else{
                callback(false);
            }
        }
    );
}

module.exports = {
    login: function(callback){
        sendNewStat('in', callback)
    },
    logout: function(callback){
        sendNewStat('out', callback)
    },
    lunch: function(callback){
        sendNewStat('lunch', callback)
    },
    break: function(callback){
        sendNewStat('break', callback)
    },
    test: function(callback){
        testForTimeclock(callback);
    }
};