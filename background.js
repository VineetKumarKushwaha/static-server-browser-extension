chrome.app.runtime.onLaunched.addListener(function() {
    var appWindow;
    console.log(chrome.runtime.getURL("index.html"));
    var appWindow = chrome.app.window.create('index.html', {
        innerBounds: {
            width: 600,
            height: 740
        }
    }, function(createdWindow) {
        appWindow = createdWindow.contentWindow;
    });
    // chrome.app.window.create(chrome.runtime.getURL("index.html"));
    var files = [];
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log(sender.tab ?
                    "from a content script:" + sender.tab.url :
                    "from the extension");

        createServer(request.port);
    });
    let serverSocketId;
    function createServer(port) {
        chrome.sockets.tcpServer.create({}, function (createInfo) {
            serverSocketId = createInfo.socketId;
            listen(createInfo.socketId, port);
        });
    }

    function ab2str(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    function str2ab(str) {
        var buf = new ArrayBuffer(str.length); // 2 bytes for each char
        var bufView = new Uint8Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
          bufView[i] = str.charCodeAt(i);
        }
        return buf;
      }

    function onAccept(info) {
        if (info.socketId != serverSocketId)
          return;

        chrome.sockets.tcp.setPaused(info.clientSocketId, false);
    }


    var getResponseHeader = function(file) {
        var httpStatus = "HTTP/1.0 200 OK";
        var contentType = "text/html; charset=UTF-8";
        var contentLength = 0;
    
        // if (!file || errorCode) {
        //     httpStatus = "HTTP/1.0 " + (errorCode || 404) + " Not Found";
        // } else {
            
        // }
        contentType = file.type || contentType;
        contentLength = file.size;
        var lines = [
          httpStatus,
          "Content-length: " + contentLength,
          "Content-type:" + contentType
        ];
    
        lines.push("Connection: keep-alive");
    
        return str2ab(lines.join("\n") + "\n\n");
      };

    function getRequestHeaders(data) {
        const requestHeaders = ab2str(data).split("\n");
        const fileNameWithStartingSlash = requestHeaders[0].split(" ")[1];
        const withoutQueryParams = fileNameWithStartingSlash.split("?")[0];
        return withoutQueryParams.substring(1, withoutQueryParams.length);
    }


    function combineTwoBuffer(b1, b2) {
        var tmp = new Uint8Array(b1.byteLength + b2.byteLength);
        tmp.set(new Uint8Array(b1), 0);
        tmp.set(new Uint8Array(b2), b1.byteLength);
        return tmp.buffer;
    }

    function listen(id, port) {
        chrome.sockets.tcpServer.listen(id, "127.0.0.1", Number(port), 50, function (result) {
            console.log("LISTENING:", result);

            chrome.sockets.tcpServer.onAccept.addListener(onAccept);


            chrome.sockets.tcp.onReceive.addListener(function(data) {
                  console.log("files============>", getRequestHeaders(data.data));                
                  const fileName = getRequestHeaders(data.data);
                
                if (appWindow.AllFiles[fileName]) {
                        let header = getResponseHeader(appWindow.AllFiles[fileName]);

                        let outputBuffer = new ArrayBuffer(header.byteLength + appWindow.AllFiles[fileName].size);
                        
                        console.log("file found");
                        var fr = new FileReader();

                        fr.onload = function (e) {
                            const unit8 =  combineTwoBuffer(header, e.target.result);
                            // console.log(ab2str(unit8));
                            chrome.sockets.tcp.send(data.socketId, unit8, function(resultCode) {
                                console.log("Data sent to new TCP client connection.")
                            });
                        };
                        fr.readAsArrayBuffer(appWindow.AllFiles[fileName])
                        return;
                }

                chrome.runtime.getPackageDirectoryEntry(function(root) {
                    root.getFile("404.html", {}, function(fileEntry) {
                      fileEntry.file(function(file) {
                        var reader = new FileReader();
                        reader.onloadend = function(e) {
                            let header = getResponseHeader(file);
                            const unit8 = combineTwoBuffer(header, e.target.result);
                            console.log(ab2str(unit8));
                            chrome.sockets.tcp.send(data.socketId, unit8, function(resultCode) {
                                console.log("Data sent to new TCP client connection.")
                            });
                        };
                        reader.readAsArrayBuffer(file);
                      });
                    });
                  });

                
      
                  // chrome.sockets.tcp.send(id, buffer);
            });
        });
    }

    
});


