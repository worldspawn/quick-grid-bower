(function () {
  'use strict';

  angular.module('ngQuickGrid', []);
})();
(function () {
  'use strict';

  angular.module('ngQuickGrid')
    .directive('quickGrid', function () {
      return {
        restrict: 'A',
        scope: true,
        controllerAs: 'grid',
        controller: ['$scope', '$element', '$attrs', function ($scope, $element, $attrs) {
          this.searchModel = $scope.$eval($attrs.gridModel);
        }]
      };
    });
})();
(function (module) {
  try {
    module = angular.module('quick-grid-partials');
  } catch (e) {
    module = angular.module('quick-grid-partials', []);
  }
  module.run(['$templateCache', function ($templateCache) {
      $templateCache.put('/quick-grid/quick-grid-footer.html',
        '<div class="btn-group" ng-if="quickPaging.searchModel.pageCount.length > 1"><button ng-repeat="x in quickPaging.searchModel.pageCount track by $index" ng-click="quickPaging.searchModel.paging.toPage($index)" ng-disabled="$index === quickPaging.searchModel.paging.pageIndex" class="btn btn-primary btn-sm">{{$index + 1}}</button></div>');
    }
  ]);
})();
(function () {
  'use strict';

  angular.module('ngQuickGrid')
    .directive('quickPaging', function () {
      return {
        restrict: 'A',
        require: ['^quickGrid', 'quickPaging'],
        controller: function () {},
        scope: true,
        controllerAs: 'quickPaging',
        templateUrl: '/quick-grid/quick-grid-footer.html',
        link: function ($scope, $element, $attrs, controllers) {
          var quickGrid = controllers[0];
          var selfController = controllers[1];
          selfController.searchModel = quickGrid.searchModel;
        }
      };
    });
})();
(function () {
  'use strict';

  angular.module('ngQuickGrid')
    .directive('quickSort', ['$compile', function ($compile) {
      return {
        restrict: 'A',
        require: '^quickGrid',
        link: function ($scope, $element, $attrs, quickGrid) {
          var sortBy = $attrs.quickSort;
          var carets = angular.element('<span ng-if="grid.searchModel.paging.sortBy.toLowerCase().indexOf(\'' + sortBy.toLowerCase() + '\') === 0"><i class="glyphicon glyphicon-triangle-bottom" ng-if="grid.searchModel.paging.sortBy.toLowerCase().indexOf(\'desc\') > -1"></i><i class="glyphicon glyphicon-triangle-top" ng-if="grid.searchModel.paging.sortBy.toLowerCase().indexOf(\'desc\') === -1"></i></span>');
          $element.append($compile(carets)($scope));
          $element.on('click', function () {
            $scope.$apply(function () {
              quickGrid.searchModel.paging.sort(sortBy);
            });
          });
        }
      };
    }]);
})();
(function () {
  'use strict';

  function PrefixOperator(value, operator) {
    this.value = value;
    this.toJSON = function () {
      if (this.value === null || this.value === undefined || this.value === '') {
        return undefined;
      }
      var value = this.value;
      return operator + value;
    };
  }

  var operators = {
    '%': function (value) {
      this.value = value;
      this.toJSON = function () {
        if (this.value === null || this.value === undefined || this.value === '') {
          return undefined;
        }
        var value = this.value;
        return '%' + value + '%';
      };
    },
    '%~': function (value) {
      this.value = value;
      this.toJSON = function () {
        if (this.value === null || this.value === undefined || this.value === '') {
          return undefined;
        }
        var value = this.value;
        return '%' + value;
      };
    },
    '~%': function (value) {
      this.value = value;
      this.toJSON = function () {
        if (this.value === null || this.value === undefined || this.value === '') {
          return undefined;
        }
        var value = this.value;
        return value + '%';
      };
    },
    '()': function (value) {
      this.value = value;
      this.toJSON = function () {
        if (this.value === null || this.value === undefined || this.value === '') {
          return undefined;
        }

        var values = [];
        this.value.forEach(function (x) {
          values.push(x);
        });
        return '(' + values.join(',') + ')';
      };
    }
  };

  function PagingModel(defaultSortBy) {
    this.sort(defaultSortBy);
  }

  function SearchModel(defaultSortBy, defaultModel) {
    this.model = defaultModel || {};
    this.paging = new PagingModel(defaultSortBy);
    this.pageCount = [];
    this.filters = {};
  }

  SearchModel.prototype = {
    addFilter: function (key, operator, value) {
      var Constructor = operators[operator] || PrefixOperator;
      this.filters[key] = new Constructor(value, operator);
    },
    attachToScope: function ($scope, cb) {
      var self = this;

      function onChange() {
        self.paging.pageIndex = 0;
        self.paging.filterHash = null;
        cb(angular.extend({}, self.model, {
          filters: self.filters
        }), self.paging, true)
          .then(function (result) {
            if (result.pageCount !== null) {
              self.pageCount.length = result.pageCount;
            }

            self.paging.filterHash = result.filterHash;
          });
      }

      $scope.$watch(function () {
        return self.model;
      }, onChange, true);

      $scope.$watch(function () {
        return self.filters;
      }, onChange, true);

      $scope.$watch(function () {
        return self.paging;
      }, function (newValue, oldValue) {
        if (newValue.sortBy !== oldValue.sortBy || newValue.pageIndex !== oldValue.pageIndex) {
          cb(angular.extend({}, self.model, {
            filters: self.filters
          }), newValue, false);
        }
      }, true);
    }
  };

  PagingModel.prototype = {
    sort: function (by) {
      if (by === null) {
        delete this.sortBy;
      } else {
        if (by === this.sortBy) {
          this.sortBy = by + ' desc';
        } else {
          this.sortBy = by;
        }
      }
    },
    toPage: function (pageIndex) {
      this.pageIndex = pageIndex;
    }
  };

  angular.module('ngQuickGrid')
    .factory('SearchModel', function () {
      return SearchModel;
    });
})();