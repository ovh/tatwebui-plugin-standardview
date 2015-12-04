/*global angular*/
angular.module('TatUi').config(function ($stateProvider, PluginProvider) {
    'use strict';

    PluginProvider.addPlugin(
      {
        'name':'Standard View',
        'route' : 'standardview-list',
        'type': 'messages-views',
        'default': true
      }
    );

    $stateProvider.state('standardview-list', {
        url: '/standardview/list/{topic:topicRoute}?idMessage&filterInLabel&filterAndLabel&filterNotLabel&filterInTag&filterAndTag&filterNotTag',
        templateUrl: '../build/tatwebui-plugin-standardview/standardview/list/standardview-list.view.html',
        controller: 'MessagesStandardViewListCtrl',
        controllerAs: 'ctrl',
        reloadOnSearch: false,
        translations: [
            'plugins/tatwebui-plugin-standardview/standardview'
        ]
    });
});
