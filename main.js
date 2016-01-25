"use strict";

var utils = require(__dirname + '/lib/utils'),
    Koubachi = require('koubachi'),
    koubachi = new Koubachi.Koubachi();

var adapter = utils.adapter({
    name: 'koubachi',
    
    unload: function (callback) {
        try {
            callback();
        } catch (e) {
            callback();
        }
    },
    discover: function (callback) {
        //adapter.log.info("adapter koubachi discovered");
    },
    install: function (callback) {
        //adapter.log.info("adapter koubachi installed");
    },
    uninstall: function (callback) {
        //adapter.log.info("adapter koubachi uninstalled");
    },
    //objectChange: function (id, obj) {
    //    //adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
    //},
    //stateChange: function (id, state) {
    //    //adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));
    //},
    ready: function () {
        main();
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function setObject(name, stateName, device, callback) {
    adapter.setObject(name + '.' + stateName, {
        type: 'state',
        common: {
            name: name,
            role: 'state',
            type: typeof device.val,
            write: false,
        },
        native: {}
    }, callback);
}

function setState(name, stateName, device, callback) {
    if (typeof device !== 'object') return;
    adapter.setState(name + '.' + stateName, { val: device[stateName], ack: true });
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var devices = {};
var plants = {};

var deviceStateNames = [
    "number_of_readings",
    "virtual_battery_level",
    "last_transmission",
    "next_transmission",
    "associated_since",
    "recent_soilmoisture_reading_value",
    "recent_soilmoisture_reading_time",
    "recent_temperature_reading_value",
    "recent_temperature_reading_time",
    "recent_light_reading_value",
    "recent_light_reading_time",
];

var plantStateNames = [
    "created_at",
    "id",
    "last_mist_at",
    "last_water_at",
    "location",
    "name",
    "updated_at",
    "vdm_water_pending",
    "vdm_water_level",
    "vdm_mist_pending",
    "vdm_mist_level",
    "vdm_fertilizer_pending",
    "vdm_fertilizer_level",
    "vdm_temperature_pending",
    "vdm_temperature_level",
    "vdm_light_pending",
    "vdm_light_level"
];

function createPlant(deviceName, plant, callback) {
    if (!plant) return;
    var states = [];
    var name = deviceName + '.' + plant.name;
    
    function addState() {
        if (states.length) {
            var stateName = states.pop();
            setObject(name, stateName, plant, function (err, obj) {
                setState(name, stateName, plant);
                setTimeout(addState(), 0);
            });
        } else {
            if (callback) callback(0);
        }
    }
    
    adapter.setObject/*NotExists*/(name, {
        type: 'channel', 
        common: {
            name: name, 
            role: 'device'
        },
        native: {}
    }, function (err, obj) {
        for (var i = 0; i < plantStateNames.length; i++) states.push(plantStateNames[i]);
        addState();
    });
}


function createDevice(device, callback) {
    if (!device) return;
    var states = [];
    var name = device.mac_address;

    function addState() {
        if (states.length) {
            var stateName = states.pop();
            var fullName = name + '.' + stateName;
            setObject(name, stateName, device, function (err, obj) {
                setState(name, stateName, device);
                setTimeout(addState(), 0);
            });
        } else {
            if (device.plants.length) createPlant(name, plants[device.plants[0].id], callback);
        }
    }
    
    adapter.setObject/*NotExists*/(name, {
        type: 'device', 
        common: {
            name: device.plants.length ? plants[device.plants[0].id].name : name, 
            role: 'device'
        },
        native: {}
    }, function (err, obj) {
        adapter.log.debug("Device " + obj.id + " created, adding States...")
        for (var i = 0; i < deviceStateNames.length; i++) states.push(deviceStateNames[i]);
        addState();
    });
}

var nextReadingTime = new Date().getTime() + 24 * 60 * 60 * 1000;
var nextIntervall = 120 * 60 * 1000;

function checkIntervall() {
    var next = nextReadingTime;
    var now = new Date().getTime();
    for (var i in devices) {
        var date = new Date(devices[i].next_transmission);
        if ((next > date.getTime()) && (date.getTime() > now)) {
            next = date.getTime();
        };
    }
    if (next != nextReadingTime) {
        nextReadingTime = next;
        nextIntervall = nextReadingTime - now + 5000;
        if (nextIntervall < 1000) nextIntervall = 10000;
        //var s = adapter.formatDate(new Date(nextReadingTime), "YYYY-MM-DD hh:mm:ss");
        var s = adapter.formatDate(new Date(now + nextIntervall), "YYYY-MM-DD hh:mm:ss");
        adapter.log.info("Next Intervall: " + s);
    }
}


function updateStates(callback) {

    koubachi.getPlants(function (err, results) {
        if (err) return;
        var newPlants = {};
        
        for (var i = 0; i < results.length; i++) {
            newPlants[results[i].plant.id] = results[i].plant;
        }
        koubachi.getDevices(function (err, results) {
            if (err) return;
            
            for (var j = 0; j < results.length; j++) {
                var device = results[j].device;
                var id = device.mac_address;
                for (var i in deviceStateNames) {
                    var stateName = deviceStateNames[i];
                    if (devices[id][stateName] !== device[stateName]) {
                        devices[id][stateName] = device[stateName];
                        setState(id, stateName, device);
                    }
                }
                if (!device.plants.length) continue;
                var plant = newPlants[device.plants[0].id];
                id += '.' + plant.name;
                for (var i in plantStateNames) {
                    var stateName = plantStateNames[i];
                    if (plants[device.plants[0].id][stateName] !== plant[stateName]) {
                        plants[device.plants[0].id][stateName] = plant[stateName];
                        setState(id, stateName, plant);
                    }
                }
            }
            checkIntervall();
            if (nextIntervall) {
                setTimeout(updateStates, nextIntervall);
            }
        });
    });
    //if (adapter.config.intervall) {
    //    setTimeout(updateStates, adapter.config.intervall * 1000 * 60);
    //}
}



function main() {
    
    koubachi.on('error', function (err) {
        adapter.log.error("koubachi.on error");
    }); //.setConfig(adapter.config.appKey, adapter.config.userCredentialsals);

    koubachi.setConfig(adapter.config.appKey, adapter.config.userCredentials);
    koubachi.getPlants(function (err, results) {
        if (err) return adapter.log.error('getDevices: ' + err.message);
        
        for (var i = 0; i < results.length; i++) {
            plants[results[i].plant.id] = results[i].plant;
        }
        koubachi.getDevices(function (err, results) {
            if (err) return adapter.log.error('getDevices: ' + err.message);
            
            for (var i = 0; i < results.length; i++) {
                devices[results[i].device.mac_address] = results[i].device;
                createDevice(results[i].device);
            }
            setTimeout(updateStates, 10000);
        });
    });
    
    
    //koubachi.getTasks(plantID, function (err, results) {
    //    var i;
    //    if (err) return console.log('getTasks: ' + err.message);
    //    for (i = 0; i < results.length; i++) {
    //    }
    //});
    
    //koubachi.getReadings(plantID, function (err, results) {
    //    var i;
    //    if (err) return console.log('getReadings: ' + err.message);
        
    //    for (i = 0; i < results.sensors.length; i++) {
    //    }

    //});
    
    //adapter.subscribeStates('*');
}

