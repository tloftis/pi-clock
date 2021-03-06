function sendNewStat(stat, callback) {
    if(stat != 'lunch'){
        setTimeout(function(){
            callback(false);
        }, 1750);
    }else{
        setTimeout(function(){
            callback(true);
        }, 2000);
    }
}

var int = 0;

function testForTimeclock(callback){
    int++;

    if(int < 2){
        setTimeout(function(){
            callback(false);
        }, 1750);
    }else{
        setTimeout(function(){
            callback(true);
        }, 2000);
    }
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
