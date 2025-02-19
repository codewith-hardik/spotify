

let currentSong = new Audio();
let play = document.getElementById("play");
let songName = [];
let songs;
let currfolder;

async function getSongs(folder) {
    currfolder = folder;
    let a = await fetch(`songs/${folder}/`);
    let respons = await a.text();
    let div = document.createElement("div");
    div.innerHTML = respons;
    let as = div.getElementsByTagName("a");
    let songs = [];
    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".m4a")) {
            songs.push(element.href.split(`/${folder}/`)[1]);
        }
    }
    let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0];
    songUL.innerHTML = "";
    for (const song of songs) {
        songUL.innerHTML = songUL.innerHTML + `<li>

        
                    <div class="songLogo pointer">
                        <img src="img/music.svg"  class="invert" alt="music">
                    </div>
                    <div class="songInfo">
                        <div class="songName"> ${song.replaceAll("%20", " ").replaceAll("/songs/", '')}</div>
                        <div class="singer">Hardik</div>
                    </div>
                    <div class="playNow pointer">
                        <img src="img/play.svg"  class="invert"  id="play" alt="play">
                    </div>
         </li>`
    }


    // Attach an event listener to each song
    Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", () => {
            playMusic(e.querySelector(".songInfo").firstElementChild.innerHTML.trim());
        })
    })
    // songNames = [];
    // for (let index = 0; index < songs.length; index++) {
    //     songNames.push(songs[index].split("/").slice(-1)[0]);

    // }

    return songs;
}
// second to minuts:second
function secondsToTimeFormat(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "Invalid input";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}



const playMusic = (track, paused = false) => {
    // let autio = new Audio("/songs/"+track);

    currentSong.src = `${currfolder}/` + track;
    if (!paused) {
        currentSong.play();
        play.src = "img/paused.svg"

    }
    document.querySelector(".songInfo-playbar").innerHTML = `${decodeURI(track).replace("/songs/", '')}`;
    document.querySelector(".songTime").innerHTML = `00:00 / 00:00`;
}
const strtSong = (track, paused = false) => {
    // let autio = new Audio("/songs/"+track);
    currentSong.src = `${currfolder}/` + track;
    if (!paused) {
        currentSong.play();
        play.src = "img/paused.svg"

    }
    document.querySelector(".songInfo-playbar").innerHTML = `${decodeURI(track).replace("/songs/", '')}`;
    document.querySelector(".songTime").innerHTML = `00:00 / 00:00`;
}

async function displayAlbums() {
    let a = await fetch(`songs/`)
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a")
    let cardContainer = document.querySelector(".cardContainer")
    let array = Array.from(anchors);

    for (let index = 0; index < array.length; index++) {
        const e = array[index];
        if (e.href.includes("/songs/")) {
            let folder = e.href.split("/").slice(-2)[1];

            // get folder matadata
            let a = await fetch(`songs/${folder}/info.json`);
            let respons = await a.json();

            cardContainer.innerHTML = cardContainer.innerHTML + `<div class="card pointer" data-folder="${folder}">
              <div class="play">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 40 40"
                  width="40"
                  height="40"
                  fill="none"
                  class="pointer"
                >
                  <circle cx="20" cy="20" r="20" fill="#1fdf64" />

                  <path d="M14 10L30 20L14 30V10Z" fill="black" />
                </svg>
              </div>
              <img
                src="/songs/${folder}/cover.jpg"
                alt="card"
              />
              <h2>${respons.titel}</h2>
              <p>${respons.description}</p>
            </div>`
        }
    }
    // update albums data on playlist
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`);
            playMusic(songs[0]);
        })

    })

}
async function main() {

    songs = await getSongs("/songs/cp");
    //display all Albums
    await displayAlbums();
    playMusic(songs[0], true);
    // var autio = new Audio(songs[0]);
    // autio.play();


    // Attach an event liétener to play, next and previous

    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = "img/paused.svg";


        } else {
            currentSong.pause();
            play.src = "img/play.svg";

        }
    })

    // time update
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songTime").innerHTML =
            `${secondsToTimeFormat(currentSong.currentTime)}/${secondsToTimeFormat(currentSong.duration)}`
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    })
    // seekbar eventlistener
    document.querySelector(".seekbar").addEventListener("click", (e) => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = (currentSong.duration * percent) / 100;

    })
    // event for hambarger
    document.querySelector(".hambarger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    })
    // event for crose
    document.querySelector(".x").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-100%";
    })
    // previus & next btn
    document.querySelector("#previus").addEventListener("click", () => {
        let idx = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
        console.log(idx);
        if ((idx - 1) >= 0) {
            playMusic(songs[idx - 1]);
        }
    })
    document.querySelector("#next").addEventListener("click", () => {
        let idx = songs.indexOf(currentSong.src.split("/").slice(-1)[0])

        console.log(idx);
        if ((idx + 1) < songs.length) {
            playMusic(songs[idx + 1]);
        }
    })

    // document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
    //     console.log("Setting volume to", e.target.value, "/ 100")
    //     currentSong.volume = parseInt(e.target.value) / 100
    //     if (currentSong.volume >0){
    //         document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg")
    //     }
    // })

    // set volume 
    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100;
    })

    //  mute the song 
    document.querySelector(".volume>img").addEventListener("click", (e) => {
        if (e.target.src.includes("volume.svg")) {
            e.target.src = e.target.src.replace("img/volume.svg", "img/mute.svg");
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        } else {
            e.target.src = e.target.src.replace("img/mute.svg", "img/volume.svg");
            currentSong.volume = 0.5;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 50;
        }
    })
}



main();
document.addEventListener("DOMContentLoaded", function () {
});




