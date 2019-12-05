'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', [])
    .factory('unifyedglobal', ['$http', '$rootScope', '$location', function($http, $rootScope, $location) {
        /**************************************************************************************/

        $rootScope.production = true; // Suggests that this codebase is only for staging
        $rootScope.standaloneApp = true; // Suggests that this codebase is only for staging

        function fnGetClearpass(config, callBack) {
            //Skip clearpass API call if password exists
            if ($rootScope.password) {
                config.password = $rootScope.password;
                return callBack(null, config);
            }
            //var clearpassEndpoint = "https://qlsso.quicklaunchsso.com/admin/secured/" + qlTenantid + "/api/getClearPass";
            var clearpassEndpoint = config.clearpassUrl;
            // call clearpass API
            $http({
                url: clearpassEndpoint,
                method: 'GET',
                withCredentials: true
            }).then(function successCallback(res) {
                if (!res.data) {
                    console.error("Unkonw error: Clearpass API not executed properly. " + res);
                    return callBack({
                        "err": "Couldnt get clearpass from QL"
                    });
                }
                config.password = res.data;
                return callBack(null, config);
            }, function errorCallback(err) {
                console.error(err);
                return callBack(err);
            });
        }

        function handleWebAdapterAuthentication(erpconfig, callBack) {
            //For webadapter products, need external authentication to webadapter to get valid ticket for calling service APIs
            var url = erpconfig.middlewareServerUrl + "/services/authenticate/" + $rootScope.user.tenant + "/" + erpconfig.product;
            //Example: https://kryptosmw.kryptosmobile.com/webadapter2/services/authenticate/SWCC/colleague
            var data = {};
            if (window.device) {
                data = "username=" + erpconfig.username + "&password=" + erpconfig.password;
            } else {
                url = "/websimulator/json?url=" + url;
                data = {
                    method: "POST",
                    body: "username=" + erpconfig.username + "&password=" + erpconfig.password
                };
            }
            $.blockUI();
            $http.post(url, data).success(function(data, status, headers, config) {
                $.unblockUI();
                $rootScope.erpticket[erpconfig.product] = data.ticket;
                var serviceUrl = erpconfig.middlewareServerUrl + "/services/data/" + $rootScope.user.tenant + "/" + erpconfig.product + erpconfig.endpoint + "?ticket=" + $rootScope.erpticket[erpconfig.product];
                console.log("Service URL: " + serviceUrl);
                erpconfig.serviceUrl = serviceUrl;
                return callBack(null, erpconfig);
            }).error(function(data, status, headers, config) {
                $.unblockUI();
                $rootScope.erpticket[erpconfig.product] = "";
                return callBack(data);
            });
        }

        function handleBannerAuthentication(erpconfig, callBack) {
            //For banner products, need external authentication to webadapter to get valid ticket for calling service APIs
            var url = erpconfig.middlewareServerUrl + "/services/authenticate/login";
            //Example: https://kryptosda.kryptosmobile.com/kmwda1mwcc/services/authenticate/login
            var data = {};
            if (window.device) {
                data = "username=" + erpconfig.username + "&password=" + erpconfig.password;
            } else {
                url = "/websimulator/json?url=" + url;
                data = {
                    method: "POST",
                    body: "username=" + erpconfig.username + "&password=" + erpconfig.password
                };
            }
            $.blockUI();
            $http.post(url, data).success(function(data, status, headers, config) {
                $.unblockUI();
                $rootScope.erpticket[erpconfig.product] = data.ticket;
                var serviceUrl = erpconfig.middlewareServerUrl + "/services/student" + erpconfig.endpoint + "?ticket=" + $rootScope.erpticket[erpconfig.product];
                console.log("Service URL: " + serviceUrl);
                erpconfig.serviceUrl = serviceUrl;
                return callBack(null, erpconfig);
            }).error(function(data, status, headers, config) {
                $.unblockUI();
                $rootScope.erpticket[erpconfig.product] = "";
                return callBack(data);
            });
        }

        function handleBannerOAuthAuthentication(config, callBack) {
            //For Banner, no need of external authentication, API service call itself would validate and get the service data.
            $rootScope.erpticket[config.product] = $rootScope.user.accessToken;
            var serviceUrl = config.middlewareServerUrl + "/services/student/" + config.endpoint + "?ticket=" + $rootScope.erpticket[config.product];
            console.log("Service URL: " + serviceUrl);
            config.serviceUrl = serviceUrl;
            return callBack(null, config);
        }

        function setupDemoServiceEndpoints(config, callBack) {
            if (config.product.toLowerCase() == "banner") {
                config.serviceUrl = config.middlewareServerUrl + "/services/student" + config.endpoint;
            } else if (config.product.toLowerCase() == "ps") {
                config.serviceUrl = config.middlewareServerUrl + "/services/data/" + $rootScope.user.tenant + "/" + config.product + config.endpoint;
            }
            return callBack(null, config);
        }

        function setupServiceEndpoints(config, callBack) {
            if (config.product.toLowerCase() == "banner") {
                config.serviceUrl = config.middlewareServerUrl + "/services/student" + config.endpoint + "?ticket=" + $rootScope.erpticket[config.product];
            } else if (config.product.toLowerCase() == "ps") {
                config.serviceUrl = config.middlewareServerUrl + "/services/data/" + $rootScope.user.tenant + "/" + config.product + config.endpoint + "?ticket=" + $rootScope.erpticket[config.product];
            }
            return callBack(null, config);
        }

        function erpConnect(config, callBack) {
            config.username = $rootScope.username;
            // Remove the query parameters in case of demo mode
            if (config.demoMode) {
                var tempParamExists = config.endpoint.indexOf("=");
                var tempUrl = "";
                if (tempParamExists > 0) {
                    config.endpoint = config.endpoint.substring(0, config.endpoint.lastIndexOf("/"));
                }
                setupDemoServiceEndpoints(config, function(err, config) {
                    return callBack(err, config);
                });
            } else {
                if (config.product.toLowerCase() == "banner") {
                    if (config.tokenType == "oauth") {
                        handleBannerOAuthAuthentication(config, function(err, config) {
                            return callBack(err, config);
                        });
                    } else {
                        config.clearpassUrl = $rootScope.qlClearPassUrl;
                        fnGetClearpass(config, function(err, config) {
                            if (!err) {
                                handleBannerAuthentication(config, function(err, config) {
                                    return callBack(err, config);
                                });
                            }
                            return callBack(err, config);
                        });
                    }
                } else if (config.product.toLowerCase() == "ps") {
                    config.clearpassUrl = $rootScope.qlClearPassUrl;
                    fnGetClearpass(config, function(err, config) {
                        if (!err) {
                            handleWebAdapterAuthentication(config, function(err, config) {
                                return callBack(err, config);
                            });
                        }
                        return callBack(err, config);
                    });
                }
            }
        }

        function executeServiceAPI(erpconfig, method, counter, callBack) {
            setupServiceEndpoints(erpconfig, function(err, erpconfig) {
                var serviceUrl = erpconfig.serviceUrl;
                console.log(serviceUrl);
                var url = "";
                var proxyMethod = method;
                var proxyData = {};
                if (window.device) {
                    url = serviceUrl;
                } else {
                    url = "/websimulator/json?url=" + encodeURIComponent(serviceUrl);
                    proxyMethod = "POST";
                    proxyData = {
                        method: method
                    }
                    if (method == "POST") {
                        proxyData = {
                            method: "POST",
                            body: erpconfig.postdata
                        }
                        if (erpconfig.demoMode) {
                            proxyData = "";
                            url = serviceUrl;
                        }
                    }
                }
                counter++;
                $http({
                    method: proxyMethod,
                    url: url,
                    data: proxyData
                }).
                success(function(data, status, headers, config) {
                    console.log("RESULTS:");
                    console.log(data);
                    callBack(erpconfig, data, status, headers, config);
                }).
                error(function(data, status, headers, config) {
                    if (status == 403 && counter <= 2) {
                        // ticket expired, need to reauthenticate
                        erpConnect(erpconfig, function(err, erpconfig) {
                            if (err) {
                                $.unblockUI();
                                console.log("Couldnt execute API due to errors.");
                                return callback();
                            }
                            executeServiceAPI(erpconfig, method, counter, callBack);
                        });
                    }
                    return callBack(erpconfig, data, status, headers, config);
                });
            });

        }

        $rootScope.postAPI = function(config, endpoint, postdata, callback) {
            config.endpoint = endpoint;
            config.postdata = postdata;
            config.demoMode = (config.middlewareServerUrl == "https://kryptosda.kryptosmobile.com/kryptosds") ? true : false;
            $.blockUI();
            if (!$rootScope.demoMode && $rootScope.erpticket && $rootScope.erpticket[config.product]) {
                executeServiceAPI(config, "POST", 1, function(erpconfig, data, status, headers, config) {
                    $.unblockUI();
                    return callback(data, status, headers, config);
                });
            } else {
                if (!$rootScope.erpticket) {
                    $rootScope.erpticket = {};
                }
                erpConnect(config, function(err, config) {
                    if (err) {
                        console.log("Couldnt execute API due to errors.");
                        $.unblockUI();
                        return callback();
                    }
                    executeServiceAPI(config, "POST", 1, function(erpconfig, data, status, headers, config) {
                        $.unblockUI();
                        return callback(data, status, headers, config);
                    });
                });
            }
        };


        $rootScope.getAPI = function(config, endpoint, callback) {
            config.endpoint = endpoint;
            config.demoMode = (config.middlewareServerUrl == "https://kryptosda.kryptosmobile.com/kryptosds") ? true : false;
            $.blockUI();
            if (!$rootScope.demoMode && $rootScope.erpticket && $rootScope.erpticket[config.product]) {
                executeServiceAPI(config, "GET", 1, function(erpconfig, data, status, headers, config) {
                    $.unblockUI();
                    return callback(data, status, headers, config);
                });
            } else {
                if (!$rootScope.erpticket) {
                    $rootScope.erpticket = {};
                }
                erpConnect(config, function(err, config) {
                    if (err) {
                        console.log("Couldnt execute API due to errors.");
                        $.unblockUI();
                        return callback();
                    }
                    executeServiceAPI(config, "POST", 1, function(erpconfig, data, status, headers, config) {
                        $.unblockUI();
                        return callback(data, status, headers, config);
                    });
                });
            }
        };
        /******************************************************************************************************************************************/

        $rootScope.userNameIntialsColor = ['#36B37E', '#FF5630', '#FFAB00', '#8d99ae', '#50939b', '#de4d78', '#bc59cf', '#0f5772', '#7d7e7d', '#4fb443', '#596fef', '#00b8ff'];
        $rootScope.randomBackground = function(fn, ln) {
            var first = fn;
            var last = ln;
            var name = first + last;
            var sum = 0;
            for (var i = 0; i < name.length; i++) {
                sum += name.charCodeAt(i);
            }
            return $rootScope.userNameIntialsColor[sum % $rootScope.userNameIntialsColor.length];
        }

        $rootScope.userRolestoString = function (a) {
            for (var i = 0; i < a.length; i++) {
                a[i] = a[i].charAt(0).toUpperCase() + a[i].slice(1);
            }
            return a.toString().replace(/,/g, ', ');
        }

        $rootScope.inAppNotificationHandler = function(push) {
            push.on('notification', function(data) {
                if (data.additionalData.foreground) {
                    //navigator.notification.alert(data.message,null,data.title,'Ok');
                    if (data.additionalData.picture || data.additionalData.image) {
                        if (device.platform == "Android") {
                            $('#notImg').attr('src', data.additionalData.picture);
                        } else {
                            $('#notImg').attr('src', data.additionalData.image);
                        }
                        $('#notImg').show();
                    } else {
                        //$('#notImg').attr('src', '');
                        $('#notImg').hide();
                    }
                    $('#notTitle').html(data.title);
                    $('#notDesc').html(data.message);
                    $('.modale').css('display', 'block');
                    setTimeout(function() {
                        $('.modale').addClass('opened');
                    }, 1000)
                }
            });
        }

        /*****************Services for unifyed applets (whatsUp, messaging etc) *********************************/
        $rootScope.isEmpty = function(obj) {
            return (Object.keys(obj).length === 0);
        };
        $rootScope.callAPI = function(url, method, data, callback) {
            try {
                if (!$rootScope.isblocking) $.blockUI();
                var apiEndPoint = $rootScope.GatewayUrl + url;
                var req = {
                    "method": method,
                    "url": apiEndPoint,
                    "headers": {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + $rootScope.user.accessToken,
                        'X-TENANT-ID': $rootScope.user.tenant,
                        'X-TENANT-DOMAIN': $rootScope.user.tenantdomain
                    },
                    data: data,
                    json: true
                };


                $http(req).then(function successCallback(res) {
                    if (!$rootScope.isblocking) {
                        $.unblockUI();
                    }

                    return callback(res);
                }, function errorCallback(err) {
                    console.log(JSON.stringify(err));
                    if (!$rootScope.isblocking) {
                        $.unblockUI();
                    }
                    //return callback();
                    /* Commented the code below since token refersh is not working */
                    if (err.status == 404) {
                        return callback(null);
                    } else if (err.status == 0 || err.status == 401) {
                        $rootScope.refreshToken(url, method, data, callback);
                        return callback();
                    }
                });
            } catch (e) {
                if (!$rootScope.isblocking) {
                    $.unblockUI();
                }
                console.log(e)
                return callback();
            }
        }
        $rootScope.refreshToken = function(url, method, data, callback) {

            $.blockUI();
            var refreshUrl = $rootScope.GatewayUrl + "/unifydidentity/open/oauth2/token";
            var data = "refresh_token=" + $rootScope.user.refreshToken;

            var req = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-TENANT-ID': $rootScope.tenant
                },
                url: refreshUrl,
                method: 'POST',
                data: data,
                json: true
            }

            $http(req).then(function successCallback(res) {
                var data = res.data;
                $rootScope.user['accessToken'] = data.access_token;
                $rootScope.user['refreshToken'] = data.refresh_token;
                $rootScope.user['providerData'] = data.access_token;

                $.jStorage.set('userToken', res.data);
                $rootScope.callAPI(url, method, data, callback);
                $.unblockUI();
            }, function errorCallback(err) {
                console.log(err);
                error(err);
                $.unblockUI();
                $location.path("/app/SignIn279/SignIn279");
            });
        };

        $rootScope.callOpenAPI = function(option, cb) {
            var req;
            if (window.device) {
                req = option
            } else {
                req = {
                    url: 'https://kryptosda.kryptosmobile.com/kryptosds/utils/proxy',
                    data: option,
                    method: 'POST'
                }
            }


            $http(req).then(function successCallback(res) {
                cb(null, res.data);
            }, function errorCallback(err) {
                cb(err, null);
            });

        };
    }]);

/*****************End for Services for unifyed applets (whatsUp, messaging etc) *********************************/

angular.module('myApp')
    .run(function runApp(unifyedglobal) {

    });