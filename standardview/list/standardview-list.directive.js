/*global angular */

/**
 * @ngdoc directive
 * @name TatUi.directive:messagesItem
 * @restrict AE
 * @description
 * display a route message
 */
angular.module('TatUi').directive('messagesStandardviewItem', function($compile) {
  'use strict';

  return {
    restrict: 'E',
    scope: {
      message: '=',
      topic: '=',
      isTopicDeletableMsg: '=',
      isTopicUpdatableMsg: '=',
      isTopicDeletableAllMsg: '=',
      isTopicUpdatableAllMsg: '=',
      isTopicRw: '='
    },
    replace: true,
    templateUrl: '../build/tatwebui-plugin-standardview/standardview/list/standardview-item.directive.html',
    controllerAs: 'ctrl',
    /**
     * @ngdoc controller
     * @name TatUi.controller:messagesItem
     * @requires TatUi.Authentication       Tat Authentication
     * @requires TatUi.TatEngineMessageRsc  Tat Engine Resource Message
     * @requires TatUi.TatEngine            Global Tat Engine service
     *
     * @description Directive controller
     */
    controller: function($scope, $rootScope, TatEngineMessageRsc,
      TatEngineMessagesRsc, TatEngine, TatMessage, Authentication) {
      var self = this;
      this.answerPanel = false;

      this.canDoneMessage = false;
      this.canDeleteFromTasksMessage = false;
      this.canAddToTasksMessage = true;
      this.privateTasksTopic = 'Private/' + Authentication.getIdentity().username + '/Tasks';

      this.getBrightness = function(rgb) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(rgb);
        return result ?
          0.2126 * parseInt(result[1], 16) +
          0.7152 * parseInt(result[2], 16) +
          0.0722 * parseInt(result[3], 16) : 0;
      };

      /**
       * @ngdoc function
       * @name toggleTaskMessage
       * @methodOf TatUi.controller:messagesItem
       * @description create or remove a task from one message
       */
      this.addToTasksMessage = function(message) {
        TatEngineMessageRsc.update({
          'idReference': message._id,
          'action': 'task',
          'topic': self.privateTasksTopic
        }).$promise.then(function(resp) {
          TatEngine.displayReturn(resp);
          self.removeLabel(message, "done");
          self.removeLabel(message, "done:"+Authentication.getIdentity().username, true);
          if (resp.message) {
            message.labels = resp.message.labels;
          }
          self.canDeleteFromTasksMessage = true;
          self.canAddToTasksMessage = false;
          self.canDoneMessage = true;
        }, function(resp) {
          TatEngine.displayReturn(resp);
        });
      };

      this.deleteFromTasksMessage = function(message) {
        $scope.setInToDone = false;
        TatEngineMessageRsc.update({
          'idReference': $scope.message._id,
          'action': 'untask',
          'topic': self.privateTasksTopic
        }).$promise.then(function(resp) {
          TatEngine.displayReturn(resp);
          if (self.isTopicTasks) {
            message.hide = true;
          }
          if (resp.message) {
            message.labels = resp.message.labels;
          }
          self.canDeleteFromTasksMessage = false;
          self.canAddToTasksMessage = true;
          self.canDoneMessage = false;
        }, function(resp) {
          TatEngine.displayReturn(resp);
        });
      };

      this.addLabelDone = function(message) {
        TatMessage.addLabel(message, $scope.topic.topic, "done", "#14892c", function() {
          TatMessage.addLabel(message,
            $scope.topic.topic,
            "done:" + Authentication.getIdentity().username,
            "#14892c", //green,
            function() {
              self.removeLabel(message, "doing");
              self.removeLabel(message, "doing:"+Authentication.getIdentity().username, true);
            }
          );
        });
      };

      this.doneMessage = function(message) {
        $scope.setInToDone = false;
        TatEngineMessageRsc.update({
          'idReference': $scope.message._id,
          'action': 'untask',
          'topic': self.privateTasksTopic
        }).$promise.then(function(resp) {
          TatEngine.displayReturn(resp);
          if (self.isTopicTasks) {
            message.hide = true;
          }
          if (resp.message) {
            message.labels = resp.message.labels;
          }
          self.addLabelDone(message);
          self.canDeleteFromTasksMessage = false;
          self.canAddToTasksMessage = true;
          self.canDoneMessage = false;
        }, function(resp) {
          TatEngine.displayReturn(resp);
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
          'idMessageToDelete': message._id,
          'cascade': 'cascade/'
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
      this.updateMessage = function(message) {
        message.updating = false;
        TatEngineMessageRsc.update({
          'topic': $scope.topic.topic.indexOf("/") === 0 ? $scope.topic.topic.substr(1) : $scope.topic.topic,
          'idReference': message._id,
          'text': message.text,
          'action': 'update',
        }).$promise.then(function(resp) {
          message.text = resp.message.text;
        }, function(resp) {
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
      this.hasLiked = function(message) {
        if (message && message.likers) {
          return _.include(message.likers, Authentication.getIdentity().username);
        }
        return false;
      };

      /**
       * @ngdoc function
       * @name toggleLikeMessage
       * @methodOf TatUi.controller:messagesItem
       * @description toggle 'like' state on the message
       *
       */
      this.toggleLikeMessage = function(message) {
        var action = self.hasLiked(message) ? 'unlike' : 'like';
        TatEngineMessageRsc.update({
          'topic': $scope.topic.topic.indexOf("/") === 0 ? $scope.topic.topic.substr(1) : $scope.topic.topic,
          'idReference': message._id,
          'action': action
        }).$promise.then(function(resp) {
          if (resp.message) {
            message.likers = resp.message.likers;
            message.nbLikes = resp.message.nbLikes;
          }
        }, function(err) {
          TatEngine.displayReturn(err);
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

        TatEngineMessageRsc.update({
          'action': 'unlabel',
          'topic': $scope.topic.topic.indexOf("/") === 0 ? $scope.topic.topic.substr(1) : $scope.topic.topic,
          'idReference': $scope.message._id,
          'text': labelText
        }).$promise.then(function(resp) {
          if (resp.message) {
            message.labels = resp.message.labels;
          }
          self.computeFlagsTask(message);
        }, function(resp) {
          TatEngine.displayReturn(resp);
        });
      };

      this.urlMessage = function(message) {
        $rootScope.$broadcast('topic-change', {
          topic: $scope.topic.topic.indexOf("/") === 0 ? $scope.topic.topic.substr(1) : $scope.topic.topic,
          idMessage: message._id,
          reload: true
        });
      };

      this.containsLabel = function(message, labelText) {
        if (message.inReplyOfIDRoot) {
          return false;
        }
        var r = false;
        if (message.labels) {
          for (var i = 0; i < message.labels.length; i++) {
            var l = message.labels[i];
            if (l.text === labelText) {
              return true;
            }
          }
        }
        return r;
      };

      this.refreshMsg = function(message) {
        message.loading = true;
        TatEngineMessagesRsc.list({
          topic: $scope.topic.topic.indexOf("/") === 0 ? $scope.topic.topic.substr(1) : $scope.topic.topic,
          treeView: "onetree",
          idMessage: message._id,
          limit: 1,
          skip: 0
        }).$promise.then(function(data) {
          message.loading = false;
          if (!data.messages || data.messages.length != 1) {
            TatEngine.displayReturn("Invalid return while getting message");
            return
          }
          message.labels = data.messages[0].labels;
          message.tags = data.messages[0].tags;
          message.text = data.messages[0].text;
          message.nbLikes = data.messages[0].nbLikes;
          message.nbReplies = data.messages[0].nbReplies;
          message.nbVotesDown = data.messages[0].nbVotesDown;
          message.nbVotesUP = data.messages[0].nbVotesUP;
          message.dateCreation = data.messages[0].dateCreation;
          message.dateUpdate = data.messages[0].dateUpdate;
          message.replies = data.messages[0].replies;
        }, function(err) {
          message.loading = false;
          TatEngine.displayReturn(err);
        });
      }

      this.init = function(message) {
        self.refreshMsg(message);
        if ($scope.topic.topic.indexOf(self.privateTasksTopic) === 0) {
          self.isTopicTasks = true;
        }
        self.computeFlagsTask(message);
      };

      this.computeFlagsTask = function(message) {
        self.canDoneMessage = self.containsLabel(message, "doing:"+Authentication.getIdentity().username);
        self.canDeleteFromTasksMessage = self.containsLabel(message, "doing:"+Authentication.getIdentity().username);
        self.canAddToTasksMessage = !self.containsLabel(message, "doing:"+Authentication.getIdentity().username);
        if (self.containsLabel(message, "done")) {
          self.canDoneMessage = false;
        }

        if (message.topic && message.topic.indexOf("/" + self.privateTasksTopic) === 0) {
          $scope.isTopicDeletableMsg = true;
          $scope.isTopicDeletableAllMsg = true;
        }
      };

      this.init($scope.message);
    }
  };
});
