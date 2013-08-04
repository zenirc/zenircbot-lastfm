var request = require('request')
  , api = require('zenircbot-api')
  , zen = new api.ZenIRCBot()
  , config = api.load_config(__dirname + 'lastfm.json')

require('./lib/format')


function get_latest_track(user, cb) {
  var params = {
    method: 'user.getrecenttracks'
  , user: user.username
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
    cb(null, user, body.recenttracks.track[0])
  })
}

function display_track(err, user, track) {
  if (!err && track['@attr'] && track['@attr'].nowplaying === 'true') {
    if (track.mbid !== user.last) {
      user.last = track.mbid
      zen.send_privmsg(
        config.channel,
        '{0} is listening to {1} by {2} on {3}'.format(
            user.nick
          , track.name
          , track.artist['#text']
          , track.album['#text']
          )
      )
    }
  }
}

config.users.forEach(function(user, index) {
  setTimeout(function() {
    get_latest_track(user, display_track)
    setInterval(get_latest_track, config.interval * 1000,
                user, display_track)
  }, ((config.interval/config.users.length)*(index+1)) * 1000 )
})
