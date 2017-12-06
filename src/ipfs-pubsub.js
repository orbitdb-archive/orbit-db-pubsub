'use strict'

const Room = require('ipfs-pubsub-room')

const Logger = require('logplease')
const logger = Logger.create("orbit-db.ipfs-pubsub")
Logger.setLogLevel('ERROR')

const maxTopicsOpen = 256
let topicsOpenCount = 0

class IPFSPubsub {
  constructor(ipfs, id) {
    this._ipfs = ipfs
    this._id = id
    this._subscriptions = {}

    if (this._ipfs.pubsub === null)
      logger.error("The provided version of ipfs doesn't have pubsub support. Messages will not be exchanged.")

    this._handleMessage = this._handleMessage.bind(this)

    // Bump up the number of listeners we can have open,
    // ie. number of databases replicating
    if (this._ipfs.setMaxListeners)
      this._ipfs.setMaxListeners(maxTopicsOpen)
  }

  subscribe(topic, onMessageCallback, onNewPeerCallback) {
    if(!this._subscriptions[topic]) {
      const room = Room(this._ipfs, topic)

      room.on('error', (e) => {
        logger.error("Pubsub Error:", e)
      })

      room.on('message', (message) => {
        this._handleMessage(message)
      })

      room.on('peer joined', (peer) => {
        this._subscriptions[topic].onNewPeer(topic, peer, room)
      })

      room.on('subscribed', () => {
        this._subscriptions[topic] = { 
          room: room, 
          onMessage: onMessageCallback, 
          onNewPeer: onNewPeerCallback 
        }
        topicsOpenCount ++
        logger.debug("Topics open:", topicsOpenCount)
      })

    }
  }

  unsubscribe(hash) {
    if(this._subscriptions[hash]) {
      this._subscriptions[hash].room.leave()
      this._subscriptions[hash].room = null
      delete this._subscriptions[hash]
      logger.debug(`Unsubscribed from '${hash}'`)
      topicsOpenCount --
      logger.debug("Topics open:", topicsOpenCount)
    }
  }

  publish(hash, message) {
    if(this._subscriptions[hash] && this._subscriptions[hash].room && this._ipfs.pubsub) {
      this._subscriptions[hash].room.broadcast(Buffer.from(JSON.stringify(message)))
    }
  }

  disconnect() {
    Object.keys(this._subscriptions)
      .forEach((e) => this.unsubscribe(e))

    this._subscriptions = {}
  }


  _handleMessage(message) {
    // Don't process our own messages
    if (message.from === this._id)
      return

    // Get the message content and a subscription
    let content, subscription, topicId
    try {
      // Get the topic
      topicId = message.topicIDs[0]
      content = JSON.parse(message.data)
      subscription = this._subscriptions[topicId]
    } catch (e) {
      logger.error(e)
      logger.error('Couldn\'t parse pubsub message:', message)
    }

    if(subscription && subscription.onMessage && content) {
      subscription.onMessage(topicId, content)
    }
  }
}

module.exports = IPFSPubsub
