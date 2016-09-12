# orbit-db-pubsub

Default message propagation service for orbit-db. Uses IPFS pubsub.

**WIP**

# Install
```
npm install orbit-db-pubsub
```

### API

#### subscribe(topic, onMessageCallback)

Listen for new messages in `topic`

`onMessageCallback` gets called when a message is received with signature `(topic, data)`

#### unsubscribe(topic)

Stop listening for new messages in `topic`

#### publish(topic, data)

Publish `data` to a `topic`
