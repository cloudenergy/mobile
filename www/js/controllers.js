angular.module('gugecc.controllers', [])
    .controller('HomeTabCtrl', function($scope,
        $api,
        $ionicSideMenuDelegate,
        cookies,
        push,
        Account,
        $weather) {

        $scope.showLeft = function() {
            $ionicSideMenuDelegate.toggleLeft()
        }

        $scope.account = Account;
        var user = cookies.get('user');

        $scope.$on("$ionicView.enter", function() {
            // 添加天气信息
            $weather.get().then(function(weather) {
                $scope.weather = weather.today;
                $scope.city = weather.city;
            });

            $scope.unread = localStorage._unread;
        });

        // 注册推送
        push.register($scope.account);
    })
    .controller('Analyze', function($scope,
        $ionicSideMenuDelegate,
        $timeout,
        $api,
        cookies,
        Me,
        utils,
        $cordovaDatePicker,
        $stateParams) {
        var user = cookies.get('user');
        $scope.show = $stateParams.type ? $stateParams.type : 'DAY';
        var time = $stateParams.time
        $scope.time = time ? time : moment().format('YYYYMMDD');

        $scope.showLeft = function() {
            $ionicSideMenuDelegate.toggleLeft()
        }

        $scope.$on('create', function(event, chart) {
            $scope.chart = chart;
        });

        var options = {
            mode: 'date', // or 'time'
            doneButtonLabel: '确认',
            doneButtonColor: '#33cd5f',
            allowFutureDates: false,
            cancelButtonLabel: '取消',
            cancelButtonColor: '#ef473a',
            locale: 'zh_CN'
        };

        $scope.choose_date = function() {
            options.date = moment($scope.time, 'YYYYMMDD')._d;

            $cordovaDatePicker.show(options).then(function(date) {
                $scope.time = moment(date).format('YYYYMMDD');
                $scope.getData($scope.show);
            });
        }

        $scope.getData = function(type, cb) {
            $api.business.energyconsumptioncost({
                'time': $scope.time,
                'project': Me.project,
                'type': type
            }, function(res) {
                $scope.usage = utils.bar(res.result[Me.project].detail, $scope.show);

                $scope.list = res.result[Me.project].detail;
                if (cb) {
                    cb();
                };
            });
        }

        $scope.options = {}

        $scope.colours = [{ // default
            "fillColor": '#F7464A'
        }, { // default
            "fillColor": '#46BFBD'
        }, { // default
            "fillColor": '#FDB45C'
        }];
        $scope.showBar = function(bar, event) {
            console.log(bar, $scope.chart);
        }
        $scope.changeview = function(view) {
            $scope.show = view;
            $scope.list = [];
            $scope.getData(view);
        }
        $scope.getData($scope.show);
    })
    .controller('AnalyzeDetail', ['$scope', '$api', 'Me', '$stateParams', '$state',
        function($scope, $api, Me, $stateParams, $state) {

        }
    ])
    .controller('Charge', function($scope,
        Me,
        $state, $stateParams,
        cookies, $api,
        channels, bankcards,
        $app,
        $ionicSideMenuDelegate, $ionicLoading, $ionicModal, $ionicHistory) {
        $scope.me = Me;
        $scope.amountSelects = [100, 500, 1000, 2000, 5000];
        $scope.otherAmount = '';
        $scope.channels = channels;
        $scope.bankcards = bankcards;
        $scope.cardpay = false;
        $scope.selectedCard = null;
        $scope.checkKey = 'a0';

        $scope.charge = {
            amount: 100,
            channelaccountid: channels ? channels[0].id : undefined
        };

        $scope.init = function() {
            if (!!bankcards.length) {
                $scope.selectedCard = bankcards[0];
                $scope.charge.channelaccountid = bankcards[0]['id'];
                $scope.cardpay = true;
            }
        }
        $scope.init();

        $scope.plt_choose = function(channel) {
            $scope.charge.channelaccountid = channel.id;
            $scope.cardpay = false;
        }

        $scope.card_choose = function(card) {
            $scope.selectedCard = card;
            $scope.cardpay = true;
            $scope.charge.channelaccountid = card.id;
        }

        $scope.setAmount = function(amount, reset, key) {
            $scope.charge.amount = amount;
            if (reset) {
                $scope.otherAmount = '';
            };
            $scope.checkKey = key;
        }

        $scope.pay = function() {
            // 提示无充值渠道错误
            if (!channels) {
                $ionicLoading.show({
                    template: '暂无可用充值渠道',
                    duration: 1000
                });
                return;
            }

            if (!$scope.charge.amount && !angular.isNumber($scope.charge.amount)) {
                $ionicLoading.show({
                    template: '请选择正确的金额',
                    duration: 1000
                });
                return;
            };

            var data = {
                project: Me.project,
                body: '智慧管家充值',
                subject: '智慧管家',
                uid: cookies.get('user')
            };
            angular.extend(data, $scope.charge);

            $app.pay(data, $scope.cardpay).then(function() {
                // 成功
                $api.business.userinfo({ uid: cookies.get('user') }, function(res) {
                    $ionicHistory.clearCache();
                    $scope.me = res.result;

                    $app.modal({
                        templateUrl: 'templates/charge/result.html',
                        scopeData: {
                            me: $scope.me
                        }
                    });
                });
            }, function(err) {
                $ionicLoading.show({
                    template: err.message,
                    duration: 1200
                })
            });
        }

        $scope.payTest = function() {
            $app.modal({
                templateUrl: 'templates/charge/pin.html',
            });
        }

        $scope.refresh = function() {
            $state.reload().then(function() {
                // or
                $scope.bankcards = bankcards;
            });
        }

        $scope.show_bind = function() {
            var modal = $app.modal({
                templateUrl: 'templates/charge/bind.html',
                controller: 'BindCard',
                data: {
                    project: Me.project
                }
            });

            modal.then(function(res) {
                if (res.command == 'pay') {

                    $api.channelaccount.info({
                        belongto: Me.uid,
                        status: 'success'
                    }, function(res) {
                        $scope.bankcards = res.result;

                        $scope.init();
                        $scope.pay();
                    });
                }
            })
        }
    })
    .controller('Device', ['$scope', '$api', 'cookies', 'Me', '$state', 'info', '$ionicLoading',
        function($scope, $api, cookies, Me, $state, info, $ionicLoading) {
            var project = Me.project;

            $scope.canSwitch = function(commands) {
                return _.contains(commands, 'EMC_SWITCH');
            }

            $scope.load = function() {
                $scope.devices = [];

                $api.sensor.info({
                    project: project,
                }, function(res) {
                    $scope.$broadcast('scroll.refreshComplete');
                    if (!res.code) {
                        $scope.devices = res.result.detail;
                    };
                })
            }
            $scope.load();

            $scope.showDevice = function(device) {
                $state.go('tabs.device_control', { 'sensor': device, id: device.id });
            }

            $scope.toggle = function(device, evt) {
                navigator.notification.confirm('', function(res) {
                    if (res == 2) {
                        return false;
                    }

                    var command = device.status && device.status.switch == 'EMC_ON' ? 'EMC_OFF' : 'EMC_ON',
                        code = hex_sha1(info.ctrlpasswd).toUpperCase();

                    $api.control.send({ id: device.id, command: 'EMC_SWITCH', ctrlcode: code, param: { mode: command } }, function(res) {
                        console.log('res: ', res);
                        $ionicLoading.show({
                            template: '命令已发送<br> 稍后下来刷新查看执行状态',
                            duration: 2000
                        });
                        device.status.switch = command;
                    });
                }, '确认执行操作?', ['确认', '取消']);

                evt.stopPropagation();
                return false;
            }
        }
    ])
    .controller('DeviceCtrl', ['$scope', '$state', '$api', 'sensor', 'Me', '$stateParams', 'recent', 'info', '$ionicLoading', '$ionicPopup',
        function($scope, $state, $api, sensor, Me, $stateParams, recent, info, $ionicLoading, $ionicPopup) {
            console.log('sensor: ', sensor);
            $scope.sensor = sensor;
            $scope.tab = 'control';

            $scope.toggle = function(device, evt) {
                // 调用 confirm
                navigator.notification.confirm('', function(res) {
                    if (res == 2) {
                        return false;
                    }

                    var command = device.status && device.status.switch == 'EMC_ON' ? 'EMC_OFF' : 'EMC_ON',
                        code = hex_sha1(info.ctrlpasswd).toUpperCase();

                    $api.control.send({ id: device.id, command: 'EMC_SWITCH', ctrlcode: code, param: { mode: command } }, function(res) {
                        console.log('res: ', res);
                        $ionicLoading.show({
                            template: '命令已发送<br> 稍后下来刷新查看执行状态',
                            duration: 2000
                        });
                    });
                }, '确认执行操作?', ['确认', '取消']);

                evt.stopPropagation();
            }

            $scope.statusImg = function(device) {
                return device.status && device.status.switch == 'EMC_ON' ? 'img/switchOn.png' : 'img/switchOff.png';
            }

            $scope.canSwitch = function(commands) {
                return _.contains(commands, 'EMC_SWITCH');
            }

            $scope.show = function(tab) {
                $scope.tab = tab;
            }

            $scope.go = function(month) {
                $state.go('tabs.device_month', { 'month': month, 'device': $scope.sensor.id });
            }

            $scope.get_template = function() {
                if (sensor.devicetype == 'TEMPERATURECONTROL') {
                    sensor.channels[41];
                    return 'templates/device/type/temp.html';
                }

                return 'templates/device/type/electricity.html';
            }

            $scope.send_command = function(command, org){
                var param = {}
                switch (command) {
                    case 'EMC_TEMPRATURE':
                        param = {value: org[0]+org[1]};
                        sensor.channels[37].lasttotal = param.value;

                        break;
                    case 'EMC_SWITCH':
                        param = {}
                    default:
                        // statements_def
                        break;
                }

                $api.control.send({
                    id: sensor.id,
                    command: command,
                    param: param
                }, function(data) {
                    console.log('data:', data);
                })
            }

            $scope.recent = recent;
        }
    ])
    .controller('MonthCtrl', ['$scope', '$state', '$api', 'Me', '$stateParams', 'utils', 'days',
        function($scope, $state, $api, Me, $stateParams, utils, days) {
            $scope.vm = $stateParams.month;

            $scope.usage = utils.duty(days.usage);

            $scope.colours = [{ // default
                "fillColor": '#FCA9A9'
            }, { // default
                "fillColor": '#DF1C1C'
            }, { // default
                "fillColor": '#FDB45C'
            }];
        }
    ])
    .controller('LogCtrl', ['$scope', '$api', 'Me', 'cookies', '$http', function($scope, $api, Me, cookies, $http) {
        $scope.tab = 'charge';
        $scope.paging = {};

        var project = Me.project;
        var query = {
            charges: {
                "project": [{ "id": project }],
                "from": moment().subtract(12, 'month').format('YYYYMMDD'),
                "to": moment().format('YYYYMMDD'),
                pageindex: 1,
                pagesize: 20,
                status: 'SUCCESS'
            },
            fee: {
                // project: Me.project,
                uid: cookies.get('user'),
                // key: '',
                from: moment().format('YYYYMM')+'01',
                to: moment().format('YYYYMMDD'),
                // flow: 'EXPENSE',
                category: 'PAYFEES'
            }
        }

        $scope.more = function(type) {
            var paging = $scope.paging[type];
            if (!paging) {
                return true
            };
            return paging.pageindex * paging.pagesize < paging.count;
        }

        $scope.loadList = function(type) {
            if (type == 'charges') {
                $api.business.recentchargelog(query[type], function(res) {
                    var page = res.result[project].detail;
                    $scope[type] = $scope[type] ? $scope[type].concat(page) : page;
                    $scope.paging[type] = res.result[project].paging;

                    $scope.$broadcast('scroll.infiniteScrollComplete');
                })
            };

            if (type == 'fee') {
                $api.business.fundflow(query[type], function(res) {
                    var page = res.result;
                    $scope[type] = $scope[type] ? $scope[type].concat(page) : page;
                    // $scope.paging[type] = res.result[project].paging;
                    // $scope.$broadcast('scroll.infiniteScrollComplete');
                })
            };
        }

        $scope.loadList('charges');
        $scope.loadList('fee');

        $scope.loadMore = function(type) {
            var paging = $scope.paging[type];
            if (!paging) {
                return false;
            };
            if (paging.pageindex * paging.pagesize < paging.count) {
                query[type].pageindex++;
                $scope.loadList(type);
            }
        }

        $scope.getLogs = function(tab) {
            tab ? $scope.tab = tab : 1;
        }
    }])
    .controller('BindCard', ['$scope', '$modalData', 'cookies', '$api', '$app', '$ionicLoading', '$interval',
        function($scope, $modalData, cookies, $api, $app, $ionicLoading, $interval) {
            $scope.data = {};
            $scope.order = {};

            $api.bank.info({}, function(res) {
                $scope.banks = res.result;
            });

            $scope.startCounter = function() {
                $scope.time = 60,
                    timer = $interval(function() {
                        $scope.time--;
                    }, 1000, 60);
            }

            $scope.getCode = function() {
                // 检查表单输入
                var data = angular.extend({ uid: cookies.get('user') }, $scope.data);

                $api.channelaccount.verifycode(data, function(res) {
                    if (res.code == 0 && res.result.orderID) {
                        $scope.data.orderid = res.result.orderID;
                        $scope.startCounter();
                    } else {
                        $ionicLoading.show({
                            template: res.message,
                            duration: 2000
                        });
                    }
                });
            }

            $scope.bind = function() {
                var data = {
                    belongto: cookies.get('user'),
                    flow: 'EARNING',
                    name: $scope.data.name,
                    idcard: $scope.data.idcard,
                    account: $scope.data.bankcard,
                    accounttype: 'PRIVATE',
                    origin: $scope.order.banktype,
                    reservedmobile: $scope.data.mobile,
                    reservedname: $scope.data.name,
                    orderid: $scope.data.orderid,
                    verifycode: $scope.order.verifycode
                }

                $api.channelaccount.add(data, function(res) {
                    if (res.code == 0) {
                        $app.closeModal($scope.modal, {
                            command: 'pay'
                        });
                    } else {
                        $ionicLoading.show({
                            template: res.message,
                            duration: 2000
                        });
                    }
                })
            }
        }
    ])
    .controller('PayPinpad', ['$scope', '$modalData', '$api', '$app', '$ionicLoading',
        function($scope, $modalData, $api, $app, $ionicLoading) {

            $scope.data = angular.extend({}, $modalData.payment);

            $scope.close = function() {
                var dismiss = function() {
                    $app.closeModal($scope.modal, {
                        command: 'error',
                        message: '用户已放弃支付'
                    }, true);
                }
                if (navigator.notification) {
                    navigator.notification.confirm('', function(res) {
                        if (res == 2) {
                            return false;
                        }
                        dismiss();
                    }, '确认放弃支付', ['放弃', '继续支付']);
                } else {
                    dismiss();
                }
            }

            $scope.pay = function() {
                console.log($scope.data);
                $api.payment.charge($scope.data, function(res) {
                    if (res.code == 0) {
                        $app.closeModal($scope.modal, {
                            command: 'success'
                        });
                        return
                    }

                    $ionicLoading.show({
                        template: res.message || res.err.message,
                        duration: 1200
                    });
                })
            }
        }
    ])
    .controller('BankCardSetting', [
        '$scope', '$app', '$api', '$ionicLoading', '$rootScope', '$state', 'cookies',
        function($scope, $app, $api, $ionicLoading, $rootScope, $state, cookies) {
            $scope.$on("$ionicView.enter", function() {
                $api.channelaccount.info({
                    belongto: cookies.get('user'),
                    all: true
                }, function(res) {
                    $scope.bankcards = res.result;
                });
            });

            $scope.add = function() {
                $app.modal({
                    templateUrl: 'templates/charge/bind.html',
                    controller: 'BindCard',
                    data: {
                        project: $rootScope._me.project
                    }
                }).then(function(res) {
                    $state.reload();
                });
            }
        }
    ])
    .controller('CardDetail', ['$scope', '$stateParams', '$state', '$api', '$ionicLoading',
        function($scope, $stateParams, $state, $api, $ionicLoading) {
            $scope.card = $stateParams.card;
            console.log($scope.card);

            $scope.unbind = function() {

                $api.channelaccount.delete({
                    id: $scope.card.id
                }, function(res) {
                    if (res.code == 0) {
                        $state.go('bankcards', null, { reload: true, notify: true });
                    } else {
                        $ionicLoading.show({
                            template: res.message,
                            duration: 1200
                        });
                    }
                });
            }
        }
    ])
    .controller('Passwd', ['$scope', '$api', 'cookies', 'account', '$state', '$ionicLoading',
        function($scope, $api, cookies, account, $state, $ionicLoading) {
            $scope.data = {};

            $scope.update = function() {
                $api.account.passwd($scope.data, function(res) {
                    if (res.code == 0) {
                        cookies.down();
                        $state.go('login');

                        $ionicLoading.show({
                            template: '密码修改成功，请重新登录',
                            duration: 1200
                        })
                    } else {
                        $ionicLoading.show({
                            template: res.message || '修改失败',
                            duration: 1200
                        })
                    }
                })
            }
        }

    ])
     .controller('Notices', ['$scope', 'notice', '$rootScope', '$api', 
        function($scope, notice, $rootScope, $api){
            $scope.me = $rootScope._me;
            localStorage._unread = 0;

            $scope.$on("$ionicView.enter", function() {
                // 添加天气信息
                $scope.events = notice.all();
            });

            $scope.get_title = function (event) {
                return notice.title(event.type);
            }

            $scope.parse_content = function(event){
                var load = notice.parse(event.type, event.param);
                return load.template;
            }
        }
    ])
