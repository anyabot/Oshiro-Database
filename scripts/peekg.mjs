var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/react/cjs/react.production.min.js
var require_react_production_min = __commonJS({
  "node_modules/react/cjs/react.production.min.js"(exports) {
    "use strict";
    var l = Symbol.for("react.element");
    var n = Symbol.for("react.portal");
    var p = Symbol.for("react.fragment");
    var q = Symbol.for("react.strict_mode");
    var r = Symbol.for("react.profiler");
    var t = Symbol.for("react.provider");
    var u = Symbol.for("react.context");
    var v = Symbol.for("react.forward_ref");
    var w = Symbol.for("react.suspense");
    var x = Symbol.for("react.memo");
    var y = Symbol.for("react.lazy");
    var z = Symbol.iterator;
    function A(a) {
      if (null === a || "object" !== typeof a) return null;
      a = z && a[z] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var B = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } };
    var C = Object.assign;
    var D = {};
    function E(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    E.prototype.isReactComponent = {};
    E.prototype.setState = function(a, b) {
      if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a, b, "setState");
    };
    E.prototype.forceUpdate = function(a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    };
    function F() {
    }
    F.prototype = E.prototype;
    function G(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    var H = G.prototype = new F();
    H.constructor = G;
    C(H, E.prototype);
    H.isPureReactComponent = true;
    var I = Array.isArray;
    var J = Object.prototype.hasOwnProperty;
    var K = { current: null };
    var L = { key: true, ref: true, __self: true, __source: true };
    function M(a, b, e) {
      var d, c = {}, k = null, h = null;
      if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
      var g = arguments.length - 2;
      if (1 === g) c.children = e;
      else if (1 < g) {
        for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
        c.children = f;
      }
      if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
      return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
    }
    function N(a, b) {
      return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
    }
    function O(a) {
      return "object" === typeof a && null !== a && a.$$typeof === l;
    }
    function escape(a) {
      var b = { "=": "=0", ":": "=2" };
      return "$" + a.replace(/[=:]/g, function(a2) {
        return b[a2];
      });
    }
    var P = /\/+/g;
    function Q(a, b) {
      return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
    }
    function R(a, b, e, d, c) {
      var k = typeof a;
      if ("undefined" === k || "boolean" === k) a = null;
      var h = false;
      if (null === a) h = true;
      else switch (k) {
        case "string":
        case "number":
          h = true;
          break;
        case "object":
          switch (a.$$typeof) {
            case l:
            case n:
              h = true;
          }
      }
      if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
        return a2;
      })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I(a)) for (var g = 0; g < a.length; g++) {
        k = a[g];
        var f = d + Q(k, g);
        h += R(k, b, e, f, c);
      }
      else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
      else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S(a, b, e) {
      if (null == a) return a;
      var d = [], c = 0;
      R(a, d, "", "", function(a2) {
        return b.call(e, a2, c++);
      });
      return d;
    }
    function T(a) {
      if (-1 === a._status) {
        var b = a._result;
        b = b();
        b.then(function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
        }, function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
        });
        -1 === a._status && (a._status = 0, a._result = b);
      }
      if (1 === a._status) return a._result.default;
      throw a._result;
    }
    var U = { current: null };
    var V = { transition: null };
    var W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
    function X() {
      throw Error("act(...) is not supported in production builds of React.");
    }
    exports.Children = { map: S, forEach: function(a, b, e) {
      S(a, function() {
        b.apply(this, arguments);
      }, e);
    }, count: function(a) {
      var b = 0;
      S(a, function() {
        b++;
      });
      return b;
    }, toArray: function(a) {
      return S(a, function(a2) {
        return a2;
      }) || [];
    }, only: function(a) {
      if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
      return a;
    } };
    exports.Component = E;
    exports.Fragment = p;
    exports.Profiler = r;
    exports.PureComponent = G;
    exports.StrictMode = q;
    exports.Suspense = w;
    exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
    exports.act = X;
    exports.cloneElement = function(a, b, e) {
      if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
      var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
      if (null != b) {
        void 0 !== b.ref && (k = b.ref, h = K.current);
        void 0 !== b.key && (c = "" + b.key);
        if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
        for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
      }
      var f = arguments.length - 2;
      if (1 === f) d.children = e;
      else if (1 < f) {
        g = Array(f);
        for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
        d.children = g;
      }
      return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
    };
    exports.createContext = function(a) {
      a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a.Provider = { $$typeof: t, _context: a };
      return a.Consumer = a;
    };
    exports.createElement = M;
    exports.createFactory = function(a) {
      var b = M.bind(null, a);
      b.type = a;
      return b;
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(a) {
      return { $$typeof: v, render: a };
    };
    exports.isValidElement = O;
    exports.lazy = function(a) {
      return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
    };
    exports.memo = function(a, b) {
      return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
    };
    exports.startTransition = function(a) {
      var b = V.transition;
      V.transition = {};
      try {
        a();
      } finally {
        V.transition = b;
      }
    };
    exports.unstable_act = X;
    exports.useCallback = function(a, b) {
      return U.current.useCallback(a, b);
    };
    exports.useContext = function(a) {
      return U.current.useContext(a);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(a) {
      return U.current.useDeferredValue(a);
    };
    exports.useEffect = function(a, b) {
      return U.current.useEffect(a, b);
    };
    exports.useId = function() {
      return U.current.useId();
    };
    exports.useImperativeHandle = function(a, b, e) {
      return U.current.useImperativeHandle(a, b, e);
    };
    exports.useInsertionEffect = function(a, b) {
      return U.current.useInsertionEffect(a, b);
    };
    exports.useLayoutEffect = function(a, b) {
      return U.current.useLayoutEffect(a, b);
    };
    exports.useMemo = function(a, b) {
      return U.current.useMemo(a, b);
    };
    exports.useReducer = function(a, b, e) {
      return U.current.useReducer(a, b, e);
    };
    exports.useRef = function(a) {
      return U.current.useRef(a);
    };
    exports.useState = function(a) {
      return U.current.useState(a);
    };
    exports.useSyncExternalStore = function(a, b, e) {
      return U.current.useSyncExternalStore(a, b, e);
    };
    exports.useTransition = function() {
      return U.current.useTransition();
    };
    exports.version = "18.3.1";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.3.1";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text) {
          return text.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c) {
                return c;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              nextName = nextNamePrefix + getElementKey(child, i);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState2(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init);
        }
        function useRef(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect2(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create, deps);
        }
        function useInsertionEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create, deps);
        }
        function useLayoutEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create, deps);
        }
        function useCallback(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create, deps);
        }
        function useImperativeHandle(ref, create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create, deps);
        }
        function useDebugValue(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i = 2; i < arguments.length; i++) {
              validateChildKeys(arguments[i], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i = 2; i < arguments.length; i++) {
            validateChildKeys(arguments[i], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module && module[requireString];
              enqueueTaskImpl = nodeRequire.call(module, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve, reject);
                    } else {
                      resolve(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                    } else {
                      resolve(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve, reject) {
                    resolve(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i = 0;
              try {
                for (; i < queue.length; i++) {
                  var callback = queue[i];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports.Children = Children;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports.act = act;
        exports.cloneElement = cloneElement$1;
        exports.createContext = createContext;
        exports.createElement = createElement$1;
        exports.createFactory = createFactory;
        exports.createRef = createRef;
        exports.forwardRef = forwardRef;
        exports.isValidElement = isValidElement;
        exports.lazy = lazy;
        exports.memo = memo;
        exports.startTransition = startTransition;
        exports.unstable_act = act;
        exports.useCallback = useCallback;
        exports.useContext = useContext;
        exports.useDebugValue = useDebugValue;
        exports.useDeferredValue = useDeferredValue;
        exports.useEffect = useEffect2;
        exports.useId = useId;
        exports.useImperativeHandle = useImperativeHandle;
        exports.useInsertionEffect = useInsertionEffect;
        exports.useLayoutEffect = useLayoutEffect;
        exports.useMemo = useMemo;
        exports.useReducer = useReducer;
        exports.useRef = useRef;
        exports.useState = useState2;
        exports.useSyncExternalStore = useSyncExternalStore;
        exports.useTransition = useTransition;
        exports.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_production_min();
    } else {
      module.exports = require_react_development();
    }
  }
});

// scripts/peekg.ts
import fs from "node:fs";

// node_modules/@altterisk/game-hub/dist/data.js
var import_react = __toESM(require_react(), 1);
var JsonLoadError = class extends Error {
  constructor(resource, attempts) {
    super(`failed to load ${resource}: ${attempts.join("; ") || "no candidate URL"}`);
    this.resource = resource;
    this.attempts = attempts;
    this.name = "JsonLoadError";
  }
};
var defaultRetryOn = (status) => status === 408 || status === 429 || status >= 500;
function createJsonLoader(options) {
  const { urls, retry = 1, retryOn = defaultRetryOn, init } = options;
  const pending = /* @__PURE__ */ new Map();
  const resolved = /* @__PURE__ */ new Map();
  async function fetchOnce(name) {
    const doFetch = options.fetch ?? fetch;
    const candidates = await urls(name);
    const attempts = [];
    for (let pass = 0; pass <= retry; pass += 1) {
      let retryable = false;
      for (const url of candidates) {
        let res;
        try {
          res = await doFetch(url, init);
        } catch (e) {
          attempts.push(`${url} ${e instanceof Error ? e.message : String(e)}`);
          retryable = true;
          continue;
        }
        if (res.ok)
          return res.json();
        attempts.push(`${url} ${res.status}`);
        if (retryOn(res.status))
          retryable = true;
      }
      if (!retryable)
        break;
    }
    throw new JsonLoadError(name, attempts);
  }
  return {
    load(name) {
      let p = pending.get(name);
      if (!p) {
        p = fetchOnce(name).then((value) => {
          resolved.set(name, value);
          return value;
        }, (error) => {
          pending.delete(name);
          throw error;
        });
        pending.set(name, p);
      }
      return p;
    },
    peek(name) {
      return resolved.get(name);
    },
    forget(name) {
      if (name === void 0) {
        pending.clear();
        resolved.clear();
      } else {
        pending.delete(name);
        resolved.delete(name);
      }
    }
  };
}

// src/labels.ts
var JP_EN = {
  // stats: the game's own column names (StatusTypes bound to them in the exe)
  HealthMaximum: "Max HP",
  Health: "Current HP",
  Regeneration: "Regen",
  AttackPower: "ATK",
  AttackRange: "Range",
  AttackSpeed: "Attack speed",
  AttackTargetCount: "Targets",
  Defense: "DEF",
  BlockCount: "Block",
  GimmickPoint: "Stratagem cooldown",
  "GimmickPoint (current)": "Stratagem cooldown progress",
  GimmickStockCount: "Stratagem stock",
  Deposit: "Deposit",
  "DamageVs\u5996\u602A": "Damage vs \u5996\u602A",
  AntiSpecterBonus: "Anti-yokai bonus",
  "DamageVs\u9B54\u7269": "Damage vs \u9B54\u7269",
  SpreadReductionRate: "Splash damage rate",
  DirectHitBonus: "Direct-hit bonus",
  "DirectHitBonus (override)": "Direct-hit bonus (override)",
  AntiAirBonus: "Anti-air bonus",
  "DamageVsFlying (no missile)": "Damage vs flying (non-missile attacks)",
  IgnoreArmor: "ignores DEF",
  Missile: "missile attack",
  AntiDemonBonus: "anti-\u9B54\u7269 bonus",
  DamageDrain: "HP drain (% of damage dealt)",
  "HealthGauge (max)": "Max HP gauges",
  HealthGauge: "HP gauges",
  ImmuneToDamage: "Damage immunity",
  Undying: "Can't be destroyed (HP stays at 1)",
  "Undying blocked": "Blocks 'can't be destroyed'",
  IgnoreImmuneToDamage: "pierces damage immunity",
  "SpecialGauge (max)": "Special gauge per stock",
  SpecialGauge: "Special gauge",
  SpecialGaugeChargeByDamage: "Special gauge gain when hit",
  "SpecialGaugeChargeByDamage (flat cut)": "Special gauge gain when hit (flat cut)",
  SpecialStock: "Special attack stock",
  "DeployCost%": "Deploy Ki",
  "DeployCost (flat cut)": "Deploy Ki reduction",
  DeployCostReduction: "Deploy Ki reduction",
  CostReduction: "Cost reduction",
  "RetreatKiRefund%": "Ki refund on retreat (% of deploy Ki)",
  "GiantifyKiCost%": "Giantify Ki",
  "GiantifyKiCost (flat cut)": "Giantify Ki reduction",
  "DefenseIgnore%": "DEF ignore",
  "DefenseIgnore (flat)": "DEF ignore (flat)",
  "DamageReduction% (\u7269\u7406)": "Physical damage reduction",
  "Defense (\u9B54\u6CD5)": "Magic defense",
  "DamageReduction% (\u9B54\u6CD5)": "Magic damage reduction",
  "\u9B54\u6CD5 (MagicDamage / IgnoreArmor)": "magic (ignores DEF)",
  "\u56FA\u5B9A\u30C0\u30E1\u30FC\u30B8 (TrueDamage)": "true damage",
  "\u9060\u8DDD\u96E2 (RangedAttack)": "ranged",
  "\u98DB\u884C\u7279\u653B (AntiAir)": "anti-air",
  "\u76F4\u6483\u30DC\u30FC\u30CA\u30B9 (DirectHitBonus)": "direct-hit bonus",
  "\u5996\u602A\u7279\u653B (AntiSpecter)": "anti-yokai",
  "\u9B54\u7269\u7279\u653B (AntiDemon)": "anti-\u9B54\u7269",
  "\u4E0E\u30C0\u30E1\u52B9\u679C\u7121\u8996 (IgnoreGiveDamage)": "ignores damage-dealt modifiers",
  "\u88AB\u30C0\u30E1\u52B9\u679C\u7121\u8996 (IgnoreTakeDamage)": "ignores damage-taken modifiers",
  "\u7279\u5B9A\u653B\u6483\u30DC\u30FC\u30CA\u30B9\u52B9\u679C\u7121\u8996 (IgnoreAttackBonus)": "ignores attack bonuses",
  "\u30C0\u30E1\u30FC\u30B8\u7121\u52B9(\u6575\u30AE\u30DF\u30C3\u30AF\u7528)\u7121\u8996 (IgnoreImmuneToDamageForEnemyGimmick)": "pierces damage immunity",
  FallNotCounted: "Falling doesn't count toward the fallen-unit count",
  \u72B6\u614B\u7570\u5E38\u7121\u52B9: "Crowd-control immunity",
  \u6C17\u56DE\u53CE\u91CF: "Ki gain",
  \u6C17\u56DE\u53CE\u6642\u9593: "Ki gain interval",
  \u56DE\u5FA9\u91CF: "Healing amount",
  \u5929\u5019\u7121\u52B9: "Weather immunity",
  "\u81EA\u52D5\u5DE8\u5927\u5316\u6642\u9593%": "Auto-giantify time",
  "\u81EA\u52D5\u5DE8\u5927\u5316\u6642\u9593 (flat ms)": "Auto-giantify time (flat)",
  \u6C17\u306E\u81EA\u7136\u5897\u52A0\u91CF: "Natural Ki gain",
  "\u653B\u6483\u6642\u81EA\u50B7(\u6700\u5927\u8010\u4E45%)": "Recoil per attack (% of own max HP)",
  \u9699\u77ED\u7E2E: "Attack gap reduction",
  \u9EBB\u75FA: "Paralysis",
  \u6697\u95C7: "Darkness",
  \u6DF7\u4E71: "Confusion",
  \u706B\u50B7: "Burn",
  \u731B\u6BD2: "Deadly Poison",
  \u6C37\u7D50: "Freeze",
  \u7D76\u671B: "Despair",
  \u670D\u5F93: "Submission",
  \u7372\u5F97\u91D1: "Gold gain",
  \u7372\u5F97\u6BBFEXP: "Lord EXP gain",
  \u7372\u5F97\u91D1\u3068\u8535\u304B\u3089\u306E\u5165\u624B\u91D1: "Gold gain (incl. storehouses)",
  \u8981\u77F3\u306E\u5165\u624B\u6570: "Keystone drops",
  \u57CE\u5A18\u5408\u6210\u6642\u306E\u7372\u5F97\u7D4C\u9A13\u5024: "EXP from fusion",
  \u66B4\u96E8: "Downpour",
  \u8C6A\u96EA: "Heavy Snow",
  \u7634\u6C17: "Miasma",
  \u8F5F\u96F7: "Thunder",
  \u66B4\u98A8: "Gale",
  \u6FC3\u9727: "Dense Fog",
  \u865A\u591C: "Void Night",
  \u5E7B\u9727: "Phantom Fog",
  Untargetable: "Can't be targeted",
  "Untargetable (non-flying)": "Can't be targeted except by flying enemies",
  SpecialGaugeChargeByAttack: "Special gauge gain on attack",
  "SpecialGaugeChargeByAttack (flat cut)": "Special gauge gain on attack (flat cut)",
  // stats
  \u8010\u4E45: "HP",
  \u73FE\u5728\u8010\u4E45: "Current HP",
  \u653B\u6483: "ATK",
  \u9632\u5FA1: "DEF",
  \u9632\u5FA1\u7121\u8996: "DEF ignore",
  \u56DE\u5FA9: "Regen",
  \u5C04\u7A0B: "Range",
  \u653B\u6483\u901F\u5EA6: "Attack speed",
  \u9699: "Attack gap",
  \u653B\u6483\u5BFE\u8C61: "Targets",
  \u653B\u6483\u5BFE\u8C61\u6570: "Target count",
  \u8DB3\u6B62\u3081\u6570: "Block",
  \u79FB\u52D5\u901F\u5EA6: "Move speed",
  \u7BC4\u56F2: "Area",
  \u7206\u98A8\u7BC4\u56F2: "Blast radius",
  \u7206\u98A8\u30C0\u30E1\u30FC\u30B8: "Blast damage",
  \u30C0\u30E1\u30FC\u30B8: "Damage",
  \u4E0E\u30C0\u30E1\u30FC\u30B8: "Damage dealt",
  \u4E0E\u3048\u308B\u30C0\u30E1\u30FC\u30B8: "Damage dealt",
  \u653B\u6483\u3067\u4E0E\u3048\u308B\u30C0\u30E1\u30FC\u30B8: "Attack damage dealt",
  \u7BC4\u56F2\u653B\u6483\u3067\u4E0E\u3048\u308B\u30C0\u30E1\u30FC\u30B8: "Area attack damage",
  \u88AB\u30C0\u30E1\u30FC\u30B8: "Damage taken",
  \u88AB\u56DE\u5FA9\u91CF: "Healing received",
  \u4E0E\u56DE\u5FA9\u91CF: "Healing given",
  \u98DB\u884C\u6575\u306B\u5BFE\u3057\u3066\u653B\u6483: "ATK vs flying",
  \u5996\u602A\u306B\u5BFE\u3057\u3066\u653B\u6483: "ATK vs yokai",
  \u7279\u6B8A\u653B\u6483\u30B2\u30FC\u30B8\u84C4\u7A4D\u91CF: "Special gauge gain",
  \u7279\u6B8A\u653B\u6483\u30B2\u30FC\u30B8\u84C4\u7A4D\u901F\u5EA6: "Special gauge speed",
  \u6642\u9593: "Time",
  \u518D\u914D\u7F6E\u6642\u9593: "Redeploy time",
  \u8A08\u7565\u4F7F\u7528\u307E\u3067\u306E\u6642\u9593: "Time until stratagem",
  \u521D\u56DE\u8A08\u7565\u4F7F\u7528\u307E\u3067\u306E\u6642\u9593: "Time until first stratagem",
  \u81EA\u52D5\u5DE8\u5927\u5316\u6642\u9593: "Auto-giantify time",
  \u8A08\u7565\u518D\u4F7F\u7528\u6642\u9593: "Stratagem cooldown",
  // ki
  \u914D\u7F6E\u6C17: "Deploy Ki",
  \u5DE8\u5927\u5316\u6C17: "Giantify Ki",
  \u8A08\u7565\u6D88\u8CBB\u6C17: "Stratagem Ki cost",
  \u7372\u5F97\u6C17: "Ki gain",
  \u6483\u7834\u7372\u5F97\u6C17: "Ki per kill",
  \u64A4\u9000\u5927\u7834\u56DE\u5FA9\u6C17: "Ki refund on retreat/defeat",
  // outside battle
  \u7372\u5F97\u7D4C\u9A13\u5024: "EXP gain",
  \u5165\u624B\u91D1: "Gold gain",
  \u6240\u6301\u3057\u3066\u3044\u308B\u3060\u3051\u3067\u7372\u5F97\u91D1: "Gold gain (owned)",
  \u6240\u6301\u3057\u3066\u3044\u308B\u3060\u3051\u3067\u7372\u5F97\u6BBFEXP: "Lord EXP gain (owned)",
  // when
  \u653B\u6483\u3057\u305F\u6575: "on hit (the enemy it attacks)",
  \u5927\u9B54\u6CD5: "Great Magic",
  \u7279\u6B8A\u653B\u6483: "special attack",
  \u6575N\u4F53\u306B\u3064\u304D: "per enemy",
  \u98DB\u884C: "vs flying",
  \u6C34\u4E0A: "water",
  \u653B\u6483\u3059\u308B\u5EA6\u306B: "each attack",
  \u653B\u6483\u3092\u53D7\u3051\u308B\u5EA6\u306B: "each time attacked",
  \u6575\u3092\u6483\u7834\u3059\u308B\u5EA6\u306B: "each enemy defeated",
  \u5DE8\u5927\u5316\u3059\u308B\u5EA6\u306B: "per giantification",
  N\u79D2\u6BCE\u306B: "every few seconds",
  // who / where
  \u81EA\u8EAB: "self",
  \u81EA\u8EAB\u3068\u81EA\u8EAB\u306E\u4F0F\u5175: "self and own ambush units",
  \u515C\u5A18: "kabuto girls",
  \u8ECD\u8239\u57CE\u5A18: "warship castle girls",
  \u4F0F\u5175: "ambush units",
  \u90E8\u968A: "formation",
  \u6C34\u57CE: "water castles",
  \u5C71\u57CE: "mountain castles",
  \u57CE\u5A18: "castle girls",
  \u8FD1\u63A5\u57CE\u5A18: "melee castle girls",
  \u9060\u9694\u57CE\u5A18: "ranged castle girls",
  \u76FE\u57CE\u5A18: "shield castle girls",
  \u53CC\u5263\u57CE\u5A18: "dual-sword castle girls",
  \u5473\u65B9: "allies",
  \u6575: "enemies",
  \u98DB\u884C\u6575: "flying enemies",
  \u5996\u602A: "yokai",
  \u6D77\u6D0B\u515C: "ocean kabuto",
  \u8535: "storehouses",
  \u5C04\u7A0B\u5185: "in range",
  \u5168\u3066: "all",
  \u30C8\u30FC\u30AF\u30F3: "tokens",
  \u81EA\u8EAB\u306E\u30C8\u30FC\u30AF\u30F3: "own tokens",
  \u512A\u5148\u653B\u6483\u5BFE\u8C61: "Priority target (taunt)",
  \u653B\u6483\u5C5E\u6027: "Attack attribute",
  \u7121\u5C5E\u6027: "none",
  \u708E\u5C5E\u6027: "fire",
  \u6C37\u5C5E\u6027: "ice",
  \u6C34\u5C5E\u6027: "water",
  \u96F7\u5C5E\u6027: "thunder",
  \u571F\u5C5E\u6027: "earth",
  \u98A8\u5C5E\u6027: "wind",
  \u5149\u5C5E\u6027: "light",
  \u95C7\u5C5E\u6027: "dark",
  \u6BD2\u5C5E\u6027: "poison",
  \u5C5E\u60271: "attribute 1",
  \u5C5E\u60272: "attribute 2",
  \u5C5E\u60273: "attribute 3",
  \u56DE\u5FA9\u3092\u53D7\u3051\u3089\u308C\u306A\u3044: "Can't be healed",
  \u8DB3\u6B62\u3081\u5BFE\u8C61\u306B\u306A\u3089\u306A\u3044: "Can't be blocked",
  \u56DE\u5FA9\u304C\u30C0\u30E1\u30FC\u30B8\u306B\u5909\u5316: "Heals on it deal damage",
  \u653B\u6483\u3057\u306A\u3044: "Doesn't attack",
  "\u8A08\u7565\u6D88\u8CBB\u6C17%": "Stratagem Ki cost %",
  "\u4F0F\u5175(\u7A2E\u52251)": "ambush units (token type 1)",
  "\u821F(\u7A2E\u52254)": "boats (token type 4)",
  \u30C8\u30FC\u30AF\u30F3B: "test token B",
  \u30C8\u30FC\u30AF\u30F3C: "test token C",
  \u98DB\u884C\u4EE5\u5916\u306E\u6575: "non-flying enemies",
  "\u57CE\u5A18(\u81EA\u8EAB\u3092\u9664\u304F)": "castle girls except self",
  "\u8FD1\u63A5\u57CE\u5A18(\u81EA\u8EAB\u3092\u9664\u304F)": "melee castle girls except self",
  "\u9060\u9694\u57CE\u5A18(\u81EA\u8EAB\u3092\u9664\u304F)": "ranged castle girls except self",
  \u8FD1\u63A5\u306E\u307F\u306E\u57CE\u5A18: "melee-only castle girls",
  \u9060\u9694\u306E\u307F\u306E\u57CE\u5A18: "ranged-only castle girls",
  "\u8FD1\u63A5\u30FB\u9060\u9694\u4E21\u7528\u306E\u57CE\u5A18": "castle girls placeable on both"
};
var WEAPON_EN = {
  \u5200: "Sword",
  \u69CD: "Spear",
  \u69CC: "Hammer",
  \u5F13: "Bow",
  \u77F3\u5F13: "Crossbow",
  \u9244\u7832: "Gun",
  \u5927\u7832: "Cannon",
  \u6B4C\u821E: "Song & Dance",
  \u6CD5\u8853: "Magic",
  \u76FE: "Shield",
  \u9234: "Bell",
  \u6756: "Staff",
  \u62F3: "Fist",
  \u6295\u5263: "Throwing Blades",
  \u7953\u4E32: "Purification Wand",
  \u672C: "Book",
  \u97AD: "Whip",
  \u938C: "Scythe",
  \u6226\u68CD: "Mace",
  \u9663\u8C9D: "Conch Horn",
  \u53CC\u5263: "Dual Swords",
  \u8ECD\u8239: "Warship",
  \u30E9\u30F3\u30B9: "Lance",
  \u8336\u5668: "Tea Set",
  "\u30C8\u30FC\u30AF\u30F3\u6C4E\u7528[\u8FD1\u63A5]": "Token (melee)",
  "\u30C8\u30FC\u30AF\u30F3\u6C4E\u7528[\u9060\u9694]": "Token (ranged)",
  "\u30C8\u30FC\u30AF\u30F3\u6C4E\u7528[\u653B\u6483\u306A\u3057]": "Token (no attack)"
};
var REGION_EN = {
  \u5317\u6D77\u9053: "Hokkaido",
  \u6771\u5317: "Tohoku",
  \u95A2\u6771: "Kanto",
  \u7532\u4FE1\u8D8A: "Koshinetsu",
  \u5317\u9678: "Hokuriku",
  \u6771\u6D77: "Tokai",
  \u8FD1\u757F: "Kinki",
  \u4E2D\u56FD: "Chugoku",
  \u56DB\u56FD: "Shikoku",
  \u4E5D\u5DDE: "Kyushu",
  \u6C96\u7E04: "Okinawa",
  \u6D77\u5916: "Overseas",
  \u305D\u306E\u4ED6: "Other",
  \u7570\u754C: "Otherworld"
};
var TRAIT_EN = {
  \u590F: "Summer",
  \uFF8A\uFF9B\uFF73\uFF68\uFF9D: "Halloween",
  \u6B63\u6708: "New Year",
  \u7BC0\u5206: "Setsubun",
  \u7AEF\u5348: "Boys' Day",
  \u82B1\u5AC1\u8863\u88C5: "Bridal",
  \u8056\u591C: "Christmas",
  \uFF8A\uFF9E\uFF9A\uFF9D\uFF80\uFF72\uFF9D: "Valentine's",
  \u809D\u8A66\u3057: "Test of Courage",
  \u7D62\u721B: "Splendor",
  \u304A\u6708\u898B: "Moon Viewing",
  \u5B66\u5712: "School",
  \u5927\u5BB0\u5E9C\u3068\u53E4\u4EE3\u5C71\u57CE: "Dazaifu & Ancient Mountain Castles",
  \u30ED\u30EF\u30FC\u30EB\u6E13\u8C37: "Loire Valley",
  \u30A2\u30A4\u30A2\u30F3\u30EA\u30F3\u30B0: "Iron Ring",
  \u53E4\u4EE3\u57CE\u67F5: "Ancient Stockades",
  \u67B6\u7A7A\u57CE: "Fictional Castle",
  \u6C34\u4E0A\u914D\u7F6E: "Water Placement",
  \u57CE\u585E\u90FD\u5E02: "Fortified City",
  \u95A2\u6771\u4E03\u540D\u57CE: "Seven Famous Castles of Kanto",
  \u4F0A\u6771\u56DB\u5341\u516B\u57CE: "Ito's 48 Castles",
  \u4E2D\u56FD\u90FD\u57CE: "Chinese Capitals",
  \u5BAE\u6BBF: "Palace",
  \u7570\u4F1D: "Alternate Legend",
  \u30A2\u30A4\u30C9\u30EB: "Idol",
  \u5E7C\u304D: "Young",
  \u6E29\u6CC9: "Hot Spring",
  \u6E2F: "Port"
};
var CASTLE_EN = {
  \u5E73: "plain",
  \u5C71: "mountain",
  \u5E73\u5C71: "plain-mountain",
  \u6C34: "water",
  \u5730\u7344: "hell"
};
var ENEMY_EN = {
  \u515C: "Kabuto",
  \u5996\u602A: "Yokai",
  \u8D64\u5099\u3048\u515C: "Red-Armor Kabuto",
  \u52D5\u7269\u515C: "Animal Kabuto",
  \u6D77\u6D0B\u515C: "Ocean Kabuto",
  \u897F\u6D0B\u515C: "Western Kabuto",
  \u9B54\u7269: "Demon",
  \u6575\u57CE\u5A18: "Enemy Castle Girl",
  \u5927\u5C06\u515C: "Commander Kabuto",
  \u6575\u515C\u5A18: "Enemy Kabuto Girl",
  \u6B66\u795E: "War God",
  \u7126\u71B1\u5730\u7344: "Scorching Hell",
  \u6975\u5BD2\u5730\u7344: "Freezing Hell",
  \u7B49\u6D3B\u5730\u7344: "Reviving Hell",
  \u91DD\u5C71\u5730\u7344: "Needle Mountain Hell",
  \u7121\u9593\u5730\u7344: "Avici Hell"
};
function tagEN(jp) {
  const tr = (x) => TRAIT_EN[x] ?? CATEGORY_JP_EN[x] ?? REGION_EN[x] ?? WEAPON_EN[x] ?? ENEMY_EN[x];
  let m = /^\[(.+)\]城娘(.*)$/.exec(jp);
  if (m && tr(m[1])) return `${tr(m[1])} castle girls${suffixEN(m[2])}`;
  m = /^(.+?)城娘(.*)$/.exec(jp);
  if (m && (REGION_EN[m[1]] || WEAPON_EN[m[1]])) return `${REGION_EN[m[1]] ?? WEAPON_EN[m[1]]} castle girls${suffixEN(m[2])}`;
  m = /^★(\d)城娘(.*)$/.exec(jp);
  if (m) return `\u2605${m[1]} castle girls${suffixEN(m[2])}`;
  m = /^(.+)を含む城$/.exec(jp);
  if (m && CASTLE_EN[m[1]]) return `castles that include ${CASTLE_EN[m[1]]}`;
  m = /^(.+)城$/.exec(jp);
  if (m && CASTLE_EN[m[1]]) return `${CASTLE_EN[m[1]]} castles`;
  if (jp.includes("\u30FB")) {
    const parts = jp.split("\u30FB").map((p) => ENEMY_EN[p] ?? p);
    return parts.join(", ");
  }
  return ENEMY_EN[jp] ?? TRAIT_EN[jp];
}
var suffixEN = (s) => s === "(\u81EA\u8EAB\u3092\u9664\u304F)" ? " except self" : s;
var CATEGORY_JP_EN = {
  \u9B54\u6CD5\u5C11\u5973: "Magical Girl",
  \u5192\u967A\u8005: "Adventurer",
  \u9A0E\u58EB: "Knight",
  \u30E9\u30DC\u30E1\u30F3: "Lab Member",
  \u515C\u5A18: "Kabuto Girl",
  \u8D85\u9AD8\u6821\u7D1A: "Ultimate",
  \u5E0C\u671B\u30F6\u5CF0\u5B66\u5712: "Hope's Peak Academy",
  \u9B54\u5973: "Witch",
  JFW\u57FA\u5730: "JFW Base",
  \u30A2\u30A4\u30AE\u30B9\u6226\u58EB: "Aigis Warrior",
  \u30E2\u30F3\u30B9\u30BF\u30FC\u5A18: "Monster Girl",
  \u80FD\u529B\u8005: "Esper",
  \u9B54\u8853\u5E2B: "Magician",
  \u5B66\u5712\u90FD\u5E02: "Academy City",
  \u9032\u6483\u306E\u5DE8\u4EBA: "Attack on Titan",
  \uFF7C\uFF9E\uFF6C\uFF8A\uFF9E\uFF73\uFF6B\uFF6F\uFF78\u5CF6: "Jabberwock Island",
  \u57CE\u59EB: "Castle Princess",
  \u30F4\u30A1\u30A4\u30B9: "Weiss",
  GuP: "Girls und Panzer",
  "T\uFF0EO\uFF0EW\uFF0EE\uFF0ER\uFF0E": "T.O.W.E.R."
};

// src/effects.tsx
var loader = createJsonLoader({ urls: (n) => [`${import.meta.env.BASE_URL}data/${n}.json`] });
var STACKING = { 4: "stacks", 5: "stacks", 3: "stacks", 2: "doesn't stack" };
var FLAT_MAX_STATUS = /* @__PURE__ */ new Set([
  105,
  106,
  108,
  111,
  113,
  203,
  210,
  211,
  212,
  213,
  214,
  215,
  216,
  219,
  220,
  223,
  10107,
  10201,
  10206,
  10405,
  10452,
  10454
]);
var EFFECT_FLAGS = {
  PhysicalDamage: "physical",
  MagicDamage: "magic",
  TrueDamage: "true damage",
  MeleeAttack: "melee",
  RangedAttack: "ranged",
  AmbushAttack: "ambush units",
  AntiAir: "vs air",
  AntiSpecter: "vs specters",
  AntiDemon: "vs demons",
  IgnoreGiveDamage: "ignores damage-dealt modifiers",
  IgnoreTakeDamage: "ignores damage-taken modifiers",
  IgnoreAttackBonus: "ignores attack bonuses",
  IgnoreImmuneToDamageForEnemyGimmick: "ignores enemy damage immunity",
  MinDamage: "min damage"
};
function effectRow(table, row, v, modifierText, ccName = (cc) => `crowd control ${cc}`) {
  const on = Object.keys(EFFECT_FLAGS).filter((k) => row[k]).map((k) => EFFECT_FLAGS[k]);
  const ms = (k) => typeof row[k] === "number" ? row[k] / 1e3 : 0;
  const extra = [];
  if (ms("IntervalInMillis")) extra.push(`every ${ms("IntervalInMillis")}s`);
  if (row.CrowdControl) extra.push(`inflicts ${ccName(Number(row.CrowdControl))}${ms("CrowdControlDurationInMillis") ? ` for ${ms("CrowdControlDurationInMillis")}s` : ""}`);
  if (row.MissileID) extra.push(`missile #${row.MissileID}`);
  if (row.WeaponTypeTrigger) extra.push(`weapon type ${row.WeaponTypeTrigger}`);
  const tags = [...on, ...extra].join(", ");
  switch (table) {
    case "DealDamageEffect": {
      const own = row.DealDamageEffectType === 2;
      const base = {
        1: "ATK",
        3: own ? "own current HP" : "the target's current HP",
        4: own ? "own max HP" : "the target's max HP"
      };
      const vt = Number(row.ValueType);
      const amount = vt === 2 ? `${v}` : base[vt] ? `${fmt(v / 100)}\xD7 ${base[vt]}` : `${v} (value type ${vt})`;
      const kind = own ? "damage" : "independent damage";
      return `${kind} ${amount}${tags ? ` (${tags})` : ""}`;
    }
    case "OnTakeDamageEffect": {
      const flat = row.ValueType === 2;
      const from = tags ? ` (from ${tags})` : "";
      switch (row.OTDEffectType) {
        case 1:
          return `when attacked${from}: counter for ${flat ? v : `${v}% of own ATK`}`;
        case 2:
          return `when attacked${from}: ${flat ? v : `${v}% of the damage taken`}`;
        case 3:
          return `barrier${from}: blocks ${flat ? `up to ${v}` : `${v}%`} of the damage`;
        case 5:
          return `when attacked${from}: damage split into hits of ${v}`;
        case 6:
          return `damage taken${from} ${flat ? `\u2212${v}` : `\u2212${v}%`}`;
        case 7:
          return `damage taken${from} ${flat ? `+${v}` : `+${v}%`}`;
        case 8:
          return `damage aimed at them is taken by this unit instead${from}`;
        case 9:
          return `each hit${from} takes only 1 HP (value ${v})`;
        case 10:
          return `evades attacks${from}`;
        case 11:
          return `hits${from} of ${v} damage or less are nullified`;
      }
      return `when taking damage: effect type ${row.OTDEffectType} ${v} (value type ${row.ValueType}${tags ? `; from ${tags}` : ""})`;
    }
    case "OnGiveDamageEffect": {
      const unit = row.ValueType === 2 ? "" : "%";
      const on2 = tags ? ` (${tags})` : "";
      if (row.OGDEffectType === 1) return `damage dealt${on2} +${v}${unit}`;
      if (row.OGDEffectType === 2) return `damage dealt${on2} \u2212${v}${unit}`;
      return `when dealing damage: effect type ${row.OGDEffectType} ${v} (value type ${row.ValueType}${tags ? `; ${tags}` : ""})`;
    }
    case "ImmunityEffect":
      return `immune to ${modifierText(Number(row.StatusModifierID ?? 0), Number(row.ImmunityValue ?? 0))}` + (row.ConditionOperator ? ` (condition op${row.ConditionOperator} ${row.ConditionValue ?? 0})` : "");
  }
  return `${table} ${v}`;
}
var UNIT_EFFECT_TABLE = {
  3: "OnTakeDamageEffect",
  7: "ImmunityEffect",
  9: "DealDamageEffect"
};
var per = (what, d) => d > 1 ? `per ${d} ${what}` : `per ${what}`;
var CONDITION = {
  2: () => "per enemy in range",
  5: (d) => per("times this unit was knocked out (\u5927\u7834)", d),
  6: () => "per other castle girl in range",
  7: () => "per ally in range",
  9: (d) => `at giantification stage ${d}`,
  10: (d, trait) => `per ${trait(d)} unit in range`,
  11: (d) => `while blocking \u2265 ${d}`,
  12: (d) => `while blocking \u2264 ${d}`,
  14: (d) => per("knockouts (\u5927\u7834) in the formation", d),
  17: (d) => per("own ambush unit (\u4F0F\u5175) deployed", d),
  18: (d) => per("own ambush unit (\u4F0F\u5175) deployed", d)
};
var moveSpeed = (v) => v >= 99999 ? "instant (teleport)" : String(v);
var MOVE_MODE = {
  2: "moves in its stand pose",
  3: "walks",
  4: "walks with its \u6B69\u304D2 (walk2) motion",
  6: "moves in its stand pose",
  7: "walks",
  9: "moves in its \u7ACB\u30612 (stand2) pose"
};
var moveMode = (d) => d ? `, ${MOVE_MODE[d] ?? `move mode ${d}`}` : "";
var CLASS_ABILITY = {
  // FUN_0056c3c0 -> weapon attack strategy; values are the AttackStrategyID (攻撃方法) set: 101-106, 1101
  3: (v) => `attack method (\u653B\u6483\u65B9\u6CD5) \u2192 #${v}`,
  // FUN_00507960 -> visitor slot 0x58; values are BattleCharaTextureInfo ids ("…クラス特技モーション")
  6: (v) => `battle motion set \u2192 #${v} (its attack animation sets the hit count)`,
  // bit 3 of +0x88ac (FUN_00511250)
  9: (v, d) => `can move on water tiles (\u6C34\u4E0A), move speed ${moveSpeed(v)}${moveMode(d)}`,
  // bit 4 (FUN_00511190)
  12: (v, d) => `can move on all tiles, move speed ${moveSpeed(v)}${moveMode(d)}`,
  // FUN_0056c560: stand-motion slot 2 from motion variant v; v 9 = 立ち2 when the weapon has 立ち2モーションフラグ
  10: (v) => `stand motion \u2192 variant ${v}${v === 9 ? " (\u7ACB\u30612 / stand2)" : ""}`,
  // FUN_0056c330: attack-motion slot 1 from variant v; v 8 = 攻撃2 when the weapon has 攻撃2モーションフラグ
  11: (v) => `attack motion \u2192 variant ${v}${v === 8 ? " (\u653B\u64832 / attack2)" : ""}`,
  // bit 12 (FUN_00511480), tested with bit 3 by the placement checks FUN_00559d80 / FUN_00579d50
  13: () => "can be deployed on boat tiles (\u821F\u30DE\u30B9\u914D\u7F6E\u53EF\u80FD)",
  // FUN_0050fbd0 / FUN_0050fd20: attaches effect id v to the unit's sprite
  14: (v) => `visual effect #${v}`,
  15: (v) => `visual effect #${v}`,
  // bit 0 (FUN_005111f0)
  16: (v, d) => `can move on melee tiles (\u8FD1\u63A5\u30DE\u30B9), move speed ${moveSpeed(v)}${moveMode(d)}`,
  // bit 1 (FUN_00511220)
  17: (v, d) => `can move on ranged tiles (\u9060\u9694\u30DE\u30B9), move speed ${moveSpeed(v)}${moveMode(d)}`,
  // bit 2 (FUN_005111c0)
  18: (v, d) => `can move on melee and ranged tiles (\u9060\u8FD1\u30DE\u30B9), move speed ${moveSpeed(v)}${moveMode(d)}`,
  // +0x8918 / +0x891c / +0x8920; values n+1 / n / n+2 follow MovingAttack's 移動中 / 移動前 / 移動後 ids
  19: (v) => `walking motion (\u79FB\u52D5\u4E2D\u30E2\u30FC\u30B7\u30E7\u30F3) \u2192 #${v}`,
  20: (v) => `walk-start motion (\u79FB\u52D5\u524D\u30E2\u30FC\u30B7\u30E7\u30F3) \u2192 #${v}`,
  21: (v) => `walk-end motion (\u79FB\u52D5\u5F8C\u30E2\u30FC\u30B7\u30E7\u30F3) \u2192 #${v}`
};
function enchantTarget(t) {
  if (t === 100) return 12;
  if (t === 200) return 13;
  if (t > 100 && t < 200) return t + 200;
  if (t > 200 && t < 300) return t + 199;
  if (t > 400 && t < 500) return t + 200;
  if (t >= 1100 && t < 1110) return t + 4e3;
  return t;
}
var STEP_NOUN = {
  2: ["hit", "hits"],
  11: ["attack", "attacks"],
  12: ["time it is attacked", "times it is attacked"],
  13: ["kill", "kills"]
};
var fmt = (n) => String(Math.round(n * 1e3) / 1e3);
var cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function describeRow(r0, kind, defs2, link, base) {
  const used = /* @__PURE__ */ new Set();
  const r = { ...r0 };
  if (base && !r0.AbilityType) {
    r.AbilityType = base.AbilityType;
    if (base.AbilityTypeDetail) r.AbilityTypeDetail = base.AbilityTypeDetail;
    if (!r0.AbilityTargetType && !r0.AbilityAreaType) {
      if (base.AbilityTargetType) r.AbilityTargetType = base.AbilityTargetType;
      if (base.AbilityAreaType) r.AbilityAreaType = base.AbilityAreaType;
    }
  }
  const num = (k) => {
    used.add(k);
    return typeof r[k] === "number" ? r[k] : 0;
  };
  const evidence = [];
  const word = (key, fallback) => {
    const l = defs2.labels[key];
    if (!l) return fallback;
    if (l.src !== "exe" && l.src !== "item") evidence.push(`${key} = \u300C${l.jp}\u300D (${l.n}/${l.of} clauses${l.ex[0] ? `, e.g. ${l.ex[0]}` : ""})`);
    return JP_EN[l.jp] ?? tagEN(l.jp) ?? l.jp;
  };
  const amountFor = (key, v) => {
    const l = defs2.labels[key];
    const sign = l?.dir === "-" ? "\u2212" : l?.dir === "+" ? "+" : "";
    if (l?.unit === "\u500D" && l.form === "add") return `\xD7${fmt(1 + v / 100)}`;
    if (l?.unit === "\u500D" && l.form === "mul") return `\xD7${fmt(v / 100)}`;
    if (l?.unit === "%") return `${sign}${v}%`;
    if (l?.unit === "\u79D2") return `${sign}${l.form === "milli" ? fmt(v / 1e3) : v}s`;
    return `${sign}${v}`;
  };
  const modifier = (code, v) => {
    const d = defs2.smt[code];
    if (!d) return `modifier ${code} ${v}`;
    const [status, expr, vt, ref, refSender] = d;
    if (status === 201) {
      const names = [];
      for (let b = 1; b <= v; b <<= 1) if (v & b) names.push(defs2.labels[`flag:${b}`] ? word(`flag:${b}`, "") : `flag ${b}`);
      const how = expr === 4 ? "add" : expr === 5 ? "remove" : expr === 3 ? "set" : `expr${expr}`;
      return `attack properties (${how}): ${names.join(", ")}`;
    }
    const stat = word(`status:${status}`, `stat ${status}`);
    const kind2 = defs2.labels[`statuskind:${status}`]?.jp;
    if (kind2 === "bool") return expr === 3 ? `${stat}: ${v > 0 ? "on" : "off"}` : `${stat} ${expr === 2 ? "\u2212" : "+"}${v}`;
    if (kind2 === "bitmask") {
      const types = [];
      let rest = v;
      for (let b = 1; b <= v; b <<= 1) {
        const l = defs2.labels[`ccbit:${b}`];
        if (v & b && l) {
          types.push(l.jp);
          rest &= ~b;
        }
      }
      const weathers = [];
      let wrest = v;
      for (let b = 1; b <= v; b <<= 1) {
        const l = defs2.labels[`weatherbit:${b}`];
        if (v & b && l && status === 319) {
          weathers.push(l.jp);
          wrest &= ~b;
        }
      }
      if (status === 225) {
        const attrs = [];
        for (let b = 1; b <= v; b <<= 1) if (v & b) attrs.push(defs2.labels[`attrbit:${b}`] ? word(`attrbit:${b}`, "") : `bit ${b}`);
        return `${stat}${expr === 5 ? " removed" : expr === 3 ? " set to" : ""}: ${attrs.join(", ")}`;
      }
      if (status === 319 && v === 65535) return `${stat}: all weather`;
      if (weathers.length && !wrest) return `${stat}${expr === 5 ? " removed" : ""}: ${weathers.join(", ")}`;
      if (types.length && !rest) {
        const how = expr === 5 || expr === 2 ? "loses" : expr === 3 ? "set to" : "gains";
        return `${stat}: ${how} ${types.map((t) => JP_EN[t] ?? t).join(", ")}`;
      }
      return `${stat} ${expr === 3 ? "=" : expr === 5 || expr === 2 ? "clear" : "set"} bits 0x${v.toString(16)}`;
    }
    const w = defs2.labels[`smt:${code}`];
    const dir = expr === 1 || expr === 2 ? w?.dir ?? (expr === 1 ? "+" : "-") : "";
    const sign = dir === "+" ? "+" : dir === "-" ? "\u2212" : "";
    let amount;
    if (expr === 3) amount = `set to ${v}`;
    else if (w?.unit === "\u500D" && w.form === "add") amount = `\xD7${fmt(dir === "-" ? 1 - v / 100 : 1 + v / 100)}`;
    else if (w?.unit === "\u500D" && w.form === "mul") amount = `\xD7${fmt(v / 100)}`;
    else if (w?.unit === "\u79D2") amount = `${sign}${w.form === "milli" ? fmt(v / 1e3) : v}s`;
    else if (vt === 1) amount = `${sign}${v}`;
    else if (vt === 2 || vt === 4) amount = `${sign}${v}%`;
    else if (vt === 6) amount = `${sign}${v}% of ${refSender ? "the giver's " : ""}${word(`status:${ref}`, `stat ${ref}`)}`;
    else amount = `${sign}${v} (value type ${vt})`;
    const stack = vt === 1 && (expr === 1 || expr === 2) ? FLAT_MAX_STATUS.has(status) ? "doesn't stack" : "stacks" : expr === 1 || expr === 2 ? STACKING[vt] : void 0;
    return `${stat} ${amount}${stack ? `, ${stack}` : ""}`;
  };
  const ccName = (cc) => defs2.labels[`cc:${cc}`] ? word(`cc:${cc}`, "") : `crowd control ${cc}`;
  const unitEffect = (id, v) => {
    const ue = defs2.unit_effect[id];
    if (!ue) return null;
    const [type, actual] = ue;
    if (type === 1) return modifier(actual, v);
    const table = UNIT_EFFECT_TABLE[type];
    const row = table ? defs2.effect_tables?.[table]?.[actual] : void 0;
    if (row) return effectRow(table, row, v, modifier, ccName);
    return `unit effect type ${type} #${actual} ${v}`;
  };
  const who = (tg, ar) => {
    if (tg === 51) return "The castle girl named in the text";
    const t = tg ? word(`target:${tg}`, `target ${tg}`) : "";
    const aJp = ar ? defs2.labels[`area:${ar}`]?.jp : void 0;
    if (aJp === "\u81EA\u8EAB" || defs2.labels[`target:${tg}`]?.jp === "\u81EA\u8EAB") {
      if (aJp) word(`area:${ar}`, "");
      return "Self";
    }
    if (aJp) word(`area:${ar}`, "");
    if (defs2.labels[`target:${tg}`]?.jp.startsWith("\u81EA\u8EAB")) return cap(t);
    if (aJp === "\u5C04\u7A0B\u5185") return cap(`${t} in range`);
    if (aJp === "\u5168\u3066") return cap(`all ${t}`);
    return cap(t || (ar ? `area ${ar}` : ""));
  };
  const missile = (id) => {
    const mods = defs2.missiles[id] ?? [];
    const cc = defs2.missile_cc?.[id];
    const parts = mods.map(([code, v, ms]) => `${modifier(code, v)}${ms ? `, for ${fmt(ms / 1e3)}s` : ""}`);
    if (cc) parts.unshift(`inflicts ${ccName(cc[0])}${cc[1] ? ` (${fmt(cc[1] / 1e3)}s)` : ""}`);
    if (!parts.length) return `missile #${id}`;
    return `missile #${id}: ${parts.join("; ")}`;
  };
  const tail = () => {
    const parts = [];
    const KIND_TYPES = /* @__PURE__ */ new Set([1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 23]);
    const growing = kind === "ability" && r.AbilityTypeDetail === 3 && KIND_TYPES.has(Number(r.AbilityType)) && typeof r.LimitValue === "number" && r.LimitValue !== 0;
    if (growing) {
      const n = num("AbilityEffectDetail");
      const rev = num("EnableReverseEffect");
      const step = r.AbilityType === 19 ? n > 1 ? `every ${n}s` : "every second" : n > 1 ? `every ${n} ${STEP_NOUN[Number(r.AbilityType)]?.[1] ?? "triggers"}` : `each ${STEP_NOUN[Number(r.AbilityType)]?.[0] ?? "trigger"}`;
      parts.push(`${rev ? "shrinks" : "grows"} by that amount ${step}`);
    } else if (kind === "ability" && KIND_TYPES.has(Number(r.AbilityType)) && CONDITION[num("AbilityTypeDetail")]) {
      const c = CONDITION[num("AbilityTypeDetail")](num("AbilityEffectDetail"), (id) => word(`trait:${id}`, `trait ${id}`));
      if (c) parts.push(c);
    } else {
      const every = num("AbilityEffectDetail");
      if (every >= 1e3) parts.push(`every ${fmt(every / 1e3)}s`);
      else if (every && !(r.AbilityType === 6 && CLASS_ABILITY[Number(r.AbilityTypeDetail)])) used.delete("AbilityEffectDetail");
    }
    const loc = num("AbilityLocationType");
    if (loc && defs2.labels[`location:${loc}`]) parts.push(`when on ${word(`location:${loc}`, "")} tiles`);
    else if (loc) used.delete("AbilityLocationType");
    const ms = num("DurationInMillis") || num("EffectDuration");
    if (ms >= 100) parts.push(`for ${fmt(ms / 1e3)}s`);
    else if (ms) parts.push(`for ${ms}ms`);
    const p = num("ProbabilityOfActivation");
    if (p) parts.push(`${p}% chance`);
    const lim = num("LimitValue");
    if (lim) parts.push(`up to ${lim}`);
    if (num("GrowUpLimitOnly")) parts.push("only at max giantification (\u6700\u5927\u5316)");
    if (num("Growup")) parts.push("activates on giantification (\u5DE8\u5927\u5316\u6642\u767A\u52D5)");
    if (num("InvalidEachGrowUpCorrection")) parts.push("no giantification scaling (\u5909\u4F4D\u88DC\u6B63\u7121\u52B9)");
    if (!growing && num("EnableReverseEffect")) parts.push("reversible (\u53CD\u8EE2\u5316\u6709\u52B9)");
    num("Passive");
    return parts.length ? `, ${parts.join(", ")}` : "";
  };
  const text = [];
  if (kind === "ability") {
    const at = num("AbilityType"), atd = num("AbilityTypeDetail"), v = num("EffectValue");
    const smt = num("StatusModifierType");
    const subject = who(num("AbilityTargetType"), num("AbilityAreaType"));
    const trigKey = `trigger:${at}`;
    const typeKey = `abtype:${at}`;
    const trigger = at === 19 && atd === 3 ? "" : defs2.labels[trigKey] ? word(trigKey, "") : defs2.labels[typeKey] ? word(typeKey, "") : "";
    const lead = at === 2 && trigger && subject === "Self" ? "On hit, the enemy it attacks: " : trigger ? `${cap(trigger)}${subject ? `, ${subject.charAt(0).toLowerCase()}${subject.slice(1)}` : ""}: ` : subject ? `${subject}: ` : "";
    const perGrowUp = num("EachGrowUp") ? `, ${word("field:EachGrowUp", "per giantification")}` : "";
    if (at === 21 && link) {
      const f = link.field, m = link.missile;
      const parts = [];
      const dmg = typeof f.Param3 === "number" ? f.Param3 : 0;
      if (dmg) parts.push(`damage \xD7${fmt(dmg / 100)} ATK`);
      for (const i of [1, 2]) {
        const code = Number(m[`StatusModifierType${i}`] ?? 0), val = Number(m[`StatusEffectValue${i}`] ?? 0);
        const ms = Number(m[`DurationInMillis${i}`] ?? 0);
        if (code) parts.push(`${modifier(code, val)}${ms ? `, for ${fmt(ms / 1e3)}s` : ""}`);
      }
      text.push(`Field effect #${link.field_id}: ${parts.join("; ") || "(no decoded effect)"}${tail()}`);
    } else if (num("UnitEffectID") && defs2.unit_effect[num("UnitEffectID")]) {
      const id = num("UnitEffectID");
      const [type, actual] = defs2.unit_effect[id];
      if (type === 1) text.push(`${lead}${modifier(actual, v)}${perGrowUp}${tail()}`);
      else {
        const table = UNIT_EFFECT_TABLE[type];
        const row = table ? defs2.effect_tables?.[table]?.[actual] : void 0;
        if (!table) used.delete("UnitEffectID");
        const body = row ? effectRow(table, row, v, modifier, ccName) : table ? `${table} #${actual} ${v}` : `unit effect ${id} ${v}`;
        text.push(`${lead}${body}${tail()}`);
      }
    } else if (at === 6 && (atd === 2 || atd === 4)) {
      text.push(`${lead}${cap(missile(v))}${tail()}`);
    } else if (at === 9 && defs2.effect_tables?.DealDamageEffect?.[atd]) {
      const row = defs2.effect_tables.DealDamageEffect[atd];
      text.push(`${lead}${effectRow("DealDamageEffect", row, v, modifier, ccName)}${tail()}`);
    } else if (at === 3 && atd >= 1 && atd <= 11) {
      num("StatusModifierType");
      num("Effect");
      const vt = [4, 5, 9, 10, 11].includes(atd) ? 2 : 1;
      text.push(`${lead}${effectRow("OnTakeDamageEffect", { OTDEffectType: atd, ValueType: vt }, v, modifier, ccName)}${tail()}`);
    } else if (at === 6 && CLASS_ABILITY[atd]) {
      text.push(`${lead}${CLASS_ABILITY[atd](v, num("AbilityEffectDetail"))}${tail()}`);
    } else if (at === 5 && atd === 1) {
      word("abilitytype:5/1", "");
      text.push(`${lead}Natural Ki gain +${v}% (+${fmt(v / 100)} Ki per tick; a 2nd/3rd such unit counts \xBD/\xBC)${tail()}`);
    } else if (at === 5 && atd === 3) {
      const ms = num("DurationInMillis");
      text.push(`Ki +${v} every ${fmt(ms / 1e3)}s`);
    } else if (at === 22 && atd && defs2.attack_bonus[atd]) {
      const b = defs2.attack_bonus[atd];
      const stat = word(`status:${b.StatusType}`, `stat ${b.StatusType}`);
      const op = defs2.labels[`op:${b.ConditionOperator}`] ? word(`op:${b.ConditionOperator}`, "") : `op${b.ConditionOperator}`;
      text.push(`${lead}damage \xD7${fmt(v / 100)} against enemies with ${stat} ${op} ${b.ConditionValue}${tail()}`);
    } else if (smt) {
      const how = at > 1 && !trigger && at !== 22 && !(at === 19 && atd === 3) ? ` (ability type ${at}${atd ? `/${atd}` : ""})` : "";
      text.push(`${lead}${modifier(smt, v)}${perGrowUp}${tail()}${how}`);
    } else {
      const key = `abilitytype:${at}/${atd}`;
      text.push(`${lead}${word(key, `ability type ${at}/${atd}`)} ${amountFor(key, v)}${perGrowUp}${tail()}`);
    }
  } else if (kind === "organized" || kind === "always" || kind === "quest" || kind === "potential") {
    const et = num("EffectType"), v = num("EffectValue"), key = `effecttype:${et}`;
    let lead = "";
    if (kind === "organized") {
      const tg = num("TargetType"), ar = num("AreaType");
      const t = tg ? word(`otarget:${tg}`, `target ${tg}`) : "";
      const aJp = ar ? defs2.labels[`oarea:${ar}`]?.jp : void 0;
      if (aJp) word(`oarea:${ar}`, "");
      const subject = aJp === "\u90E8\u968A" ? `${t} in the formation` : aJp === "\u5168\u3066" ? `all ${t}` : t || (ar ? `area ${ar}` : "");
      if (subject) lead = `${cap(subject)}: `;
      if (!et && !v) {
        text.push("No formation effect of its own (its effects are the quest-only rows)");
        return finish();
      }
    }
    if (kind === "quest") {
      const qt = num("QuestType");
      const ex = defs2.quest_types?.[qt];
      const subject = who(num("AbilityTargetType"), num("AbilityAreaType"));
      lead = `In quest type ${qt}${ex?.length ? ` (${ex.join(", ")}\u2026)` : ""}${subject ? `, ${subject.charAt(0).toLowerCase()}${subject.slice(1)}` : ""}: `;
      num("Passive");
    }
    const resolved = unitEffect(et, v);
    text.push(`${lead}${resolved ?? `${word(key, `effect ${et}`)} ${amountFor(key, v)}`}${tail()}`);
  } else if (kind === "enchant") {
    const secs = num("DurationInSeconds");
    const dur = secs ? `, for ${fmt(secs)}s` : "";
    const tt = num("TargetType");
    const ally = defs2.labels[`etarget:${tt}`]?.jp === "\u81EA\u5206\u306E\u307F" ? (word(`etarget:${tt}`, ""), "Self") : "Target";
    for (const i of [1, 2, 3]) {
      const code = num(`AllyModifierType${i}`), v = num(`AllyEffectValue${i}`);
      if (code) text.push(`${ally}: ${modifier(code, v)}${dur}`);
    }
    for (const f of ["MissileID", "SpreadMissileID", "ShotMissileID"]) {
      const id = num(f);
      if (id) text.push(`${ally}: ${missile(id)}`);
    }
    const bq = num("BarrierQuantity");
    if (bq) text.push(`${ally}: barrier (\u30D0\u30EA\u30A2) blocks up to ${bq} damage${dur}`);
    if (num("DistributeDamage")) text.push(`${ally}: damage taken is split among all deployed castle girls (\u30C0\u30E1\u30FC\u30B8\u5206\u6563)${dur}`);
    if (num("ActivateAbility")) text.push(`${ally}: its skill (\u7279\u6280) activates (\u7279\u6280\u767A\u52D5)`);
    if (num("TransformDisabled")) text.push(`${ally}: unit change disabled (\u30E6\u30CB\u30C3\u30C8\u5909\u66F4\u7121\u52B9)`);
    const sa = num("SpecialAttackID");
    if (sa) text.push(`${ally}: uses special attack #${sa} (\u7279\u6B8A\u653B\u6483ID)`);
    const ohd = num("OnHitEffectDuration");
    if (ohd) text.push(`on-hit effects last ${fmt(ohd / 1e3)}s (\u7740\u5F3E\u52B9\u679C\u6642\u9593)`);
    const ts = num("TargetSet");
    if (ts) {
      const codes = defs2.target_sets?.[ts] ?? [];
      const names = codes.map((t) => word(`target:${enchantTarget(t)}`, `target ${t}`));
      text.push(`Can target (\u767A\u52D5\u5BFE\u8C61): ${names.length ? names.join(", ") : `set #${ts}`}`);
    }
    if (num("SpecialAttackingInvalidActivate")) text.push("Can't be used during a special attack");
    num("AllyEffectSetID");
    num("OpponentEffectSetID");
    if (num("TransformEnabled") || num("TransformEnabledCT")) text.push(`${ally}: transforms${dur}`);
    const oa = num("OpponentAreaType");
    const enemies = defs2.labels[`oparea:${oa}`] ? `Enemies ${word(`oparea:${oa}`, "")}` : "Enemies";
    if (oa && !defs2.labels[`oparea:${oa}`]) used.delete("OpponentAreaType");
    for (const i of [1, 2, 3]) {
      const code = num(`OpponentModifierType${i}`), v = num(`OpponentEffectValue${i}`);
      if (code) text.push(`${enemies}: ${modifier(code, v)}${dur}`);
    }
    const red = num("TakeDamageReductionRate");
    if (red) text.push(`${ally}: damage taken \u2212${red}%${dur}`);
    if (!text.length && secs && (r.AllyEffectSetID || r.OpponentEffectSetID)) text.push(`Lasts ${fmt(secs)}s; effects listed below`);
  } else if (kind === "enchant_set") {
    const et = num("EnchantEffectType"), v = num("EffectValue"), key = `enchanttype:${et}`;
    const st = num("EffectTargetType"), sa = num("EffectAreaType");
    const area = defs2.labels[`sarea:${sa}`]?.jp;
    if (area) word(`sarea:${sa}`, "");
    const t = defs2.labels[`starget:${st}`] ? word(`starget:${st}`, "") : "";
    let subject = "";
    if (area === "\u5BFE\u8C61" && (!t || t === "\u5BFE\u8C61")) subject = "Target";
    else if (area === "\u5BFE\u8C61\u306E\u5C04\u7A0B\u5185") subject = `${t && t !== "\u5BFE\u8C61" ? t : "units"} in the target's range`;
    else if (t) subject = t;
    else subject = `target ${st}${sa ? `, area ${sa}` : ""}`;
    const dt = num("EffectDetailType"), dv = num("EffectDetailValue");
    let per2 = "";
    if (dt === 3 && num("LimitValue")) {
      per2 = `, grows by that amount ${dv > 1 ? `every ${dv} triggers (seconds when timed)` : "each trigger"}`;
    } else if (CONDITION[dt]) {
      const c = CONDITION[dt](dv, (id) => word(`trait:${id}`, `trait ${id}`));
      per2 = c ? `, ${c}` : "";
    } else if (dt && defs2.labels[`setdetail:${dt}`]) per2 = `, ${word(`setdetail:${dt}`, "")}`;
    else if (dt) {
      used.delete("EffectDetailType");
      used.delete("EffectDetailValue");
    }
    const resolved = unitEffect(et, v);
    text.push(`${cap(subject)}: ${resolved ?? `${word(key, `effect ${et}`)} ${amountFor(key, v)}`}${per2}${tail()}`);
  }
  return finish();
  function finish() {
    const rest = {};
    for (const [k, v] of Object.entries(r0)) if (!used.has(k)) rest[k] = v;
    return { text, evidence, rest };
  }
}

// scripts/peekg.ts
var defs = JSON.parse(fs.readFileSync("public/data/effects.json", "utf-8"));
var want = new Set(process.argv.slice(2).map(Number));
for (const f of fs.readdirSync("public/data/unit")) {
  const u = JSON.parse(fs.readFileSync(`public/data/unit/${f}`, "utf-8"));
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (want.has(o.id) && o.effect?.row) {
      want.delete(o.id);
      console.log(o.id, o.name, "|", describeRow(o.effect.row, "enchant", defs).text.join(" \xB7 "), "|", (o.description ?? "").replace(/\n/g, ""));
    }
    Object.values(o).forEach(walk);
  };
  walk(u);
}
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
