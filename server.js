const fs = require("fs");
const http = require("http");
const path = require("path");
const url = require("url");
const port = 2112;
const osc = require('node-osc');
const io = require('socket.io')(8081);
//const maxAPI = require("max-api");

var oscServer, oscClient;
var isConnected = false;

io.sockets.on('connection', function (socket) {
	console.log('connection');
	socket.on("config", function (obj) {
		isConnected = true;
    	oscServer = new osc.Server(obj.server.port, obj.server.host);
	    oscClient = new osc.Client(obj.client.host, obj.client.port);
	    oscClient.send('/status', socket.sessionId + ' connected');
		oscServer.on('message', function(msg, rinfo) {
			socket.emit("message", msg);
		});
		socket.emit("connected", 1);
	});
 	socket.on("message", function (obj) {
		oscClient.send.apply(oscClient, obj);
  	});
	socket.on('disconnect', function(){
		if (isConnected) {
			oscServer.kill();
			oscClient.kill();
		}
  	});
});

function serveStatic(req, res) {
	console.log(`${req.method} ${req.url}`);

	// parse URL
	const parsedUrl = url.parse(req.url);
	// extract URL path
	let pathname = `.${parsedUrl.pathname}`;
	// based on the URL path, extract the file extention. e.g. .js, .doc, ...
	const ext = path.parse(pathname).ext || ".html";
	// maps file extention to MIME typere
	const map = {
		".ico": "image/x-icon",
		".html": "text/html",
		".js": "text/javascript",
		".json": "application/json",
		".css": "text/css",
		".png": "image/png",
		".jpg": "image/jpeg",
		".wav": "audio/wav",
		".mp3": "audio/mpeg",
		".svg": "image/svg+xml",
		".pdf": "application/pdf",
		".doc": "application/msword"
	};

	pathname = path.resolve(path.join(__dirname, "clientpage", pathname));

	fs.exists(pathname, (exist) => {
		if (!exist) {
			// if the file is not found, return 404
			res.statusCode = 404;
			res.end(`File ${pathname} not found!`);
			return;
		}

		// if is a directory search for index file matching the extention
		if (fs.statSync(pathname).isDirectory()) pathname += "/index" + ext;

		// read file from file system
		fs.readFile(pathname, (err, data) => {
			if (err) {
				res.statusCode = 500;
				res.end(`Error getting the file: ${err}.`);
			} else {
				// if the file is found, set Content-type and send data
				res.setHeader("Content-type", map[ext] || "text/plain");
				res.end(data);
			}
		});
	});
}

const requestHandler = (request, response) => {
	if (request.method === "GET") {
		serveStatic(request, response);
	}
};

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
	if (err) {
		console.log("something bad happened", err);
	}
	console.log(`server is listening on ${port}`);
});
