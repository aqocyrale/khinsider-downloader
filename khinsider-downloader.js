'use strict';

// import

const FileSystem = require('fs');
const Path = require('path');
const Https = require('https');

// run

start(error => {
	if(error) {
		console.error(error);
		process.exit(1);
	} else {
		process.exit(0);
	}
});

// functions

function start(callback) {
	const argvKeyUrl = '--url';
	const argvKeyDir = '--dir';
	
	const {
		[argvKeyDir]: downloadDir,
		[argvKeyUrl]: khinsiderAlbumUrl,
	} = parseProcessArgv(process.argv.slice(2), [ argvKeyDir, argvKeyUrl ]);

	if(!downloadDir || !khinsiderAlbumUrl) {
		console.log(
			'usage:\n    node ' + Path.basename(__filename) + ' ' +
			argvKeyDir + '=./save-files-here ' +
			argvKeyUrl + '=https://downloads.khinsider.com/album-url',
		);
		return callback(null);
	}

	const sessionName = decodeURIComponent(Path.basename(khinsiderAlbumUrl));
	const startDate = new Date();
	console.log('[' + createDateString(startDate) + '] ' + 'start: ' + sessionName);

	try {
		FileSystem.mkdirSync(downloadDir, { recursive: true });
	} catch(error) {
		return callback(error);
	}

	fetchKhinsiderDownloadPageUrls(khinsiderAlbumUrl, (error, khinsiderTrackUrls) => {
		if(error) return callback(error);

		downloadKhinsiderTrackUrls(downloadDir, khinsiderTrackUrls, (error, totalDownloadedBytes) => {
			if(error) return callback(error);

			const endDate = new Date();
			console.log('[' + createDateString(endDate) + '] ' + 'done: ' + sessionName);
			console.log('- downloaded in: ' + createDurationString(endDate - startDate));
			console.log('- download size: ' + byteSizeToFormatted(totalDownloadedBytes));

			callback(null);
		});
	});
}

function downloadKhinsiderTrackUrls(downloadDir, khinsiderTrackUrls, callback) {
	const progressPadSize = khinsiderTrackUrls.length.toString().length;
	const progressTotalString = khinsiderTrackUrls.length.toString().padStart(progressPadSize, ' ');
	
	let totalDownloadedBytes = 0;
	asyncLoopStep(0);

	function asyncLoopStep(i) {
		if(i >= khinsiderTrackUrls.length) return callback(null, totalDownloadedBytes);

		fetchKhinsiderMp3Url(khinsiderTrackUrls[i], (error, mp3Url) => {
			if(error) return callback(error);
	
			const fileName = decodeURIComponent(Path.basename(mp3Url));

			console.log(
				'[' + createDateString() + '] ' +
				'[' + (i + 1).toString().padStart(progressPadSize, ' ') + '/' +
				progressTotalString + '] ' +
				fileName,
			);
			
			downloadFile(mp3Url, Path.join(downloadDir, fileName), (error, downloadedBytes) => {
				if(error) return callback(error);

				totalDownloadedBytes += downloadedBytes;
				asyncLoopStep(i + 1);
			});
		});
	}
}

function fetchKhinsiderMp3Url(khinsiderTrackUrl, callback) {
	Https.get(khinsiderTrackUrl, httpResponse => {
		readEntireStream(httpResponse, (error, bodyBuffer) => {
			if(error) return callback(error);

			const bodyString = bodyBuffer.toString();

			const audioNodeStartIndex = bodyString.indexOf('<audio');
			if(audioNodeStartIndex === -1) {
				return callback(Error('audio node start index not found'));
			}

			const audioSrcStartIndex = bodyString.indexOf('src="', audioNodeStartIndex);
			if(audioSrcStartIndex === -1) {
				return callback(Error('audio src start index not found'));
			}

			const audioSrcEndIndex = bodyString.indexOf('"', audioSrcStartIndex + 'src="'.length);
			if(audioSrcEndIndex === -1) {
				return callback(Error('audio src end index not found'));
			}

			const srcText = bodyString.slice(audioSrcStartIndex + 'src="'.length, audioSrcEndIndex);

			callback(null, srcText);
		});
	}).on('error', callback);
}

