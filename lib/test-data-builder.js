var extend = require('util')._extend;
var async = require('async');
var _ = require('underscore');
var Q = require('q');
var fixtures;


module.exports = exports = TestDataBuilder;

TestDataBuilder.setfixtures = function(fx){
  fixtures = fx;
}

/**
 * Build many Model instances in one async call.
 *
 * Usage:
 * ```js
 * // The context object to hold the created models.
 * // You can use `this` in mocha test instead.
 * var context = {};
 *
 * var ref = TestDataBuilder.ref;
 * new TestDataBuilder()
 *   .define('application', Application, {
 *     pushSettings: { stub: { } }
 *   })
 *   .define('device', Device, {
 *      appId: ref('application.id'),
 *      deviceType: 'android'
 *   })
 *   .define('notification', Notification)
 *   .buildTo(context, function(err) {
 *     // test models are available as
 *     //   context.application
 *     //   context.device
 *     //   context.notification
 *   });
 * ```
 * @constructor
 */
function TestDataBuilder() {
  this._definitions = [];
  this.afterBuild = [];
}

function getProperties(name, fixtureGroup, _data, options){
  var rawDef, me = this;
  if(typeof(_data) ==='string'){
    rawData = fixtures[fixtureGroup][_data] || {};
  } else {
    rawData = _data;
  }
  if(options){
    _.extend(rawData, options);
  }
  var properties = _.keys(fixtures.map[fixtureGroup].definition.properties)
  var data = _.pick(rawData, properties);
  var refs = _.omit(rawData,properties);
  _.each(refs, function(val, key){
    if(_.isUndefined(val.value)){
      setHasMany.call(me, val, key, name, fixtureGroup);
    } else {
      setBelongsTo.call(me, data, val, key, fixtureGroup);
    }
  });
  return data;
}

function setBelongsTo(data, val, key, fixtureGroup){
  var fk = val['_fk_'];
  delete val['_fk_'];
  if(_.isUndefined(fk)){
    fk= {"Id": "id"}; //default value
  }
  var idx = _.keys(fk)[0];
  var newKey = key+idx;
  if(_.isUndefined(data[newKey])){
    data[newKey] = new Reference(key+"."+fk[idx]);
    var result =  isFixtureDefined.call(this, val.fixture, key);
    if(result.length === 0){
      this.define(key, val.fixture, val.value);
    }
  }
}

function isFixtureDefined(group, name){
  return _.where(this._definitions, {
    name: name,
    fixture: group
  });
}

function getDefinedkeys(){
  return _.map(this._definitions, function(def){ return def.name; });
}

function sanitizeContext(callback){
  _.each(getDefinedkeys.call(this), function(name){
    delete this._context[name];
  }, this);
  callback()
}

function setHasMany(val, key, name, parentModel){
  //set defaults value if missing
  val.postfix = val.postfix || "Id"; 
  val.foreignKeyAttribute = val.foreignKeyAttribute || "id"; 
  var me = this
    , options = {};

  options[key+val.postfix]= TestDataBuilder.ref([name, val.foreignKeyAttribute].join('.'));
  options[key+"Type"] = fixtures.map[parentModel].modelName;

  _.each(val.items, function(quantity, item){
    if(typeof(quantity)=== 'number'){
      for (var i=0; i< quantity; i++){
        me.afterBuild.push([val.fixture, val.fixture, item, options]);
      }
    } else {
      var data = _.extend(quantity.data, options);
      for(var i=0; i< quantity.quantity; i++){
        me.afterBuild.push([val.fixture, fixtures.map[val.fixture], data]);
      }
    }
  });
}

function buildHasManyRelated(){
  for(var i=0; i<this.afterBuild.length; i++){
    var args = this.afterBuild[i];
    if(args){
      this.define.apply(this, args);
      this.afterBuild[i]=null;
    }
  }
}

/**
 * Define a new model instance.
 * @param {string} name Name of the instance.
 *   `buildTo()` will save the instance created as context[name].
 * @param {string} Fixtures group name.
 * @param {string} fixture key
 *   Properties to set in the object.
 *   Intelligent default values are supplied by the builder
 *   for required properties not listed.
 * @return TestDataBuilder (fluent interface)
 */
TestDataBuilder.prototype.define = function(name, fixtureGroup, data, options) {
  if(typeof fixtureGroup === 'string'){
    this._definitions.push({
      name: name,
      model: fixtures.map[fixtureGroup],
      fixture: fixtureGroup,
      properties: getProperties.call(this, name, fixtureGroup, data, options)
    });
  } else {
    this._definitions.push({
      name: name,
      model: fixtureGroup,
      properties: data
    });    
  }
  return this;
};

