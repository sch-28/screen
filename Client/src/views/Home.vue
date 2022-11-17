<template>
	<v-container class="wrapper">
		<video ref="videoStream" autoplay style="display: none"></video>
		<video ref="videoPreview" autoplay controls width="600" style="display: none"></video>
		<div class="canvas-wrapper">
			<div class="overflow">
				<canvas ref="canvas"></canvas>
			</div>
			<button @click="askForWindow" class="window-button"></button>
			<span class="duration-span" ref="duration-span">{{ duration }}</span>
		</div>
		<div class="control-wrapper">
			<recordButton v-model="startRecord" @toggle="toggleRecording()" :disabled="!videoStreamSrc" />
			<!-- <v-btn @click="askForWindow" class="window-button">Change Window</v-btn> -->
		</div>
	</v-container>
</template>

<style scoped>
	canvas {
		max-width: 1250px !important;
		max-height: 703.13px !important;
		display: block;
		background: #272727;
	}
	.canvas-wrapper .overflow {
		overflow: auto;
		max-width: 80vw;
		max-height: 80vh;
	}
	.canvas-wrapper {
		border: solid gray;
		border-width: 20px 20px 35px 20px;
		box-sizing: content-box;
		border-radius: 15px;
		position: relative;
		background: #272727;
	}

	.canvas-wrapper .window-button {
		content: "";
		position: absolute;
		width: 20px;
		height: 20px;
		background: lightgray;
		left: calc(50% - 10px);
		bottom: -27.5px;
		border-radius: 50%;
		transition: all 100ms ease;
	}

	.canvas-wrapper .duration-span {
		position: absolute;
		bottom: -30px;
		color: lightgray;
		right: 0;
	}
	.duration-span.hidden {
		display: none;
	}

	.canvas-wrapper .window-button:hover {
		box-shadow: 0 0 4px 2px rgba(255, 255, 255, 0.2), 0 0 10px 4px rgba(37, 21, 255, 0.2),
			0 0 16px 6px rgba(27, 209, 255, 0.2);
	}
	.wrapper {
		display: flex;
		justify-content: center;
		flex-direction: column;
		align-items: center;
		height: calc(100% - 35px);
	}

	.control-wrapper {
		background: lightgray;
		display: flex;
		justify-content: center;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		padding: 20px;
		position: relative;
	}

	.control-wrapper::after {
		width: 500px;
		max-width: 90vw;
		height: 35px;
		bottom: -35px;
		background: #272727;
		content: "";
		position: absolute;
		border-radius: 20px 20px 0px 0px;
	}
</style>

