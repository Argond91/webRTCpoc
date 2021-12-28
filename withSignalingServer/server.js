var webSocketServ = require('ws').Server;


var wss = new webSocketServ({
    port: 9090
})

var users = {};
var otherUser;
let connect
wss.on('connection', conn => {
    console.log("User connected");

    conn.on('message', message => {
        var data;

        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {};
        }

        switch (data.type) {

            case "login":
                console.log(`User ${data.name} logged in`)
                users[data.name] = conn;
                conn.name = data.name
                break;
            case "offer":
                console.log(`Offer from ${data.name} to ${data.otherUser}`)
                connect = users[data.name];
                otherUser = users[data.otherUser]
                if (connect != null && otherUser != null) {
                    conn.otherUser = data.otherUser;
                    connect.otherUser = data.otherUser

                    sendToOtherUser(otherUser, {
                        type: "offer",
                        offer: data.offer,
                        name: conn.name
                    })
                }
                break;

            case "answer":
                console.log(`Answer from ${data.name} to ${data.otherUser}`)
                otherUser = users[data.otherUser]
                if (otherUser != null) {
                    sendToOtherUser(otherUser, {
                        type: "answer",
                        answer: data.answer
                    })
                }

                break

            case "candidate":
                console.log(`Candidate from ${data.name} to ${data.otherUser}`)
                otherUser = users[data.otherUser]
                if (otherUser != null) {
                    sendToOtherUser(otherUser, {
                        type: "candidate",
                        candidate: data.candidate
                    })
                }
                break;
            default:
                sendToOtherUser(conn, {
                    type: "error",
                    message: "Command not found: " + data.type
                });
                break;
        }


    })
    conn.on('close', function () {
        console.log('Connection closed');
        if(conn.name){
            delete users[conn.name];
            if(conn.otherUser){
                var connect = users[conn.otherUser];
                conn.otherUser = null;

                if(conn != null){
                    sendToOtherUser(connect, {
                        type:"leave"
                    } )
                }
            }
        }
    })
})

function sendToOtherUser(connection, message) {
    connection.send(JSON.stringify(message))
}
