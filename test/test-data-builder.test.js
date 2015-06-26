var loopback = require('loopback');
var TestDataBuilder = require('../lib/test-data-builder');
var expect = require('chai').expect;
var moment = require('moment');
var fixtures = require('./fixtures');
TestDataBuilder.setfixtures(fixtures);

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

  it('builds a model with promise', function(done) {
    givenTestModel({ value: String });

    var context = {}
    new TestDataBuilder()
      .define('model', TestModel, { value: 'a-string-value' })
      .qBuildTo(context)
      .then(function(context){
        expect(context.model).to.have.property('value', 'a-string-value');
        done();
      })
      .then(null, function(err){ done(err) });
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
  function itFillsRequiredPropertiesWithSpecificValuesFor(type, value, property) {
    it(
      'fills required ' + type + ' properties with specified values',
      function(done) {
        givenTestModel({
          required: { type: type, required: true, default: value }
        });

        new TestDataBuilder()
          .define('model', TestModel, {required: property})
          .buildTo(this, function(err) {
            if (err) return done(err);
            expect(this.model.required).to.equal(property);
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

  itFillsRequiredPropertiesWithSpecificValuesFor(String, "default val", "My new value");
  itFillsRequiredPropertiesWithSpecificValuesFor(Object, {val: "My Val"}, {obj: "My new object"});

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

  it('manage relations name collusion', function(done) {
    createModels();
    var ctx={};
    new TestDataBuilder()
      .define('payment1', 'payments', 'pm1')
      .define('payment2', 'payments', 'pm2')
      .buildTo(ctx, function(err) {
        if(err) return done(err);
        console.log('ctx = ',ctx)
        expect(ctx.payment1.cartId).to.not.equal(ctx.payment2.cartId);
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

  it('manages inline fixtures creation', function(done) {
    var inline = fixtures.carts.inline;
    createModels();   
    var ctx={};
    new TestDataBuilder()
      .define('cart', 'carts', 'inline')
      .buildTo(ctx, function(err) {
        if(err) return done(err);
        expect(ctx.user.name).to.equal(inline.user.value.name);
        expect(ctx.books).to.exist;
        done();
      }.bind(this));
  });

  it('manages polymorphic relations', function(done) {
    createModels();   
    var ctx={};
    new TestDataBuilder()
      .define('book', 'books', 'book1')
      .buildTo(ctx, function(err) {
        if(err) return done(err);
        expect(ctx.comments.length).to.equal(2);
        for(var i=0; i< ctx.comments.length; i++){
          var comment = ctx.comments[i];
          expect(comment.subjectId).to.equal(ctx.book.id);
          expect(comment.subjectType).to.equal('Book');
        }
        done();
      }.bind(this));
  });

  function createModels(){
    var Device = givenModel('Device', { 
      type: { type: String, required: true },
      model: { type: String, required: true }
    }, {
      relations: {
        comments: {
          type: "hasMany",
          model: "Comment",
          polymorphic: {
            as: "subject"
          }
        },
        cart: {
          type: "belongsTo",
          model: "Cart"
        }
      }
    }, 'devices');
    var User = givenModel('User', { 
      name: { type: String, required: true }
    },'users');
    var Cart = givenModel('Cart', { 
      session: { type: String, required: true },
      timeout: { type: Number}
    },{
      relations: {
        user: {
          type: "belongsTo",
          model: "User"
        }
      }
    }, 'carts');    
    var Book = givenModel('Book', { 
      title: { type: String, required: true },
      author: { type: String, required: true }
    }, {
      relations: {
        user: {
          type: "belongsTo",
          model: "User"
        },
        comments: {
          type: "hasMany",
          model: "Comment",
          polymorphic: {
            as: "subject"
          }
        }
      }      
    }, 'books');
    var Payment = givenModel('Payment', { 
      cardNumber: { type: String, required: true },
      date: {type: Date },
      amount: { type: Number, required: true }
    },{
      relations: {
        cart: {
          type: "belongsTo",
          model: "Cart"
        }
      }
    },'payments');
    var Comment = givenModel('Comment',
    {
      text: {type: String, required: true}
    },{
      relations: {
        subject: {
          type: "belongsTo",
          polymorphic: true
        }
      }
    },
    'comments');
  }

  function givenTestModel(properties, options) {
    TestModel = givenModel('TestModel', properties, options);
  }

  function givenModel(name, properties, options, mapping) {
    if(!mapping){
      mapping = options;
      options = {};
    }
    var ModelCtor = loopback.createModel(name, properties, options);
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
