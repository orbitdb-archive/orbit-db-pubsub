'use strict'

const PeerMonitor = require('ipfs-pubsub-peer-monitor')
const async = require('async')

const Logger = require('logplease')
const logger = Logger.create("pubsub", { color: Logger.Colors.Yellow })
Logger.setLogLevel('ERROR')

const noop = (err) => { if (err) throw err }

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

  subscribe(topic, onMessageCallback, onNewPeerCallback, callback = noop) {
    if (this._subscriptions[topic]) {
      logger.warn(`Subscription already exists: ${topic}`)
      return callback()
    }

    if (!this._ipfs.pubsub) {
      logger.warn('IPFS pubsub is not active')
      return callback()
    }

    this._ipfs.pubsub.subscribe(topic, this._handleMessage, (err, res) => {
      if (err) {
        return callback(err)
      }

      const topicMonitor = new PeerMonitor(this._ipfs.pubsub, topic)

      topicMonitor.on('join', (peer) => {
        logger.debug(`Peer joined ${topic}:`)
        logger.debug(peer)
        if (this._subscriptions[topic]) {
          onNewPeerCallback(topic, peer)
        } else {
          logger.warn('Peer joined a room we don\'t have a subscription for')
          logger.warn(topic, peer)
        }
      })

      topicMonitor.on('leave', (peer) => logger.debug(`Peer ${peer} left ${topic}`))
      topicMonitor.on('error', (e) => logger.error(e))

      this._subscriptions[topic] = {
        topicMonitor: topicMonitor,
        onMessage: onMessageCallback,
        onNewPeer: onNewPeerCallback
      }

      topicsOpenCount ++
      logger.debug('Topics open:', topicsOpenCount)

      callback()
    })
  }

  unsubscribe (hash, callback) {
    if (!callback) {
      return new Promise((resolve, reject) => {
        this._unsubscribe(hash, (err) => {
          if (err) {
            return reject(err)
          }
          resolve()
        })
      })
    }

    this._unsubscribe(hash, callback)
  }
  _unsubscribe (hash, callback) {
    if (!this._subscriptions[hash]) {
      logger.warn(`Subscription doesn't exist: ${hash}`)
      return callback()
    }

    this._ipfs.pubsub.unsubscribe(hash, this._handleMessage, (err) => {
      if (err) {
        return callback(err)
      }
      this._subscriptions[hash].topicMonitor.stop()
      delete this._subscriptions[hash]
      logger.debug(`Unsubscribed from '${hash}'`)
      topicsOpenCount --
      logger.debug("Topics open:", topicsOpenCount)

      callback()
    })
  }

  publish(topic, message) {
    if(this._subscriptions[topic] && this._ipfs.pubsub) {
      this._ipfs.pubsub.publish(topic, Buffer.from(JSON.stringify(message)))
    }
  }

  disconnect (callback) {
    if (!callback) {
      return new Promise((resolve, reject) => {
        this._disconnect((err) => {
          if (err) {
            return reject(err)
          }
          resolve()
        })
      })
    }

    this._disconnect(callback)
  }

  _disconnect (callback) {
    const subscriptions = Object.keys(this._subscriptions)
    async.eachSeries(subscriptions, this.unsubscribe.bind(this), (err) => {
      if (err) {
        return callback(err)
      }

      this._subscriptions = {}
      callback()
    })
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
