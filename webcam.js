(function () {
    // |streaming| indicates whether or not we're currently streaming
    // video from the camera. Obviously, we start at false.

    var streaming = false;

    // The various HTML elements we need to configure or control. These
    // will be set by the startup() function.

    var video = null;
    var canvas = null;
    var takePic = null;

    function startup() {
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        takePic = document.getElementById('takePic');

        navigator.getMedia = (navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);

        navigator.getMedia({
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
        if (!canvas.classList.contains("hide")) {
            canvas.classList.add("hide");
            video.classList.remove("hide");
            takePic.innerHTML = "Landfill, Recycling, or Compost?<br /><i class=\"em em-camera\"></i>"
            clearphoto();
            return;
        }
        var context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        var data = canvas.toDataURL('image/png');
        canvas.classList.remove("hide");
        video.classList.add("hide");
        takePic.innerHTML = "Analyzing...<br/><i class=\"em em-thinking_face\"></i>";
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
                //console.log(data);
                displayResult(data);
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
        canvasContext.textAlign = "center";
        canvasContext.textBaseline = "middle";
        canvasContext.fillStyle = "#000000";
        canvasContext.font = canvasContext.font.replace(/\d+px/, "60px");
        canvasContext.fillText(text, canvasElement.width / 2, canvasElement.height / 2);
        canvasContext.fillStyle = "#FFFF00";
        canvasContext.font = canvasContext.font.replace(/\d+px/, "57px");
        canvasContext.fillText(text, canvasElement.width / 2, canvasElement.height / 2);
    }
    function displayResult(json) {
        data = JSON.parse(json);
        var cat = categorize(data.description.tags);
        takePic.innerHTML = cat + "<br/>Tap to take another picture <i class=\"em em-camera\"></i>";
        drawTextCenterOfCanvas(cat, canvas);
    }

    function categorize(tags) {
        var recycle = getRecycleCategory(tags);
        var compost = getCompostCategory(tags);
        var electronics = 0;
        var result = null;

        if (recycle.count > compost.count > electronics) {
            return "Recycling";
        } if (recycle.count < compost.count > electronics) {
            return "Compost";
        } if (recycle.count < compost.count < electronics) {
            return "Electronics";
        }
        return "Landfill";
    }

    function getRecycleCategory(tags) {
        var recycle = {};
        var plastic = getPlastic(tags);
        var metal = getMetal(tags);
        var paper = getPaper(tags);

        recycle.count = plastic.length + metal.length + paper.length;
        //TODO - add subcategories
        return recycle;
    }

    function getPlastic(tags) {
        var plastic = [];
        tags.forEach(function (tag) {
            if (isPlastic(tag)) {
                plastic.push(tag);
            }
        });
        return plastic;

        function isPlastic(tag) {
            var plastics = [
                "bottle",
                "glass",
                "water",
                "drinking water",
                "plastic",
                "drinking",
                "beverage"
            ];
            return plastics.includes(tag);
        }
    }

    function getMetal(tags) {
        var metal = [];
        tags.forEach(function (tag) {
            if (isMetal(tag)) {
                metal.push(tag);
            }
        });
        return metal;

        function isMetal(tag) {
            var metals = [
                "can",
                "metal",
                "bottle",
                "beverage",
                "canned",
                "silver"
            ];
            return metals.includes(tag);
        }
    }

    function getPaper(tags) {
        var paper = [];
        tags.forEach(function (tag) {
            if (isPaper(tag)) {
                paper.push(tag);
            }
        });
        return paper;

        function isPaper(tag) {
            var papers = [
                "paper",
                "document",
                "words",
                "newspaper"
            ];
            return papers.includes(tag);
        }
    }

    function getCompostCategory(tags) {
        var compost = {};
        var items = getCompost(tags);

        compost.items = items;
        compost.count = compost.items.length;

        return compost;
    }

    function getCompost(tags) {
        var compost = [];
        tags.forEach(function (tag) {
            if (isCompost(tag)) {
                compost.push(tag);
            }
        });
        return compost;

        function isCompost(tag) {
            var composts = [
                "food",
                "apple",
                "banana",
                "eating",
                "fruit"
            ];
            return composts.includes(tag);
        }
    }

    function getPaper(tags) {
        var plastic = [];
        tags.forEach(function (tag) {
            if (isPlastic(tag)) {
                plastic.push(tag);
            }
        });
        return plastic;

        function isPlastic(tag) {
            var plastics = [
                "bottle",
                "glass",
                "water",
                "plastic",
                "drinking",
                "beverage"
            ];
            return plastics.includes(tag);
        }
    }

    // Set up our event listener to run the startup process
    // once loading is complete.
    window.addEventListener('load', startup, false);
})();