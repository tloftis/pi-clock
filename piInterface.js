'use strict';

var monitoredPins = {};//Holds callbacks for when pins change state
var timeclock = require('./index-fake.js'),
    g = require('wiring-pi'),
    async = require('async');

g.setup('gpio');

//This monitores the pins held by the monitoredPins array checking them every 10 ms
var inputInterval = setInterval(function(){
    //The key is the pin number
    for(var key in monitoredPins){
        monitoredPins[key].inter(g.digitalRead(+key));
    }
}, 25);

function digChange(pin, funct){
    pin = +pin; //this is here to make sure nothing gets changed out of scope, although that should only happen if it is an obj

    //If the pin is already being monitored then just add to the list of callbacks
    if(monitoredPins[pin]){
        monitoredPins[pin].functs.push(funct);
    }else{
        //Here the pin is set to be an input by hardware, a var past is made to store the state last read by the software
        //a interval will come by and call inter giving the current state of the pin as input, that is compared with the past value
        //If they don't match, then the state must have changed, call all calbacks, then update the past var to the new val
        g.pinMode(pin, g.INPUT);
        monitoredPins[pin] = {};
        var past = +g.digitalRead(pin);

        //just feed this function with the pins current state and it will fire and update if it had changed
        monitoredPins[pin].inter = function(now){
            if(now !== past){
                for(var i = 0; i < monitoredPins[pin].functs.length; i++){
                    monitoredPins[pin].functs[i](now);
                }

                past = now;
            }
        };

        monitoredPins[pin].functs = [funct];
    }

    //Returns a function that when called removes the callback and returns the callback function
    return function removeCallback(){
        var index = monitoredPins[pin].functs.indexOf(funct);
        if(index !== -1){
            monitoredPins[pin].functs.splice(index, 1);

            if(!monitoredPins[pin].functs.length){
                delete monitoredPins[pin];
            }
        }

        //Remove the operation of this function so it can't be repeatedly called and then return
        //removeCallback = function(){};
        return funct;
    };
}

function outputSetup(pin){
    pin = +pin;
    var lastVal = 0;
    g.pinMode(pin, g.OUTPUT);

    return {
        set: function(val){
            lastVal = +val;
            g.digitalWrite(pin, lastVal);
        },
        toggle: function(){
            lastVal = !lastVal;
            g.digitalWrite(pin, +lastVal);
        }
    };
}

function flashingLed(pin){
    var output = outputSetup(pin);
    var interval = false;

    function clearItter(){
        if(interval){
            clearInterval(interval);
            interval = false;
        }
    }

    return {
        pulse: function(rate){
            clearItter();

            interval = setInterval(function(){
                output.toggle();
            }, rate);
        },
        off: function(){
            clearItter();
            output.set(0);
        },
        on: function(){
            clearItter();
            output.set(1);
        }
    };
}

var statusLed = flashingLed(4);
var connected = false;
var connectionTesting = false;
var pulseRate = 333;

function setupConnection(){
    if(connectionTesting){
        return;
    }

    statusLed.pulse(pulseRate);

    connectionTesting = setInterval(function(){
       timeclock.test(function(val){
           if(val){
               connected = true;
               statusLed.on();
               clearInterval(connectionTesting);
               connectionTesting = false;
           }else{
               connected = false;
               statusLed.pulse(pulseRate);
           }
       })
    }, 2000)
}

digChange(3, function(){
    console.log('Dig change, Login');

    if(connected) {
        timeclock.login(function (val) {
            if (!val) {
                setupConnection();
            }
        });
    }
});

digChange(2, function(){
    console.log('Dig change, lunch');

    if(connected) {
        timeclock.lunch(function (val) {
            if (!val) {
                setupConnection();
            }
        });
    }
});

digChange(15, function(){
    console.log('Dig change, logout');

    if(connected) {
        timeclock.logout(function (val) {
            if (!val) {
                setupConnection();
            }
        });
    }
});

setupConnection();
