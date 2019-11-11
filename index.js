 (function () {
    document.querySelector(".fileChooser").addEventListener("change", function (e) {
        console.log(e.target.files[0].webkitRelativePath)
    });

    document.querySelector(".portNumber").value = 8080;
    document.querySelector(".portNumber").addEventListener("change", function (e) {
        consoe.log(e.target.value);
    });

    window.AllFiles = [];

    document.querySelector(".startServer").addEventListener("click", function () {
        var port = document.querySelector(".portNumber").value;
        var filePath = document.querySelector(".fileChooser").files;

        for (let i = 0;i < filePath.length;i++) {
            var name = filePath[i].webkitRelativePath.substring(5);
            AllFiles[name] = filePath[i];
        }

        chrome.runtime.sendMessage({
            port
        }, function(response) {
            console.log(response);
        });
    })
}());