function fetchKhinsiderDownloadPageUrls(khinsiderAlbumUrl, callback) {
	Https.get(khinsiderAlbumUrl, httpResponse => {
		readEntireStream(httpResponse, (error, bodyBuffer) => {
			if(error) return callback(error);

			const bodyString = bodyBuffer.toString();

			const songListStartIndex = bodyString.indexOf('<table id="songlist">');
			if(songListStartIndex === -1) {
				return callback(Error('song list start index not found'));
			}

			const songListFirstTrStartIndex = bodyString.indexOf('<tr>', songListStartIndex);
			if(songListStartIndex === -1) {
				return callback(Error('song list first tr start index not found'));
			}

			const songListTrListEndIndex = bodyString.indexOf(
				'<tr id="songlist_footer">',
				songListFirstTrStartIndex,
			);
			if(songListStartIndex === -1) {
				return callback(Error('song list tr list end index not found'));
			}

			const songListTbodyTextContent = bodyString.slice(
				songListFirstTrStartIndex,
				songListTrListEndIndex,
			);

			const khinsiderTrackUrls = [];
			for(const trText of songListTbodyTextContent.split('<tr>')) {
				if(trText.trim() === '') continue;

				const urlStartNeedle = '<td class="clickable-row"><a href="';

				const urlStartIndex = trText.indexOf(urlStartNeedle);
				if(urlStartIndex === -1) {
					return callback(Error('tr url start index not found'));
				}

				const urlEndIndex = trText.indexOf('"', urlStartIndex + urlStartNeedle.length);
				if(urlEndIndex === -1) {
					return callback(Error('tr url end index not found'));
				}

				khinsiderTrackUrls.push(new URL(
					trText.slice(urlStartIndex + urlStartNeedle.length, urlEndIndex),
					khinsiderAlbumUrl,
				).href);
			}

			callback(null, khinsiderTrackUrls);
		});
	}).on('error', callback);
}

function parseProcessArgv(argv, argKeys) {
	const args = {};
	for(const string of argv) {
		for(const argKey of argKeys) {
			if(string.startsWith(argKey + '=')) {
				args[argKey] = string.slice((argKey + '=').length);
				break;
			}
		}
	}
	return args;
}

function createDurationString(durationMs) {
	const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
	const hours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

	const parts = [];
	if(days > 0) {
		parts.push(days + ' days');
	}
	if(hours > 0) {
		parts.push(hours + ' hours');
	}
	if(minutes > 0) {
		parts.push(minutes + ' minutes');
	}
	if(seconds > 0) {
		parts.push(seconds + ' seconds');
	}
	return parts.join(' ');
}

function createDateString(date = new Date()) {
	return date.toISOString().slice(0, 19).replace('T', ' ');
}

function byteSizeToFormatted(byteSize) {
	const units = [ 'Bytes', 'KB', 'MB', 'GB', 'TB' ];
	let unitIndex = 0;
	let size = byteSize;

	while(size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		++unitIndex;
	}

	return size.toFixed(2) + units[unitIndex];
}

function downloadFile(url, filePath, callback) {
	const writeStream = FileSystem.createWriteStream(filePath);
	let downloadedBytes = 0;
	
	Https.get(url, httpResponse => {
		httpResponse.on('data', buffer => {
			downloadedBytes += buffer.length;
		});

		httpResponse.pipe(writeStream);

		writeStream.on('finish', () => {
			writeStream.close(() => {
				callback(null, downloadedBytes);
			});
		});
	}).on('error', callback);
}

function readEntireStream(stream, callback) {
	const chunks = [];

	stream.on('error', callback);
	stream.on('data', buffer => chunks.push(buffer));
	stream.on('end', () => callback(null, Buffer.concat(chunks)));
}
