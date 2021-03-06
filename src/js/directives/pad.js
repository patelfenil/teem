'use strict';

/**
 * @ngdoc function
 * @name Teem.controller:ChatCtrl
 * @description
 * # Chat Ctrl
 * Show Pad for a given project
 */

angular.module('Teem')
  .directive('pad', function() {
    return {
      scope: true,
      link: function($scope, elem, attrs) {
        $scope.editingDefault = attrs.editingDefault;
      },
      controller: [
        'SessionSvc', '$rootScope', '$scope', '$route', '$location',
        '$timeout', 'SharedState', 'needWidget', '$element',
        function(SessionSvc, $rootScope, $scope, $route, $location,
        $timeout, SharedState, needWidget, $element) {

          var buttons = ['text_fields', 'format_bold', 'format_italic', 'format_strikethrough',
          'format_align_left', 'format_align_center', 'format_align_right',
          'format_list_bulleted', 'format_list_numbered'];

          var annotationMap = {
            'text_fields': 'paragraph/header=h3',
            'format_bold': 'style/fontWeight=bold',
            'format_italic': 'style/fontStyle=italic',
            'format_strikethrough': 'style/textDecoration=line-through',
            'format_align_left': 'paragraph/textAlign=left',
            'format_align_center': 'paragraph/textAlign=center',
            'format_align_right': 'paragraph/textAlign=right',
            'format_list_bulleted': 'paragraph/listStyleType=unordered',
            'format_list_numbered': 'paragraph/listStyleType=decimal'
          };

          var annotations = {};

          $scope.padWidgets = {
            'need': needWidget.getWidget($scope),
            'img': {
              onInit: function(parentElement, state) {
                $scope.project.attachments[state].file.getUrl().then(url => {
                  parentElement.innerHTML='<img src="'+url+'">';
                });
              },
              onChangeState: function(parentElement, before, state) {
                $scope.project.attachments[state].file.getUrl().then(url => {
                  parentElement.innerHTML='<img src="'+url+'">';
                });
              }
            }
          };

          $scope.padAnnotations = {
            'paragraph/header': {
              onAdd: function() {
                $scope.pad.outline = this.editor.getAnnotationSet('paragraph/header');
                $timeout();
              },
              onChange: function() {
                $scope.pad.outline = this.editor.getAnnotationSet('paragraph/header');
                $timeout();
              },
              onRemove: function() {
                $scope.pad.outline = this.editor.getAnnotationSet('paragraph/header');
                $timeout();
              }
            },
            'link': {
              onEvent: function(range, event) {
                if (event.type === 'click') {
                  event.stopPropagation();
                  $scope.linkModal.open(range);
                }
              }
            }
          };

          function updateAllButtons() {
            for (let btn of buttons) {
              let [key, val] = annotationMap[btn].split('=');
              $scope.buttons[btn] = (annotations && annotations[key] === val);
            }
            $timeout();
          }

          function disableAllButtons() {
            $scope.buttons = {};
            buttons.forEach(btn => $scope.buttons[btn] = false);
            $timeout();
          }

          $scope.padCreate = function(editor) {

            $scope.linkModal = {
              add: function() {
                event.stopPropagation();
                let range = editor.getSelection();
                if (range.text) {
                  editor.setAnnotation('link', '');
                }
                $scope.linkModal.open(range);
              },
              open: function(range) {
                let annotation = editor.getAnnotationInRange(range, 'link');

                $scope.linkModal.range = range;
                $scope.linkModal.annotation = annotation;
                console.log(range);
                let clientRect = range.node.nextSibling ?
                  range.node.nextSibling.getBoundingClientRect() :
                  range.node.parentElement.getBoundingClientRect();
                document.getElementById('link-modal').style.top = clientRect.top + 25 + 'px';
                document.getElementById('link-modal').style.left = clientRect.left + 'px';

                $scope.linkModal.text = range.text;
                $scope.linkModal.link = annotation ? annotation.value : '';
                $scope.linkModal.show = true;

                let emptyInput = !range.text ? 'text': 'link';
                let autofocus = document.querySelector('#link-modal [ng-model="linkModal.' + emptyInput + '"]');
                $timeout(() => autofocus && autofocus.focus());
              },
              change: function() {
                let range = editor.setText($scope.linkModal.range, $scope.linkModal.text);
                editor.setAnnotationInRange(range, 'link', $scope.linkModal.link);
                $scope.linkModal.show = false;
                $scope.linkModal.edit = false;
              },
              clear: function() {
                editor.clearAnnotationInRange($scope.linkModal.range, 'link');
                $scope.linkModal.show = false;
                $scope.linkModal.edit = false;
              }
            };

            disableAllButtons();

            editor.onSelectionChanged(function(range) {
              annotations = range.annotations;
              updateAllButtons();
            });
          };

          $scope.padReady = function(editor) {
            // FIXME
            // SwellRT editor is created with .wave-editor-off
            // Should use .wave-editor-on when SwellRT editor callback is available
            // https://github.com/P2Pvalue/swellrt/issues/84
            var editorElement = angular.element($element.find('.swellrt-editor').children()[0]);

            editorElement.on('focus', updateAllButtons);
            editorElement.on('blur', disableAllButtons);

            $scope.pad.outline = editor.getAnnotationSet('paragraph/header');

            $scope.annotate = function(btn) {
              let [key, val] = annotationMap[btn].split('=');
              let currentVal = annotations[key];
              if (currentVal === val) {
                val = null;
              }

              annotations[key] = val;
              editor.setAnnotation(key, val);
              editorElement.focus();
            };

            $scope.clearFormat = function() {
              editor.clearAnnotation('style');
              editorElement.focus();
            };

            $scope.widget = function(type) {
              if (type === 'need') {
                needWidget.add(editor, $scope);
              }
              if (type === 'img') {
                if (arguments[1] === undefined) { // First step
                  $scope.pad.selectingFile = true;
                  $timeout(() => $scope.pad.selectingFile = false);
                } else { // Second step
                  $scope.pad.selectingFile = false;
                  var id = $scope.project.addAttachment(arguments[1]);
                  editor.addWidget('img', id);
                }
              }
            };

            $scope.editOn = function () {
              if (editorElement.attr('class') === 'wave-editor-on') {
                $scope.pad.editing = true;
                SessionSvc.showSaving = true;
                SharedState.turnOn('hiddenTabs');
                $timeout();
              }
            };

            $scope.editOff = function () {
              if (editorElement.attr('class') === 'wave-editor-on') {
                $scope.pad.editing = $scope.editingDefault;
                SessionSvc.showSaving = false;
                SharedState.turnOff('hiddenTabs');
                $timeout();
              }
            };

            if ($scope.editingDefault && $scope.project.isParticipant()) {
              $scope.pad.editing = true;
            }
          };

          $scope.$watchCollection(function() {
            return SessionSvc.status;
          }, function(current) {
            $scope.pad.saving = !current.sync;
          });

      }],
      templateUrl: 'pad.html'
    };
  });
