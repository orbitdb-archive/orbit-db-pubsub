'use strict'

const ipfsApi = require('ipfs-api')
const logger = require('logplease').create("orbit-db.IPFSPubSub")

class IPFSPubsub {
  constructor(ipfs) {
    this._ipfs = ipfs
    this._subscriptions = {}
  }

  subscribe(hash, onMessageCallback) {
    if(!this._subscriptions[hash]) {
      this._subscriptions[hash] = { onMessage: onMessageCallback }
      this._ipfs.pubsub.sub(hash, (err, stream) => {
        stream.on('data', this._handleMessage.bind(this))
      })
      // FIXME: when js-ipfs-api returns the stream before the
      // first message has been received, this can be remove
      this._ipfs.pubsub.pub(hash, '/connect')
    }
  }

  unsubscribe(hash) {
    if(this._subscriptions[hash])
      delete this._subscriptions[hash]
  }

  publish(hash, message) {
    if(this._subscriptions[hash])
      this._ipfs.pubsub.pub(hash, message)
  }

  _handleMessage(message) {
    if (message.data === '/connect')
      return

    const hash = message.topicIDs[0]
    const sub = this._subscriptions[hash]

    if(sub && sub.onMessage) {
      sub.onMessage(hash, message.data)
    }
  }
}

module.exports = IPFSPubsub
