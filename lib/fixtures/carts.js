var factory = {
  usercart: {
    session: "1111122222333333",
    user: {
      fixture: "users",
      value: "bob"
    },
    cart: {
      fixture: "devices",
      items: {
        dev1: 1,
        dev2: 2
      }
    }
  },
  anoncart: {
    session: "1111122222333333",
    cart: {
      fixture: "devices",
      items: {
        dev1: 1,
        dev2: 2
      }
    }
  }

}

module.exports = factory;