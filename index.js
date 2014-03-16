var request = require('request')
  , api = require('zenircbot-api')
  , zen = new api.ZenIRCBot()
  , config = api.load_config(__dirname + '/lastfm.json')

require('./lib/format')

function get_list_of_users(group, cb) {
  var params = {
    method: 'group.getmembers'
  , group: group
  , api_key: config.api_key
  , format: 'json'
  }
  request({
    uri: 'https://ws.audioscrobbler.com/2.0/?'
  , qs: params
  , json: true
  }, function(err, res, body) {
    if (err) {
      cb(err)
      return
    }
    var users = []
    if (body && body.members) {
      body.members.user.forEach(function(user) {
        users.push(user.name)
      })
    }
    console.log('get_list_of_users calling callback with: ', users)
    cb(null, users)
  })
}


function get_latest_track(user, cb) {
  var params = {
    method: 'user.getrecenttracks'
  , user: user.nick
  , api_key: config.api_key
  , format: 'json'
  }
  console.log('Looking up: ', user)
  request({
    uri: 'https://ws.audioscrobbler.com/2.0/?'
  , qs: params
  , json: true
  }, function(err, res, body) {
    if (err) {
      cb(err)
      return
    }
    if (body && body.recenttracks && body.recenttracks.track && body.recenttracks.track.length > 0) {
      cb(null, user, body.recenttracks.track[0])
    } else {
      cb('Body is missing stuff.')
    }
  })
}

function display_track(err, user, track) {
  if (!err && track && track['@attr'] && track['@attr'].nowplaying === 'true') {
    zen.redis.get('lastfm:alias:'+user.nick, function(err, nick) {
      var name = nick || user.nick
      zen.redis.get('lastfm:obfusticate:' + name, function(err, res) {
        if (res) {
          name = '[' + name.split('').join(' ') + ']'
        }
        var message = '{0} is listening to {1} by {2} on {3}'.format(
                          name
                        , track.name
                        , track.artist['#text']
                        , track.album['#text']
                        )
        if (message !== user.last) {
          user.last = message
          console.log(message)
          zen.send_privmsg(
            config.channel,
            message
          )
        }
      })
     
    })
  }
}

var members = {}

function check_users() {
  var user_list = Object.keys(members)
  var interval = 3000
  if (user_list.length > 20) {
    interval = (60000/user_list.length)
  }
  user_list.forEach(function(user, index) {
    setTimeout(get_latest_track, (interval * index), members[user], display_track)
  })
}

function main() {
  get_list_of_users(config.group, function(err, users) {
    if (err) {
      console.log('Err: ', err)
      return
    }
    users.forEach(function(user) {
      if (members[user] === undefined) {
        console.log('Found: ', user)
        members[user] = {nick: user}
      }
    })
    check_users()
  })
  setTimeout(main, (Object.keys(members).length * 3 || 10) * 1000)
}

main()

zen.register_commands(
  "lastfm.js",
  [{
    name: "!claim <lastfm_nick>",
    description: "Aliases the lastfm_nick to the invoker's nick."
  }, {
    name: "!obfusticate",
    description: "Toggles nick obfustication, so you don't get IRC pings."
  }]
)

var filtered = zen.filter({version: 1, type: 'directed_privmsg'})
filtered.on('data', function(msg){
  var claim = /^claim (.*)/i.exec(msg.data.message)
  var unclaim = /^unclaim (.*)/i.exec(msg.data.message)
  var obfusticate = /^obfusticate$/i.exec(msg.data.message)
  var lastfm_nick = ''
  if (claim) {
    lastfm_nick = claim[1].trim()
    zen.redis.set('lastfm:alias:' + lastfm_nick, msg.data.sender, function(err, res) {
                    zen.send_privmsg(msg.data.channel,
                                     lastfm_nick + " -> " + msg.data.sender)
                  })
  } else if (unclaim) {
    lastfm_nick = unclaim[1].trim()
    zen.redis.del('lastfm:alias:' + lastfm_nick, function(err, res) {
                    zen.send_privmsg(msg.data.channel,
                                     lastfm_nick + " != " + msg.data.sender)
                  })
  } else if (obfusticate) {
    var key = 'lastfm:obfusticate:' + msg.data.sender
    zen.redis.get(key, function(err, res) {
      if (res) {
        zen.redis.del(key, function() {
          zen.send_privmsg(msg.data.channel, msg.data.sender + ': obfustication disabled')
        })
      } else {
        zen.redis.set(key, true, function() {
          zen.send_privmsg(msg.data.channel, msg.data.sender + ': obfustication enabled')
        })
      }
    })
  }
})
