angular.module('starter.controllers', [])

.filter('ldate', function() {
    'use strict';
    return function(date) {
        return moment(date).format('llll');
    };
})

.filter('duration', function() {
    'use strict';
    return function(date) {
        return moment(date).format('HH:mm');
    };
})

.filter('translatei18', function($filter) {
    'use strict';
    return function(text) {
        return $filter('translate')(text.replace('-', ''));
    };
})

.filter('unsafe', function($sce) {
    'use strict';
    return function(val) {
        return $sce.trustAsHtml(val);
    };
})

.directive('navBarClass', function() {
    'use strict';
    return {
        restrict: 'A',
        compile: function(element, attrs) {

            // We need to be able to add a class the cached nav-bar
            // Which provides the background color
            var cachedNavBar = document.querySelector('.nav-bar-block[nav-bar="cached"]');
            var cachedHeaderBar = cachedNavBar.querySelector('.bar-header');

            // And also the active nav-bar
            // which provides the right class for the title
            var activeNavBar = document.querySelector('.nav-bar-block[nav-bar="active"]');
            var activeHeaderBar = activeNavBar.querySelector('.bar-header');
            var barClass = attrs.navBarClass;
            var ogColors = [];
            var colors = ['positive', 'stable', 'light', 'royal', 'dark', 'assertive', 'calm', 'energized'];
            var cleanUp = function() {
                for (var i = 0; i < colors.length; i++) {
                    var currentColor = activeHeaderBar.classList.contains('bar-' + colors[i]);
                    if (currentColor) {
                        ogColors.push('bar-' + colors[i]);
                    }
                    activeHeaderBar.classList.remove('bar-' + colors[i]);
                    cachedHeaderBar.classList.remove('bar-' + colors[i]);
                }
            };
            return function($scope) {
                $scope.$on('$ionicView.beforeEnter', function() {
                    cleanUp();
                    cachedHeaderBar.classList.add(barClass);
                    activeHeaderBar.classList.add(barClass);
                });

                $scope.$on('$stateChangeStart', function() {
                    for (var j = 0; j < ogColors.length; j++) {
                        activeHeaderBar.classList.add(ogColors[j]);
                        cachedHeaderBar.classList.add(ogColors[j]);
                    }
                    cachedHeaderBar.classList.remove(barClass);
                    activeHeaderBar.classList.remove(barClass);
                    ogColors = [];
                });
            };
        }
    };
})

// Service to communicate with OpenWeatherMap API.
.factory('$weather', function($q, $http) {
    'use strict';
    var API_ROOT = 'http://api.openweathermap.org/data/2.5/';
    this.byCityName = function(query) {
        var deferred = $q.defer();
        // Call the API using JSONP.
        $http.jsonp(API_ROOT + '/weather?callback=JSON_CALLBACK&APPID=58a0c4c313ac9a047be43c97c2c719fc&units=metric&q=' + encodeURI(query)).then(function(response) {
            var statusCode = parseInt(response.data.cod, 10);
            if (statusCode === 200) {
                // Call successful.
                deferred.resolve(response.data);
            } else {
                // Something went wrong. Probably the city doesn't exist.
                deferred.reject(response.data.message);
            }
        }, function(error) {
            // Unable to connect to API.
            deferred.reject(error);
        });
        // Return a promise.
        return deferred.promise;
    };
    this.byCityId = function(id) {
        var deferred = $q.defer();
        $http.jsonp(API_ROOT + '/weather?callback=JSON_CALLBACK&APPID=58a0c4c313ac9a047be43c97c2c719fc&units=metric&id=' + id).then(function(response) {
            var statusCode = parseInt(response.data.cod, 10);
            if (statusCode === 200) {
                deferred.resolve(response.data);
            } else {
                deferred.reject(response.data.message);
            }
        }, function(error) {
            deferred.reject(error);
        });
        return deferred.promise;
    };
    this.byLocation = function(coords) {
        var deferred = $q.defer();
        $http.jsonp(API_ROOT + '/weather?callback=JSON_CALLBACK&APPID=58a0c4c313ac9a047be43c97c2c719fc&units=metric&lat=' + coords.latitude + '&lon=' + coords.longitude).then(function(response) {
            var statusCode = parseInt(response.data.cod, 10);
            if (statusCode === 200) {
                deferred.resolve(response.data);
            } else {
                deferred.reject(response.data.message);
            }
        }, function(error) {
            deferred.reject(error);
        });
        return deferred.promise;
    };
    return this;
})

