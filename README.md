# ZenIRCBot Last.fm

> 14:22:13 ZenDevBot | Wraithan is listening to Terminal March by Darren Korb on Bastion Original Soundtrack

## Configuration

You'll need to get an API key from [last.fm](http://www.last.fm/api/account/create).

Copy the `lastfm.json.dist` to `lastfm.json` 

Edit `lastfm.json` and add in your information.

## Notes

The bot limits itself to checking each user every 120 seconds by default as last.fm says their API only updates that often. It does 1 query per user count / interval seconds in an effort to even out load caused and be a good consumer of the API.
