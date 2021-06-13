const print  = console.log

var io = require('socket.io-client');

var socket = io("http://localhost:3000/");

socket.on('connect', () => {
	socket.on('chat message', function(data){
        print(data);
	});
})