.controller('AppCtrl', function($state, $scope, $ionicModal, $ionicPopup, $timeout, $interval, $ionicPlatform,
    $ionicHistory, $weather, $http, $translate, $filter, $ionicScrollDelegate,
    leafletData, leafletBoundsHelpers, $FileFactory) {
    'use strict';

    $scope._version = '0.9.18';
    $timeout(function(){
    try {
        $scope.platform = window.device.platform;
        $scope.android_version = window.device.version.toLowerCase();
        if ($scope.platform === 'android') {
            if (parseInt(window.device.version) < 5) {
               $scope.platform = 'oldandroid';
            }
        }
    } catch(err) {
        $scope.platform = 'Browser';
        console.log(err);
    }}, 1000);
    $scope.weather = $weather;

    $scope.running = false;
    $scope.prefs = {};

    $scope.prefs.minrecordingaccuracy = 14;
    $scope.prefs.minrecordinggap = 1000;
    $scope.prefs.minrecordingspeed = 3;
    $scope.prefs.maxrecordingspeed = 38;
    $scope.prefs.unit = 'kms';
    $scope.prefs.first_run = true;

    $scope.prefs.timevocalannounce = true;
    $scope.prefs.distvocalannounce = true;
    $scope.prefs.avgpacevocalannounce = true;
    $scope.prefs.avgspeedvocalannounce = true;
    $scope.prefs.language = 'English';
    try {
        navigator.globalization.getPreferredLanguage(
        function (language) { $scope.prefs.language = language.value; console.log('Prefered language: ' + $scope.prefs.language);},
        function () {console.error('Error getting language\n');}
    );} catch(err) {
         console.info('Globalization module probably not available: ' + err);
    }

    $scope.prefs.heartrateannounce = false;
    $scope.prefs.gpslostannounce = true;

    $scope.prefs.delay = 10 * 1000;
    $scope.prefs.usedelay = true;
    $scope.prefs.debug = false;
    $scope.prefs.keepscreenon = true;

    $scope.prefs.togglemusic = true;
    $scope.prefs.distvocalinterval = 0; //en km (0 == None)
    $scope.prefs.timevocalinterval = 5; //en minutes
    $scope.prefs.timefastvocalinterval = 0; //en minutes
    $scope.prefs.timelowvocalinterval = 0; //en minutes

    $scope.prefs.heartratemax = 190;
    $scope.prefs.heartratemin = 80;
    $scope.prefs.registeredBLE = {};

    $scope.prefs.usegoogleelevationapi = false;
    $scope.bluetooth_scanning = false;

    // Load Sessions
    $timeout(function() {
        $scope.loadSessions();
    }, 0);

    $timeout(function() {
        $scope.detectBLEDevice();
    }, 3000);

    $scope.dateTimeReviver = function(key, value) {
        if ((key === 'duration') || (key === 'pace')) {
            if (typeof value === 'string') {
                return new Date(value);
            }
        }
        return value;
    };

    $scope.computeAllSessionsFromGPXData = function() {
        $scope.sessions.map(function(session) {
            $scope.computeSessionFromGPXData(session, false);
        });
        $scope.writeSessionsToFile($scope.sessions);
        if ($scope.platform === 'Browser') {
            $scope.storageSetObj('sessions', $scope.sessions); }
        $scope.computeResumeGraph();
    };
    
    $scope.parseFloatOr = function(shouldbefloat) {
        if (!shouldbefloat) {
            return 0; }
        else {
            try {
                return parseFloat(shouldbefloat);
            } catch(err) { 
                console.info('shouldbefloat:'+err);
                return 0.0;}
        }
    };

    $scope.computeKalmanLatLng = function(datas) {
        //var MinAccuracy = 1;
        var Q_metres_per_second = 3;    
        var TimeStamp_milliseconds;
        var tinc;
        var lat;
        var lng;
        var newlat;
        var newlng;
        var variance = -1; // P matrix.  Negative means object uninitialised.  NB: units irrelevant, as long as same units used throughout
        var K;
        var accuracy;
        var kalmanEle = new KalmanFilter(0.2, 3, 10);

        return datas.map(function(item, idx) {
            accuracy = $scope.parseFloatOr(item[5]);
            newlat = parseFloat(item[0]);
            newlng = parseFloat(item[1]);
            if (accuracy < 1) {
                accuracy = 1;}
            if (variance < 0) {
                TimeStamp_milliseconds = (new Date(item[2])).getMilliseconds();
                lat = newlat;
                lng = newlng;
                variance = accuracy * accuracy;
            } else {
                tinc = (new Date(item[2])).getMilliseconds() - TimeStamp_milliseconds;
                if (tinc > 0) {
                    variance += tinc * Q_metres_per_second * Q_metres_per_second / 1000;
                    TimeStamp_milliseconds = (new Date(item[2])).getMilliseconds();
                }
                K = variance / (variance + (accuracy * accuracy));
                lat += K * (newlat - lat);
                lng += K * (newlng - lng);
                variance = (1 - K) * variance * Q_metres_per_second;
            }

            if (isNaN(item[3]) && (idx-1 > 0)) {
                console.log(idx+':'+$scope.parseFloatOr(item[3]));
                item[3] = datas[idx-1][3];
            }

            return { lat: lat,
                     lng: lng,
                     timestamp: item[2],
                     ele: (kalmanEle.update($scope.parseFloatOr(item[3])))[0],
                     hr: $scope.parseFloatOr(item[4]),
                     accuracy: $scope.parseFloatOr(item[5]),
                     cadence: $scope.parseFloatOr(item[6]),
                     power: $scope.parseFloatOr(item[7]),
                     stryde: $scope.parseFloatOr(item[8]) };
        });

    };

    $scope.computeSessionSimplifyAndFixElevation = function(session, doSave) {
        //var encpath = '';
        var gpx_path = [];
        var gpxPoints = [];
       
        gpxPoints = simplifyGPX($scope.computeKalmanLatLng($scope.session.gpxData), 0.00001);

        //Do it before and talk after
        //Thats here for preventing waiting too long an answer which could be
        //long to get on slow mobile network and so the session is displayed
        //with a 0 km run
        $scope.computeSessionFromGPXPoints(session, gpxPoints, doSave); 
       
        console.log('test scope.prefs.usegoogleelevationapi:' + $scope.prefs.usegoogleelevationapi);
        if ($scope.prefs.usegoogleelevationapi === true) {
            console.log('scope.prefs.usegoogleelevationapi');
            gpx_path = gpxPoints.map(function(item){
                return [item.lat, item.lng];});

            var gpx_paths = [];
            var i,j,chunk = 100;
            for (i=0,j=gpx_path.length; i<j; i+=chunk) {
                gpx_paths.push(gpx_path.slice(i,i+chunk));
            }
            var encpaths = gpx_paths.map(function(path){
                return L.polyline(path).encodePath(); 
            });
            console.log(encpaths);
            encpaths.map(function(encpath, encidx){
                $http({url:'https://maps.googleapis.com/maps/api/elevation/json?key=AIzaSyCIxn6gS4TePkbl7Pdu49JHoMR6POMafdg&locations=enc:' + encpath ,
                    method:'GET',
                    }).then(function(response) {
                       if (response.data.status === 'OK') {
                            for (var idx = 0; idx < response.data.results.length; idx++) {
                                gpxPoints[encidx*100 + idx].ele = response.data.results[idx].elevation;                        
                            }
                            if (encidx === (encpaths.length -1)) {
                                session.fixedElevation = true;
                                $scope.computeSessionFromGPXPoints(session, gpxPoints, doSave);
                            }
                       } else {
                            console.log('Can t retrieve data from google elevation api');
                        }
                }, function(error) {
                    console.log(error);
                });
            });
        }       
    };

    $scope.computeSessionFromGPXData = function(session, doSave) { 
       $scope.session = session;
       $scope.computeSessionSimplifyAndFixElevation(session, doSave);
    };

    $scope.computeSessionFromGPXPoints = function(session, gpxPoints, doSave) {
        console.debug('computeSessionFromGPXPoints');
        var hrZ1 = parseInt($scope.prefs.heartratemin) + parseInt(($scope.prefs.heartratemax - $scope.prefs.heartratemin) * 0.60);
        var hrZ2 = parseInt($scope.prefs.heartratemin) + parseInt(($scope.prefs.heartratemax - $scope.prefs.heartratemin) * 0.70);
        var hrZ3 = parseInt($scope.prefs.heartratemin) + parseInt(($scope.prefs.heartratemax - $scope.prefs.heartratemin) * 0.80);
        var hrZ4 = parseInt($scope.prefs.heartratemin) + (parseInt($scope.prefs.heartratemax - $scope.prefs.heartratemin) * 0.90);
        var hrZ = [0, 0, 0, 0, 0];
        var hr_color = 0;
        $scope.session.hhr_colors = ['#dcdcdc', '#97BBCD', '#46BFBD', '#FDB45C', '#F7464A'];
        $scope.session.hr_colors = ['rgba(220,220,220,0.5)', 'rgba(151, 187, 205, 0.5)', 'rgba(70, 191, 189, 0.5)', 'rgba(253, 180, 92, 0.5)', 'rgba(247, 70, 74, 0.5)'];
        $scope.session.hhr_colors = [{
            fillColor: 'rgba(220,220,220,0.5)',
            strokeColor: 'rgba(220,220,220,0.7)'
        }, {
            fillColor: 'rgba(151, 187, 205, 0.5)',
            strokeColor: 'rgba(151, 187, 205, 0.7)'
        }, {
            fillColor: 'rgba(70, 191, 189, 0.5)',
            strokeColor: 'rgba(70, 191, 189, 0.7)'
        }, {
            fillColor: 'rgba(253, 180, 92, 0.5)',
            strokeColor: 'rgba(253, 180, 92, 0.7)'
        }, {
            fillColor: 'rgba(247, 70, 74, 0.5',
            strokeColor: 'rgba(247, 70, 74, 0.7'
        }];

        //Max and min for leaflet and ele
        var minHeight = gpxPoints[0].ele;
        var maxHeight = minHeight;
        var lonMin = gpxPoints[0].lng;
        var lonMax = lonMin;
        var latMax = gpxPoints[0].lat;
        var latMin = latMax;
        var eleDown = 0;
        var eleUp = 0;
        var maxHeartRate = 0;

        //For calc
        var curLat = gpxPoints[0].lat;
        var curLng = gpxPoints[0].lng;
        var curDate = gpxPoints[0].timestamp;
        var curEle = gpxPoints[0].ele;
        var curHeartRate = gpxPoints[0].hr;
        var curAcc = gpxPoints[0].accuracy;
        var curCadence = gpxPoints[0].cadence;
        var curPower = gpxPoints[0].power;
        var curStryde = gpxPoints[0].stryde;

        var oldLat = curLat;
        var oldLng = curLng;
        var oldDate = curDate;
        var oldEle = curEle;

        var timeStartTmp = new Date(gpxPoints[0].timestamp);
        var timeEndTmp = 0;

        var mz = 1;
        var dTemp = 0;
        var dTotal = 0;
        var dMaxTemp = 1000; // kilometer marker
        var stepDetails = [];

        var mz2 = 1;
        var eleStartTmp = curEle;
        var heartRatesTmp = [];
        var heartRatesTmp2 = [];
        var cadenceTmp = [];
        var cadenceTmp2 = [];
        var powerTmp = [];
        var powerTmp2 = [];
        var strydeTmp = [];
        var strydeTmp2 = [];
        var dTemp2 = 0;
        var smallStepDetail = [];
        var timeStartTmp2 = new Date(gpxPoints[0].timestamp);
        var timeEndTmp2 = 0;
        var dMaxTemp2 = 250;

        var paths = {};
        paths.p1 = {
            color: '#3F51B5',
            weight: 2,
            latlngs: []
        };
        var markers = {};
        markers.s = {
            lat: curLat,
            lng: curLng,
            icon: {
                type: 'div',
                className: 'leaflet-circle-marker-start',
                html: 'S',
                iconSize: [20, 20]
            },
            message: 'S',
            draggable: false,
            opacity: 0.8
        };
        markers.e = {
            lat: gpxPoints[gpxPoints.length - 1].lat,
            lng: gpxPoints[gpxPoints.length - 1].lng,
            icon: {
                type: 'div',
                className: 'leaflet-circle-marker-end',
                html: 'E',
                iconSize: [20, 20]
            },
            message: 'S',
            draggable: false,
            opacity: 0.8
        };
        //var dists = [];
        var gpxspeedtmp;
        var gpxpacetmp;
        var timeDiff;
        var dLat;
        var dLon;
        var dLat1;
        var dLat2;
        var dtd;
        var dspeed;
        var a, c, d;
        var idx = 0;
        var dwithoutpause = 0;

        for (var p = 0; p < gpxPoints.length; p++) {

            //gpxPoints.map(function(item) {

            curLat = gpxPoints[p].lat;
            curLng = gpxPoints[p].lng;
            curEle = gpxPoints[p].ele;
            curDate = gpxPoints[p].timestamp;
            curHeartRate = gpxPoints[p].hr;
            curAcc = gpxPoints[p].accuracy;
            curCadence = gpxPoints[p].cadence;
            curPower = gpxPoints[p].power;
            curStryde = gpxPoints[p].stryde;
            //Distances
            dLat = (curLat - oldLat) * Math.PI / 180;
            dLon = (curLng - oldLng) * Math.PI / 180;
            dLat1 = (oldLat) * Math.PI / 180;
            dLat2 = (curLat) * Math.PI / 180;
            a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(dLat1) * Math.cos(dLat1) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            d = 6371 * c;
            //Speed between this and previous point
            dtd = new Date(curDate) - new Date(oldDate);
            dspeed = (Math.round((d) * 100) / 100) / (dtd / 1000 / 60 / 60);
            //if (dspeed > 38) {
                //console.log("usain bold power");
            //} else {

                //Leaflet
                paths.p1.latlngs.push({
                    lat: curLat,
                    lng: curLng
                });
                if (curLat < latMin) {
                    latMin = curLat;
                }
                if (curLat > latMax) {
                    latMax = curLat;
                }
                if (curLng < lonMin) {
                    lonMin = curLng;
                }
                if (curLng > lonMax) {
                    lonMax = curLng;
                }

                //Max elevation
                if (curEle > maxHeight) {
                    maxHeight = curEle;
                }
                if (curEle < minHeight) {
                    minHeight = curEle;
                }
                if (curHeartRate > maxHeartRate) {
                    {
                        maxHeartRate = curHeartRate;
                    }
                }

                if (p > 0) {
                    //Time without same
                    if (dspeed > 0) {
                        dwithoutpause += dtd;
                    }

                    dTotal += d;
                    gpxPoints[p].dist = dTotal;

                    if (curHeartRate) {
                        heartRatesTmp.push(curHeartRate);
                        heartRatesTmp2.push(curHeartRate);

                        if (curHeartRate > hrZ4) {
                            idx = 4;
                        } else {
                            if (curHeartRate > hrZ3) {
                                idx = 3;
                            } else {
                                if (curHeartRate > hrZ2) {
                                    idx = 2;
                                } else {
                                    if (curHeartRate > hrZ1) {
                                        idx = 1;
                                    } else {
                                        idx = 0;
                                    }
                                }
                            }
                        }
                        hrZ[idx] += dtd / 60000;
                    }

                    if (curPower) {
                        powerTmp.push(curPower);
                        powerTmp2.push(curPower);
                    }

                    if (curCadence) {
                        cadenceTmp.push(curCadence);
                        cadenceTmp2.push(curCadence);
                    }
                    
                    if (curStryde) {
                        strydeTmp.push(curStryde);
                        strydeTmp2.push(curStryde);
                    }
                    
                    dTemp += (d * 1000);
                    if (((dTotal - (mz - 1)) * 1000) >= dMaxTemp) {
                        markers[mz] = {
                            lat: curLat,
                            lng: curLng,
                            icon: {
                                type: 'div',
                                className: 'leaflet-circle-marker',
                                html: mz,
                                iconSize: [20, 20]
                            },
                            message: mz + ' Km(s)',
                            draggable: false,
                            opacity: 0.8
                        };
                        timeEndTmp = new Date(gpxPoints[p].timestamp);
                        timeDiff = timeEndTmp - timeStartTmp;
                        gpxpacetmp = (timeDiff) / (dTemp / 1000);
                        gpxpacetmp = (Math.round(gpxpacetmp * 100) / 100) * 1;
                        gpxspeedtmp = (Math.round((dTemp / 1000) * 100) / 100) / (timeDiff / 1000 / 60 / 60);
                        gpxspeedtmp = Math.round(gpxspeedtmp * 100) / 100;
                        stepDetails.push({
                            pace: new Date(gpxpacetmp),
                            speed: gpxspeedtmp,
                            km: (mz * dMaxTemp) / 1000,
                            hr: average(heartRatesTmp, 0),
                            cadence: average(cadenceTmp, 0),
                            power: average(powerTmp, 0),
                            stryde: average(strydeTmp,1)
                        });
                        timeStartTmp = new Date(gpxPoints[p].timestamp);
                        mz++;
                        dTemp = 0;
                        heartRatesTmp = [];
                        powerTmp = [];
                        cadenceTmp = [];

                    }
                    dTemp2 += (d * 1000);
                    if (((dTotal * 1000 - mz2 * 250)) >= dMaxTemp2) {

                        timeEndTmp2 = new Date(gpxPoints[p].timestamp);
                        timeDiff = timeEndTmp2 - timeStartTmp2;
                        gpxpacetmp = (timeDiff) / (dTemp / 1000);
                        gpxpacetmp = (Math.round(gpxpacetmp * 100) / 100) * 1;
                        gpxspeedtmp = (Math.round((dTemp2 / 1000) * 100) / 100) / (timeDiff / 1000 / 60 / 60);
                        gpxspeedtmp = Math.round(gpxspeedtmp * 100) / 100;
                        smallStepDetail.push({
                            pace: new Date(gpxpacetmp),
                            speed: gpxspeedtmp,
                            km: (mz2 * dMaxTemp2 / 10) / 100,
                            ele: (eleStartTmp + curEle) / 2,
                            hr: average(heartRatesTmp2, 0),
                            cadence: average(cadenceTmp2, 0),
                            power: average(powerTmp2, 0),
                            stryde: average(strydeTmp2, 1)
                        });
                        timeStartTmp2 = new Date(gpxPoints[p].timestamp);
                        mz2++;
                        dTemp2 = 0;
                        eleStartTmp = curEle;
                        heartRatesTmp2 = [];
                    }
                }
                if ((gpxPoints.length - 1) === p) {
                    timeEndTmp = new Date(gpxPoints[p].timestamp);
                    timeDiff = timeEndTmp - timeStartTmp;
                    gpxpacetmp = (timeDiff) / (dTemp / 1000);
                    gpxpacetmp = (Math.round(gpxpacetmp * 100) / 100) * 1;
                    gpxspeedtmp = (Math.round((dTemp / 1000) * 100) / 100) / (timeDiff / 1000 / 60 / 60);
                    gpxspeedtmp = Math.round(gpxspeedtmp * 100) / 100;
                    stepDetails.push({
                        pace: new Date(gpxpacetmp),
                        speed: gpxspeedtmp,
                        km: Math.round(dTotal * 10) / 10,
                        hr: average(heartRatesTmp, 0),
                        cadence: average(cadenceTmp, 0),
                        power: average(powerTmp, 0)
                    });
                    timeEndTmp2 = new Date(gpxPoints[p].timestamp);
                    timeDiff = timeEndTmp2 - timeStartTmp2;
                    if (timeDiff > 0) {
                        gpxpacetmp = (timeDiff) / (dTemp / 1000);
                        gpxpacetmp = (Math.round(gpxpacetmp * 100) / 100) * 1;
                        gpxspeedtmp = (Math.round((dTemp2 / 1000) * 100) / 100) / (timeDiff / 1000 / 60 / 60);
                        gpxspeedtmp = Math.round(gpxspeedtmp * 100) / 100;
                        smallStepDetail.push({
                            pace: new Date(gpxpacetmp),
                            speed: gpxspeedtmp,
                            km: Math.round(dTotal * 10) / 10,
                            ele: (eleStartTmp + curEle) / 2,
                            hr: average(heartRatesTmp2, 0),
                            cadence: average(cadenceTmp2, 0),
                            power: average(powerTmp2, 0),
                            stryde: average(strydeTmp2, 0)
                        });
                    }
               // }



            }
            oldLat = curLat;
            oldLng = curLng;
            oldDate = curDate;
            oldEle = curEle;
        }

        //Date
        $scope.session.date = moment(new Date(gpxPoints[0].timestamp)).format('llll');

        //Points
        $scope.session.gpxPoints = gpxPoints;

        //Maps markers
        if ($scope.session.map === undefined) {
            $scope.session.map = {
                center: {
                    lat: 48,
                    lng: 4,
                    zoom: 5,
                    autoDiscover: false
                },
                paths: {},
                bounds: {},
                controls: {
                    scale: true
                },
                markers: {},
                tiles: {
                    url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                }
            };
        }
        $scope.session.map.markers = markers;
        $scope.session.map.paths = paths;

        //Maps bounds
        $scope.session.map.bounds = leafletBoundsHelpers.createBoundsFromArray([
            [latMin, lonMin],
            [latMax, lonMax]
        ]);
        $scope.session.map.defaults = {
            scrollWheelZoom: false
        };

        //Pace by km
        $scope.session.paceDetails = stepDetails;

        //Heart Rate OK ?
        if ((hrZ[0] === 0) && (hrZ[1] === 0) &&
            (hrZ[2] === 0) && (hrZ[3] === 0) && (hrZ[4] === 0)) {
            $scope.session.heartRate = false;
        } else {
            $scope.session.heartRate = true;
        }

        //Version of computation
        $scope.session.version = $scope._version;
        //Graph speed / ele
        $scope.session.chart_options = {
            animation: false,
            showTooltips: false,
            showScale: true,
            scaleIntegersOnly: true,
            bezierCurve: true,
            pointDot: false,
            responsive: true,
            scaleUse2Y: true,
            legendTemplate: '<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'
        };
        $scope.session.chart2_options = {
            animation: false,
            showTooltips: false,
            showScale: true,
            scaleIntegersOnly: true,
            bezierCurve: true,
            pointDot: false,
            responsive: true,
            legendTemplate: '' //'<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'
        };
        $scope.session.chart4_options = {
            animation: false,
            showTooltips: false,
            showScale: true,
            scaleIntegersOnly: true,
            bezierCurve: true,
            pointDot: false,
            responsive: true,
            legendTemplate: '' //'<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'
        };
        $scope.session.chart3_labels = [$scope.translateFilter('_hr_zone0') + ' < 60%',
            $scope.translateFilter('_hr_zone1') + ' > 60%',
            $scope.translateFilter('_hr_zone2') + ' > 70%',
            $scope.translateFilter('_hr_zone3') + ' > 80%',
            $scope.translateFilter('_hr_zone4') + ' > 90%'
        ];
        for (var i = 0; i < hrZ.length; i++) {
            hrZ[i] = hrZ[i].toFixed(1);
        }
        $scope.session.chart3_data = hrZ;

        $scope.session.chart_labels = [];
        $scope.session.chart2_labels = [];
        $scope.session.chart4_labels = [];
        $scope.session.chart_data = [
            [],
            []
        ];
        $scope.session.chart2_data = [
            []
        ];
        $scope.session.chart4_data = [
            []
        ];
        $scope.session.chart2_type = 'Heartrate';
        $scope.session.chart_series = [$scope.translateFilter('_speed_kph'), $scope.translateFilter('_altitude_meters')];
        $scope.session.chart2_series = [$scope.translateFilter('_speed_kph'), $scope.translateFilter('_bpms_label')];
        $scope.session.chart4_type = 'Heartrate';
        $scope.session.chart4_series = [$scope.translateFilter('_altitude_meters'), $scope.translateFilter('_bpms_label')];
        $scope.session.avg_hr = [];
        $scope.session.avg_cadence = [];
        $scope.session.avg_power = [];
        $scope.session.chart3_type = 'DoughnutWithValue';
        smallStepDetail.map(function(step) {
            if (step.hr > hrZ4) {
                hr_color = 4;
            } else {
                if (step.hr > hrZ3) {
                    hr_color = 3;
                } else {
                    if (step.hr > hrZ2) {
                        hr_color = 2;
                    } else {
                        if (step.hr > hrZ1) {
                            hr_color = 1;
                        } else {
                            hr_color = 0;
                        }
                    }
                }
            }
            if (Math.round(step.km) === step.km) {
                $scope.session.chart_labels.push(step.km);
                $scope.session.chart2_labels.push(step.km + '|' + $scope.session.hr_colors[hr_color]);
                $scope.session.chart4_labels.push(step.km + '|' + $scope.session.hr_colors[hr_color]);
            } else {
                $scope.session.chart_labels.push('');
                $scope.session.chart2_labels.push('|' + $scope.session.hr_colors[hr_color]);
                $scope.session.chart4_labels.push('|' + $scope.session.hr_colors[hr_color]);
           }

            $scope.session.chart_data[0].push(step.speed);
            $scope.session.chart_data[1].push(step.ele);
            $scope.session.chart2_data[0].push(step.speed);
            $scope.session.chart4_data[0].push(step.ele);
            //$scope.session.chart2_data[1].push(step.hr); // was step.hr

            //Calc avg hr
            $scope.session.avg_hr.push(step.hr);

            //Calc avg power & cadence
            $scope.session.avg_power.push(step.power);
            $scope.session.avg_cadence.push(step.cadence);
        });

        $scope.session.avg_hr = average($scope.session.avg_hr, 0);
        $scope.session.avg_power = average($scope.session.avg_power, 0);
        $scope.session.avg_cadence = average($scope.session.avg_cadence, 0);

        $scope.session.chart3_options = {
            animation: false,
            animationEasing : 'easeOutBounce',
            showTooltips: true,
            showScale: false,
            showLegend: true,
            scaleIntegersOnly: true,
            responsive: true,
            legendTemplate: '<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<segments.length; i++){%><li><span style=\"background-color:<%=segments[i].fillColor%>\"></span><%if(segments[i].label){%><%=segments[i].label%><%}%></li><%}%></ul>',
            averageValue: $scope.session.avg_hr
        };
        
        eleUp = 0; //parseFloat(elePoints[0][3]);
        eleDown = 0; //parseFloat(elePoints[0][3]);
        for (p = 0; p < gpxPoints.length; p++) {
            curEle = gpxPoints[p].ele;

            if (p > 0) {

                oldEle = gpxPoints[p - 1].ele;

                if (curEle > oldEle) {
                    eleUp += (curEle) - (oldEle);
                } else if (curEle < oldEle) {
                    eleDown += (oldEle) - (curEle);
                }

            }
        }

        var gpxStart = gpxPoints[0].timestamp;
        var gpxEnd = gpxPoints[gpxPoints.length - 1].timestamp;

        var d1 = new Date(gpxStart);
        var d2 = new Date(gpxEnd);
        var miliseconds = d2 - d1;


        var tmpMilliseconds = miliseconds;

        var seconds = miliseconds / 1000;
        var minutes = seconds / 60;
        var hours = minutes / 60;
        var days = hours / 24;

        days = tmpMilliseconds / 1000 / 60 / 60 / 24;
        days = Math.floor(days);

        tmpMilliseconds = tmpMilliseconds - (days * 24 * 60 * 60 * 1000);
        hours = tmpMilliseconds / 1000 / 60 / 60;
        hours = Math.floor(hours);

        tmpMilliseconds = tmpMilliseconds - (hours * 60 * 60 * 1000);
        minutes = tmpMilliseconds / 1000 / 60;
        minutes = Math.floor(minutes);

        tmpMilliseconds = tmpMilliseconds - (minutes * 60 * 1000);
        seconds = tmpMilliseconds / 1000;
        seconds = Math.floor(seconds);

        //var gpxdur = new Date("Sun May 10 2015 " + hours + ":" + minutes + ":" + seconds + " GMT+0200");

        var gpxpace = (miliseconds) / dTotal;
        gpxpace = (Math.round(gpxpace * 100) / 100) * 1;
        gpxpace = new Date(gpxpace);

        var gpxspeed = (Math.round(dTotal * 100) / 100) / (miliseconds / 1000 / 60 / 60);
        gpxspeed = Math.round(gpxspeed * 100) / 100;
        var gpxspeedwithoutpause = Math.round(((Math.round(dTotal * 100) / 100) / (dwithoutpause / 1000 / 60 / 60))*100) / 100;
        var gpxpacewithoutpause = new Date(dwithoutpause / dTotal);
        $scope.session.gpxMaxHeight = Math.round(maxHeight);
        $scope.session.gpxMinHeight = Math.round(minHeight);
        $scope.session.distance = Math.round(dTotal * 100) / 100;
        $scope.session.pace = gpxpace;
        $scope.session.speed = gpxspeed;
        $scope.session.speedinmvt = gpxspeedwithoutpause; 
        $scope.session.paceinmvt = gpxpacewithoutpause;
        $scope.session.eleUp = Math.round(eleUp);
        $scope.session.eleDown = Math.round(eleDown);
        $scope.session.distk = $scope.session.distance.toFixed(0);

        $scope.session.duration = new Date(d2 - d1);

        $scope.session.start = gpxPoints[0].timestamp;
        $scope.session.end = gpxPoints[gpxPoints.length - 1].timestamp;

        $scope.session.overnote = (parseInt(gpxspeed) * 1000 * (miliseconds / 1000 / 60) * 0.000006 + ((Math.round(eleUp) - Math.round(eleDown)) * 0.02)).toFixed(1);

        //And now save
        //FIX SAVE
        var saved = false;
        $scope.sessions.map(function(item, idx){
            if (item.recclicked === $scope.session.recclicked) {
                $scope.sessions[idx] = $scope.session;
                if (doSave === true) {
                    $scope.writeSessionsToFile($scope.sessions);
                    if ($scope.platform === 'Browser') {
                        $scope.storageSetObj('sessions', $scope.sessions);}
                    $scope.updateList();
                    saved = true;
                }
            }
        });
        if ((!saved) && (doSave)){
            $scope.sessions.push($scope.session);
            $scope.writeSessionsToFile($scope.sessions);
            if ($scope.platform === 'Browser') {
                $scope.storageSetObj('sessions', $scope.sessions);}
            $scope.updateList(); 
            saved = true;
        }
    };

    /*$scope.importAllGpx = function(){
        var fs = new $FileFactory();
        fs.getEntries('file:///storage/emulated/0/Android/data/net.khertan.forrunners/files/').then(function(result) {
            $scope.files = result;
            $scope.getContents = function(path) {
                fs.getEntries(path).then(function(result) {
                    if (result instanceof FileEntry) {
                        var view = $ionicHistory.backView();
                        if (view) {
                            view.go();
                        }
                        result.file(function(gotFile) {
                            $scope.importGPX(gotFile);
                        }, function(err) {console.error(err);});
                            
                    } else {
                        $scope.files = result;
                        $scope.files.unshift({name: '[parent]'});
                        fs.getParentDirectory(path).then(function(result) {
                            result.name = '[parent]';
                            $scope.files[0] = result;
                        });
                    }
                });
            };

            $scope.files.map(function(file){
                if (file.name.indexOf('.gpx', file.name.length - '.gpx'.length) !== -1) {
                    $scope.getContents(file.nativeURL);
                }
            });

            $scope.cleanSessions();

        }, function(error) {
            console.error(error);
        });

    };*/


    $scope.importGPX = function(file) {
        console.log('importing GPX:'+file);
        var reader = new FileReader();

        reader.onloadend = function() {
            var x2js = new X2JS();
            var json = x2js.xml_str2json(this.result);

            var gpxPoints = [];
                
            if (json.gpx.trk.trkseg instanceof Array) {
                json.gpx.trk.trkseg.map(function(item) {
                    gpxPoints = gpxPoints.concat(item.trkpt);
                });
            } else {
                gpxPoints = json.gpx.trk.trkseg.trkpt;
            }
            
            //NOW RECOMPUTE AND CREATE
            $scope.session = {};
            $scope.session.gpxData = [];

            gpxPoints.map(function(item) {
                var bpms;
                var accuracy;
                var power;
                var cadence;
                var stryde;

                try {
                    bpms = parseFloat(item.extensions.TrackPointExtension.hr.__text);
                } catch (exception) {
                    try {
                        bpms = parseFloat(item.extensions.hr.__text);
                    } catch (exception2) {
                        bpms = undefined;
                    }
                }
                try {
                    power = parseFloat(item.extensions.TrackPointExtension.power.__text);
                } catch (exception) {
                    try {
                        power = parseFloat(item.extensions.power.__text);
                    } catch (exception2) {
                        power = undefined;
                    }
                }
                try {
                    cadence = parseFloat(item.extensions.TrackPointExtension.cad.__text);
                } catch (exception) {
                    try {
                        cadence = parseFloat(item.extensions.cad.__text);
                    } catch (exception2) {
                        cadence = undefined;
                    }
                }
                try {
                    accuracy = parseFloat(item.extensions.TrackPointExtension.accuracy.__text);
                } catch (exception) {
                    try {
                        accuracy = parseFloat(item.extensions.accuracy.__text);
                    } catch (exception2) {
                        accuracy = undefined;
                    }
                }
                try {
                    stryde = parseFloat(item.extensions.TrackPointExtension.stryde.__text);
                } catch (exception) {
                    try {
                        stryde = parseFloat(item.extensions.stryde.__text);
                    } catch (exception2) {
                        stryde = undefined;
                    }
                }


                $scope.session.gpxData.push([item._lat, item._lon, item.time, item.ele, bpms, accuracy, cadence, power, stryde]);
            });

            $scope.session.recclicked = new Date(gpxPoints[0].time).getTime();
            //Save session already compute session
            $scope.saveSession();
        };

        reader.readAsText(file);
    };

    $scope.iosFilePicker = function() {
        var utis = ['public.data', 'public.item', 'public.content', 'public.file-url', 'public.text'];
        window.FilePicker.pickFile(function(url) {
            $scope.importGPX(url);
        }, function(err){
            $ionicPopup.alert({
            title: $scope.translateFilter('_gpx_import_title'),
            template: err
        }, utis);});
    };

    $scope.doFileChooser = function() {
       if ($scope.platform === 'iOS') {
            $scope.iosFilePicker();
        } else if ($scope.platform === 'OldAndroid' ) {
              $state.go('app.filepicker');
        } else {
           $timeout(function(){document.getElementById('gpxFile').click();},100);
        }  
     };


    $scope.importGPXs = function(element) {
        for (var idx in element.files) {
            if (typeof element.files[idx] === 'object') {
                $scope.importGPX(element.files[idx]);
            }
        }

        $ionicPopup.alert({
            title: $scope.translateFilter('_gpx_import_title'),
            template: $scope.translateFilter('_gpx_file_imported')
        });

    };

    $scope.writeGPX = function(dirEntry, filename, session) {
        var gpxHead = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n';
        gpxHead += '<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" creator="ForRunners" version="1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd">';
        gpxHead += '<metadata>\n';
        gpxHead += '<link href="http://www.khertan.net">\n';
        gpxHead += '<text>Khertan Software</text>\n';
        gpxHead += '</link>\n';
        gpxHead += '<time>' + moment().format() + '</time>\n';
        gpxHead += '</metadata>\n';
        gpxHead += '<trk>\n';
        gpxHead += '<trkseg>\n';

        var gpxSubHead = '';
        var gpxFoot = '</trkseg></trk>\n</gpx>';

        dirEntry.getFile(filename, {
            create: true
        }, function(fileEntry) {
            fileEntry.createWriter(function(writer) {
                // Already in JSON Format
                writer.onwrite = function() {};
                writer.onerror = function(e) {
                    $ionicPopup.alert({
                        title: $scope.translateFilter('_gpx_error_title'),
                        template: $scope.translateFilter('_gpx_error_content')
                    });
                    console.error(e);
                    console.error(writer.error);
                };
                writer.fileName = filename; //moment(session.recclicked).format('YYYYMMDD_hhmm') + '.gpx';
                gpxSubHead = '<name>' + session.date + '</name>\n';

                var gpxPoints = '';
                session.gpxData.map(function(pts) {
                    gpxPoints += '<trkpt lat=\"' + pts[0] + '\" lon=\"' + pts[1] + '\">\n';
                    gpxPoints += '<ele>' + pts[3] + '</ele>\n';
                    gpxPoints += '<time>' + pts[2] + '</time>\n';
                    if (pts[4] || pts[5] || pts[6] || pts[7] || pts[8]) {
                        gpxPoints += '<extensions><gpxtpx:TrackPointExtension>';
                        if (pts[4]) {
                            gpxPoints += '<gpxtpx:hr>' + pts[4] + '</gpxtpx:hr>\n';
                        }
                        if (pts[5]) {
                            gpxPoints += '<gpxtpx:accuracy>' + pts[5] + '</gpxtpx:accuracy>\n';
                        }
                        if (pts[6]) {
                            gpxPoints += '<gpxtpx:cad>' + pts[6] + '</gpxtpx:cad>\n';
                        }
                        if (pts[7]) {
                            gpxPoints += '<gpxtpx:power>' + pts[7] + '</gpxtpx:power>\n';
                        }
                        if (pts[8]) {
                            gpxPoints += '<gpxtpx:stryde>' + pts[8] + '</gpxtpx:stryde>\n';
                        }
                        gpxPoints +=  '</gpxtpx:TrackPointExtension></extensions>';
                    }
                    gpxPoints += '</trkpt>\n';
                });
                writer.write(gpxHead + gpxSubHead + gpxPoints + gpxFoot, {
                    type: 'text/plain'
                });
            }, function() {
                console.log('failed can t create writer');
            });
        }, function() {
            console.log('failed to get file');
        });

    };

    $scope.exportAGPX = function(dirEntry, session, overwrite) {
        if (overwrite === false) {
            dirEntry.getFile(
                moment(session.recclicked).format('YYYYMMDD_hhmm') + '.gpx', {
                    create: false
                },
                function() {}, //exist so don t overwrite
                function() {
                    $scope.writeGPX(dirEntry, moment(session.recclicked).format('YYYYMMDD_hhmm') + '.gpx', session);
                });
        } else {
            $scope.writeGPX(dirEntry, moment(session.recclicked).format('YYYYMMDD_hhmm') + '.gpx', session);
        }

    };

    $scope.exportAsGPX = function(overwrite) {
        try {
        $scope.sessions.map(function(session) {
            var stordir = cordova.file.externalDataDirectory;
            if (!stordir) {
                stordir = cordova.file.dataDirectory;
            }

            window.resolveLocalFileSystemURL(stordir,
                function(dirEntry) {
                    $scope.exportAGPX(dirEntry, session, overwrite);
                },
                function() {
                    console.log('failed can t open fs');
                });
        });

        if (overwrite) {
            $ionicPopup.alert({
                title: $scope.translateFilter('_gpx_export_title'),
                template: $scope.translateFilter('_gpx_file_exported')
            });
        }
        } catch(err) {
            console.error('Export as GPX failed : ' + err);
        }

    };

    $scope.storageSetObj = function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));}
        catch(err){console.error(err);}
    };

    $scope.storageGetObj = function(key) {
        return JSON.parse(localStorage.getItem(key));
    };

    $scope.setLang = function() {
        var lang = 'en-US';
        //console.log($scope.prefs.language);
        //if ($scope.prefs.language === 'English') {lang = 'en-US';}
        //else if ($scope.prefs.language === 'Francais') {lang = 'fr-FR';}
        if ($scope.prefs.language) {
            lang = $scope.prefs.language;
        }
        $translate.use(lang);
        moment.locale(lang);
    };

    //$scope.translate = $translate.filter('translate');
    $scope.translateFilter = $filter('translate');

    var prefs = $scope.storageGetObj('prefs');
    if (prefs) {
        for (var prop in prefs) {
            $scope.prefs[prop] = prefs[prop];
        }
        //console.log('Prefs load ended');
        $scope.setLang();
    } else {
        //console.log('Really ? No Prefs ?');
    }

    $scope.cleanSessions = function() {
        // Remove Session with note <= 0.1
        if ($scope.sessions !== null) {
            console.log('Cleaning session!');
            $scope.sessions = $scope.sessions.filter(function(item) {
                return (parseFloat(item.overnote) > 0.1);
            });
        }
    };
   
    $scope.writeToFile = function(datas, filename) {
        //var path = 'file:///storage/emulated/0/Android/data/net.khertan.forrunners/'; 
        //var path = cordova.file.dataDirectory;
        var path = cordova.file.externalApplicationStorageDirectory;
        try {
            window.resolveLocalFileSystemURL(path, function(dirEntry) {
                //cordova.file.externalDataDirectory
                dirEntry.getFile(filename, {
                    create: true
                }, function(fileEntry) {
                    fileEntry.createWriter(function(writer) {
                        // Already in JSON Format
                        writer.onwrite = function() {
                        };
                        writer.onerror = function(e) {
                            console.error(e);
                        };
                        writer.fileName = filename;
                        writer.write(new Blob([JSON.stringify(datas)], {
                            type: 'text/plain'
                        }));
                    }, function() {
                        console.error('Cant write '+filename);
                    });
                }, function() {
                    console.error('Cant write 2nd '+filename);
                });
            }, function() {
                console.error('Cant write 3th '+filename);
            });
        }
        catch(err) {console.error('writeSessionsToFile:' + err);}
    };

    $scope.writeSessionsToFile = function(sessions) {
        $scope.writeToFile(sessions, 'sessions.gpxs');
    };

    $scope.writeResumeToFile = function(resume) {
        $scope.writeToFile(resume, 'resume');
    };

    $scope.loadFromFile = function(filename, success, fail) {
        //var path = 'file:///storage/emulated/0/Android/data/net.khertan.forrunners/'+filename;
        //var path = cordova.file.dataDirectory+filename;
        var path = cordova.file.externalApplicationStorageDirectory +filename;
        if (typeof window.resolveLocalFileSystemURL === 'function') {
            window.resolveLocalFileSystemURL(path, function(fileEntry){
                fileEntry.file(function(file) {
                    var reader = new FileReader();
                    reader.onloadend = function() {
                        success(JSON.parse(this.result, $scope.dateTimeReviver));
                        console.log('loaded from file:'+filename);
                    }; reader.readAsText(file);
                });
            }, function(err){fail(err);});
        } else {
            $timeout(function(){$scope.loadFromFile(filename, success, fail);}, 500);
        }
    };

    $scope.loadResumeFromFile = function() {
        $scope.loadFromFile('resume', function(datas) {
            $scope.resume = datas;
            if ((!$scope.resume) || (!('bestspeed' in $scope.resume))){
                $scope.computeResumeGraph(); 
            }
        }, function(err){
            $scope.computeResumeGraph();
            console.error('LoadResumeFromFile failed :'+err);
        });
    };

    $scope.loadSessionsFromFile = function() {
        $scope.loadFromFile('sessions.gpxs', function(datas) {
            $scope.sessions = datas;
            $scope.postLoadSessions();
        }, function(err){
            console.error('LoadSessionsFromFile failed :'+err);
            $timeout(function(){
                try{
                    $scope.sessions = JSON.parse(localStorage.getItem('sessions'), $scope.dateTimeReviver);}
                catch(err){}
                $scope.postLoadSessions();
            }, 100);
        });
    };

    $scope.loadSessions = function() {
        try {
            $scope.loadSessionsFromFile();
       } catch (exception) {
            console.error(exception);
            $timeout(function(){
            $scope.sessions = JSON.parse(localStorage.getItem('sessions'), $scope.dateTimeReviver);
            $scope.postLoadSessions();}, 100);
        }
    };
    
    $scope.postLoadSessions = function() {
         try {
            if ($scope.sessions === undefined) {
                $scope.sessions = [];    
            }
        
            if ($scope.sessions !== null) {
                $scope.sessions.sort(function(a, b) {
                    var x = parseInt(a.recclicked);
                    var y = parseInt(b.recclicked);
                    return (((x < y) ? -1 : ((x > y) ? 1 : 0)) * -1);
                });
            }

            //Cleaning
            $scope.cleanSessions();

            // Remove Duplicate recclicked (already sorted)
            if ($scope.sessions !== null) {
                $scope.sessions = $scope.sessions.filter(function(item, pos, self) {
                    if (pos > 0)
                        {return item.recclicked !== self[pos-1].recclicked;}
                    else
                        {return true;}
                });
            }

            $scope.updateList();
            if(navigator && navigator.splashscreen) {
                navigator.splashscreen.hide();}

            try {
            $scope.loadResumeFromFile();
            } catch(err) {
                $scope.computeResumeGraph();
            }
            //$scope.computeResumeGraph();
           
        } catch (exception) {
            console.error(exception);
        }
    

   };

    $scope.updateList = function() {
        if ($scope.sessions !== null) {
           $scope.list_sessions=[];
           $scope.sessions.sort(function(a, b) {
                var x = parseInt(a.recclicked);
                var y = parseInt(b.recclicked);
                return (((x < y) ? -1 : ((x > y) ? 1 : 0)) * -1);
            });
        }

       if ($scope.sessions) {
            if ($scope.sessions.length > 10) {
                $scope.list_sessions = $scope.sessions.slice(0,10);}
            else {
                $scope.list_sessions = $scope.sessions;}
            //$scope.$broadcast('scroll.infiniteScrollComplete'); 
       }
    };

    $scope.moredata = false;

    $scope.hasMoreData = function() {
        if ($scope.sessions) {
            return $scope.sessions.length > $scope.list_sessions.length;}
        return false;
    };

    $scope.loadMoreData=function()
    {
        if ($scope.sessions) {
            if ($scope.list_sessions.length < $scope.sessions.length) {
                $scope.list_sessions.push($scope.sessions[$scope.list_sessions.length]); 
            }
            if($scope.sessions.length > $scope.list_sessions.length )
            {
                $scope.moredata=true;
            } else {
                $scope.moredata=false;
            }
        }
        $scope.$broadcast('scroll.infiniteScrollComplete');
    };

    $scope.list_sessions=[];

    $scope.glbs = {
        heartRate: {
            service: '180d',
            measurement: '2a37'
        },
        cadence: {
            service: '1814',
            measurement: '2a53'
        },
        power: {
            service: '1818',
            measurement: '2a63'
        },
        radius: {
            miles: 3959,
            kms: 6371
        },
        tounit: {
            miles: 1609.344,
            kms: 1000
        },
        pace: {
            miles: 26.8224,
            kms: 16.6667
        },
        speed: {
            miles: 2.2369,
            kms: 3.6
        },
        pacelabel: {
            miles: ' min/mile',
            kms: ' min/km'
        },
        speedlabel: {
            miles: ' mph',
            kms: ' kph'
        },
        distancelabel: {
            miles: ' miles',
            kms: ' km'
        }
    };

    $ionicPlatform.registerBackButtonAction(function() {
        if ($scope.running === false) {
            var view = $ionicHistory.backView();
            if (view) {
                view.go();
            }
        } else {
            $state.go('app.running');
        }
    }, 100);

    $scope.openModal = function() {
               $state.go('app.running');

    };

    $scope.closeModal = function() {
        $state.go('app.sessions');
    };

    $scope.registerBluetoothDevice = function(id) {
        if (id in $scope.prefs.registeredBLE) {
             delete $scope.prefs.registeredBLE[id];
       } else {
             $scope.prefs.registeredBLE[id] = $scope.bluetooth_devices[id];
        }
        $scope.savePrefs();
    };

    $scope.detectBLEDevice = function() {
        $scope.bluetooth_devices = {};
        
        for (var prop in $scope.prefs.registeredBLE) {
            $scope.bluetooth_devices[prop] = {
                'id': prop,
                'name': $scope.prefs.registeredBLE[prop].name,
                'registered': true
            };
        }
        $scope.bluetooth_scanning = true;

        try {
            ble.startScan([], function(bledevice) {
                $scope.$apply(function() {
                    if (!(bledevice.id in $scope.bluetooth_devices)) {
                        if (bledevice.id in $scope.prefs.registeredBLE) {
                            $scope.bluetooth_devices[bledevice.id] = {
                                'id': bledevice.id,
                                'name': bledevice.name ? bledevice.name : 'Unknow',
                                'registered': true
                            };

                        } else {
                            $scope.bluetooth_devices[bledevice.id] = {
                                'id': bledevice.id,
                                'name': bledevice.name ? bledevice.name : 'Unknow',
                                'registered': false
                            };
                        }
                    }
                });
            }, function() {
                $scope.$apply(function() {
                    $scope.bluetooth_scanning = false;
                });
            });

            setTimeout(function() {
                ble.stopScan(
                    function() {
                        $scope.$apply(function() {
                            $scope.bluetooth_scanning = false;
                        });
                    },
                    function() {
                        $scope.$apply(function() {
                            $scope.bluetooth_scanning = false;
                        });
                    }
                );
            }, 5000);
        } catch (exception) {                                                   
            $scope.bluetooth_scanning = false;
            console.info('BluetoothLE not available');   
        }  
    };

    $scope.heartRateOnConnect = function(peripheral) {
        //HEARTRATE
        ble.notify(peripheral.id,
            $scope.glbs.heartRate.service,
            $scope.glbs.heartRate.measurement,
            $scope.heartRateOnData,
            function(err) {
                console.error('BLE HR error :' + err);
                $scope.session.beatsPerMinute = null;
            });
 
        //CADENCE
        ble.notify(peripheral.id,
            $scope.glbs.cadence.service,
            $scope.glbs.cadence.measurement,
            $scope.cadenceOnData,
            function(err) {
                console.error('BLE Cadence error :' + err);
                $scope.session.instantCadence = null;
            });
        
        //POWER
        ble.notify(peripheral.id,
            $scope.glbs.power.service,
            $scope.glbs.power.measurement,
            $scope.powerOnData,
            function(err) {
                console.error('BLE Power error :' + err);
                $scope.session.instantPower = null;
                $scope.session.intantStride = null;
            });
        
    };

    $scope.heartRateOnData = function(buffer) {
        var data = new DataView(buffer);
        // https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.heart_rate_measurement.xml
        if (data.getUint8(0) === 0x1000) {
            $scope.session.beatsPerMinute = data.getUint16(1);
        } else {
            $scope.session.beatsPerMinute = data.getUint8(1);
        }
    };


    $scope.cadenceOnData = function(buffer) {
        //
        var data = new DataView(buffer);
        $scope.session.instantCadence = data.getUint8(3);
        console.log('Instant Cadence' + $scope.session.instantCadence);
        console.log('Data1' + data.getUint8(1));
        console.log('Data2' + data.getUint8(2));
        console.log('Data3' + data.getUint8(3));
        console.log('Data4' + data.getUint8(4));

        if (data.getUint8(0) === 0x1000) {
            $scope.session.instantStride = data.getUint16(4);}
    };

    $scope.powerOnData = function(buffer) {
        //https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.cycling_power_measurement.xml
        var data = new DataView(buffer);
        $scope.session.instantPower = data.getInt16(2, true);
    };

    $scope.heartRateOnDisconnect = function(reason) {
        console.debug('BLE Disconnected:' + reason);
        $scope.session.beatsPerMinute = null;
    };

    $scope.heartRateScan = function() {
        // https://developer.bluetooth.org/gatt/services/Pages/ServiceViewer.aspx?u=org.bluetooth.service.heart_rate.xml
        if ((Object.keys($scope.prefs.registeredBLE).length > 0) && ($scope.session.beatsPerMinute === null)) {
            ble.scan([$scope.glbs.heartRate.service], 5,
                //onScan
                function(peripheral) {
                    console.debug('Found ' + JSON.stringify(peripheral));

                    if (peripheral.id in $scope.prefs.registeredBLE) {
                        //foundHeartRateMonitor = true;
                        ble.connect(peripheral.id,
                            $scope.heartRateOnConnect,
                            $scope.heartRateOnDisconnect);
                    } else {
                        console.debug('Device ' + peripheral.id + ' not registered');
                    }

                }, function() {
                    console.error('BluetoothLE scan failed');
                }
            );
        }
    };

    $scope.stopSession = function() {
        $scope.session.saving = true;
        $timeout(function() {
            //navigator.geolocation.clearWatch($scope.session.watchId);
            backgroundGeoLocation.stop();
            $interval.cancel($scope.runningTimeInterval);
            if ($scope.session.gpxData.length > 0) {
                //Session cleaning
                delete $scope.session.accuracy;
                delete $scope.session.elapsed;
                delete $scope.session.firsttime;
                delete $scope.session.elevation;
                delete $scope.session.time;
                delete $scope.session.pace;
                delete $scope.session.speed;
                delete $scope.session.maxspeed;
                delete $scope.session.equirect;
                delete $scope.session.eledist;
                delete $scope.session.altold;
                delete $scope.session.latold;
                delete $scope.session.lonold;
                delete $scope.session.latold;
                delete $scope.session.lastdisptime;
                delete $scope.session.maxalt;
                delete $scope.session.minalt;
                delete $scope.session.hilldistance;
                delete $scope.session.flatdistance;
                delete $scope.session.avpace;
                delete $scope.session.avspeed;
                delete $scope.session.lastdistvocalannounce;
                delete $scope.session.lasttimevocalannounce;
                delete $scope.session.timeslowvocalinterval;
                delete $scope.session.lastfastvocalannounce;
                delete $scope.session.kalmanDist;
                $scope.session.fixedElevation = undefined;
                $scope.saveSession();
                $scope.computeResumeGraph();
                //$scope.updateList();
            }
            $scope.running = false;
            try {
                cordova.plugins.backgroundMode.disable();
            } catch (exception) {
                console.debug('ERROR: cordova.plugins.backgroundMode disable');
            }
            try {
                window.plugins.insomnia.allowSleepAgain();
            } catch (exception) {
                console.debug('ERROR: cordova.plugins.insomnia allowSleepAgain');
            }

            try {
                clearInterval($scope.btscanintervalid);
            } catch (exception) {
            }

            if ($scope.platform === 'firefoxos') {
                try {
                    $scope.screen_lock.unlock();
                } catch(exception) {}
                try {
                    $scope.gps_lock.unlock();
                } catch(exception) {}
            }

            $scope.closeModal();
            $scope.session.saving = false;
        }, 10);
    };

    $scope.speakText = function(text) {
        try {

            musicControl.isactive(function(err, cb) {
                if (err) {
                    console.error(err);
                }

                var stopMusic = (cb && $scope.prefs.togglemusic);

                var utterance = new SpeechSynthesisUtterance();

                utterance.text = text;
                utterance.volume = 1;
                utterance.lang = ($scope.prefs.language);


                if (stopMusic) {
                    utterance.onend = function(event) {
                        if (stopMusic) {
                            musicControl.togglepause(function(err, cb) {
                                if (err) {
                                    console.error(err, event, cb);
                                }
                                return;
                            });
                        }
                    };
                    musicControl.togglepause(function(err, cb) {
                        if (err) {
                            console.error(err, event, cb);
                        }
                        speechSynthesis.speak(utterance);
                        return;
                    });
                } else {
                    speechSynthesis.speak(utterance);
                }
            });
        } catch (exception) {
            console.debug('SpeechSynthesisUtterance not available : ' + exception);
        }
    };

    $scope.testRunSpeak = function() {
        $scope.session = {};
        $scope.session.equirect = 3.24;
        $scope.session.avspeed = 10.21;
        $scope.session.avpace = '5:48';
        $scope.session.time = '1:28:23';
        $scope.session.beatsPerMinute = 160;
        $scope.runSpeak();
    };

    $scope.runSpeak = function() {
        var speechText = '';
        if ($scope.prefs.distvocalannounce) {
            speechText += $scope.session.equirect.toFixed(2) + ' ' + $scope.translateFilter('_kilometers') + ' ';
        }
        if ($scope.prefs.timevocalannounce) {
            speechText += ', ';
            var hs = $scope.session.time.split(':')[0];
            if (parseInt(hs, 10) > 0) {
                speechText += hs + ' ' + $scope.translateFilter('_hours') + ' ' + $scope.translateFilter('_and') + ' ';
            }
            speechText += $scope.session.time.split(':')[1] + ' ' + $scope.translateFilter('_minutes');
        }

        if ($scope.prefs.avgspeedvocalannounce) {
            speechText += ', ' + $scope.session.speed + ' ' + $scope.translateFilter('_kilometers_per_hour') + ' ';
        }
        if ($scope.prefs.avgpacevocalannounce) {
            speechText += ', ';
            speechText += $scope.session.avpace.split(':')[0] + ' ' + $scope.translateFilter('_minutes') + ' ' + $scope.translateFilter('_and') + ' ';
            speechText += $scope.session.avpace.split(':')[1] + ' ' + $scope.translateFilter('_seconds_per_kilometers');
        }
        if (($scope.prefs.heartrateannounce === true) && ($scope.session.beatsPerMinute > 0)) {
            speechText += ', ' + $scope.session.beatsPerMinute + ' ' + $scope.translateFilter('_bpms') + ' ';
        }
 
        $scope.speakText(speechText);
    };

    $scope.recordPosition = function(pos) {
        //console.debug(pos);
        if ($scope.mustdelay === false) {
            var latnew = pos.latitude;
            var lonnew = pos.longitude;
            var timenew = pos.time;
            var altnew = 'x';
            var elapsed = 0;

            if (typeof pos.altitude === 'number') {
                altnew = pos.altitude;
            }

            $scope.$apply(function() {
                $scope.session.accuracy = pos.accuracy;
                $scope.session.accuracy_fixed = pos.accuracy.toFixed(0);

                if ((pos.accuracy <= $scope.prefs.minrecordingaccuracy) &&
                    (timenew > $scope.session.recclicked) &&
                    ($scope.session.latold !== 'x') &&
                    ($scope.session.lonold !== 'x')) {
                    $scope.session.gpsGoodSignalToggle = true;
                    if (($scope.prefs.gpslostannounce)) {
                            //$scope.speakText($scope.translateFilter('_gps_got'));
                            $scope.gpslostlastannounce = timenew;
                    }
                }

                if ((pos.accuracy >= $scope.prefs.minrecordingaccuracy) &&
                    ($scope.session.gpsGoodSignalToggle === true) &&
                    (timenew > $scope.session.recclicked)) {
                    // In case we lost gps we should announce it
                    $scope.session.gpsGoodSignalToggle = false;
                    if (($scope.prefs.gpslostannounce) && ((timenew - 30) > $scope.gpslostlastannounce)) {
                        $scope.speakText($scope.translateFilter('_gps_lost'));
                        $scope.gpslostlastannounce = timenew;
                    }
                }

                if ($scope.session.firsttime !== 0) {
                    //Elapsed time
                    elapsed = timenew - $scope.session.firsttime;
                    var hour = Math.floor(elapsed / 3600000);
                    var minute = ('0' + (Math.floor(elapsed / 60000) - hour * 60)).slice(-2);
                    var second = ('0' + Math.floor(elapsed % 60000 / 1000)).slice(-2);
                    $scope.session.time = hour + ':' + minute + ':' + second;
                    $scope.session.elapsed = elapsed;

                    if ((pos.accuracy <= $scope.prefs.minrecordingaccuracy)) {
                        // Instant speed
                        if (pos.speed) {
                            $scope.session.speeds.push(pos.speed);
                            if ($scope.session.speeds.length > 5) {
                                $scope.session.speeds.shift();
                            }
                            $scope.session.speed = average($scope.session.speeds,0);
                            var currentPace = $scope.glbs.pace[$scope.prefs.unit] / $scope.session.speed;
                            //converts metres per second to minutes per mile or minutes per km
                            $scope.session.pace = Math.floor(currentPace) + ':' + ('0' + Math.floor(currentPace % 1 * 60)).slice(-2);
                            $scope.session.speed = ($scope.session.speed * $scope.glbs.speed[$scope.prefs.unit]).toFixed(1);
                            if ($scope.session.maxspeed < $scope.session.speed) {
                                $scope.session.maxspeed = $scope.session.speed;
                            }
                        }

                        // Not first point
                        if ($scope.session.latold !== 'x' && $scope.session.lonold !== 'x') {

                            //Limit ok
                            if (timenew - $scope.session.lastdisptime >= $scope.prefs.minrecordinggap) {
                                $scope.session.lastdisptime = timenew;

                                //Distances
                                var dLat;
                                var dLon;
                                var dLat1;
                                var dLat2;
                                var a, c, d;
                                var dtd;
                                var dspeed;

                                dLat = (latnew - $scope.session.latold) * Math.PI / 180;
                                dLon = (lonnew - $scope.session.lonold) * Math.PI / 180;
                                dLat1 = ($scope.session.latold) * Math.PI / 180;
                                dLat2 = (latnew) * Math.PI / 180;
                                a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                    Math.cos(dLat1) * Math.cos(dLat1) *
                                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                d = $scope.session.kalmanDist.update(6371 * c)[0];
                                //Speed between this and previous point
                                dtd = new Date(timenew) - new Date($scope.session.timeold);
                                dspeed = (d) / (dtd / 1000 / 60 / 60);

                                elapsed = timenew - $scope.session.firsttime;
                                //console.log(ispeed);
                                if ((dspeed > 2)) {
                                    $scope.session.equirect += d;
                                    $scope.session.eledist += d;
                                }

                                //Elevation?
                                if ($scope.session.altold !== 'x') {
                                    $scope.session.altold = altnew;
                                    if (altnew > $scope.session.maxalt) {
                                        $scope.session.maxalt = altnew;
                                        $scope.session.elevation = ($scope.session.maxalt - $scope.session.minalt).toFixed(1);
                                    }
                                    if (altnew < $scope.session.minalt) {
                                        $scope.session.minalt = altnew;
                                        $scope.session.elevation = ($scope.session.maxalt - $scope.session.minalt).toFixed(1);
                                    }
                                }
                                $scope.session.hilldistance = $scope.session.eledist.toFixed(2);
                                $scope.session.flatdistance = $scope.session.equirect.toFixed(2);
                                $scope.session.distk = $scope.session.equirect.toFixed(1);
                                if ($scope.session.equirect > 0) {
                                    var averagePace = elapsed / ($scope.session.equirect * 60000);
                                    $scope.session.avpace = Math.floor(averagePace) + ':' + ('0' + Math.floor(averagePace % 1 * 60)).slice(-2);
                                    if (dspeed) {
                                        $scope.session.avspeed = dspeed.toFixed(1);
                                    } else {
                                        $scope.session.avspeed = '0';
                                    }
                                }

                                $scope.session.latold = latnew;
                                $scope.session.lonold = lonnew;
                                $scope.session.altold = altnew;
                                $scope.session.timeold = timenew;

                                //Alert and Vocal Announce
                                if (parseInt($scope.prefs.distvocalinterval) > 0) {
                                    $scope.session.lastdistvocalannounce = 0;
                                    if (($scope.session.equirect - $scope.session.lastdistvocalannounce) > $scope.prefs.distvocalinterval * 1000) {
                                        $scope.session.lastdistvocalannounce = $scope.session.equirect;
                                        $scope.runSpeak();
                                    }
                                }

                                if (parseInt($scope.prefs.timevocalinterval) > 0) {
                                    if ((timenew - $scope.session.lasttimevocalannounce) > $scope.prefs.timevocalinterval * 60000) /*fixme*/ {
                                        $scope.session.lasttimevocalannounce = timenew;
                                        $scope.runSpeak();
                                    }
                                }

                                if (parseInt($scope.prefs.timeslowvocalinterval) > 0) {
                                    if (($scope.session.lastslowvocalannounce !== -1) &&
                                        ((timenew - $scope.session.lastslowvocalannounce) > $scope.prefs.timeslowvocalinterval * 60000)) /*fixme*/ {
                                        $scope.session.lastslowvocalannounce = -1;
                                        $scope.session.lastfastvocalannounce = timenew;
                                        $scope.speakText($scope.translateFilter('_run_fast'));
                                    }
                                }
                                if (parseInt($scope.prefs.timefastvocalinterval) > 0) {
                                    if (($scope.session.lastfastvocalannounce !== -1) &&
                                        ((timenew - $scope.session.lastfastvocalannounce) > $scope.prefs.timefastvocalinterval * 60000)) /*fixme*/ {
                                        $scope.session.lastslowvocalannounce = timenew;
                                        $scope.session.lastfastvocalannounce = -1;
                                        $scope.speakText($scope.translateFilter('_run_slow'));
                                    }
                                }
                            }
                        }
                    }
                } else {
                    $scope.session.firsttime = timenew;
                    $scope.session.lastdisptime = timenew;
                    $scope.session.lastdistvocalannounce = 0;
                    $scope.session.lasttimevocalannounce = timenew;
                    $scope.session.lastslowvocalannounce = timenew;
                    $scope.session.lastfastvocalannounce = -1;
                    $scope.session.latold = latnew;
                    $scope.session.lonold = lonnew;
                    $scope.session.time = '00:00:00';
                    $scope.session.hilldistance = '0';
                    $scope.session.flatdistance = '0';
                    $scope.session.maxspeed = '0';
                    $scope.session.speed = '0';
                    $scope.session.avspeed = '0';
                    $scope.session.elapsed = 0;
                    $scope.session.minalt = 99999;
                    $scope.session.maxalt = 0;
                    $scope.session.elevation = '0';
                    $scope.session.smoothed_speed = [];
                }
                if ((timenew - $scope.session.lastrecordtime >= $scope.prefs.minrecordinggap) &&
                    (pos.accuracy <= $scope.prefs.minrecordingaccuracy)) {
                    //console.log('Should record');
                    var pointData = [
                        latnew.toFixed(6),
                        lonnew.toFixed(6),
                        new Date(timenew).toISOString() //.replace(/\.\d\d\d/, '')
                    ];

                    if (typeof pos.altitude === 'number') {
                        pointData.push(pos.altitude);
                    } else {
                        pointData.push('x');
                    }

                    if ($scope.session.beatsPerMinute) {
                        pointData.push($scope.session.beatsPerMinute);
                    } else {
                        pointData.push('x');
                    }

                    pointData.push(pos.accuracy);
 
                    if ($scope.session.instantCadence) {
                        pointData.push($scope.session.instantCadence);
                    } else {
                        pointData.push('x');
                    }

                    if ($scope.session.instantPower) {
                        pointData.push($scope.session.instantPower);
                    } else {
                        pointData.push('x');
                    }

                    if ($scope.session.instantStride) {
                        pointData.push($scope.session.instantStride);
                    } else {
                        pointData.push('x');
                    }


                    $scope.session.gpxData.push(pointData);
                    $scope.session.lastrecordtime = timenew;
                }

                // Record Weather
                if ($scope.session.weather === '') {
                    $scope.weather.byLocation({
                        'latitude': latnew,
                        'longitude': lonnew
                    }).then(function(weather) {
                        $scope.session.weather = weather;
                    });
                }

            });
        }
        backgroundGeoLocation.finish();
    };

    $scope.toRad = function(x) {
        return x * Math.PI / 180;
    };

    //$scope.errorfn = function(err) {
    //    console.debug('errorfn:' + err);
    //};

    $scope.errorPosition = function(err) {
        console.debug('errorPosition:' + err.message + ':' + err.code);
        $scope.session.gpsGoodSignalToggle = false;
        console.debug('gpsGoodSignalToggle set to false');
        console.debug( $scope.gpslostlastannounce);
        console.debug($scope.session.lastrecordtime);
        if (($scope.prefs.gpslostannounce)) {
                $scope.speakText($scope.translateFilter('_gps_lost'));
                $scope.gpslostlastannounce = $scope.session.lastrecordtime;
            }
    };


    $scope.startSession = function() {
        $scope.running = true;

        $scope.session = {};
        $scope.session.gpsGoodSignalToggle = true;
        $scope.gpslostannounced = false;
        $scope.session.recclicked = new Date().getTime();
        $scope.session.date = moment().format('llll');

        $scope.session.mdate = moment().format('MMMM YYYY');
        $scope.session.ddate = new Date().getDate();
        $scope.session.gpxData = [];

        $scope.session.unit = $scope.prefs.unit;
        $scope.session.speedlabel = $scope.glbs.speedlabel[$scope.prefs.unit];
        $scope.session.pacelabel = $scope.glbs.pacelabel[$scope.prefs.unit];
        $scope.session.distancelabel = $scope.glbs.distancelabel[$scope.prefs.unit];

        $scope.session.lastrecordtime = 0;
        $scope.session.elapsed = 0;
        $scope.session.firsttime = 0;

        $scope.session.latold = 'x';
        $scope.session.lonold = 'x';
        $scope.session.altold = 'x';

        $scope.session.time = '00:00:00';
        $scope.session.dist = 0;
        $scope.session.kalmanDist = new KalmanFilter(0.2, 3, 10);
        $scope.session.equirect = 0;
        $scope.session.eledist = 0;
        $scope.session.hilldistance = '0';
        $scope.session.flatdistance = '0';
        $scope.session.elevation = '0';
        $scope.session.maxspeed = '0';
        $scope.session.speed = '0';
        $scope.session.avspeed = '0';
        $scope.session.avpace = '00:00';
        $scope.session.speeds = [];

        $scope.session.weather = '';
        $scope.session.temp = '';

        $scope.screen_lock = null;
        $scope.gps_lock = null;
        $scope.gpslostlastannounce = 0;

        $scope.mustdelay = ($scope.prefs.useDelay === true);
        $scope.delay = new Date().getTime();
        if ($scope.mustdelay === true) {
            $scope.mustdelaytime = new Date().getTime();
            $scope.mustdelayintervalid = setInterval($scope.delayCheck, 500);
        }
        try {
            cordova.plugins.backgroundMode.setDefaults({
                title: 'ForRunners',
                ticker: $scope.translateFilter('_notification_slug'),
                text: $scope.translateFilter('_notification_message')
            });
            cordova.plugins.backgroundMode.enable();
        } catch (exception) {
            console.debug('ERROR: cordova.plugins.backgroundMode not enabled');
        }

        if ($scope.prefs.keepscreenon === true) {
            try {
                window.plugins.insomnia.keepAwake();
            } catch (exception) {
                console.debug('ERROR: window.plugins.insomnia keepAwake');
            }
        }

        try {
            $scope.session.beatsPerMinute = null;
            $scope.btscanintervalid = setInterval($scope.heartRateScan, 10000);
        } catch (exception) {
            console.debug('ERROR: BLEScan:' + exception);
        }


        if ($scope.prefs.debug) {
            $scope.prefs.minrecordingaccuracy = 22;
        } else {
            $scope.prefs.minrecordingaccuracy = 22;
        }
        
        if ($scope.platform === 'firefoxos') {
            try {
                $scope.gps_lock = window.navigator.requestWakeLock('gps');
                if ($scope.prefs.keepscreenon === true) {
                    $scope.screen_lock = window.navigator.requestWakeLock('screen');
                }
            } catch (exception) {
                console.debug('ERROR: Can\'t set background GPS or keep screen on setting for FirefoxOS:' + exception);
            }
        }
        /*$scope.session.watchId = navigator.geolocation.watchPosition(
            $scope.recordPosition,
            $scope.errorPosition, {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 3000
        });*/
        //Timer to update time
        $scope.runningTimeInterval = $interval(function() {
                if ($scope.session.firsttime > 0) {
                var elapsed = Date.now() - $scope.session.firsttime;
                var hour = Math.floor(elapsed / 3600000);                   
                var minute = ('0' + (Math.floor(elapsed / 60000) - hour * 60)).slice(-2);
                var second = ('0' + Math.floor(elapsed % 60000 / 1000)).slice(-2);
                $scope.session.time = hour + ':' + minute + ':' + second;   
                $scope.session.elapsed = elapsed; 
                }
        }, 2000);

        backgroundGeoLocation.configure($scope.recordPosition, $scope.errorPosition, {
            desiredAccuracy: $scope.prefs.minrecordingaccuracy,
            locationService: backgroundGeoLocation.service.ANDROID_DISTANCE_FILTER,
            notificationIconColor: '#4CAF50',
            notificationTitle: 'ForRunners Background tracking',
            notificationText: 'Recording',
            notificationIcon: 'notification_icon',
            activityType: 'Fitness',
            activitiesInterval: 2000,
            stationaryRadius: 10,
            distanceFilter: 1,
            interval: 3000,
            fastestInterval: 2000,
            locationTimeout: 3,
            debug: $scope.prefs.debug, // <-- enable this hear sounds for background-geolocation life-cycle.
            stopOnTerminate: false, // <-- enable this to clear background location settings when the app terminates
        });
        backgroundGeoLocation.start();
        $scope.openModal();

    };


    $scope.delayCheck = function() {
        if ((new Date().getTime() - $scope.mustdelaytime) < $scope.prefs.delay) {
            $scope.delay = (new Date().getTime() - $scope.mustdelaytime);
            $scope.session.time = (-($scope.prefs.delay - $scope.delay) / 1000).toFixed(0);
            $scope.$apply();
        } else {
            $scope.mustdelay = false;
            $scope.speakText($scope.translateFilter('go'));
            $scope.session.time = '00:00:00';
            clearInterval($scope.mustdelayintervalid);
            $scope.$apply();
        }
    };

    $scope.saveSession = function() {
        //var sessions = [];
        //DOCOMPUTE        
        //try {
        //    sessions = $scope.storageGetObj('sessions');
        //} catch (exception) {}
        var sessions = $scope.sessions;
        if (!sessions) {
            sessions = [];
            $scope.sessions = [];
        }

        if (sessions.indexOf($scope.session) < 0) {
            $scope.session.map = {
                center: {
                    lat: 48,
                    lng: 4,
                    zoom: 5,
                    autoDiscover: false
                },
                paths: {},
                bounds: {},
                controls: {
                    scale: true
                },
                markers: {},
                tiles: {
                    url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                }
            };
            //avoid duplicate ... test before
            var saved = false;
            $scope.sessions.map(function(item, idx){
                if (item.recclicked === $scope.session.recclicked) {
                    $scope.sessions[idx] = $scope.session;
                        saved = true;
                    }
            });
            if (!saved){
                $scope.sessions.push($scope.session);
                saved = true;
            }
            
            $scope.writeSessionsToFile(sessions);
            if ($scope.platform === 'browser') {
                $scope.storageSetObj('sessions', sessions); }
            
            try {
                $scope.computeSessionFromGPXData($scope.session, true);
            } catch (exception) {
                console.error('ComputeSessionFromGPX Failed on save:' + exception);
            }
            $scope.updateList();
            $scope.computeResumeGraph();


            //Automated backup
            setTimeout(function() {
                $scope.exportAsGPX(false);
            }, 5000);
        }
        //$scope.storageSetObj('version', $scope._version);
    };
 
    $scope.savePrefs = function() {
        $scope.storageSetObj('prefs', $scope.prefs);
        $scope.setLang();
    };


    $scope.computeResumeGraph = function() {
        $scope.resume = {};
        $scope.resume.chart_labels = [];
        $scope.resume.chart_series = [$scope.translateFilter('_overnote'), $scope.translateFilter('_duration_minutes')];
        $scope.resume.chart_data = [
            [],
            []
        ];
        $scope.resume.chart_options = {
            responsive: true,
            animation: false,
            showScale: false,
            scaleShowLabels: false,
            pointHitDetectionRadius: 10,
            scaleUse2Y: true,
            legendTemplate: '<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'
        };

        $scope.resume.overnote = 0;
 
        $scope.resume.elapsed = 0;
        $scope.resume.equirect = 0;
        $scope.resume.avspeed = 0;

        $scope.resume.longesttime = new Date(0);
        $scope.resume.bestdistance = 0;
        $scope.resume.bestspeed = 0;

        $scope.sessions.map(function(item) {

            $scope.resume.chart_labels.push(item.date);
            try {
             $scope.resume.chart_data[1].push(item.duration.getUTCMinutes() + item.duration.getUTCHours() * 60);
             $scope.resume.chart_data[0].push(item.overnote);
             $scope.resume.elapsed += item.duration.getTime();
            } catch(err) {console.error('item.duration.getUTCMinutes'); }
            $scope.resume.avspeed += item.speed;
            $scope.resume.equirect += item.distance;
            $scope.resume.overnote += parseFloat(item.overnote);


            if (item.speed > $scope.resume.bestspeed) {
                $scope.resume.bestspeed = item.speed;
            }
            if (item.duration > $scope.resume.longesttime) {
                $scope.resume.longesttime = item.duration;
            }
            if (item.distance > $scope.resume.bestdistance) {
                $scope.resume.bestdistance = item.distance;
            }

        });

        if ($scope.resume.chart_labels.length > 25) {
            $scope.resume.chart_labels = $scope.resume.chart_labels.slice(0, 24);
            $scope.resume.chart_data[0] = $scope.resume.chart_data[0].slice(0, 24);
            $scope.resume.chart_data[1] = $scope.resume.chart_data[1].slice(0, 24);
        }
        $scope.resume.chart_labels.reverse();
        $scope.resume.chart_data[0].reverse();
        $scope.resume.chart_data[1].reverse();

        $scope.resume.flatdistance = ($scope.resume.equirect / $scope.sessions.length).toFixed(1);
        $scope.resume.avspeed = ($scope.resume.avspeed / $scope.sessions.length).toFixed(1);
        $scope.resume.avduration = new Date($scope.resume.elapsed / $scope.sessions.length);
        $scope.resume.overnote = Math.round(($scope.resume.overnote / $scope.sessions.length), 1);
 
        $scope.resume.bestspeed = $scope.resume.bestspeed.toFixed(1);
        $scope.resume.bestdistance = $scope.resume.bestdistance.toFixed(1);

        $scope.writeResumeToFile($scope.resume);
        $ionicScrollDelegate.resize();

    };

})

