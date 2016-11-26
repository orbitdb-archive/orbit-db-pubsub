'use strict'

const logger = require('logplease').create("orbit-db.IPFSPubSub")

// TODO: setup logging properly

class IPFSPubsub {
  constructor(ipfs) {
    this._ipfs = ipfs
    this._subscriptions = {}
  }

  subscribe(hash, onMessageCallback) {
    if(!this._subscriptions[hash]) {
      this._subscriptions[hash] = { onMessage: onMessageCallback }
      this._ipfs.pubsub.subscribe(hash, { discover: true }, (err, stream) => {
        if (err)
          logger.error(err)

        if (stream && this._subscriptions[hash]) {
          this._subscriptions[hash].stream = stream
          stream.on('data', this._handleMessage.bind(this))
          // TODO: handle end of stream
          // stream.on('end', () => console.log("Disconnected from pubsub"))
        }
      })
    }
  }

  unsubscribe(hash) {
    if(this._subscriptions[hash]) {
      if (this._subscriptions[hash].stream)
        this._subscriptions[hash].stream.cancel()

      delete this._subscriptions[hash]
    }
  }

  publish(hash, message) {
    if(this._subscriptions[hash])
      this._ipfs.pubsub.publish(hash, message)
  }

  disconnect() {
    Object.keys(this._subscriptions)
      .forEach((e) => this.unsubscribe(e))
  }

  _handleMessage(message) {
    const hash = message.topicIDs[0]
    const subscription = this._subscriptions[hash]

    if(subscription && subscription.onMessage) {
      subscription.onMessage(hash, message.data)
    }
  }
}

module.exports = IPFSPubsub
