'use strict'

const logger = require('logplease').create("orbit-db.ipfs-pubsub")
logger.setLogLevel('ERROR')

class IPFSPubsub {
  constructor(ipfs) {
    this._ipfs = ipfs
    this._subscriptions = {}

    if (this._ipfs.pubsub === null)
      logger.error("The provided version of ipfs doesn't have pubsub support. Messages will not be exchanged.")
  }

  subscribe(hash, onMessageCallback) {
    if(!this._subscriptions[hash]) {
      this._subscriptions[hash] = { onMessage: onMessageCallback }

      if (this._ipfs.pubsub) {
        this._ipfs.pubsub.subscribe(hash, { discover: true }, (err, stream) => {
          if (err)
            logger.error(err)

          logger.debug(`Subscribed to '${hash}'`)

          if (stream && this._subscriptions[hash]) {
            this._subscriptions[hash].stream = stream
            stream.on('data', this._handleMessage.bind(this))
            // TODO: handle end of stream
            // stream.on('end', () => console.log("Disconnected from pubsub"))
          }
        })
      }
    }
  }

  unsubscribe(hash) {
    if(this._subscriptions[hash]) {
      if (this._subscriptions[hash].stream)
        this._subscriptions[hash].stream.cancel()

      delete this._subscriptions[hash]
      logger.debug(`Unsubscribed from '${hash}'`)
    }
  }

  publish(hash, message) {
    if(this._subscriptions[hash] && this._ipfs.pubsub)
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
