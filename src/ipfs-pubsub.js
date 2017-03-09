'use strict'

const Logger = require('logplease')
const logger = Logger.create("orbit-db.ipfs-pubsub")
Logger.setLogLevel('ERROR')

class IPFSPubsub {
  constructor(ipfs) {
    this._ipfs = ipfs
    this._subscriptions = {}

    if (this._ipfs.pubsub === null)
      logger.error("The provided version of ipfs doesn't have pubsub support. Messages will not be exchanged.")

    this._handleMessage = this._handleMessage.bind(this)
  }

  subscribe(hash, onMessageCallback) {
    if(!this._subscriptions[hash]) {
      this._subscriptions[hash] = { onMessage: onMessageCallback }

      if (this._ipfs.pubsub)
        this._ipfs.pubsub.subscribe(hash, { discover: true }, this._handleMessage)
    }
  }

  unsubscribe(hash) {
    if(this._subscriptions[hash]) {
      this._ipfs.pubsub.unsubscribe(hash, this._handleMessage)
      delete this._subscriptions[hash]
      logger.debug(`Unsubscribed from '${hash}'`)
    }
  }

  publish(hash, message) {
    if(this._subscriptions[hash] && this._ipfs.pubsub)
      this._ipfs.pubsub.publish(hash, new Buffer(JSON.stringify(message)))
  }

  disconnect() {
    Object.keys(this._subscriptions)
      .forEach((e) => this.unsubscribe(e))

    this._subscriptions = {}
  }

  _handleMessage(message) {
    // Don't process our own messages
    if (message.from === this._ipfs.PeerId)
      return

    const hash = message.topicCIDs[0]
    const data = JSON.parse(message.data.toString())
    const subscription = this._subscriptions[hash]

    if(subscription && subscription.onMessage && data)
      subscription.onMessage(hash, data)
  }
}

module.exports = IPFSPubsub
