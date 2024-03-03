# khinsider downloader

khinsider.com album batch downloaded

## dependencies

requires nodejs

## usage

- make sure nodejs is in the path
```
node -v
```

- from the command line (cmd or powershell) cd to khinsider-downloader.js then edit and run this command:
```
node khinsider-downloader.js --dir=./desktop/something --url=https://downloads.khinsider.com/game-soundtracks/album/something
```

- edit the --dir parameter to point at a directory path on your pc to download to.
the directory will be created if it doesn't exist

- edit the --url parameter to point at a khinsider url to download from

## expected output

```
[2024-03-03 12:34:56] start: khinsider-album-name
[2024-03-03 12:34:56] [ 1/15] 01 track-title.mp3
...
[2024-03-03 12:35:26] [15/15] 15 track-title.mp3
[2024-03-03 12:35:26] done: khinsider-album-name
- downloaded in: 30 seconds
- download size: 123.45MB
```

## license

MIT
