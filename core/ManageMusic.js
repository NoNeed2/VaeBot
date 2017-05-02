var isPlaying = {};
var songData = {};
var songs = {};

exports.stopMusic = function(guild) {
	var connection = guild.voiceConnection;
	if (!connection) return false;
	var voiceChannel = connection.channel;
	var player = connection.player;
	if (!player) return false;
	var dispatcher = player.dispatcher;
	if (!dispatcher) return false;
	isPlaying[guild.id] = false;
	dispatcher.end("StopMusic");
	var realSongData = songData[guild.id];
	realSongData.nowVideo = null;
	realSongData.nowAuthor = null;
	realSongData.voteSkips = [];
	realSongData.isAuto = false;
	return true;
};

exports.clearQueue = function(guild) {
	songs[guild.id] = [];
	return Music.stopMusic(guild);
};

exports.chooseRandomSong = function(guild, autoPlaylist, lastId) {
	var autoSongs = autoPlaylist.songs;
	var newSong = autoSongs[Util.getRandomInt(0, autoSongs.length-1)];
	var video = newSong[0];
	var songId = typeof(video.id) == "object" ? video.id.videoId : video.id;
	if (autoSongs.length > 1 && songId == lastId) {
		return Music.chooseRandomSong(guild, autoPlaylist, lastId);
	} else {
		return newSong;
	}
};

exports.playRealSong = function(newSong, guild, channel, doPrint) {
	console.log("Playing Real Song");
	if (doPrint == null) doPrint = true;
	var video = newSong[0];
	var author = newSong[1];
	var videoId = typeof(video.id) == "object" ? video.id.videoId : video.id;
	var realSongData = songData[guild.id];
	realSongData.nowVideo = video;
	realSongData.nowAuthor = author;
	realSongData.voteSkips = [];
	realSongData.isAuto = false;
	Music.streamAudio(videoId, guild, channel);
	if (doPrint) Util.sendDescEmbed(channel, "Playing " + video.snippet.title, "Added by " + Util.safeEveryone(author.toString()), Util.makeEmbedFooter(author), null, 0x00E676);
};

exports.playNextQueue = function(guild, channel, doPrint) {
	console.log("Playing Next Queue");
	if (doPrint == null) doPrint = true;
	var realSongs = songs[guild.id];
	var autoPlaylist = Data.guildGet(guild, playlist);
	console.log("\nrealSongs");
	console.log(realSongs.length);
	console.log("-------Playing Next Queue---------");
	if (realSongs.length > 0) {
		var newSong = realSongs[0];
		Music.playRealSong(newSong, guild, channel, doPrint);
	} else if (autoPlaylist.hasOwnProperty("songs") && autoPlaylist.songs.length > 0) {
		console.log("Playing Next Queue, Playing Next Auto");
		Music.playNextAuto(guild, channel, true);
	} else {
		Music.stopMusic(guild);
	}
};

exports.playNextAuto = function(guild, channel, doPrint) {
	var autoPlaylist = Data.guildGet(guild, playlist);
	if (!autoPlaylist.hasOwnProperty("songs") || autoPlaylist.songs.length === 0) {
		Music.stopMusic(guild);
		return;
	}
	var realSongData = songData[guild.id];
	var lastId = "";
	if (realSongData.isAuto === true) lastId = typeof(realSongData.nowVideo.id) == "object" ? realSongData.nowVideo.id.videoId : realSongData.nowVideo.id;
	var newSong = Music.chooseRandomSong(guild, autoPlaylist, lastId);
	var video = newSong[0];
	var author = newSong[1];
	/*var newSongNum = songNum+1;
	if (newSongNum >= autoSongs.length) newSongNum = 0;
	autoPlaylist.songNum = newSongNum;
	Data.guildSaveData(playlist);*/
	console.log("Playing Next Auto");
	var videoId = typeof(video.id) == "object" ? video.id.videoId : video.id;
	realSongData.nowVideo = video;
	realSongData.nowAuthor = author;
	realSongData.voteSkips = [];
	realSongData.isAuto = true;
	Music.streamAudio(videoId, guild, channel);
	if (doPrint) Util.sendDescEmbed(channel, "[Auto-Playlist-Started]", "Playing " + video.snippet.title, Util.makeEmbedFooter(null), null, 0x00E676);
};

exports.streamAudio = function(remote, guild, channel) {
	var connection = guild.voiceConnection;
	if (connection == null) return Util.commandFailed(channel, "System", "Bot is not connected to a Voice Channel");
	var voiceChannel = connection.channel;

	var oldPlayer = connection.player;
	if (oldPlayer) {
		var oldDispatcher = oldPlayer.dispatcher;
		if (oldDispatcher) {
			oldDispatcher.end("NewStreamAudio");
		}
	}

	console.log("Streaming Audio: " + remote);
	const streamOptions = {seek: 0, volume: 1, passes: 1};

	const stream = yt(remote, {filter: 'audioonly'});
	const dispatcher = connection.playStream(stream, streamOptions);

	isPlaying[guild.id] = true;

	dispatcher.on("end", reason => {
		if (reason == "NewStreamAudio" || reason == "StopMusic") return;
		if (isPlaying[guild.id]) {
			console.log("Track Ended: " + reason);
			var realSongData = songData[guild.id];
			var realSongs = songs[guild.id];

			if (realSongs.length > 0) {
				var video = realSongs[0][0];
				var videoId = typeof(video.id) == "object" ? video.id.videoId : video.id;
				if (videoId == remote) realSongs.splice(0, 1);
			}

			if (voiceChannel.members.size > 1) {
				var autoPlaylist = Data.guildGet(guild, playlist);
				if (realSongs.length === 0 && realSongData.isAuto === true) {
					console.log("Track Ended, Playing Next Auto");
					Music.playNextAuto(guild, channel);
				} else {
					Music.playNextQueue(guild, channel, true);
				}
			} else {
				Music.stopMusic(guild);
				Util.print(channel, "Auto stopping audio | No users in voice");
			}
		}
	});
};

exports.joinMusic = function(guild, channel, func) {
	var connection = guild.voiceConnection;
	if (connection == null) {
		var musicChannel = Util.findVoiceChannel("music", guild);
		if (musicChannel) {
			musicChannel.join()
			.then(connection => {
				func(connection);
			})
			.catch(error => console.log("\n[E_JoinMusic] " + error));
		} else {
			Util.print(channel, "Not connected to a voice channel");
			return;
		}
	} else {
		func(connection);
	}
};

exports.addSong = function(speaker, guild, channel, video) {
	var realSongs = songs[guild.id];
	realSongs.push([video, speaker]);
	if (realSongs.length <= 1 || songData[guild.id].isAuto === true) {
		Music.playNextQueue(guild, channel, true);
	} else {
		Util.sendDescEmbed(channel, "[" + realSongs.length + "] Audio Queue Appended", video.snippet.title, Util.makeEmbedFooter(speaker), null, 0x00E676);
	}
};