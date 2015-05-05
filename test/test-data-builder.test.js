var loopback = require('loopback');
var TestDataBuilder = require('../lib/test-data-builder');
var expect = require('chai').expect;
var moment = require('moment');
var fixtures = require('../lib/fixtures');

describe('TestDataBuilder', function() {
  var db;
  var TestModel;

  beforeEach(function() {
    db = loopback.createDataSource({ connector: loopback.Memory });
  });

  it('builds a model', function(done) {
    givenTestModel({ value: String });

    new TestDataBuilder()
      .define('model', TestModel, { value: 'a-string-value' })
      .buildTo(this, function(err) {
        if (err) return done(err);
        expect(this.model).to.have.property('value', 'a-string-value');
        done();
      }.bind(this));
  });

  // Parameterized test
  function itAutoFillsRequiredPropertiesWithUniqueValuesFor(type) {
    it(
      'auto-fills required ' + type + ' properties with unique values',
      function(done) {
        givenTestModel({
          required1: { type: type, required: true },
          required2: { type: type, required: true }
        });

        new TestDataBuilder()
          .define('model', TestModel, {})
          .buildTo(this, function(err) {
            if (err) return done(err);
            expect(this.model.required1).to.not.equal(this.model.required2);
            expect(this.model.optional).to.satisfy(notSet);
            done();
          }.bind(this));
      }
    );
  }

  // Parameterized test
  function itAutoFillsRequiredPropertiesWithDefaultValuesFor(type, value) {
    it(
      'auto-fills required ' + type + ' properties with defaults values',
      function(done) {
        givenTestModel({
          required: { type: type, required: true, default: value }
        });

        new TestDataBuilder()
          .define('model', TestModel, {})
          .buildTo(this, function(err) {
            if (err) return done(err);
            expect(this.model.required).to.equal(value);
            done();
          }.bind(this));
      }
    );
  }

  itAutoFillsRequiredPropertiesWithDefaultValuesFor(String, "defaut Value");
  itAutoFillsRequiredPropertiesWithDefaultValuesFor(Number, 0);
  itAutoFillsRequiredPropertiesWithDefaultValuesFor(Number, 10);
  itAutoFillsRequiredPropertiesWithUniqueValuesFor(String);
  itAutoFillsRequiredPropertiesWithUniqueValuesFor(Number);
  itAutoFillsRequiredPropertiesWithUniqueValuesFor(Date);

  it('limits the length of the generated string value to the property length', function(done) {
    var testMaxStringLength = 10;
    givenTestModel({
      required1: { type: String, required: true },
      required2: { type: String, required: true, length: testMaxStringLength }
    });

    new TestDataBuilder()
      .define('model', TestModel, {})
      .buildTo(this, function(err) {
        if (err) return done(err);
        expect(this.model.required1).to.not.equal(this.model.required2);
        expect(this.model.required2).to.have.length.of.at.most(testMaxStringLength);
        done();
      }.bind(this));
  });

  it('auto-fills required Boolean properties with false', function(done) {
    givenTestModel({
      required: { type: Boolean, required: true }
    });

    new TestDataBuilder()
      .define('model', TestModel, {})
      .buildTo(this, function(err) {
        if (err) return done(err);
        expect(this.model.required).to.equal(false);
        done();
      }.bind(this));
  });

  it('does not fill optional properties', function(done) {
    givenTestModel({
      optional: { type: String, required: false }
    });

    new TestDataBuilder()
      .define('model', TestModel, {})
      .buildTo(this, function(err) {
        if (err) return done(err);
        expect(this.model.optional).to.satisfy(notSet);
        done();
      }.bind(this));
  });

  it('resolves references', function(done) {
    var Parent = givenModel('Parent', { name: { type: String, required: true } });
    var Child = givenModel('Child', { parentName: String });

    new TestDataBuilder()
      .define('parent', Parent)
      .define('child', Child, {
        parentName: TestDataBuilder.ref('parent.name')
      })
      .buildTo(this, function(err) {
        if(err) return done(err);
        expect(this.child.parentName).to.equal(this.parent.name);
        done();
      }.bind(this));
  });

  it('creates from fixture', function(done) {
    var Device = givenModel('Device', { 
      type: { type: String, required: true },
      model: { type: String, required: true } 
    }, 'devices');
    new TestDataBuilder()
      .define('device', 'devices', 'dev1')
      .buildTo(this, function(err) {
        if(err) return done(err);
        expect(this.device.name).to.equal(fixtures.devices.dev1.name);
        expect(this.device.model).to.equal(fixtures.devices.dev1.model);
        done();
      }.bind(this));
  });

  it('manage relations', function(done) {
    createModels();
    var options = {timeout: 100000};
    var ctx={};
    new TestDataBuilder()
      .define('cart', 'carts', 'anoncart', options) //options is optional
      .buildTo(ctx, function(err) {
        if(err) return done(err);
        expect(ctx.cart.session).to.equal(fixtures.carts.usercart.session);
        expect(ctx.devices.length).to.equal(3);
        done();
      }.bind(this));
  });

  it('manage indirect relations', function(done) {
    createModels();
    var ctx={};
    new TestDataBuilder()
      .define('payment', 'payments', 'pm1')
      .buildTo(ctx, function(err) {
        if(err) return done(err);
        expect(ctx.payment.cartId).to.equal(ctx.cart.id);
        expect(ctx.devices.length).to.equal(3);
        expect(moment(ctx.payment.date).isSame(moment(), 'date'));
        done();
      }.bind(this));
  });


  it('create a list of devices', function(done) {
    var Device = givenModel('Device', { 
      type: { type: String, required: true },
      model: { type: String, required: true } 
    }, 'devices');
    var ctx={};
    new TestDataBuilder()
      .defineList('devices', 3, Device)
      .buildTo(ctx, function(err) {
        if(err) return done(err);
        expect(ctx.devices.length).to.equal(3);
        done();
      }.bind(this));
  });

  it('create a list of devices from fixtures', function(done) {
    var Device = givenModel('Device', { 
      type: { type: String, required: true },
      model: { type: String, required: true } 
    }, 'devices');
    var ctx={};
    new TestDataBuilder()
      .defineList('devices', 4, 'devices', 'generic')
      .buildTo(ctx, function(err) {
        if(err) return done(err);
        expect(ctx.devices.length).to.equal(4);
        done();
      }.bind(this));
  });

  function createModels(){
    var Device = givenModel('Device', { 
      type: { type: String, required: true },
      model: { type: String, required: true },
      cartId: { type: Number} 
    }, 'devices');
    var User = givenModel('User', { 
      name: { type: String, required: true }
    }, 'users');
    var Cart = givenModel('Cart', { 
      session: { type: String, required: true },
      userId: { type: Number, required: true },
      timeout: { type: Number}
    }, 'carts');    
    var Payment = givenModel('Payment', { 
      cardNumber: { type: String, required: true },
      cartId: { type: Number, required: true },
      date: {type: Date },
      amount: { type: Number, required: true }
    }, 'payments');    
  }

  function givenTestModel(properties) {
    TestModel = givenModel('TestModel', properties);
  }

  function givenModel(name, properties, mapping) {
    var ModelCtor = loopback.createModel(name, properties);
    ModelCtor.attachTo(db);
    if(mapping){
      fixtures.map[mapping]=ModelCtor;
    }
    return ModelCtor;
  }

  function notSet(value) {
    // workaround for `expect().to.exist` that triggers a JSHint error
    // (a no-op statement discarding the property value)
    return value === undefined || value === null;
  }
});
