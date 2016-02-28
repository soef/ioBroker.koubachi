"use strict";

var utils = require(__dirname + '/lib/utils'),
    Koubachi = require('koubachi'),
    koubachi = new Koubachi.Koubachi();

var soef = require(__dirname + '/lib/soef'),
    g_devices = soef.Devices();

var adapter = utils.adapter({
    name: 'koubachi',
    
    unload: function (callback) {
        try {
            callback();
        } catch (e) {
            callback();
        }
    },
    //discover: function (callback) {
    //    //adapter.log.info("adapter koubachi discovered");
    //},
    //install: function (callback) {
    //    //adapter.log.info("adapter koubachi installed");
    //},
    //uninstall: function (callback) {
    //    //adapter.log.info("adapter koubachi uninstalled");
    //},
    //objectChange: function (id, obj) {
    //    //adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
    //},
    //stateChange: function (id, state) {
    //    //adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));
    //},
    ready: function () {
        g_devices.init(adapter, function(err) {
            main();
        });
    }

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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


var nextReadingTime = new Date().getTime() + 24 * 60 * 60 * 1000;
var nextIntervall = 120 * 60 * 1000;

function calculateNextIntervall() {
    var next = nextReadingTime;
    var now = new Date().getTime();
    for (var id in g_devices.states) {
        if ((id.indexOf('.') >= 0) || !g_devices.has(id, 'next_transmission')) continue;
        var date = new Date(g_devices.states[id].next_transmission);
        if ((next > date.getTime()) && (date.getTime() > now)) {
            next = date.getTime();
        };
    }
    if (next != nextReadingTime) {
        nextReadingTime = next;
        nextIntervall = nextReadingTime - now + 5000;
        if (nextIntervall < 1000) nextIntervall = 10000;
        var s = adapter.formatDate(new Date(now + nextIntervall), "YYYY-MM-DD hh:mm:ss");
        adapter.log.info("Next Intervall: " + s);
    }
}


function updateStates(callback) {

    koubachi.getPlants(function (err, _plants) {
        if (err) return;
        var plants = {};
        for (var i of _plants) {
            plants[i.plant.id] = i.plant;
        }
        koubachi.getDevices(function (err, _devices) {
            if (err || !_devices) return;
            var dev = new g_devices.CDevice(); //name, device.plants.length ? plants[plantId].name : name, list);

            for (var j = 0; j < _devices.length; j++) {
                var device = _devices[j].device;
                if (!device || !device.plants.length) continue;
                var id = device.mac_address;
                var plantId = device.plants[0].id;
                var name = plants[plantId].name ? plants[plantId].name : id
                dev.setDevice (id, { common: { name: name}, next_transmission: device.next_transmission} );

                for (var i of deviceStateNames) {
                    dev.set(i, device[i]);
                }

                dev.setChannel(name);
                for (var i of  plantStateNames) {
                    dev.set(i, plants[plantId][i]);
                }
            }
            g_devices.update();

            calculateNextIntervall();
            if (nextIntervall) {
                setTimeout(updateStates, nextIntervall);
            }
        });
    });
}


function main() {

    koubachi.on('error', function (err) {
        adapter.log.error("koubachi.on error");
    }); //.setConfig(adapter.config.appKey, adapter.config.userCredentialsals);

    koubachi.setConfig(adapter.config.appKey, adapter.config.userCredentials);
    updateStates ();


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

