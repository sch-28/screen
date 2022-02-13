<template>
	<div
		ref="button"
		@click="buttonClick"
		:class="clicked ? 'button pause' : 'button'"
		:style="disabled ? 'border-color: transparent transparent transparent gray;' : ''"
	></div>
</template>

<script>
	export default {
		data() {
			return {
				clicked: false,
			};
		},
		props: {
			record: Boolean,
			disabled: Boolean,
		},
		model: {
			prop: "record",
			event: "toggle",
		},
		methods: {
			buttonClick() {
				if (this.disabled) return;
				this.clicked = !this.clicked;
				this.$emit("toggle", this.clicked);
			},
		},
	};
</script>

<style scoped>
	.button {
		width: 30px;
		height: 30px;
		box-sizing: border-box;
		border-width: 15px 0px 15px 30px;
		border-color: transparent transparent transparent black;
		border-style: solid;
		transition: 100ms all ease;
		cursor: pointer;
	}
	.button.pause {
		border-style: double;
		border-width: 0px 0px 0px 30px;
	}
</style>
