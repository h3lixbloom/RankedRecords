import React, {useState, useEffect} from "react"
import SpotifyWebApi from "spotify-web-api-node"
import { Dropdown, Button, Modal, Icon, Image, Label, Form, Radio } from 'semantic-ui-react'
import { ToastContainer, toast } from 'react-toastify';
import Creatable from 'react-select/creatable';

import CustomTable from "./CustomTable";
import Login from "./Login"
import { FAQModalContent } from "./ModalContent";
import { PopularityTip } from "./PopularityTip";
import useAuth from "./hooks/useAuth"

import 'react-toastify/dist/ReactToastify.css';
import "./Dashboard.css"
import spotifyLogo from "./static/Spotify_Logo_RGB_White.png"

const codeURL =  new URLSearchParams(window.location.search).get("code")

const spotifyApi = new SpotifyWebApi({
    clientId: "261761120bec41c0a86bdfeb8f0c43f9"
})

// something tells me that in a year i'm going to come back to look at this and think
// "what was I doing"

// Honestly I would not look at this file if I were you. Just appreciate the magic it does :) 

const errorStr = `Please try refreshing the page - your session may have timed out. If the problem persists, please contact the developer.`;

export default function Dashboard({code}) {    
    const [firstLoginModalOpen, setFirstLoginModalOpen] = useState(true)

    const [userLogin, setUserLogin] = useState(false)
    const [currentUser, setCurrentUser] = useState({})

    const [searchValue, setSearchValue] = useState("")
    const [searchResults, setSearchResults] = useState([])
    
    const [artistName, setArtistName] = useState("")
    const [artistResults, setArtistResults] = useState([]);
    const [artistID, setArtistID] = useState("");

    const [artistAlbumOffset, setArtistAlbumOffset] = useState(0);
    const [albumTrackOffset, setAlbumTrackOffset] = useState(0);
    const [trackOffset, setTrackOffset] = useState(0);

    const [albumList, setAlbumList] = useState([]);
    const [trackList, setTrackList] = useState([]);
    const [trackListPop, setTrackListPop] = useState([]);
    const [finalTrackList, setFinalTrackList] = useState([]);

    const [doneLoadingAlbums, setDoneLoadingAlbums] = useState(false);
    const [doneLoadingTracks, setDoneLoadingTracks] = useState(false);
    const [doneLoadingTracksPop, setDoneLoadingTracksPop] = useState(false);
    const [doneLoadingFinalTrackList, setDoneLoadingFinalTrackList] = useState(false);

    const [disableEntering, setDisableEntering] = useState(false);
    const [faqOpen, setFaqOpen] = useState(false);
    const [playlistCreatorOpen, setPlaylistCreatorOpen] = useState(false);

    const [newPlaylist, setNewPlaylist] = useState({});
    const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
    const [defaultDropVal, setDefaultDropVal] = useState(undefined);
    const [playlistFilters, setPlaylistFilters] = useState([]);
    const [trackMax, setTrackMax] = useState("All");

    const [sortMethod, setSortMethod] = useState("popularity");
    const [sortedDir, setSortedDir] = useState("descending");

    const [filteredPlaylist, setFilteredPlaylist] = useState([null]);

    const accessTokenReg = useAuth(code, false)
    const accessTokenLog = useAuth(codeURL, true);

    const sortOptions = [
        {
          key: 'popularity',
          text: 'Popularity',
          value: 'popularity',
        },
        {
            key: 'chronology',
            text: 'Chronology',
            value: 'release_date',
          },
  
    ]

    const defaultFilterOptions = [
        {label: 'remix', value: 'remix'},
        {label: 'commentary', value: 'commentary'},
        {label: 'karaoke', value: 'karaoke'},
        {label: 'instrumental', value: 'instrumental'},
        {label: 'acoustic', value: 'acoustic'},
        {label: 'voice memo', value: 'voice memo'},
    ];

    const toastContent = (message) => toast(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        progress: undefined,
    });   
    
    function resetFields() {
        setSearchResults([]);

        setArtistAlbumOffset(0);
        setAlbumTrackOffset(0);
        setTrackOffset(0);

        setAlbumList([]);
        setTrackList([]);
        setTrackListPop([]);
        setFinalTrackList([]);

        setNewPlaylist({});
        setFilteredPlaylist([]);
        setPlaylistFilters([]);
        setTrackMax("All");
    
        setDoneLoadingAlbums(false);
        setDoneLoadingTracks(false);
        setDoneLoadingTracksPop(false);
        setDoneLoadingFinalTrackList(false);

        setSortedDir("descending");
    }

    function handleChange(e, data) {
        let temp = data.options.filter(x => x.value === data.value);
        window.localStorage.setItem("currentArtistName", temp[0].text);
        window.localStorage.setItem("currentArtistID", temp[0].value);
        window.localStorage.setItem("currentArtistImage", temp[0].image.src);
        setArtistName(temp[0].text);
        setArtistID(temp[0].value);
        resetFields();
        setDisableEntering(true);
        setDefaultDropVal(undefined);
    }

    function handleSearchChange(e, data) {
        setSearchValue(e.target.value);
    }

    function handleClose(e, data) {
        setSearchValue(undefined);
    }

    function customSearch(options, query) {
        if(query === "") return [];
        return options;
    }   

    function handleFilterChange(values){
        setPlaylistFilters(values.map((filter) => filter.value));
    }

    function handleSongLimit(e, data) {
        setTrackMax(data.value);
    }

    function handleSortChange(e, data) {
        setSortMethod(data.value);
        window.localStorage.setItem("sortMethod", data.value);
    }

    function logOut() {
        setCurrentUser({});
        setUserLogin(false);
        toastContent(`❌ Logged out!`);
        window.open("https://accounts.spotify.com/logout", '_blank');
    }

    // this function needs to be rewritten and reorganized. 
    function createPlaylist() {
        let today = new Date().toISOString().slice(0, 10);

        // default max popularity
        let playlistTitle = `The ${artistName} Master Playlist`;
        let playlistDescBeginning = `All of ${artistName}'s songs,`;
        let playlistDescRanked = `ranked ${sortedDir === "ascending" ? "in ascending " : "by "}popularity. `;
        let filteredStr = "";

        if(sortMethod === "popularity") {
            if(trackMax !== "All") {
                playlistTitle = `${artistName}'s ${sortedDir === "ascending" ? "Bottom" : "Top"} ${trackMax} Tracks`;
                playlistDescBeginning = `${artistName}'s ${sortedDir === "ascending" ? "bottom" : "top"} ${trackMax} songs,`;
            }    
        } else if(sortMethod === "release_date") {
            if(trackMax === "All") {
                playlistDescRanked = `in${sortedDir === "ascending" ? "" : " reverse"} chronological release order. `;
            } else {
                playlistTitle = `${artistName}'s ${trackMax} ${sortedDir === "ascending" ? "Oldest" : "Latest"} Tracks`;
                playlistDescBeginning = `${artistName}'s ${trackMax} ${sortedDir === "ascending" ? "oldest" : "latest"} songs.`;
                playlistDescRanked = "";
            }
        }

        if(playlistFilters.length > 0) {
            filteredStr = `Filters used: ${playlistFilters.join(", ")}. `
        }

        spotifyApi.createPlaylist(`${playlistTitle}`, {
                                  'description': `${playlistDescBeginning} ${playlistDescRanked}${filteredStr}Generated by 💿 Ranked Records (https://hannahguo.me/RankedRecords/) on ${today}`, 
                                  'public': true
                                }).then(async (data) => {  

            let playlistID = data.body.id;
            let songURIs = filteredPlaylist.length <= finalTrackList.length ? filteredPlaylist : finalTrackList.map((val) => val.uri);
            
            if(trackMax !== "All") {
                songURIs = songURIs.slice(0, trackMax)
            }
            
            let maxSize = trackMax === "All" || parseInt(trackMax) > 100 ? 100 : parseInt(trackMax);
    
            for (let i = 0; i < songURIs.length; i += maxSize) {
                await spotifyApi.addTracksToPlaylist(playlistID, songURIs.slice(i, i + maxSize)).then((data) => {
                    console.log(`Success! - Set ${(i + 1)} Tracks Loaded `);
                }).catch((err) => {
                    console.log("Error on playlist creation ", {err});
                })
            }

            setNewPlaylist(data.body);
        }).catch((err) => {
            console.log({err});
            alert(errorStr + " Playlist Creation")
        });

        console.log({newPlaylist})
    }

    function userWidget() {
        return <>{userLogin && accessTokenLog && currentUser && currentUser.images ? 
            <div>
                {currentUser.images[0] && currentUser.images[0].hasOwnProperty("url") && <Image src={currentUser.images[0].url} avatar />}
                <span>Logged in as {currentUser.display_name} &nbsp;
                <span id="logOutSpan" onClick={logOut}> 
                   (Log out - due to technical limitations, logging out here will log you out of ALL Spotify applications.)
                </span>
                </span>
            </div>
            :
            <>
                Connect your account with Spotify to create playlists!
            </>
        }</>
    }

    function generationWidget() {
        let divideWidget = [];

        for(let i = 50; i < filteredPlaylist.length; i += 50) {
            divideWidget.push(i.toString());
        }

        return <>{accessTokenLog && userLogin && artistName && 
        <div id="generationWidget">
            <h3>Playlist Generation Settings</h3>

            <h5>Current Sort Method: {sortMethod === "release_date" ? "Chronology" : "Popularity"} ({sortedDir})</h5>
            <p>Close this window to change sort method.</p>

            <h5>Filters</h5>
            <p>Filter out any songs with the following words (NOT case-sensitive, and any song with your filters in its name will be removed):</p>
            <p>You can add your own custom filters by typing them in!</p>
            <Creatable
                id="filterSelect"
                placeholder="Select filters (type to add custom)"
                isMulti
                onChange={handleFilterChange}
                options={defaultFilterOptions}
            />
            <h5>Number of Tracks</h5>
            <Form>
                <Form.Field>
                Current Number: <b>{trackMax}</b>
                </Form.Field>
                <Form.Field>
                    <Radio
                        label={`All Songs ${filteredPlaylist ? `(${filteredPlaylist.length})` : ""}`}
                        name='radioGroup'
                        value={"All"}
                        checked={trackMax === "All"}
                        onChange={handleSongLimit}
                    />
                </Form.Field>
                {divideWidget.map((divideVal) =>
                    <Form.Field key={`"dividewidget${divideVal}`}>
                        <Radio
                            label={`${divideVal} Songs`}
                            name='radioGroup'
                            value={divideVal}
                            checked={trackMax === divideVal}
                            onChange={handleSongLimit}
                        />
                    </Form.Field>
                )
            }
            </Form>
        </div>}</>
    }

    function loginButton() {
        return <>{!userLogin && 
                <Login setUserLogin={setUserLogin} currentUser={currentUser.display_name}/>}</>;
    }

    useEffect(() => {
        if(newPlaylist.external_urls) {
            setPlaylistModalOpen(true);
        }
    }, [newPlaylist])

    useEffect(() => {
        let tempPlaylist = finalTrackList.map((val) => {
            if(!playlistFilters.some(fil => val.name.toLowerCase().includes(fil.toLowerCase()))) {
                return val.uri;
            }

            return null;
        }).filter(val => val);

        setFilteredPlaylist(tempPlaylist)
    }, [playlistFilters, finalTrackList])

    useEffect(() => {
        setTrackMax("All");
    }, [playlistFilters])

    // This hook handles local storage - basically whenever the search changes, the current artist in stored in local storage. 
    // Then if someone just authenticated, we can load it immediately (unfortunately the tracks need to be reloaded, can't really store
    // that in localStorage).
    useEffect(() => {
        if(codeURL) {
            setUserLogin(true);
            
            localStorage.setItem("userAuthToken", codeURL);

            let counter = 0;

            let artistName = localStorage.getItem("currentArtistName");
            let artistID = localStorage.getItem("currentArtistID");
            let artistImage = localStorage.getItem("currentArtistImage");
            let loadedSort = window.localStorage.getItem("sortMethod");
            let loadedSortDir = window.localStorage.getItem("sortedDir");

            if(artistName && artistName !== "null") {
                setArtistName(artistName);
                counter++;
            } 

            if(artistID && artistID !== "null") {
                setArtistID(artistID);
                counter++;
            }

            if(artistImage && artistImage !== "null") {
                counter++;
            }

            if(loadedSort && loadedSort !== "null") {
                setSortMethod(loadedSort);
                counter++;
            }

            if(loadedSortDir && loadedSortDir !== "null") {
                setSortedDir(loadedSortDir);
                counter++;
            }

            if(counter >= 4) {
                let newObj = {
                    image: {src: artistImage},
                    key: artistName + artistID,
                    text: artistName,
                    value: artistID,
                }
                setArtistResults([newObj]);
                setDefaultDropVal(artistID);    
            }
        } else {
            setArtistID("");
            localStorage.setItem("currentArtistID", null);
            localStorage.setItem("currentArtistName", null);
            localStorage.setItem("currentArtistImage", null);
            localStorage.setItem("userAuthToken", null);
            localStorage.setItem("sortMethod", null);
            localStorage.setItem("sortedDir", null);

            // would expire after, needs to be fixed
            // if(localStorage.getItem("userAuthToken")) {
            //     setUserLogin(true);
            // } else {
                setUserLogin(false);
            // }
        }
    }, [])

    // We have two seperate access tokens - one with login (Log), and one regular (Reg)
    // This is because I really wanted the site to have the option to be used with/without auth.
    useEffect(() => {
        if(!accessTokenReg) return;

        if(userLogin && accessTokenLog) {
            spotifyApi.setAccessToken(accessTokenLog)
        } else {
            spotifyApi.setAccessToken(accessTokenReg)
        }
    }, [userLogin, accessTokenLog, accessTokenReg])


    // Attempts to get the current logged in user - well, hopefully it works.
    useEffect(() => {
        if(userLogin && accessTokenLog) {
            spotifyApi.getMe().then(res => {
                setCurrentUser(res.body);
                toastContent(`✅ Logged in as ${res.body.display_name}`);
                let artistName = localStorage.getItem("currentArtistName");
                setPlaylistCreatorOpen(artistName && artistName !== "null");
            }).catch((err) => {
                console.log('Something went wrong!', err, "Code URL: ", codeURL, accessTokenLog);
                alert(errorStr + " Login Issue")
            });
        }
    }, [userLogin, accessTokenLog]);

    // Hahaha every hook after this gets messy
    // This one loads the search results - it's a little laggy because of how many queries are being made
    // Hence the limit of 5
    useEffect(() => {
        if(disableEntering) return;
        if(!searchValue || searchValue === "") return;
        if(!accessTokenReg) return;

        spotifyApi.searchArtists(searchValue, {limit: 5}).then(res => {
            setSearchResults(res)
            
            if(res === [] || !searchResults.body) return;

            let filteringArtists = [];
            
            searchResults.body.artists.items.forEach((item) => {
                let currentArtist = (({name, id}) => ({name, id}))(item);

                const { name: key, name: text, id: value, ...rest } = currentArtist;
                const new_obj = { key, text, value, ...rest }

                new_obj.image = {};
                new_obj.image.src = item.images[0] === undefined ? "" : item.images[0].url;

                new_obj.key = new_obj.key + item.id;

                filteringArtists.push(new_obj);
            });
            setArtistResults(filteringArtists);

        }).catch((err) => {
            console.log({err})
            alert(errorStr)
        })

    }, [disableEntering, searchValue, accessTokenReg, searchResults]);


    // Once we have an artist selected, it's time to do the big work.
    // This hook gets all of an artist's albums, filtering out compilations
    // This needs to be a hook because of artistAlbumOffset - we need to increase
    // the offset each load so that we can get the next set of albums
    useEffect(() => {
        if(!artistID) return;

        if(doneLoadingAlbums || artistAlbumOffset === -1) {
            setDoneLoadingAlbums(true);
            return;
        }

        spotifyApi.getArtistAlbums(artistID, {"offset": artistAlbumOffset}).then(res => {
            res.body.items.forEach((album) => {
                if(album.album_type === "compilation") return;
                setAlbumList(existingAlbums => [...existingAlbums, {id: album.id, name: album.name, total_tracks: album.total_tracks}])
            })
            
            if(res.body.items.length < 20) {
                setArtistAlbumOffset(-1);
                setDoneLoadingAlbums(true);
            } else {
                setArtistAlbumOffset(artistAlbumOffset => artistAlbumOffset + 20);
            }
        }).catch((err) => {
            console.log({err});
            alert(errorStr)
        })
    }, [artistID, artistAlbumOffset, doneLoadingAlbums])


    // Similar to the hook above, but this time, we get all the tracks off of all the albums
    // This might not need to be a hook come to think of it but currently I'm operating off of the
    // "if it's not broken don't fix it" mentality - and there's nothing glaringly wrong with this approach
    // from what I can tell
    useEffect(() => {
        if(!doneLoadingAlbums) return; 

        let albumArr = albumList.slice(albumTrackOffset, albumTrackOffset + 20).map(album => album.id);

        if(albumList.length === 0 || albumTrackOffset === -1 || albumArr.length <= 0) {
            setDoneLoadingTracks(true);
            return;
        }
        
        spotifyApi.getAlbums(albumArr).then(res => {
            res.body.albums.forEach(album => {
                album.tracks.items.forEach(track => {
                    if(track.artists.filter(x => x.id === artistID).length > 0) {
                        setTrackList(existingTracks => [...existingTracks, track.id])
                    }
                })
            });

            if(albumArr.length < 20) {
                setAlbumTrackOffset(-1);
                setDoneLoadingTracks(true);
            } else {
                setAlbumTrackOffset(offset => offset + 20)
            }
        }).catch((err) => {
            console.log({err});
            alert(errorStr)
        })

        return () => {albumArr = []};
    }, [doneLoadingAlbums, albumTrackOffset, albumList, artistID])


    // Final step - get all the tracks and get their popularity. Each track comes with a bunch of other information
    // that I don't need so I filter it out a bit.
    useEffect(() => {
        if(!doneLoadingTracks) return;

        let trackArr = trackList.slice(trackOffset, trackOffset + 50);

        if(trackArr.length === 0 || trackOffset === -1 || trackList.length === 0 || doneLoadingTracksPop) {
            setDoneLoadingTracksPop(true);
            return;
        }

        if(trackList.length === 0) {
            return;
        }

        spotifyApi.getTracks(trackArr).then(res => {
            res.body.tracks.forEach((track) => {
                setTrackListPop(oldTrack => {
                    if(track.external_urls.spotify) {
                        return [...oldTrack, 
                                {"name": track.name, 
                                "popularity": track.popularity, 
                                "artists": track.artists,
                                "ext_spotify_url": track.external_urls.spotify,
                                "available_markets" : track.available_markets,
                                "release_date" : track.album.release_date,
                                "uri" : track.uri}]
                    }
                })
            })

            if(trackArr.length < 50) {
                setTrackOffset(-1);
                setDoneLoadingTracksPop(true);
            } else {
                setTrackOffset(offset => offset + 50)
            }
        }).catch((err) => {
            console.log({err});
            alert(errorStr)
        })

        return () => {trackArr = []};
    }, [doneLoadingTracks, trackOffset, doneLoadingTracksPop, trackList]);

    // The easiest step - sort all the tracks by popularity!
    useEffect(() => {
        if(!doneLoadingTracksPop) return;

        let tempArr = [];

        trackListPop.forEach((track) => {
            if(!tempArr.find(curTrack => curTrack.name.toLowerCase() === track.name.toLowerCase())) {
                let checkDupes = trackListPop.filter(oldTrack => 
                                                    oldTrack.name.toLowerCase() === track.name.toLowerCase());
                checkDupes.sort((a, b) => { 
                    if(sortMethod === "release_date") {
                        return Date.parse(a[sortMethod]) - Date.parse(b[sortMethod])
                    } else {
                        return b[sortMethod]- a[sortMethod]
                    }
                });        
                tempArr.push(checkDupes[0])
            }
        })

        tempArr.sort((a, b) => {
            if(sortMethod === "release_date") {
                return Date.parse(b[sortMethod])- Date.parse(a[sortMethod])
            } else {
                return b[sortMethod]- a[sortMethod]
            }
        });
        setFinalTrackList(tempArr);
        setFilteredPlaylist(tempArr);
        setDoneLoadingFinalTrackList(true);

        return () => {tempArr = []}
    }, [doneLoadingTracksPop, trackListPop, sortMethod])

    // And now we can allow further actions :) 
    useEffect(() => {
        if(doneLoadingFinalTrackList) setDisableEntering(false);
    }, [doneLoadingFinalTrackList]);

    // Remove the access code that was in the URL after auth
    useEffect(() => {
        if(userLogin) {
            window.history.pushState({}, null, "/")
        }
    }, [userLogin]);

    useEffect(() => {
        if(sortMethod === "release_date") {
            if(sortedDir === "ascending") {
                setFinalTrackList(finalTrackList => finalTrackList.slice().sort((a, b) => {
                    return Date.parse(a[sortMethod]) - Date.parse(b[sortMethod])
                }));
            } else if(sortedDir === "descending") {
                setFinalTrackList(finalTrackList => finalTrackList.slice().sort((a, b) => {
                    return Date.parse(b[sortMethod]) - Date.parse(a[sortMethod])
                }));
            }
        } else {
            if(sortedDir === "ascending") {
                setFinalTrackList(finalTrackList => finalTrackList.slice().sort((a, b) => {
                    return a[sortMethod]- b[sortMethod]
                }));
            } else if(sortedDir === "descending") {
                setFinalTrackList(finalTrackList => finalTrackList.slice().sort((a, b) => {
                    return b[sortMethod]- a[sortMethod]
                }));
            }
        }

        localStorage.setItem("sortedDir", sortedDir);
        setPlaylistFilters([]);
    }, [doneLoadingFinalTrackList, sortedDir, sortMethod]);

    return (
    <div>
        <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss={false}
            draggable={false}
            pauseOnHover={false}
            />
        <Modal id={"firstLoginModal"} closeIcon 
                open={firstLoginModalOpen && !accessTokenLog} onClose={() => setFirstLoginModalOpen(false)}>
            <Modal.Content>
                <h1>Welcome to Ranked Records! 💿</h1>
                <p>This site lets you view <strong>all</strong> the songs by your favorite artists, which you can sort by chronology or popularity!</p>
                <p>You can create a playlist of these songs (with filters!) if you connect with Spotify - which you can do now, or later when you want to create a playlist (it's faster if you do it now, but your choice 😉).</p>
            </Modal.Content>
            <Modal.Actions>
                {loginButton()}
            </Modal.Actions>
        </Modal>

        <div id="header">
            <div id="greenGradiant"></div>
            <h1>Ranked Records</h1>
            <div id="header-desc">Find all the Spotify songs by your favourite artists, ranked by chronology or popularity
                <PopularityTip/>
            </div>

            {disableEntering && 
                <div id="disableDiv">
                    <em>
                        Please wait until the current artist songs have loaded before entering another one.
                    </em>
                </div>
            }

            <div id="action-bar">
                <Dropdown fluid selection deburr closeOnChange
                    selectOnBlur={false}
                    search={customSearch}
                    options={artistResults} 
                    placeholder={"Search for an artist..."}
                    onChange={(e, data) => handleChange(e, data)}
                    onSearchChange={(e, data) => handleSearchChange(e, data)}
                    onClose={(e, data) => handleClose(e, data)}
                    id={"searchDropdown"}
                    disabled={disableEntering}
                    selectOnNavigation={false}
                    searchQuery={searchValue}
                    value={defaultDropVal}
                    label={"search-artists"}
                    />
                
                <Dropdown fluid selection deburr closeOnChange
                    selectOnBlur={false}
                    options={sortOptions} 
                    placeholder={"Select a sort method..."}
                    onChange={(e, data) => handleSortChange(e, data)}
                    id={"sortDropdown"}
                    disabled={disableEntering}
                    selectOnNavigation={false}
                    value={sortMethod}
                    label={"sort-method"}
                    header={<Dropdown.Header content='Sort Method' />}
                />
                
                <Modal closeIcon 
                    open={playlistCreatorOpen}
                    onClose={() => setPlaylistCreatorOpen(false)}
                    onOpen={() => setPlaylistCreatorOpen(true)}
                    trigger={<Button id="createRP" disabled={disableEntering} onClick={() => setPlaylistCreatorOpen(true)}>Create Ranked Playlist</Button>}>
                    <Modal.Header>🔀 Playlist Generation </Modal.Header>
                    <Modal.Content scrolling>
                        <Modal.Description className="longModalDescription">
                            {userWidget()}
                            {generationWidget()}
                        </Modal.Description>
                    </Modal.Content>
                    <Modal.Actions id="connectActions">
                    {loginButton()}

                    {accessTokenLog && userLogin && artistName ? 
                         <>{!doneLoadingFinalTrackList && artistID ?
                        <Label id={"loadingButtonNotice"} 
                            color="red"
                            onClick={() => setPlaylistCreatorOpen(false)}>Reloading tracks, one moment... Close this window to see progress...</Label>
                        :
                        <Button disabled={!doneLoadingFinalTrackList} 
                            onClick={createPlaylist} 
                            id={"generateButton"}>
                            Create Playlist for {artistName}
                        </Button>
                        }</>
                    : userLogin && 
                    <Button color='red' onClick={() => setPlaylistCreatorOpen(false)}>
                        Close this Window to Select an Artist!
                    </Button>
                    }
                    </Modal.Actions>

                    <Modal
                        closeIcon
                        open={playlistModalOpen}
                        onClose={() => setPlaylistModalOpen(false)}
                        onOpen={() => setPlaylistModalOpen(true)}
                        >
                        <Modal.Content>
                            {newPlaylist && newPlaylist.external_urls && 
                            <>
                                <p>Your new playlist has been created - click the link below, or check your Spotify account!</p>
                                <p>Close this window to create a new playlist!</p>
                                <a href={newPlaylist.external_urls.spotify} target="_blank" rel="noreferrer">{newPlaylist.external_urls.spotify}</a>
                            </>
                            }
                        </Modal.Content>
                    </Modal>
                </Modal>
            </div>
        </div>

        {artistID && !doneLoadingFinalTrackList && 
            <div className={"centeredMessageDiv"}>
                <h3>Current Loading Stage:</h3>
                {!doneLoadingAlbums ? <p>Loading Albums... Currently found {albumList.length}</p> : <p>(1/3) {albumList.length} Albums Loaded!</p>}
                {doneLoadingAlbums && 
                    (!doneLoadingTracks ? <p>Loading Tracks... Currently found {trackList.length}</p> : <p>(2/3) {trackList.length} Tracks Loaded!</p>)}
                {doneLoadingTracks && 
                    (!doneLoadingTracksPop ? <p>Loading Tracks with more data (for sorting)... Currently loaded {trackListPop.length} </p> : <p>(3/3) Tracks with Popularity Loaded!</p>)}
            </div>
        }

        {doneLoadingFinalTrackList && <div className={"centeredMessageDiv"}>{finalTrackList.length} tracks loaded.</div>}

        <CustomTable loading={artistID && !doneLoadingFinalTrackList} data={finalTrackList} 
                     artistID={artistID} sortMethod={sortMethod} sortedDir={sortedDir} setSortedDir={setSortedDir}/>

        <div id="footer">
            <hr/>
            <div>Made with ❤ by <a href="https://hannahguo.me/" target="_blank" rel="noreferrer">Hannah Guo️</a></div>

            <div id="footer-links">
                <Modal closeIcon 
                    open={faqOpen}
                    onClose={() => setFaqOpen(false)}
                    onOpen={() => setFaqOpen(true)}
                    trigger={<Button basic inverted color="grey"><Icon name="question"/>FAQs</Button>}>
                    <Modal.Header>💿 Ranked Records FAQs</Modal.Header>
                    <Modal.Content scrolling>
                        <Modal.Description>
                            <FAQModalContent/>
                        </Modal.Description>
                    </Modal.Content>
                </Modal>
                <div>
                    <a href="https://github.com/HannahGuo/RankedRecords" target="_blank" rel="noreferrer">
                        <Button basic inverted color="grey"><Icon name="github"/>Github</Button>
                    </a>
                </div>
                <div>
                    <a href="https://github.com/HannahGuo/RankedRecords/releases" target="_blank" rel="noreferrer">
                        <Button basic inverted color="grey"><Icon name="newspaper outline"/>What's New?</Button>
                    </a>
                </div>
                <div>
                    <a href="https://forms.gle/nigc6Bwdq5hZETRY9" target="_blank" rel="noreferrer">
                        <Button basic inverted color="grey"><Icon name="inbox"/>Contact</Button>
                    </a>
                </div>
            </div>

            <div id="spotifyLogoDiv">
                Built using
                <a href="https://developer.spotify.com/" rel="noreferrer" target="_blank">
                    <img src={spotifyLogo} id="spotifyLogo" alt="Spotify Logo"/>
                </a>
            </div>
        </div>
    </div>
    );
}