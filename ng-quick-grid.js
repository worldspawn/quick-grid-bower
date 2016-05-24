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

  var operatorPrototype = {
    setNot: function (not) {
      this.not = not;
    },
    toggleNot: function () {
      this.not = !this.not;
    }
  };

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
  PrefixOperator.prototype = operatorPrototype;

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

  Object.keys(operators)
    .forEach(function (key) {
      operators[key].prototype = operatorPrototype;
    });

  function PagingModel(defaultSortBy) {
    this.sort(defaultSortBy);
  }

  function updatePaging(result) {
    /* jshint validthis: true */
    if (result.pageCount !== null) {
      this.pageCount.length = result.pageCount;
    }

    this.paging.filterHash = result.filterHash;
  }

  function attachPagingWatch() {
    /* jshint validthis: true */
    if (!this.scope) {
      return;
    }
    this.pagingWatchHandle = this.scope.$watch(function () {
      return this.paging;
    }.bind(this), function (newValue, oldValue) {
      if (newValue.sortBy !== oldValue.sortBy || newValue.pageIndex !== oldValue.pageIndex) {
        this.apply(false);
      }
    }.bind(this), true);
  }

  function onChange(newValue, oldValue) {
    /* jshint validthis: true */
    if (newValue === oldValue) {
      return;
    }
    this.apply(true);
  }

  function attachOtherWatchers() {
    /* jshint validthis: true */
    this.modelWatchHandle = this.scope.$watch(function () {
      return this.model;
    }.bind(this), onChange.bind(this), true);

    this.filterWatchHandle = this.scope.$watch(function () {
      return this.filters;
    }.bind(this), onChange.bind(this), true);
  }

  function SearchModel(callback, defaultSortBy, defaultModel) {
    this.model = defaultModel || {};
    this.paging = new PagingModel(defaultSortBy);
    this.pageCount = [];
    this.filters = {};
    this.callback = callback;
  }

  SearchModel.prototype = {
    watch: function (scope) {
      this.scope = scope;
      attachOtherWatchers.call(this);
      attachPagingWatch.call(this);
      return this;
    },
    addFilter: function (key, operator, value) {
      var Constructor = operators[operator] || PrefixOperator;
      this.filters[key] = new Constructor(value, operator);
      return this;
    },
    apply: function (reset) {
      if (this.pagingWatchHandle) {
        this.pagingWatchHandle();
      }
      if (reset) {
        this.paging.pageIndex = 0;
        this.paging.filterHash = null;
      }
      this.callback(this)
        .then(updatePaging.bind(this))
        .then(attachPagingWatch.bind(this));
    },
    toQueryString: function () {
      /* jshint validthis: true */
      //note model is not output in the query string, i'd have to build a deep converter and i can't be arsed. just use filters! :P
      var segments = [];
      var filterCount = 0;
      Object.keys(this.filters)
        .forEach(function (key) {
          var value = this.filters[key].toJSON();
          if (value !== undefined) {
            var not = this.filters[key].not ? '!' : '';
            var name = 'filters[' + filterCount+++']';
            segments.push(name + '.key=' + escape(key));
            segments.push(name + '.value=' + escape(not + value));
          }
        }.bind(this));

      if (this.model) {
        Object.keys(this.model)
          .forEach(function (key) {
            var value = this.model[key].toJSON();
            if (value !== undefined) {
              segments.push(escape(key) + '=' + escape(value));
            }
          }.bind(this));
      }

      segments.push('paging.pageIndex=' + (this.paging.pageIndex || 0));
      segments.push('paging.sortBy=' + escape(this.paging.sortBy || ''));
      segments.push('paging.filterHash=' + escape(this.paging.filterHash || ''));

      return segments.join('&');
    },
    toJSON: function () {
      var result = {
        paging: this.paging,
        filters: this.filters
      };

      Object.keys(this.model)
        .forEach(function (key) {
          result[key] = this.model[key];
        });

      return result;
    }
  };

  PagingModel.prototype = {
    sort: function (by) {
      if (by === null || by === undefined) {
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