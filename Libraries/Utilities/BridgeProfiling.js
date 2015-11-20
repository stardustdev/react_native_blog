/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule BridgeProfiling
 * @flow
 */
'use strict';

var GLOBAL = GLOBAL || this;
var TRACE_TAG_REACT_APPS = 1 << 17;

var _enabled;
var _ReactPerf = null;
function ReactPerf() {
  if (!_ReactPerf) {
    _ReactPerf = require('ReactPerf');
  }
  return _ReactPerf;
}

var BridgeProfiling = {
  setEnabled(enabled: boolean) {
    _enabled = enabled;

    ReactPerf().enableMeasure = enabled;
  },

  profile(profileName?: any) {
    if (_enabled) {
      profileName = typeof profileName === 'function' ?
        profileName() : profileName;
      global.nativeTraceBeginSection(TRACE_TAG_REACT_APPS, profileName);
    }
  },

  profileEnd() {
    if (_enabled) {
      global.nativeTraceEndSection(TRACE_TAG_REACT_APPS);
    }
  },

  reactPerfMeasure(objName: string, fnName: string, func: any): any {
    return function (component) {
      if (!_enabled) {
        return func.apply(this, arguments);
      }

      var name = objName === 'ReactCompositeComponent' && this.getName() || '';
      BridgeProfiling.profile(`${objName}.${fnName}(${name})`);
      var ret = func.apply(this, arguments);
      BridgeProfiling.profileEnd();
      return ret;
    };
  },

  swizzleReactPerf() {
    ReactPerf().injection.injectMeasure(BridgeProfiling.reactPerfMeasure);
  },

  attachToRelayProfiler() {
    // We don't want to create a dependency on `RelayProfiler`, so that's why
    // we require it indirectly (rather than using a literal string). Since
    // there's no guarantee that the module will be present, we must wrap
    // everything in a try-catch block as requiring a non-existing module
    // will just throw.
    try {
      var rpName = 'RelayProfiler';
      var RelayProfiler = require(rpName);
      RelayProfiler.attachProfileHandler('*', (name) => {
        BridgeProfiling.profile(name);
        return () => {
          BridgeProfiling.profileEnd();
        };
      });
    } catch(err) {}
  }
};

BridgeProfiling.setEnabled(global.__RCTProfileIsProfiling || false);

module.exports = BridgeProfiling;
