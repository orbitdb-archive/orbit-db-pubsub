# orbit-db-pubsub

[![npm version](https://badge.fury.io/js/orbit-db-pubsub.svg)](https://badge.fury.io/js/orbit-db-pubsub)

Default message propagation service for [orbit-db](https://github.com/haadcode/orbit-db). Uses [IPFS](https://dist.ipfs.io/go-ipfs/floodsub-2) [pubsub](https://github.com/ipfs/go-ipfs/blob/master/core/commands/pubsub.go#L23).

# Install
```
npm install orbit-db-pubsub
```

### API

#### subscribe(topic, onMessageHandler, onNewPeerHandler, [callback])

Listen for new messages in `topic`

`onMessageHandler` gets called when a message is received with signature `(topic, data)`

`onNewPeerHandler` gets called when a new peer joins with signature `(topic, peer)`

If no `callback` is provided, a promise is returned.

#### unsubscribe(topic, [callback])

Stop listening for new messages in `topic`

If no `callback` is provided, a promise is returned

#### disconnect ([callback])

Stop listening for new messages in all topics

If no `callback` is provided, a promise is returned

#### publish(topic, data)

Publish `data` to a `topic`

## Contributing

See [orbit-db's contributing guideline](https://github.com/haadcode/orbit-db#contributing).

## License

[MIT](LICENSE) ©️ 2016 Haadcode
