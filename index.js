const express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use('/lib', express.static(__dirname + '/node_modules'))

app.get('/', function(req, res){
  res.sendFile(__dirname + '/client/index.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

// var i = 0;
// setInterval(function() {
//   io.emit('data', Math.random() * 10)
// }, 1000)

////////////////////////////////////////////////////////////////////////////////

const pubsubLib = require('@google-cloud/pubsub');
const topicName = "projects/mchpiot-184909/topics/telemetry_topic"
const subscriptionName = "some-subscription-2"
const logging = {
  error: (msg) => {
    console.log('(error):', msg);
  },
  info: (msg) => {
    console.log('(info):', msg);
  }
};

const pubsub = pubsubLib({
  projectId: 'mchpiot-184909'
});

function getTopic (cb) {
  pubsub.createTopic(topicName, (err, topic) => {
    // topic already exists.
    if (err && err.code === 6) {
      cb(null, pubsub.topic(topicName));
      return;
    }
    cb(err, topic);
  });
}

function subscribe (cb) {
  let subscription;

  // Event handlers
  function handleMessage (message) {
    //const data = JSON.parse(message.data);
    cb(null, message);
  }
  function handleError (err) {
    logging.error(err);
  }

  getTopic((err, topic) => {
    if (err) {
      cb(err);
      return;
    }

    topic.createSubscription(subscriptionName, (err, sub) => {
      if (err) {
        cb(err);
        return;
      }

      subscription = sub;

      // Listen to and handle message and error events
      subscription.on('message', handleMessage);
      subscription.on('error', handleError);

      logging.info(`Listening to ${topicName} with subscription ${subscriptionName}`);
    });
  });

  // Subscription cancellation function
  return () => {
    if (subscription) {
      // Remove event listeners
      subscription.removeListener('message', handleMessage);
      subscription.removeListener('error', handleError);
      subscription = undefined;
    }
  };
}

subscribe((err, data) => {
  if(err)
    console.log(err)
  else {
    try {
      io.emit('data', {
        data: data.data.readUInt16LE(),
        // device: 'my-device',
        device: data.attributes.deviceId,
      })
      console.log(data.attributes.deviceId,  data.data.toString(), new Date())
    } catch (e) { console.log("Strange message received.") }
  }
  data.ack();
});