.controller('SessionsCtrl', function($scope, $timeout, ionicMaterialInk, ionicMaterialMotion, $state) {
    'use strict';

    $timeout(function() {
        //Get position a first time to get better precision when we really
        //start running
        navigator.geolocation.getCurrentPosition(function() {}, function() {}, {
            enableHighAccuracy: true,
            timeout: 60000,
            maximumAge: 0
        });
       
        if ($scope.prefs.first_run === true) {
            $scope.prefs.first_run = false;
            $scope.savePrefs();
            $state.go('app.help');        
        }
    }, 5000);

    // Compute Resume Graph
    $timeout(function() {
        ionicMaterialInk.displayEffect();
    }, 4000);
})

.controller('RecordsCtrl', function($scope) {
    'use strict';
    $scope.computeRecords = function() {
        $scope.records = {};
        var sessions = $scope.sessions;
        $scope.total_kms = 0;
        
        if (sessions) {
            for (var idx = 0; idx < sessions.length; idx++) {
                var session = sessions[idx];

                if ($scope.records[session.distk] === undefined) {
                    $scope.records[session.distk] = {
                        distk: session.distk,
                        speed: 0,
                        pace: undefined,
                        duration: new Date(),
                        speeds: [],
                        durations: [],
                        paces: [],
                        av_speed: undefined,
                        av_duration: undefined,
                        av_pace: undefined

                    };

                }
                $scope.total_kms += session.distance;

                if ($scope.records[session.distk].speed < session.speed) {
                    $scope.records[session.distk].speed = session.speed;
                }
                if ($scope.records[session.distk].pace === undefined) {
                    $scope.records[session.distk].pace = session.pace;

                } else {
                    if ($scope.records[session.distk].pace > session.pace) {
                        $scope.records[session.distk].pace = session.pace;
                    }
                }
                if ($scope.records[session.distk].duration > session.duration) {
                    $scope.records[session.distk].duration = session.duration;
                }

                $scope.records[session.distk].paces.push(session.pace);
                $scope.records[session.distk].speeds.push(session.speed);
                $scope.records[session.distk].durations.push(session.duration);
                $scope.records[session.distk].av_pace = average($scope.records[session.distk].paces, 0);
                $scope.records[session.distk].av_speed = average($scope.records[session.distk].speeds, 1);
                $scope.records[session.distk].av_duration = average($scope.records[session.distk].durations, 0);
            }
        }

        $scope.total_kms = $scope.total_kms.toFixed(1);

    };

    $scope.computeRecords();

    //$timeout(function() {
        //ionicMaterialInk.displayEffect();
    //}, 300);

})

