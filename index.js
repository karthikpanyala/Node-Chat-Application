
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);//socket io listens to a server object
mongoose = require('mongoose'),
users = {};
//go get to root directory, with http request and response as paramenters
app.get('/', function(req, res){
res.sendFile(__dirname + '/index.html');

});

http.listen(3000, function(){
	console.log('listening on *: 3000');
});

mongoose.connect('mongodb://localhost/chat1',function(err){
	if(err){
		console.log(err);

	}else{
		console.log('Connected to mongodb');
	}
});
 

var chatSchema = mongoose.Schema({
nick: String,
msg: String,
created: {type: Date, default: Date.now}
});

var Chat = mongoose.model('Message',chatSchema);

io.sockets.on('connection', function(socket){

	Chat.find({}, function(err, docs){
		if(err) throw err;
		console.log('sending old messages');
		socket.emit('load old msgs', docs);
	});
	socket.on('new user', function(data, callback){
		if (data in users){
			callback(false);
		} else{
			callback(true);
			socket.nickname = data;//each persons socket.nickname has their nickname stored.
			users[socket.nickname] = socket;//we want nickname to be key and socket to be value in users object
			updateNicknames();
		}
	});
	
	function updateNicknames(){
		io.sockets.emit('usernames', Object.keys(users));
	}

	socket.on('send message', function(data, callback){
		var msg = data.trim();// takes care of white space
		console.log('after trimming message is: ' + msg);
		if(msg.substr(0,3) === '/w '){
			msg = msg.substr(3);//just uses the actual message, not /w or spaces
			var ind = msg.indexOf(' ');//getting index of space
			if(ind !== -1){
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);//start of msg, till the end
				if(name in users){
					users[name].emit('whisper', {msg: msg, nick: socket.nickname});
					console.log('message sent is: ' + msg);
					console.log('Whisper!');
				} else{
					callback('Error!  Enter a valid user.');
				}
			} else{
				callback('Error!  Please enter a message for your whisper.');
			}
		} else{
			var newMsg = new Chat({msg: msg, nick: socket.nickname});
			newMsg.save(function(err){
				if(err) throw err;
			//to broadcast to all users,including me. Now we recieve the msg on client side.
			io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
		});
		}
	});
	
	socket.on('disconnect', function(data){
		if(!socket.nickname) return;
		delete users[socket.nickname];
		updateNicknames();
	});
});
