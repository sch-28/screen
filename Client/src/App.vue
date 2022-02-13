<template>
	<v-app>
		<v-main>
			<router-view />
		</v-main>
	</v-app>
</template>

<style>
	::-webkit-scrollbar {
		width: 0.5vw;
		height: 0.5vh;
	}

	/* Track */
	::-webkit-scrollbar-track {
		background: rgb(39 39 39);
	}

	/* Handle */
	::-webkit-scrollbar-thumb {
		background: #2196f3;
	}

	/* Handle on hover */
	::-webkit-scrollbar-thumb:hover {
		background: #5ca7e3;
	}
</style>

<script>
	export default {
		name: "App",

		data: () => ({
			//
		}),
	};
</script>
