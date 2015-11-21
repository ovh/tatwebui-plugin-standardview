/*global angular */

/**
 * @ngdoc directive
 * @name TatUi.directive:messagesItem
 * @restrict AE
 * @description
 * display a route message
 */
angular.module('TatUi').directive('messagesStandardviewItem', function ($compile) {
        'use strict';

        return {
            restrict: 'E',
            scope: {
                message: '=',
                topic: '=',
                isTopicDeletableMsg: "=",
                isTopicUpdatableMsg: "=",
                isTopicDeletableAllMsg: "=",
                isTopicUpdatableAllMsg: "=",
                isTopicRw: "="
            },
            replace: true,
            templateUrl: '../build/tatwebui-plugin-standardview/standardview/list/standardview-item.directive.html',
            link: function(scope, element) {
                var listWrapper = element.find('div.message-standardview-replies');
                listWrapper.append('<div messages-standardview-list="message.replies" ' +
                'topic="topic" ' +
                'is-topic-deletable-msg="isTopicDeletableMsg" ' +
                'is-topic-updatable-msg="isTopicUpdatableMsg" ' +
                'is-topic-deletable-all-msg="isTopicDeletableAllMsg" ' +
                'is-topic-updatable-all-msg="isTopicUpdatableAllMsg" ' +
                'is-topic-rw="isTopicRw"></div>');
                $compile(listWrapper)(scope);
            },
            controllerAs: 'MessageStandardviewItemCtrl',
            /**
             * @ngdoc controller
             * @name TatUi.controller:messagesItem
             * @requires TatUi.Authentication       Tat Authentication
             * @requires TatUi.TatEngineMessageRsc  Tat Engine Resource Message
             * @requires TatUi.TatEngine            Global Tat Engine service
             *
             * @description Directive controller
             */
            controller: function ($scope, $rootScope, TatEngineMessageRsc, TatEngine, Authentication, $http, appConfiguration) {
                var self = this;
                this.answerPanel = false;
                this.isTopicBookmarks = false;
                this.isTopicTasks = false;

                this.canDoneMessage = false;
                this.canDeleteFromTasksMessage = false;
                this.canAddToTasksMessage = true;
                this.privateTasksTopic = 'Private/' + Authentication.getIdentity().username + '/Tasks';

                self.setInToDoneText = "";
                this.getBrightness = function (rgb) {
                    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(rgb);
                    return result ?
                    0.2126 * parseInt(result[1], 16) +
                    0.7152 * parseInt(result[2], 16) +
                    0.0722 * parseInt(result[3], 16)
                        : 0;
                };

                this.palette = [
                  ["#d04437", "#14892c", "#5484ed"],
                  ["#000","#444","#666","#999","#ccc","#eee","#f3f3f3","#fff"],
                  ["#000","#444","#666","#999","#ccc","#eee","#f3f3f3","#fff"],
                  ["#f00","#f90","#ff0","#0f0","#0ff","#00f","#90f","#f0f"],
                  ["#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc"],
                  ["#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd"],
                  ["#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0"],
                  ["#c00","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79"],
                  ["#900","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47"],
                  ["#600","#783f04","#7f6000","#274e13","#0c343d","#073763","#20124d","#4c1130"]
                ];

                /**
                 * @ngdoc function
                 * @name replyMessage
                 * @methodOf TatUi.controller:messagesItem
                 * @description Reply to a message
                 */
                this.replyMessage = function (message) {
                    $scope.replying = false;
                    TatEngineMessageRsc.create({
                        'topic': $scope.topic,
                        'idReference': message._id,
                        'text': self.replyText
                    }).$promise.then(function (resp) {
                        self.replyText = "";
                        if (!message.replies) {
                            message.replies = [];
                        }
                        message.replies.unshift(resp.message);
                    }, function (resp) {
                        $scope.replying=true;
                        TatEngine.displayReturn(resp);
                    });
                };

                this.getText = function() {
                  return $scope.message.text;
                };

                this.addLabelDoing = function(message) {
                  message.currentLabel = {};
                  message.currentLabel.text = "doing";
                  message.currentLabel.color = "#5484ed";
                  self.removeLabel(message, "done");
                  self.addLabel(message, function() {
                    message.currentLabel.text = "doing:" + Authentication.getIdentity().username;
                    message.currentLabel.color = "#5484ed"; //blue
                    self.addLabel(message);
                  });
                };

                /**
                 * @ngdoc function
                 * @name toggleTaskMessage
                 * @methodOf TatUi.controller:messagesItem
                 * @description create or remove a task from one message
                 */
                this.addToTasksMessage = function (message) {
                    if (message.topics.length == 1 && self.isTopicTasks) {
                      self.addLabelDoing(message);
                      return;
                    }

                    TatEngineMessageRsc.update({
                        'idReference' : message._id,
                        'action' : 'task',
                        'topic' : self.privateTasksTopic
                    }).$promise.then(function(resp) {
                        TatEngine.displayReturn(resp);
                        self.addLabelDoing(message);
                        message.topics.push("/" + self.privateTasksTopic);
                        self.computeFlagsTask(message);
                    }, function(resp) {
                        TatEngine.displayReturn(resp);
                    });
                };

                this.deleteFromTasksMessage = function(message) {
                    // msg only in tasks topic
                    if (message.topics.length == 1 && self.isTopicTasks) {
                      self.removeLabel(message, "doing");
                      return;
                    }

                    $scope.setInToDone = false;
                    TatEngineMessageRsc.update({
                        'idReference' : $scope.message._id,
                        'action' : 'untask',
                        'topic' : self.privateTasksTopic
                    }).$promise.then(function(resp) {
                        TatEngine.displayReturn(resp);
                        self.removeLabel(message, "doing");
                        if (self.isTopicTasks) {
                          message.hide = true;
                        }
                        self.removePrivateTopicOnLocalMsg(message);
                        self.computeFlagsTask(message);
                    }, function(resp) {
                        TatEngine.displayReturn(resp);
                    });
                };

                this.addLabelDone = function(message) {
                  message.currentLabel = {};
                  message.currentLabel.text = "done";
                  message.currentLabel.color = "#14892c"; // green
                  self.removeLabel(message, "doing");
                  self.addLabel(message);
                  self.canDoneMessage = false;
                };

                this.removePrivateTopicOnLocalMsg = function(message) {
                  message.topics = _.remove(message.topics, function(t) {
                    if (t.indexOf("/" + self.privateTasksTopic) === 0) {
                      return false;
                    }
                    return true;
                  });
                };

                this.doneMessage = function(message) {
                    // msg only in tasks topic
                    if (message.topics.length == 1 && self.isTopicTasks) {
                      self.addLabelDone(message);
                      return;
                    }

                    $scope.setInToDone = false;
                    TatEngineMessageRsc.update({
                        'idReference' : $scope.message._id,
                        'action' : 'untask',
                        'topic' : self.privateTasksTopic
                    }).$promise.then(function(resp) {
                        TatEngine.displayReturn(resp);
                        self.addLabelDone(message);
                        if (self.isTopicTasks) {
                          message.hide = true;
                        }
                        self.removePrivateTopicOnLocalMsg(message);
                        self.computeFlagsTask(message);
                    }, function(resp) {
                        TatEngine.displayReturn(resp);
                    });
                };

                /**
                 * @ngdoc function
                 * @name bookmarkMessage
                 * @methodOf TatUi.controller:messagesItem
                 * @description create a bookmark from on message
                 */
                this.bookmarkMessage = function() {
                    var to = 'Private/' + Authentication.getIdentity().username + '/Bookmarks';
                    TatEngineMessageRsc.create({
                        'idReference' : $scope.message._id,
                        'action' : 'bookmark',
                        'topic': to
                    }).$promise.then(function(resp) {
                        TatEngine.displayReturn(resp);
                        // TODO Refresh msg
                    }, function(response) {
                        TatEngine.displayReturn(response);
                    });
                };

                /**
                 * @ngdoc function
                 * @name deleteMessage
                 * @methodOf TatUi.controller:messagesItem
                 * @description delete a message from a Private topic
                 */
                this.deleteMessage = function(message) {
                    TatEngineMessageRsc.delete({
                        'idMessage' : message._id
                    }).$promise.then(function(resp) {
                        TatEngine.displayReturn(resp);
                        message.hide = true;
                        message.displayed = false;
                    }, function(response) {
                        TatEngine.displayReturn(response);
                    });
                };

                /**
                 * @ngdoc function
                 * @name updateMessage
                 * @methodOf TatUi.controller:messagesItem
                 * @description Update a message
                 */
                this.updateMessage = function (message) {
                    message.updating = false;
                    TatEngineMessageRsc.update({
                        'topic': $scope.topic,
                        'idReference': message._id,
                        'text': message.text,
                        'action' : 'update',
                    }).$promise.then(function (resp) {
                        message.text = resp.message.text;
                    }, function (resp) {
                        message.updating = true;
                        TatEngine.displayReturn(resp);
                    });
                };

                /**
                 * @ngdoc function
                 * @name hasLiked
                 * @methodOf TatUi.controller:messagesItem
                 * @description Define if the message is marked 'like'
                 * @return {bool} If true, 'like'
                 */
                this.hasLiked = function (message) {
                    if (message && message.likers) {
                        return _.include(message.likers, Authentication.getIdentity().username);
                    } else {
                      return false;
                    }
                };

                /**
                 * @ngdoc function
                 * @name toggleTopicFavorite
                 * @methodOf TatUi.controller:messagesItem
                 * @description toggle 'like' state on the messagegit status
                 *
                 */
                this.toggleLikeMessage = function (message) {
                    var action = self.hasLiked(message) ? 'unlike' : 'like';
                    TatEngineMessageRsc.update({
                        'topic': $scope.topic,
                        'idReference': message._id,
                        'action': action
                    }).$promise.then(function (resp) {
                        if (action === 'like') {
                            if (!message.likers) {
                                message.likers = [];
                            }
                            message.likers.push(Authentication.getIdentity().username);
                            message.nbLikes++;
                        } else {
                            message.likers = _.remove(message.likers, Authentication.getIdentity().username);
                            message.nbLikes--;
                        }
                    }, function (err) {
                        TatEngine.displayReturn(err);
                    });
                };

                /**
                 * @ngdoc function
                 * @name addLabel
                 * @methodOf TatUi.controller:messagesItem
                 * @description Add a label
                 * @param {object} message Message on which to add a label
                 */
                this.addLabel = function(message, cb) {
                    TatEngineMessageRsc.update({
                        'action': 'label',
                        'topic': $scope.topic,
                        'idReference': $scope.message._id,
                        'text' : message.currentLabel.text,
                        'option' : message.currentLabel.color
                    }).$promise.then(function(resp) {
                        if (!message.labels) {
                            message.labels = [];
                        }
                        message.labels.push({
                            text: message.currentLabel.text,
                            color: message.currentLabel.color
                        });
                        message.currentLabel.text = '';
                        if (cb) {
                          cb();
                        }
                    }, function(resp) {
                        TatEngine.displayReturn(resp);
                    });
                };

                /**
                 * @ngdoc function
                 * @name removeLabel
                 * @methodOf TatUi.controller:messagesItem
                 * @description remove a label
                 * @param {object} message Message on which to add a label
                 * @param {object} label   Label {text} to remove
                 */
                 this.removeLabel = function(message, labelText) {
                     if (!message.labels) {
                       return;
                     }
                     var toRefresh = false;
                     var newList = [];
                     for (var i=0; i<message.labels.length; i++) {
                       var l = message.labels[i];
                       if (l.text === labelText || (labelText === 'doing' && l.text.indexOf('doing:') === 0)) {
                         toRefresh = true;
                         TatEngineMessageRsc.update({
                             'action': 'unlabel',
                             'topic': $scope.topic,
                             'idReference': $scope.message._id,
                             'text' : l.text
                         }).$promise.then(function(resp) {
                                 //nothing here
                             }, function(resp) {
                                 TatEngine.displayReturn(resp);
                             }
                         );
                       } else {
                         newList.push(l);
                       }
                     }

                     if (toRefresh) {
                         message.labels = newList;
                     }
                     self.computeFlagsTask(message);
                 };

                 this.urlMessage = function(message) {
                   $rootScope.$broadcast('topic-change', {topic:$scope.topic, idMessage:message._id, reload:true});
                 };

                /**
                 * @ngdoc function
                 * @name initColor
                 * @methodOf TatUi.controller:messagesItem
                 * @description Initialize the color of the picker
                 * @param {object} message Message on which the color picker will be initialized
                 * @return {true} Allways return true as it is used in an ng-show
                 */
                this.initColor = function(message) {
                    if (!message.currentLabel) {
                        message.currentLabel = {};
                    }
                    if (!message.currentLabel.color) {
                        message.currentLabel.color = '#d04437';
                    }
                    return true;
                };

                this.containsLabel = function(message, labelText) {
                    if (message.inReplyOfIDRoot) {
                      return false;
                    }
                    var r = false;
                    if (message.labels) {
                      for (var i=0; i<message.labels.length; i++) {
                        var l = message.labels[i];
                        if (l.text === labelText) {
                            return true;
                        }
                      }
                    }
                    return r;
                };

                this.init = function (message) {
                    this.initColor(message);
                    if ($scope.topic.indexOf("Private/" + Authentication.getIdentity().username + "/Bookmarks") === 0) {
                        self.isTopicBookmarks = true;
                    } else if ($scope.topic.indexOf(self.privateTasksTopic) === 0) {
                        self.isTopicTasks = true;
                    }
                    this.computeFlagsTask(message);
                };

                this.computeFlagsTask = function(message) {
                  self.canDoneMessage = false;
                  self.canDeleteFromTasksMessage = false;
                  self.canAddToTasksMessage = true;
                  for (var i=0; i<message.topics.length; i++) {
                      if (message.topics[i].indexOf("/" + self.privateTasksTopic) === 0) {
                          if (!self.containsLabel(message, "done")) {
                            self.canDoneMessage = true;
                          }
                          // if msg is not only in tasks topic
                          if (message.topics.length > 1) {
                            self.canDeleteFromTasksMessage = true;
                            $scope.isTopicDeletableMsg = false;
                            $scope.isTopicDeletableAllMsg = false;
                          } else {
                            $scope.isTopicDeletableMsg = true;
                            $scope.isTopicDeletableAllMsg = true;
                          }
                      }
                  };
                  if (self.canDoneMessage || self.isTopicTasks) {
                    self.canAddToTasksMessage = false;
                  }
                };

                this.init($scope.message);

            }
        };
    });
