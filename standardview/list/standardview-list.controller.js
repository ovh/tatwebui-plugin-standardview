/*global angular,_,moment */

/**
 * @ngdoc controller
 * @name TatUi.controller:MessagesStandardViewListCtrl
 * @requires TatUi.TatEngineMessagesRsc Tat Engine Resource Messages
 * @requires TatUi.TatEngineMessageRsc  Tat Engine Resource Message
 * @requires TatUi.TatEngine            Global Tat Engine service
 *
 * @description List Messages controller
 */
angular.module('TatUi')
  .controller('MessagesStandardViewListCtrl', function(
    $scope,
    $rootScope,
    $stateParams,
    $translate,
    $interval,
    Authentication,
    TatEngineMessagesRsc,
    TatEngineMessageRsc,
    TatEngineTopicRsc,
    TatEngine,
    TatFilter,
    TatTopic,
    Flash
  ) {
    'use strict';

    var self = this;
    self.filter = TatFilter.getCurrent();
    self.topic = $stateParams.topic;

    self.data = {
      messages: [],
      requestFrequency: 5000,
      count: 40,
      skip: 0,
      displayMore: true,
      lastExpandReplies: false,
      expandReplies: false,
      treeView: "notree"
    };

    $scope.$on('filter-changed', function(ev, filter) {
      self.data.skip = 0;
      self.data.displayMore = true;
      self.filter = angular.extend(self.filter, filter);
      self.data.messages = [];
      self.moreMessage();
    });

    self.getCurrentDate = function() {
      return moment().format('YYYY/MM/DD-HH:MM');
    };

    self.currentDate = self.getCurrentDate();

    self.getTreeMode = function() {
      if (self.data.expandReplies) {
        return "onetree";
      }
      return "notree";
    };

    /**
     * @ngdoc function
     * @name loadMore
     * @methodOf TatUi.controller:MessagesStandardViewListCtrl
     * @description Try to load more messages
     */
    self.loadMore = function() {
      if (!self.loading) {
        self.moreMessage();
      }
    };

    self.getBrightness = function(rgb) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(rgb);
      return result ?
        0.2126 * parseInt(result[1], 16) +
        0.7152 * parseInt(result[2], 16) +
        0.0722 * parseInt(result[3], 16) : 0;
    };

    /**
     * @ngdoc function
     * @name mergeMessages
     * @methodOf TatUi.controller:MessagesStandardViewListCtrl
     * @description Merge messages in the current message list
     * @param {string} messages Message list to merge
     */
    self.mergeMessages = function(dest, source) {
      if (source && _.isArray(source)) {
        for (var i = 0; i < source.length; i++) {
          var origin = _.find(dest, {
            _id: source[i]._id
          });
          if (origin) {
            if (!origin.replies) {
              origin.replies = [];
            }
            self.mergeMessages(origin.replies, source[i].replies);
            origin.labels = source[i].labels;
            origin.likers = source[i].likers;
            origin.nbLikes = source[i].nbLikes;
            origin.nbReplies = source[i].nbReplies;
            origin.tags = source[i].tags;
          } else {
            if (!self.data.intervalTimeStamp) {
              self.data.intervalTimeStamp = source[i].dateUpdate;
            } else if (source[i].dateUpdate > self.data.intervalTimeStamp) {
              self.data.intervalTimeStamp = source[i].dateUpdate;
            }
            dest.push(source[i]);
            dest.sort(function(a, b) {
              if (a.dateCreation > b.dateCreation) {
                return -1;
              }
              if (a.dateCreation < b.dateCreation) {
                return 1;
              }
              return 0;
            });
          }
        }
      }
      return dest;
    };

    /**
     * @ngdoc function
     * @name beginTimer
     * @methodOf TatUi.controller:MessagesStandardViewListCtrl
     * @description Launch the timer to request messages at regular time interval
     */
    self.beginTimer = function() {
      self.data = angular.extend(self.data, TatTopic.getDataTopic());
      if ('undefined' === typeof self.data.timer) {
        self.getNewMessages(); // Don't wait to execute first call
        self.data.timer = $interval(self.getNewMessages, self.data.requestFrequency);
        $scope.$on("$destroy", function() { self.stopTimer(); });
      }
    };

    /**
     * @ngdoc function
     * @name stopTimer
     * @methodOf TatUi.controller:MessagesStandardViewListCtrl
     * @description Stop the time that request messages at regular time interval
     */
    self.stopTimer = function() {
      $interval.cancel(self.data.timer);
      self.data.timer = undefined;
    };

    self.onCall = function(text) {
      self.currentMessage = text;
    };

    /**
     * @ngdoc function
     * @name buildFilter
     * @methodOf TatUi.controller:MessagesStandardViewListCtrl
     * @description Build a filter to read messages
     * @param {object} data Custom data to send to the API
     */
    self.buildFilter = function(data) {
      return angular.extend({}, data, self.filter);
    };

    /**
     * @ngdoc function
     * @name getNewMessages
     * @methodOf TatUi.controller:MessagesStandardViewListCtrl
     * @description Request for new messages
     */
    self.getNewMessages = function() {
      if (self.loading) {
        console.log("messages list already in refresh...");
        return;
      }
      self.loading = true;
      self.currentDate = self.getCurrentDate();

      if (self.data.expandReplies === true && !self.data.lastExpandReplies) {
        self.data.intervalTimeStamp = null;
      }
      self.data.lastExpandReplies = self.data.expandReplies;
      var filterAttrs = {
        topic: self.topic,
        treeView: self.getTreeMode(),
        onlyMsgRoot: true
      };
      if (!TatFilter.containsDateFilter) {
        filterAttrs.dateMinUpdate = self.data.intervalTimeStamp;
      }
      var filter = self.buildFilter(filterAttrs);
      return TatEngineMessagesRsc.list(filter).$promise.then(function(data) {
        self.digestInformations(data);
      }, function(err) {
        TatEngine.displayReturn(err);
        self.loading = false;
      });
    };

    self.getReplies = function(msg) {
      msg.displayReplies = !msg.displayReplies;
      if (!msg.displayReplies) {
        return;
      }

      return TatEngineMessagesRsc.list({
        topic: self.topic,
        treeView: "onetree",
        idMessage: msg._id,
        limit: 1,
        skip: 0
      }).$promise.then(function(data) {
        if (!data.messages || data.messages.length != 1) {
          TatEngine.displayReturn("invalid return while getting message");
        } else {
          msg.replies = data.messages[0].replies;
        }
      }, function(err) {
        TatEngine.displayReturn(err);
      });

    };

    /**
     * @ngdoc function
     * @name moreMessage
     * @methodOf TatUi.controller:MessagesStandardViewListCtrl
     * @description Request more messages
     * @return {object} Promise
     */
    self.moreMessage = function() {
      self.loading = true;
      var filter = self.buildFilter({
        topic: self.topic,
        treeView: self.getTreeMode(),
        onlyMsgRoot: true,
        limit: self.data.count,
        skip: self.data.skip
      });
      return TatEngineMessagesRsc.list(filter).$promise.then(function(data) {
        if (!data.messages) {
          self.data.displayMore = false;
        } else {
          self.data.skip = self.data.skip + self.data.count;
          self.digestInformations(data);
        }
      }, function(err) {
        TatEngine.displayReturn(err);
        self.loading = false;
      });
    };

    /**
     * @ngdoc function
     * @name digestInformations
     * @methodOf TatUi.controller:MessagesStandardViewListCtrl
     * @description
     * @return
     */
    self.digestInformations = function(data) {
      self.data.isTopicRw = data.isTopicRw;
      if (_.includes(Authentication.getIdentity().favoritesTopics, '/' + self.topic)) {
        self.data.isFavoriteTopic = true;
      }
      self.data.messages = self.mergeMessages(self.data.messages, data.messages);
      self.loading = false;
    };

    /**
     * @ngdoc function
     * @name init
     * @methodOf TatUi.controller:MessagesStandardViewListCtrl
     * @description Initialize list messages page. Get list of messages from Tat Engine
     */
    self.init = function() {
      TatTopic.computeTopic(self.topic, self.beginTimer);
    };

    self.setMessage = function(message) {
      message.displayed = true;
      $scope.message = message;
    };

    self.toggleMessage = function(message) {
      var same = false;
      if ($scope.message && $scope.message._id == message._id) {
        same = true;
      }
      if ($scope.message && $scope.message.displayed) {
        self.closeMessage($scope.message);
        setTimeout(function() {
          $scope.$apply(function() {
            if (!same) {
              self.setMessage(message);
            }
          });
        }, 100);
      } else {
        self.setMessage(message);
      }
    };

    self.closeMessage = function(message) {
      $scope.message.displayed = false;
      $scope.message = null;
    };

    /**
     * @ngdoc function
     * @name isDoing
     * @methodOf TatUi.controller:messagesItem
     * @description Return true if message contains a doing label
     */
    self.isDoing = function(message) {
      return self.containsLabel(message, "doing");
    };

    /**
     * @ngdoc function
     * @name isDone
     * @methodOf TatUi.controller:messagesItem
     * @description Return true if message contains a done label
     */
    self.isDone = function(message) {
      return self.containsLabel(message, "done");
    };

    self.containsLabel = function(message, labelText) {
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

    self.init();
  });
