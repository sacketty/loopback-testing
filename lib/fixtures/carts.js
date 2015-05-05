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
      //postfix: "Id", //optional
      //foreignKeyAttribute: "id", //optional
      items: {
        dev1: 1,
        dev2: 2
      }
    }
  },
  inline: {
    user: {
      fixture: "users",
      value: {
        name: "Alan",
        user: {
          fixture: "books",
          items: {
            b1: {
              data: {
                title: "Begining of the end",
                author: "John Foo"
              },
              quantity: 1
            }
          }
        }
      }
    }
  }

}

module.exports = factory;