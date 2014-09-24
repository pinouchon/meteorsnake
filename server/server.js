Meteor.publish('users', function () {
  return Meteor.users.find({}, {fields: {username: 1,
    status: 1, position: 1, direction: 1, userId: 1, score: 1}});
});
Meteor.publish('tiles', function () {
  return Tile.collection.find({}, {fields: {x: 1, y: 1, userId: 1}});
});

var step = 0;

Meteor.methods({
  reset: function () {
    if (this.userId != 'eX4rCJa7FcT8g8ykH') return;
    if (Tile.collection.find().count() != MAP_SIZE * MAP_SIZE) {
      for (var x = 0; x < MAP_SIZE; x++) {
        for (var y = 0; y < MAP_SIZE; y++) {
          Tile.collection.upsert({x: x, y: y}, {x: x, y: y});
        }
      }
    }
    Tile.collection.update({}, {$set: new Tile(-1, 0)}, {multi: true});
    User.collection.find().forEach(function (user) {
      Tile.collection.update({x: 0, y: user.userId},
        {$set: new Tile(user.userId, user.ttl)});
      User.collection.update({_id: user._id},
        {$set: new User(user.userId)});
      User.collection.update({_id: user._id},
        {$set: {score: 0}});
    });
    step = 0;
  },
  keyDown: function(which) {
    var directions = {37: [0, -1], 38: [-1, 0], 39: [0, 1], 40: [1, 0]};
    User.collection.update({_id: this.userId},
      {$set: {direction: directions[which] || [0, 0]}});
  },
  swipe: function(direction) {
    console.log('dir', direction);
    var directions = {2: [0, -1], 4: [0, 1], 8: [-1, 0], 16: [1, 0]};
    User.collection.update({_id: this.userId}, {$set: {direction: directions[direction] || [0, 0]}});
  }
});

User.collection.find({'status.online': true}).observe({
  added: function(user) {
    var i = 0;
    while (User.collection.find({
      'status.online': true,
      'userId': i,
      _id: {$ne: user._id}}).count() != 0) i++;
    Tile.collection.update({x: 0, y: i},
      {$set: new Tile(i, SNAKE_LEN)});
    User.collection.update({_id: user._id},
      {$set: new User(i)});
  }, removed: function(user) {
    Tile.collection.update({x: 0, y: user.userId},
      {$set: new Tile(-1, 0)});
    User.collection.update({_id: user._id},
      {$set: new User(-1)});
  }
});

function tick() {
  if (step > 10 * 50) return;
  Tile.collection.update({ttl: {$gt: 0}},
    {$inc: {ttl: -1}}, {multi: true});
  Tile.collection.update({ttl: 0, userId: {$ne: -1}},
    {$set: {userId: -1}}, {multi: true});
  User.collection.find({'status.online': true}).forEach(function (u) {
    var x = u.direction[0] + u.position[0];
    var y = u.direction[1] + u.position[1];
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return;

    var tile = Tile.collection.findOne({x: x, y: y});
    var scoreBonus = step % Math.max((18 - u.ttl), 1) == 0 ? 1 : 0;
    var tileBonus = step % 10 == 0 ? 1 : 0;
    if (tile.userId != -1 && tile.userId != u.userId) {
      var otherUser = User.collection.findOne({userId: tile.userId});
      User.collection.update({userId: tile.userId},
        {$inc: {ttl: -tile.ttl}});
      scoreBonus += tile.ttl;
      Tile.collection.update(
        {ttl: {$lte: tile.ttl}, userId: otherUser.userId},
        {$set: {ttl: 0, userId: -1}},
        {multi: true});
    }

    User.collection.update(
      {_id: u._id},
      {$set: {position: [x, y], score: u.score + scoreBonus,
        ttl: u.ttl + tileBonus}});
    Tile.collection.update({x: x, y: y},
      {$set: new Tile(u.userId, u.ttl)});
  });
  step++;
}

Meteor.startup(function() {
  Meteor.setInterval(tick, 200);
});