.controller('SessionCtrl', function($scope, $stateParams, $ionicPopup, $ionicHistory, $timeout, $ionicScrollDelegate) {
    'use strict';
    $scope.deleteSession = function(idx) {
        // confirm dialog
        var confirmPopup = $ionicPopup.confirm({
            title: $scope.translateFilter('_delete'),
            template: $scope.translateFilter('_confirm_delete')
        });
        confirmPopup.then(function(res) {
            if (res) {
                $scope.sessions.splice(idx, 1);
                $scope.writeSessionsToFile($scope.sessions);
                if ($scope.platform === 'Browser') {
                    $scope.storageSetObj('sessions', $scope.sessions); }
                $scope.updateList();
                $scope.computeResumeGraph();
                //Back
                var view = $ionicHistory.backView();
                if (view) {
                    view.go();
                }
            } else {
                console.error('Error confirm delete session');
            }
        });
    };

    $scope.saveSessionModifications = function() {
        $scope.sessions[$stateParams.sessionId] = $scope.session;
        $scope.writeSessionsToFile($scope.sessions);
        if ($scope.platform === 'browser') {
            $scope.storageSetObj('sessions', $scope.sessions);}
        $scope.storageSetObj('version', $scope._version);
    };

    $scope.deleteSessionByID = function(sid) {
        $scope.sessions.map(function(value, indx) {
            if (value.recclicked === sid) {
                $scope.deleteSession(indx);
            }
        });
    };

    $scope.sharePieceOfDOM = function(){

        //share the image via phonegap plugin
        window.plugins.socialsharing.share(
            $scope.session.distance + ' Kms in ' + moment($scope.session.duration).utc().format('HH:mm') + ' ( '+ $scope.session.speed+' Kph ) tracked with #ForRunners',
            'ForRunners',
            document.getElementById('speedvsalt').toDataURL(),
            'http://khertan.net/#forrunners',
            function(){ 
                //success callback
            },
            function(err){
                //error callback
                console.error('error in share', err);
            }
        );

    };

    $scope.session = $scope.sessions[$stateParams.sessionId];

    if (($scope.session.map === undefined)) {
        $scope.session.map = {
            center: {
                lat: 48,
                lng: 4,
                zoom: 5,
                autoDiscover: false
            },
            paths: {},
            bounds: {},
            controls: {
                scale: true
            },
            markers: {},
            tiles: {
                url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
        };
    }

    // Horrible hack to workarround a resize issue with chart.js and ng
    angular.element(document).ready(function () {
       $timeout(function() {
            $ionicScrollDelegate.resize();   
       }, 100);  
    });
    
    try {
        console.info('Recompute session:');
        console.info('\t fixedElevation:' + $scope.session.fixedElevation);
        console.info('\t usegoogleelevationapi:' + $scope.prefs.usegoogleelevationapi);
        console.info('\t overnote:' + $scope.session.overnote);
        console.info('\t gpxPoints:' + $scope.session.gpxPoints.length);
        console.info('\t paceDetails:' + $scope.session.paceDetails);
        console.info('\t version' + $scope.session.version);
    }catch(err){console.log(err);} 

    if ((($scope.session.fixedElevation === undefined) && ($scope.prefs.usegoogleelevationapi === true)) || 
             ($scope.session.overnote === undefined) ||
             ($scope.session.gpxPoints === undefined) ||
             ($scope.prefs.debug === true) ||
             ($scope.session.paceDetails === undefined) ||
             ($scope.session.map.paths === undefined) ||
             ($scope.session.map.bounds === undefined) ||
             ($scope.session.map.markers === undefined)||
             ($scope.session.version !== $scope._version)) {
       //PARSE GPX POINTS
        $timeout(function() {
            $scope.computeSessionFromGPXData($scope.session, true);
            //$scope.saveSessionModifications();
            $scope.updateList();
            //$ionicScrollDelegate.resize();
        }, 500);
    }
})

.controller('FilePickerController', function($scope, $ionicPlatform, $FileFactory, $ionicHistory) {
    'use strict';
    var fs = new $FileFactory();

    $ionicPlatform.ready(function() {
        fs.getEntries('file:///storage').then(function(result) {
            $scope.files = result;
        }, function(error) {
            console.error(error);
        });

        $scope.getContents = function(path) {
            fs.getEntries(path).then(function(result) {
                if (result instanceof FileEntry) {
                    var view = $ionicHistory.backView();
                    if (view) {
                        view.go();
                    }
                    result.file(function(gotFile) {
                        $scope.importGPX(gotFile);
                    }, function(err) {console.error(err);});
                        
                } else {
                    $scope.files = result;
                    $scope.files.unshift({name: '[parent]'});
                    fs.getParentDirectory(path).then(function(result) {
                        result.name = '[parent]';
                        $scope.files[0] = result;
                    });
                }
            });
        };
    });

})

.controller('SettingsCtrl', function($scope) {
    'use strict';
    //$scope.promptForRating = function() {
        //AppRate.preferences.storeAppURL.android = 'market://details?id=net.khertan.forrunners';
        //AppRate.preferences.promptAgainForEachNewVersion = false;
        //AppRate.promptForRating();
    //};
    
    //if ($scope.sessions.length > 5) {
    //    $scope.promptForRating();
    //}
}) 

.controller('HelpCtrl', function($scope, $state, $ionicScrollDelegate) {
    'use strict';
    $scope.help_cur = 1;
    $scope.next = function() {
        $scope.help_cur += 1;
        $scope.go();
        $ionicScrollDelegate.scrollTop();
    };
    $scope.previous = function() {
        $scope.help_cur -= 1;
        if ($scope.help_cur <= 0) {
            $scope.help_cur = 1;
        }
        $scope.go();
        $ionicScrollDelegate.scrollTop();
    };


    $scope.go = function() {
        if (($scope.help_cur >= 1) || ($scope.help_cur <= 6)){
            $scope.help_path = 'img/help_'+$scope.help_cur+'.svg';
            $scope.help_subtitle = $scope.translateFilter('_help_subtitle_'+$scope.help_cur);
            $scope.help_desc = $scope.translateFilter('_help_desc_'+$scope.help_cur); 
        } else if ($scope.help_cur === 7) {
            $state.go('app.sessions');            
        }
    };
    $scope.go();
});
