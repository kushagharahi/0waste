(function () {
    // |streaming| indicates whether or not we're currently streaming
    // video from the camera. Obviously, we start at false.

    var streaming = false;

    // The various HTML elements we need to configure or control. These
    // will be set by the startup() function.

    var video = null;
    var canvas = null;
    var photo = null;
    var takePic = null;

    function startup() {
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        takePic = document.getElementById('takePic');
        container = document.getElementById('container');

        navigator.getMedia = (navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);

        navigator.getMedia(
            {
                video: true,
                audio: false
            },
            function (stream) {
                if (navigator.mozGetUserMedia) {
                    video.mozSrcObject = stream;
                } else {
                    var vendorURL = window.URL || window.webkitURL;
                    video.src = vendorURL.createObjectURL(stream);
                }
                video.play();
            },
            function (err) {
                console.log("An error occured! " + err);
            }
        );

        video.addEventListener('canplay', function (ev) {
            if (!streaming) {
                streaming = true;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
        }, false);

        takePic.addEventListener('click', function (ev) {
            takepicture();
            ev.preventDefault();
        }, false);

        clearphoto();
    }

    // Fill the photo with an indication that none has been
    // captured.

    function clearphoto() {
        var context = canvas.getContext('2d');
        context.fillStyle = "#AAA";
        context.fillRect(0, 0, canvas.width, canvas.height);

        var data = canvas.toDataURL('image/png');
    }

    // Capture a photo by fetching the current contents of the video
    // and drawing it into a canvas, then converting that to a PNG
    // format data URL. By drawing it on an offscreen canvas and then
    // drawing that to the screen, we can change its size and/or apply
    // other changes before drawing it.

    function takepicture() {
        if(!canvas.classList.contains("hide")) {
            canvas.classList.add("hide");
            video.classList.remove("hide");
            takePic.innerHTML = "<i class='fas fa-camera'></i> Landfill, Recycling, Compost?"
            clearphoto();
            return;
        }
        var context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        var data = canvas.toDataURL('image/png');
        canvas.classList.remove("hide");
        video.classList.add("hide");
        drawTextCenterOfCanvas("Landfill - Click to take another picture", canvas);
        takePic.innerText = "Landfill - Click to take another picture";
        postBase64ImageMS(data);
    }

    function postBase64ImageMS(data) {
        var params = {
            "visualFeatures": "Categories,Description,Color",
            "details": "",
            "language": "en",
        };
        postAjax("https://westcentralus.api.cognitive.microsoft.com/vision/v1.0/analyze?visualFeatures=Description,Tags",
            makeBlob(data),
            "3370b1758f3a491cafc41e4db85fbeb6",
            function (data) {
                console.log(data);
            });
    }

    function makeBlob(dataURL) {
        var BASE64_MARKER = ';base64,';
        if (dataURL.indexOf(BASE64_MARKER) == -1) {
            var parts = dataURL.split(',');
            var contentType = parts[0].split(':')[1];
            var raw = decodeURIComponent(parts[1]);
            return new Blob([raw], { type: contentType });
        }
        var parts = dataURL.split(BASE64_MARKER);
        var contentType = parts[0].split(':')[1];
        var raw = window.atob(parts[1]);
        var rawLength = raw.length;

        var uInt8Array = new Uint8Array(rawLength);

        for (var i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }

        return new Blob([uInt8Array], { type: contentType });
    }

    function postAjax(url, data, key, success) {
        var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        xhr.open('POST', url);
        xhr.onreadystatechange = function () {
            if (xhr.readyState > 3 && xhr.status == 200) { success(xhr.responseText); }
        };
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.setRequestHeader("Ocp-Apim-Subscription-Key", key);

        xhr.send(data);
        return xhr;
    }

    function drawTextCenterOfCanvas(text, canvasElement) {
        let canvasContext = canvasElement.getContext("2d");
        canvasContext.fillStyle = "#4CAF50";
        canvasContext.font = canvasContext.font.replace(/\d+px/, "50px"); 
        canvasContext.textAlign = "center";
        canvasContext.textBaseline = "middle";
        canvasContext.fillText(text, canvasElement.width / 2, canvasElement.height / 2);
    }

    // Set up our event listener to run the startup process
    // once loading is complete.
    window.addEventListener('load', startup, false);
})();