<script>
	import recordButton from "../components/recordButton.vue";
	export default {
		name: "Home",
		data() {
			return {
				scale: { x: 1, y: 1 },
				mouseDown: false,
				mousePosition: { x: 0, y: 0 },
				rect: { startX: 0, startY: 0, endX: 0, endY: 0 },
				rectPreview: { startX: 0, startY: 0, endX: 1920, endY: 1080 },
				startRecord: false,
				recorder: null,
				videoStreamSrc: null,

				timer: null,
				startTime: 0,
				duration: "00:00:00",
			};
		},
		computed: {
			videoStream() {
				return this.$refs?.videoStream;
			},
			canvas() {
				return this.$refs?.canvas;
			},
			videoPreview() {
				return this.$refs?.videoStream;
			},
			ctx() {
				return this.$refs.canvas.getContext("2d");
			},
			rectPreviewHeight() {
				return Math.abs(this.rectPreview.endY - this.rectPreview.startY);
			},
			rectPreviewWidth() {
				return Math.abs(this.rectPreview.endX - this.rectPreview.startX);
			},
		},
		components: {
			recordButton,
		},
		mounted() {
			this.askForWindow();
		},
		methods: {
			updateTimer() {
				const timerDate = new Date(Date.now() - this.startTime);
				//timer preview cannot show above 1h
				timerDate.setHours(0);
				this.duration = timerDate.toLocaleTimeString();
			},
			askForWindow() {
				this.reset();
				this.videoStream.srcObject = null;
				this.videoStream.muted = false;
				navigator.mediaDevices
					.getDisplayMedia({
						audio: {
							autoGainControl: false,
							echoCancellation: false,
							googAutoGainControl: false,
							noiseSuppression: false,
						},
						video: true,
					})
					.then(this.startStream);
			},
			startStream(stream) {
				this.videoStream.onplay = this.draw;
				this.videoStream.onloadedmetadata = () => {
					this.canvas.width = this.rectPreview.endX;
					this.canvas.height = this.rectPreview.endY;
					this.scale.x = this.videoStream.videoWidth / this.canvas.width;
					this.scale.y = this.videoStream.videoHeight / this.canvas.height;
					this.videoStream.muted = true;
				};
				this.canvas.onmousemove = this.getMousePosition;
				this.canvas.onmousedown = this.startRect;
				this.canvas.onmouseout = this.stopRect;
				this.canvas.onmouseup = this.stopRect;
				this.videoStream.srcObject = stream;
				this.videoStreamSrc = stream;
			},
			getMousePosition(e) {
				const canvasOffset = this.canvas.getBoundingClientRect();
				const offsetX = canvasOffset.left;
				const offsetY = canvasOffset.top;
				const scaleX = this.canvas.width / this.canvas.clientWidth;
				const scaleY = this.canvas.height / this.canvas.clientHeight;
				this.mousePosition.x = parseInt((e.clientX - offsetX) * scaleX);
				this.mousePosition.y = parseInt((e.clientY - offsetY) * scaleY);
			},
			startRect(e) {
				e.preventDefault();
				e.stopPropagation();
				this.rect.startX = this.mousePosition.x;
				this.rect.startY = this.mousePosition.y;
				this.mouseDown = true;
			},
			stopRect(e) {
				e.preventDefault();
				e.stopPropagation();
				if (!this.mouseDown) return;
				this.rect.endX = this.mousePosition.x;
				this.rect.endY = this.mousePosition.y;
				const rectPreviewScale = {
					x: this.rectPreviewWidth / this.canvas.width,
					y: this.rectPreviewHeight / this.canvas.height,
				};
				this.rectPreview.endX = this.rectPreview.startX + this.rect.endX * rectPreviewScale.x;
				this.rectPreview.endY = this.rectPreview.startY + this.rect.endY * rectPreviewScale.y;
				/* this.rectPreview.endY =
					this.rectPreview.startY +
					(this.rect.startY + (this.rect.endX - this.rect.startX) * 0.5625) * rectPreviewScale.y; */
				this.rectPreview.startX += this.rect.startX * rectPreviewScale.x;
				this.rectPreview.startY += this.rect.startY * rectPreviewScale.y;
				Object.keys(this.rectPreview).forEach((key) => (this.rectPreview[key] = parseInt(this.rectPreview[key])));
				this.mouseDown = false;
				this.resizeCanvas(this.rectPreviewWidth, this.rectPreviewHeight);
			},
			reset() {
				this.rectPreview = { startX: 0, startY: 0, endX: 1920, endY: 1080 };
				this.resizeCanvas(this.rectPreviewWidth, this.rectPreviewHeight);
			},
			resizeCanvas(width, height) {
				this.canvas.width = width;
				this.canvas.height = height;
				if (this.canvas.width < 150) {
					this.$refs["duration-span"].classList.add("hidden");
				} else {
					this.$refs["duration-span"].classList.remove("hidden");
				}
			},
			draw() {
				if (this.rectPreviewHeight == 0 || this.rectPreviewWidth == 0) this.reset();

				this.ctx.drawImage(
					this.videoStream,
					parseInt(this.rectPreview.startX * this.scale.x),
					parseInt(this.rectPreview.startY * this.scale.y),
					parseInt(this.rectPreviewWidth * this.scale.x),
					parseInt(this.rectPreviewHeight * this.scale.y),
					0,
					0,
					this.canvas.width,
					this.canvas.height
				);

				if (this.mouseDown) {
					this.ctx.strokeStyle = "#2196f3";
					this.ctx.lineWidth = 5;
					/* this.ctx.strokeRect(
						this.rect.startX,
						this.rect.startY,
						this.mousePosition.x - this.rect.startX,
						(this.mousePosition.x - this.rect.startX) * 0.5625
					); */
					this.ctx.strokeRect(
						this.rect.startX,
						this.rect.startY,
						this.mousePosition.x - this.rect.startX,
						this.mousePosition.y - this.rect.startY
					);
				}
				window.requestAnimationFrame(this.draw);
			},
			toggleRecording() {
				if (this.startRecord) this.startRecording();
				else this.stopRecording();
			},
			stopRecording() {
				clearInterval(this.timer);
				this.duration = "00:00:00";
				this.recorder?.stop();
			},
			startTimer() {
				this.startTime = Date.now();
				this.timer = setInterval(this.updateTimer, 1000);
			},
			startRecording() {
				this.startTimer();
				const recordedChunks = [];
				const videoStream = this.canvas.captureStream(25).getTracks()[0];
				const audioStream = this.videoStream
					.captureStream()
					.getTracks()
					.find((track) => track.kind == "audio");

				const outputTracks = [];
				outputTracks.push(videoStream);
				if (audioStream) outputTracks.push(audioStream);
				const outputStream = new MediaStream(outputTracks);

				this.recorder = new MediaRecorder(outputStream, {
					mimeType: "video/webm; codecs=vp9,opus",
				});
				//no video limit?
				this.recorder.start();
				this.recorder.ondataavailable = (event) => {
					recordedChunks.push(event.data);
					//stops after 1min
					/* if (this.recorder.state === "recording") {
						this.recorder.stop();
					} */
				};

				this.recorder.onstop = () => {
					var blob = new Blob(recordedChunks, { type: "video/webm" });
					var url = URL.createObjectURL(blob);
					//window.location.assign(url);
					this.downloadVideo(url);
					//URL.revokeObjectURL(url);
					//this.videoPreview.src = url;
				};
			},

			downloadVideo(url) {
				const a = document.createElement("a");
				document.body.appendChild(a);
				a.style = "display: none";
				a.href = url;
				a.download = `clip-${Date.now()}`;
				a.click();
				URL.revokeObjectURL(url);
			},
		},
	};
</script>
