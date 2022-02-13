<template>
	<v-container class="wrapper">
		<video ref="videoStream" autoplay style="display: none"></video>
		<video ref="videoPreview" autoplay controls width="600" style="display: none"></video>
		<div class="canvas-wrapper"><canvas ref="canvas"></canvas></div>
		<div class="control-wrapper">
			<span>{{ duration }}</span>
			<recordButton v-model="startRecord" @toggle="toggleRecording()" :disabled="!videoStreamSrc" />
			<v-btn @click="askForWindow" class="window-button">Change Window</v-btn>
		</div>
	</v-container>
</template>

<style scoped>
	canvas {
		width: 1000px;
		background: #272727;
		display: block;
	}
	.window-button {
		margin-top: 15px;
	}
	.wrapper {
		display: flex;
		justify-content: center;
		flex-direction: column;
		align-items: center;
		gap: 20px;
	}
	.canvas-wrapper {
		overflow: auto;
		max-width: 80vw;
		max-height: 80vh;
	}

	.control-wrapper {
		display: flex;
		justify-content: center;
		flex-direction: column;
		align-items: center;
		gap: 15px;
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
				return this.rectPreview.endY - this.rectPreview.startY;
			},
			rectPreviewWidth() {
				return this.rectPreview.endX - this.rectPreview.startX;
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
				this.rectPreview.startX += this.rect.startX * rectPreviewScale.x;
				this.rectPreview.startY += this.rect.startY * rectPreviewScale.y;
				Object.keys(this.rectPreview).forEach((key) => (this.rectPreview[key] = parseInt(this.rectPreview[key])));
				this.mouseDown = false;
			},
			reset() {
				this.rectPreview = { startX: 0, startY: 0, endX: 1920, endY: 1080 };
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
					this.ctx.strokeRect(
						this.rect.startX + 0.5,
						this.rect.startY + 0.5,
						this.mousePosition.x - this.rect.startX + 0.5,
						this.mousePosition.y - this.rect.startY + 0.5
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
			//https://stackoverflow.com/a/62065826/17996831
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
