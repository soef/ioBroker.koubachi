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


function main() {
    
    koubachi.on('error', function (err) {
        adapter.log.info("koubachi.on error");
    }).setConfig(adapter.config.appKey, adapter.config.userCredentialsals);

    koubachi.setConfig(adapter.config.appKey, adapter.config.userCredentials);
    koubachi.getDevices(function (err, results) {
        var devices, i;
    
        if (err) return console.log('getDevices: ' + err.message);
    
        devices = {};
        for (i = 0; i < results.length; i++) {
            devices[results[i].mac_address] = results[i];
            
            adapter.log.info("Last Transmission: " + results[i].device.last_transmission);
            adapter.log.info("Next Transmission: " + results[i].device.next_transmission);

            adapter.log.info("Reading Time: " + results[i].device.recent_temperature_reading_time);
            adapter.log.info("Temperatur: " + results[i].device.recent_temperature_reading_value);
            adapter.log.info("Light Time: " + results[i].device.recent_light_reading_time);
            adapter.log.info("Light: " + results[i].device.recent_light_reading_value);

            //adapter.log.info(JSON.stringify(results[i]));
        }
    });
    
    koubachi.getPlants(function (err, results) {
        var i, plants;
        
        if (err) return console.log('getDevices: ' + err.message);
        
        plants = {};
        for (i = 0; i < results.length; i++) {
            plants[results[i].id] = results[i];
            adapter.log.info("Name: " + results[i].plant.name);
            adapter.log.info("Location: " + results[i].plant.location);
            //adapter.log.info(JSON.stringify(results[i]));
        }
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

