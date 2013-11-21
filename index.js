var request = require('request')
  , api = require('zenircbot-api')
  , zen = new api.ZenIRCBot()
  , config = api.load_config(__dirname + '/lastfm.json')

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
    if (body && body.recenttracks && body.recenttracks.track && body.recenttracks.track.length > 0) {
      cb(null, user, body.recenttracks.track[0])
    } else {
      cb('Body is missing stuff.')
    }
  })
}

function display_track(err, user, track) {
  if (!err && track && track['@attr'] && track['@attr'].nowplaying === 'true') {
    var message = '{0} is listening to {1} by {2} on {3}'.format(
                      user.nick
                    , track.name
                    , track.artist['#text']
                    , track.album['#text']
                    )
    if (message !== user.last) {
      user.last = message
      zen.send_privmsg(
        config.channel,
        message
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
