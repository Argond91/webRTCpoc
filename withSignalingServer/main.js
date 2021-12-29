let myConnection;
let remoteConnection;
let sendChannel;
let receiveChannel;
const dataChannelSend = document.querySelector('textarea#dataChannelSend');
const dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
const startButton = document.querySelector('button#startButton');
const sendButton = document.querySelector('button#sendButton');
// const sendToAllButton = document.querySelector('button#sendToAllButton');
const closeButton = document.querySelector('button#closeButton');
const createOfferButton = document.querySelector('button#createOffer');
startButton.disabled = true
let servers = null;

let userNameDiv = document.querySelector('div#username');
let sendToUser = document.querySelector('input#sendToUser');

let userName = new URLSearchParams(location.search).get("username")
if(!userName) {
  userName = `user-${Math.random().toFixed(4).substr(2)}`
}
userNameDiv.innerText = `Username: ${userName}`

let connectedUser
// const wsAddress = 'ws://localhost:9090'
const wsAddress = 'ws://34.255.190.204:9090'
let wsConnection = new WebSocket(wsAddress);
wsConnection.onopen = () => {
  console.log(`Websocket connection opened to ${wsAddress}`)
  send({
    type: 'login',
    name: userName
  })
  wsConnection.onmessage = handleWsMessage
  startButton.disabled = false
}

startButton.onclick = () => {createConnection()}
sendButton.onclick = sendData;
closeButton.onclick = closeDataChannels;
createOfferButton.onclick = createOffer

function createConnection(otherUser = null) {
  dataChannelSend.placeholder = '';
//   const configuration = {
//     "iceServers": [{
//         "urls": "stun:stunserver.example.org"
// }]
// }
//   const configuration = {
//     "iceServers": [{
//         "urls": "stun:stun2.1.google.com:19302"
// }]
// }
  const configuration = {
    "iceServers": [{
        "urls": "stun:stun.l.google.com:19302"
}]
}
  window.myConnection = myConnection = new RTCPeerConnection(configuration);
  console.log('Created my local peer connection object myConnection');

  sendChannel = myConnection.createDataChannel('sendDataChannel')
//   sendChannel = myConnection.createDataChannel('sendDataChannel', {
//     reliable: true
// });
  window.sendChannel = sendChannel
  console.log('Created send data channel');

  // if(otherUser){
 
  myConnection.onicecandidate = e => {
    if (e && e.target && e.target.iceGatheringState === 'complete') {
      console.log('done gathering candidates - got iceGatheringState complete');
  } else if (e && e.candidate == null) {
      console.log('done gathering candidates - got null candidate');
  } else {
        console.log(e.target.iceGatheringState, e);   
  }

    if (e.candidate) {
      send({
          type: "candidate",
          candidate: e.candidate,
          name: userName,
          otherUser: otherUser ? otherUser : sendToUser.value ? sendToUser.value : "Norbi"
      })
  }
  // }
}
  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;
  sendChannel.onmessage = event => {
    console.log(`sendChannel.onmessage event data ${event.data}`)
  }
  myConnection.ondatachannel = receiveChannelCallback

  startButton.disabled = true;
  closeButton.disabled = false;
}

function createOffer() {
  myConnection.createOffer().then(
    offer => {
      let wsOfferMessage = {
        type: 'offer',
        offer,
        name: userName,
        otherUser: sendToUser.value ? sendToUser.value : "Norbi"
      }
      send(wsOfferMessage)
      myConnection.setLocalDescription(offer)
    },
    onCreateSessionDescriptionError
);
}

function enableStartButton() {
  startButton.disabled = false;
}

function disableSendButton() {
  // sendButton.disabled = true;
}

function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function sendData() {
  const data = dataChannelSend.value;
  sendChannel.send(data);
  console.log('Sent Data: ' + data);
}

function closeDataChannels() {
  console.log('Closing data channels');
  sendChannel.close();
  console.log('Closed data channel with label: ' + sendChannel.label);
  receiveChannel.close();
  console.log('Closed data channel with label: ' + receiveChannel.label);
  myConnection.close();
  remoteConnection.close();
  myConnection = null;
  remoteConnection = null;
  console.log('Closed peer connections');
  // startButton.disabled = false;
  // sendButton.disabled = true;
  // closeButton.disabled = true;
  // dataChannelSend.value = '';
  // dataChannelReceive.value = '';
  // dataChannelSend.disabled = true;
  // disableSendButton();
  enableStartButton();
}

function receiveChannelCallback(event) {
  console.log('Receive ondatachannel callback');
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}

function onReceiveMessageCallback(event) {
  console.log('Received Message: ', event.data);
  dataChannelReceive.value = event.data;
}

function onSendChannelStateChange() { 
  const readyState = sendChannel.readyState;
  console.log('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    // dataChannelSend.disabled = false;
    dataChannelSend.classList.add('textarea-focused')
    dataChannelSend.focus();
    // sendButton.disabled = false;
    // closeButton.disabled = false;
  } else {
    // dataChannelSend.disabled = true;
    // sendButton.disabled = true;
    // closeButton.disabled = true;
    dataChannelSend.classList.remove('textarea-focused')
  }
}

function onReceiveChannelStateChange() {
  const readyState = receiveChannel.readyState;
  console.log(`Receive channel state is: ${readyState}`);
}

function send(message) {
  wsConnection.send(JSON.stringify(message))
}

async function handleWsMessage(msg) {
  let data = JSON.parse(msg.data);
  console.log(`Message from wsConnection type: ${data.type}`)
  switch (data.type) {
    case "offer":
      connectedUser = data.name
      console.log('connecting with user: ', connectedUser)
      if(!myConnection) {
        createConnection(data.name)
      }
      else {
        console.log('Already had myConnection when offer came in')
      }
      await myConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
      let answer = await myConnection.createAnswer()
      await myConnection.setLocalDescription(answer)
        send({
          type: "answer",
          answer: answer,
          otherUser: data.name,
          name: userName
      })
      break
    case "answer":
      await myConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      break
    case "candidate":
      myConnection.addIceCandidate(new RTCIceCandidate(data.candidate)).then(
        onAddIceCandidateSuccess,
        onAddIceCandidateError
    )
  }
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log(`Failed to add Ice Candidate: ${error.toString()}`);
}