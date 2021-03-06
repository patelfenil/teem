'use strict';

angular.module('Teem')
  .directive('chatPictureModal', function() {
    return {
      controller: ['$scope', 'SharedState', function($scope, SharedState) {
        $scope.getChatPictureUrl = function() {
          let modalSharedState = SharedState.get('modalSharedState');
          return modalSharedState && modalSharedState.url;
        };
      }],
      templateUrl: 'chat/chat-picture-modal.html'
    };
  });