/**
 * Define a list of new model instance.
 * @param {string} name Name of the instance.
 *   `buildTo()` will save the instance created as context[name].
 * @param {number} number of instances to create.
 * @param {string} Fixtures group name.
 * @param {string} fixture key
 *   Properties to set in the object.
 *   Intelligent default values are supplied by the builder
 *   for required properties not listed.
 * @return TestDataBuilder (fluent interface)
 */
TestDataBuilder.prototype.defineList = function(name, quantity, fixtureGroup, data, options) {
  for(var i=0; i< quantity; i++){
    this.afterBuild.push([name, fixtureGroup, data, options])
  }
  return this;
};

/**
 * Reference the value of a property from a model instance defined before.
 * @param {string} path Generally in the form '{name}.{property}', where {name}
 * is the name passed to `define()` and {property} is the name of
 * the property to use.
 */
TestDataBuilder.ref = function(path) {
  return new Reference(path);
};

/**
 * Asynchronously build all models defined via `define()` and save them in
 * the supplied context object.
 * @param {Object.<string, Object>} context The context to object to populate.
 * @param {function(Error)} callback Callback.
 */
TestDataBuilder.prototype.buildTo = function(context, callback) {
  buildHasManyRelated.call(this);
  var me=this;
  this._context = context;
  sanitizeContext.call(this, function(){
    async.eachSeries(
      me._definitions,
      me._buildObject.bind(me),
      callback);
  });
};

/**
* Promised version of buildTo
*/
TestDataBuilder.prototype.qBuildTo = function(context){
  var deferred = Q.defer();
  this.buildTo(context, function(err){
    if(err) return deferred.reject(err);
    deferred.resolve(context);
  });
  return deferred.promise;
}


TestDataBuilder.prototype._buildObject = function(definition, callback) {
  var defaultValues = this._gatherDefaultPropertyValues(definition.model);
  var values = extend(defaultValues, definition.properties || {});
  var resolvedValues = this._resolveValues(values);

  definition.model.create(resolvedValues, function(err, result) {
    if (err) {
      console.error(
        'Cannot build object %j - %s\nDetails: %j',
        definition,
        err.message,
        err.details);
    } else {
      if(_.isUndefined(this._context[definition.name])){
        this._context[definition.name] = result;
      } else {
        if(!_.isArray(this._context[definition.name])){
          this._context[definition.name] = [this._context[definition.name]];
        }
        this._context[definition.name].push(result);
      }
    }
    callback(err);
  }.bind(this));
};

TestDataBuilder.prototype._resolveValues = function(values) {
  var result = {};
  for (var key in values) {
    var val = values[key];
    if (val instanceof Reference) {
      val = values[key].resolveFromContext(this._context);
    }
    result[key] = val;
  }
  return result;
};

var valueCounter = 0;
TestDataBuilder.prototype._gatherDefaultPropertyValues = function(Model) {
  var result = {};
  Model.forEachProperty(function createDefaultPropertyValue(name) {
    var prop = Model.definition.properties[name];
    if (!prop.required) return;
    if(typeof(prop.default) !== 'undefined'){
      result[name]=prop.default;
      return;
    }

    switch (prop.type) {
      case String:
        var generatedString = 'a test ' + name + ' #' + (++valueCounter);

        // If this property has a maximum length, ensure that the generated
        // string is not longer than the property's max length
        if (prop.length) {
          // Chop off the front part of the string so it is equal to the length
          generatedString = generatedString.substring(
            generatedString.length - prop.length);
        }
        result[name] = generatedString;
        break;
      case Number:
        result[name] = 1230000 + (++valueCounter);
        break;
      case Date:
        result[name] = new Date(
          2222, 12, 12, // yyyy, mm, dd
          12, 12, 12,   // hh, MM, ss
          ++valueCounter // milliseconds
        );
        break;
      case Boolean:
        // There isn't much choice here, is it?
        // Let's use "false" to encourage users to be explicit when they
        // require "true" to turn some flag/behaviour on
        result[name] = false;
        break;
      // TODO: support nested structures - array, object
    }
  });
  return result;
};

/**
 * Placeholder for values that will be resolved during build.
 * @param path
 * @constructor
 * @private
 */
function Reference(path) {
  this._path = path;
}

Reference.prototype.resolveFromContext = function(context) {
  var elements = this._path.split('.');

  var result = elements.reduce(
    function(obj, prop) {
      return obj[prop];
    },
    context
  );

  return result;
};
