const video = document.getElementById("videoInput");
const videoPreview = document.getElementById("videoPreview");
const canvas = document.getElementById("canvas");

canvas.width = 1280;
canvas.height = 720;

const mousePosition = { x: 0, y: 0 };
const rect = { startX: 0, startY: 0, endX: canvas.width, endY: canvas.height };
let rectPreview = { ...rect };

const scale = { x: 1, y: 1 };

let mouseDown = false;

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

ctx.strokeStyle = "blue";
ctx.lineWidth = 2;

window.onload = startStream;

let recorder = null;

function startStream() {
	navigator.mediaDevices.getDisplayMedia({ audio: true, video: true }).then((stream) => {
		video.onplay = drawPreview;
		video.onloadedmetadata = () => {
			scale.x = video.videoWidth / canvas.width;
			scale.y = video.videoHeight / canvas.height;
		};
		canvas.onmousemove = getMousePosition;
		canvas.onmousedown = startRect;
		canvas.onmouseout = stopRect;
		canvas.onmouseup = stopRect;
		video.srcObject = stream;
	});
}

function getMousePosition(e) {
	const canvasOffset = canvas.getBoundingClientRect();
	const offsetX = canvasOffset.left;
	const offsetY = canvasOffset.top;
	mousePosition.x = parseInt(e.clientX - offsetX);
	mousePosition.y = parseInt(e.clientY - offsetY);
}

function startRect(e) {
	e.preventDefault();
	e.stopPropagation();
	rect.startX = mousePosition.x;
	rect.startY = mousePosition.y;
	mouseDown = true;
}

function stopRect(e) {
	e.preventDefault();
	e.stopPropagation();
	if (!mouseDown) return;
	rect.endX = mousePosition.x;
	rect.endY = mousePosition.y;
	const rectPreviewScale = {
		x: getRectWidth() / canvas.width,
		y: getRectHeight() / canvas.height,
	};
	rectPreview.endX = rectPreview.startX + rect.endX * rectPreviewScale.x;
	rectPreview.endY = rectPreview.startY + rect.endY * rectPreviewScale.y;
	rectPreview.startX += rect.startX * rectPreviewScale.x;
	rectPreview.startY += rect.startY * rectPreviewScale.y;
	Object.keys(rectPreview).forEach((key) => (rectPreview[key] = parseInt(rectPreview[key])));
	mouseDown = false;
}

function getRectHeight() {
	return rectPreview.endY - rectPreview.startY;
}
function getRectWidth() {
	return rectPreview.endX - rectPreview.startX;
}

function reset() {
	rectPreview = {
		startX: 0,
		startY: 0,
		endX: canvas.width,
		endY: canvas.height,
	};
}

function drawPreview() {
	if (getRectHeight() == 0 || getRectWidth() == 0) reset();

	ctx.drawImage(
		video,
		parseInt(rectPreview.startX * scale.x),
		parseInt(rectPreview.startY * scale.y),
		parseInt(getRectWidth() * scale.x),
		parseInt(getRectHeight() * scale.y),
		0,
		0,
		canvas.width,
		canvas.height
	);

	if (mouseDown) ctx.strokeRect(rect.startX, rect.startY, mousePosition.x - rect.startX, mousePosition.y - rect.startY);

	window.requestAnimationFrame(drawPreview);
}

// eslint-disable-next-line no-unused-vars
function stopRecord() {
	recorder?.stop();
}

//https://stackoverflow.com/a/62065826/17996831
// eslint-disable-next-line no-unused-vars
function record() {
	const recordedChunks = [];
	return new Promise(function (res) {
		const stream = canvas.captureStream(25 /*fps*/);
		recorder = new MediaRecorder(stream, {
			mimeType: "video/webm; codecs=vp9",
		});

		recorder.start(60000);

		recorder.ondataavailable = function (event) {
			recordedChunks.push(event.data);

			//stops after 1min
			if (recorder.state === "recording") {
				recorder.stop();
			}
		};

		recorder.onstop = function () {
			var blob = new Blob(recordedChunks, { type: "video/webm" });
			var url = URL.createObjectURL(blob);
			console.log(url);
			videoPreview.src = url;
			res(url);
		};
	});
}
