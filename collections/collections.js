MAP_SIZE = 20;
SNAKE_LEN = 8;

Tile = function(userId, ttl) {
  this.userId = userId;
  this.ttl = ttl;
};

Tile.collection = new Meteor.Collection('tiles', function() {
  return Tile.collection.find({}, {sort: {x: 1, y: 1}});
});

User = function(userId) {
  this.userId = userId;
  this.ttl = userId == -1 ? 0 : SNAKE_LEN;
  this.position = [0, userId];
  this.direction = [1, 0];
  this.score = 0;
};

User.collection = Meteor.users;